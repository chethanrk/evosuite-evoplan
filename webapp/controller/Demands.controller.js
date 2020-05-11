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
		
		_bFirstTime : true,

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
			// this._oMessagePopover = sap.ui.getCore().byId("idMessagePopover");
			// this.getView().addDependent(this._oMessagePopover);

			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("BaseController", "refreshDemandTable", this._triggerDemandFilter, this);
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
				// this._jDraggable(this);
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
			// this._oMessagePopover.openBy(oEvent.getSource());
		},
		/**
		 * Called when view attached is destroyed
		 */
		onExit: function () {
			if (this._infoDialog) {
				this._infoDialog.destroy();
			}
			this._eventBus.unsubscribe("BaseController", "refreshDemandTable", this._triggerDemandFilter, this);
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
         * On DragStart set the dragSession selected demands
         */
        onDragStart : function (oEvent){
            var oDragSession = oEvent.getParameter("dragSession"),
                oDraggedControl = oDragSession.getDragControl();

            var aIndices = this._oDataTable.getSelectedIndices(),
                oSelectedPaths, aPathsData;

            oDragSession.setTextData("Hi I am dragging");
            //get all selected rows when checkboxes in table selected
            if (aIndices.length > 0) {
                oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, aIndices, true);
                aPathsData = oSelectedPaths.aPathsData;
            } else {
                //table tr single dragged element
                oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, [oDraggedControl.getIndex()], true);
                aPathsData = oSelectedPaths.aPathsData;
            }
            // keeping the data in drag session
            this.getModel("viewModel").setProperty("/dragSession", aPathsData);
            if (oSelectedPaths && oSelectedPaths.aNonAssignable && oSelectedPaths.aNonAssignable.length > 0) {
                this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
                oEvent.preventDefault();
            }
        },
        /**
		 * On Drag end check for dropped control, If dropped control not found
		 * then make reset the selection
         * @param oEvent
         */
        onDragEnd: function(oEvent){
            var oDroppedControl = oEvent.getParameter("dragSession").getDropControl();
            if(!oDroppedControl){
                this._deselectAll();
            }
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
			if (sEvent === "refreshDemandTable" && !this._bFirstTime) {
				this._oDraggableTable.rebindTable();
			}
			this._bFirstTime = false;
		},
		/**
		 *	Navigates to evoOrder detail page with static url. 
		 */
		OnClickOrderId : function(oEvent){
			var sOrderId = oEvent.getSource().getText();
			this.openEvoOrder(sOrderId);
		}
	});
});