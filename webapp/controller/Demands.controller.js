sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/table/Table",
	"sap/ui/table/Row",
	"sap/ui/table/RowSettings",
	"sap/m/MessageToast",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Table, Row, RowSettings, MessageToast,
	RowAction, RowActionItem) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.Demands", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the demand controller is instantiated.
		 * @public
		 */
		onInit: function () {
			this._oDraggableTable = this.byId("draggableList");
			this._oDataTable = this._oDraggableTable.getTable();
			this._configureDataTable(this._oDataTable);
			this._aSelectedRowsIdx = [];
			this._oMessagePopover = sap.ui.getCore().byId("idMessagePopover");
			this.getView().addDependent(this._oMessagePopover);

			var eventBus = sap.ui.getCore().getEventBus();
			eventBus.subscribe("BaseController", "refreshDemandTable", this._triggerDemandFilter, this);
			eventBus.subscribe("App", "RegisterDrag", this._registerDnD, this);

			this.getRouter().getRoute("demands").attachPatternMatched(this._onObjectMatched, this);

			// event listener for changing device orientation with fallback of window resize
			var orientationEvent = this.getOrientationEvent(),
				_this = this;

			window.addEventListener(orientationEvent, function () {
				_this._jDraggable(_this);
			}, false);
		},
		/**
		 * Register Draggable
		 * @private
		 */
		_registerDnD: function () {
			var _this = this;
			_this._jDraggable(_this);
		},
		/**
		 * Method get call when ever the hash mathes the route name 
		 * Registering draggable functionality to make sure it will work all the time
		 * @Author Rahul
		 * @version 1.0.4
		 * @param oEvent
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var _this = this;
			_this._jDraggable(_this);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */

		/**
		 * after rendering of view
		 * @param oEvent
		 */
		onAfterRendering: function (oEvent) {
			var tableTitle = this.getResourceBundle().getText("xtit.itemListTitle");
			var noDataText = this.getResourceBundle().getText("tableNoDataText", [tableTitle]);
			var viewModel = this.getModel("viewModel");
			viewModel.setProperty("/subViewTitle", tableTitle);
			viewModel.setProperty("/subTableNoDataText", noDataText);
		},

		/**
		 * initial draggable after every refresh of table
		 * for example after go to next page
		 * @param oEvent
		 */
		onBusyStateChanged: function (oEvent) {
			var parameters = oEvent.getParameters();
			if (parameters.busy === false) {
				this._jDraggable(this);
			}
		},

		/**
		 * on press assign button in footer
		 * show modal with user for select
		 * @param oEvent
		 */
		onAssignButtonPress: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			if (this._aSelectedRowsIdx.length > 100) {
				this._aSelectedRowsIdx.length = 100;
			}
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, true);

			if (oSelectedPaths.aPathsData.length > 0) {
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedPaths.aPathsData);
			}
			if (oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
			}
		},

		/**
		 * open change status dialog
		 * @param oEvent
		 */
		onChangeStatusButtonPress: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);

			if (this._aSelectedRowsIdx.length > 0) {
				this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedPaths.aPathsData, {
					bFromHome: true
				});
			} else {
				var msg = this.getResourceBundle().getText("ymsg.selectMinItem");
				MessageToast.show(msg);
			}
		},
		/**
		 * on click on navigate acion navigate to overview page
		 * @param oEvent
		 */
		onActionPress: function (oEvent) {
			var oRouter = this.getRouter();
			var oRow = oEvent.getParameter("row");
			var oContext = oRow.getBindingContext();
			var sPath = oContext.getPath();
			var oModel = oContext.getModel();
			var oData = oModel.getProperty(sPath);

			oRouter.navTo("detail", {
				guid: oData.Guid
			});
		},

		/**
		 * open's the message popover by it source
		 * @param oEvent
		 */
		onMessagePopoverPress: function (oEvent) {
			this._oMessagePopover.openBy(oEvent.getSource());
		},
		/**
		 * Called when view attached is destroyed
		 */
		onExit: function () {
			if (this._infoDialog) {
				this._infoDialog.destroy();
			}
			if (this._oMessagePopover) {
				this._oMessagePopover.destroy();
			}
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * add configuration to demand table
		 * @param oDataTable
		 * @private
		 */
		_configureDataTable: function (oDataTable) {
			oDataTable.setEnableBusyIndicator(true);
			oDataTable.setSelectionMode("MultiToggle");
			oDataTable.setEnableColumnReordering(false);
			oDataTable.setEnableCellFilter(false);
			oDataTable.attachBusyStateChanged(this.onBusyStateChanged, this);
			oDataTable.setVisibleRowCountMode("Auto");

			// Row Action template to navigate to Detail page
			var onClickNavigation = this.onActionPress.bind(this);
			var oTemplate = oDataTable.getRowActionTemplate();
			if (oTemplate) {
				oTemplate.destroy();
				oTemplate = null;
			}
			oTemplate = new RowAction({
				items: [
					new RowActionItem({
						type: "Navigation",
						press: onClickNavigation
					})
				]
			});
			oDataTable.setRowActionTemplate(oTemplate);
			oDataTable.setRowActionCount(1);

			//enable/disable buttons on footer when there is some/no selected rows
			oDataTable.attachRowSelectionChange(function () {
				var selected = this._oDataTable.getSelectedIndices();
				if (selected.length > 0) {
					this.byId("assignButton").setEnabled(true);
					this.byId("changeStatusButton").setEnabled(true);
				} else {
					this.byId("assignButton").setEnabled(false);
					this.byId("changeStatusButton").setEnabled(false);
				}
			}, this);
		},

		/**
		 * deselect all checkboxes in table
		 * @private
		 */
		_deselectAll: function () {
			this._oDataTable.clearSelection();
		},

		/**
		 * destroy already initial draggable and build again
		 * timeout to make sure draggable is really after loading finish added
		 * @param elem
		 * @private
		 */
		_jDraggable: function (_this) {
			setTimeout(function () {
				var draggableTableId = _this._oDraggableTable.getId(), // sapUiTableRowHdr
					aPathsData = [];
				//checkbox is not inside tr so needs to select by class .sapUiTableRowHdr
				var jDragElement = $("#" + draggableTableId + " tbody tr, #" + draggableTableId + " .sapUiTableRowHdr")
					.not(".sapUiTableColHdrTr, .sapUiTableRowHidden");

				try {
					if (jDragElement.hasClass("ui-draggable")) {
						jDragElement.draggable("destroy");
					}
				} catch (error) {
					// console.warn(error);
				}

				jDragElement.draggable({
					revertDuration: 10,
					stop: function (event, ui) {
						aPathsData = [];
						_this._deselectAll();
					},
					helper: function (event, ui) {
						var target = $(event.currentTarget);
						//single drag by checkbox, checkbox is not inside tr so have to find out row index
						var selectedIdx = _this._oDataTable.getSelectedIndices(),
							oSelectedPaths = null;

						/* As the table will be loaded with only 100 items initially.
                         Maximum 100 item are selected at a time.*/
						if (selectedIdx.length > 100) {
							selectedIdx.length = 100;
						}
						//get all selected rows when checkboxes in table selected
						if (selectedIdx.length > 0) {
							oSelectedPaths = _this._getSelectedRowPaths(_this._oDataTable, selectedIdx, true);
							aPathsData = oSelectedPaths.aPathsData;
						} else {
							//table tr single dragged element
							oSelectedPaths = _this._getSelectedRowPaths(_this._oDataTable, [_this._getDraggedElementIndex(target.attr("id"))], true);
							aPathsData = oSelectedPaths.aPathsData;
						}
						// keeping the data in drag session
						_this.getModel("viewModel").setProperty("/dragSession", aPathsData);
						if (oSelectedPaths && oSelectedPaths.aNonAssignable && oSelectedPaths.aNonAssignable.length > 0) {
							_this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
						}
						//get helper html list
						var oHtml = _this._generateDragHelperHTML(aPathsData, oSelectedPaths.aNonAssignable);
						return oHtml;
					},
					cursor: "move",
					cursorAt: {
						top: -3,
						left: -3
					},
					zIndex: 10000,
					containment: "document",
					appendTo: "body"
				});
			}, 1000);
		},

		/**
		 * single dragged element's index
		 * @param targetId
		 * @returns {*}
		 * @private
		 */
		_getDraggedElementIndex: function (targetId) {
			var draggedElement = sap.ui.getCore().byId(targetId);
			return draggedElement.getIndex();
		},

		/**
		 * generates html list for dragged paths and gives back to helper function
		 * @param aPathsData
		 * @returns {jQuery|HTMLElement}
		 * @private
		 */
		_generateDragHelperHTML: function (aPathsData, aNonAssignable) {
			var $Element = $("#dragHelper"),
				helperTemplate;
			if ($Element.length > 0) {
				$Element.remove();
			}
			if (aNonAssignable.length <= 0) {
				helperTemplate = $('<ul id="dragHelper"></ul>');
			} else {
				helperTemplate = $('<ul id="dragHelper" style="display:none"></ul>');
			}

			for (var i = 0; i < aPathsData.length; i++) {
				var item = $('<li id="' + aPathsData[i].sPath + '" class="ui-draggable-dragging-item"></li>');
				var text = aPathsData[i].oData.DemandDesc;
				item.html(text);
				if (i === 2) {
					item = $('<li id="' + aPathsData[i].sPath + '" class="ui-draggable-dragging-item"></li>');
					text = aPathsData.length + " items ...";
					item.html(text);
					helperTemplate.append(item);
					break;
				}
				helperTemplate.append(item);

			}
			return helperTemplate;
		},
		/**
		 * Refresh's the demand table
		 * @param sChanel
		 * @param sEvent event which is getting triggered
		 * @param oData Data passed while publishing the event
		 * @returns
		 * @private
		 */
		_triggerDemandFilter: function (sChanel, sEvent, oData) {
			if (sEvent === "refreshDemandTable") {
				this.byId("draggableList").rebindTable();
			}
		},
		/**
		 * Register the drag and drop again
		 */
		onColumnResize: function() {
			this._jDraggable(this);
		},
		/**
		 *	Navigates to evoOrder detail page with static url. 
		 */
		OnClickOrderId : function(oEvent){
			var sOrderId = oEvent.getSource().getText();
			window.open("https://ed1.evorait.net:50103/sap/bc/ui5_ui5/evocu/evoorder/index.html?sap-client=800#/WorkOrder/"+sOrderId, "_blank");
		}
	});
});