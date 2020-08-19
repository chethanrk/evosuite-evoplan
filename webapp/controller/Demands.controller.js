sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/table/Table",
	"sap/ui/table/Row",
	"sap/m/MessageToast",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Table, Row, MessageToast,
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
			var openActionSheet = this.openActionSheet.bind(this);

			this._setRowActionTemplate(oDataTable, onClickNavigation, openActionSheet);

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
         *
         * @param oEvent
         */
		openActionSheet : function(oEvent){
			var oContext = oEvent.getSource().getParent().getParent().getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath();
				if(!this._oNavActionSheet){
					this._oNavActionSheet = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.NavigationActionSheet",this);
					this.getView().addDependent(this._oNavActionSheet);
				}
				this.selectedDemandData = oModel.getProperty(sPath);

			this._oNavActionSheet.openBy(oEvent.getSource().getParent());
		},
		/**
		 *
		 */
		onClickNavAction : function(oEvent){
			var oContext = oEvent.getSource().getBindingContext("navLinks"),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oData = oModel.getProperty(sPath);

			this.openEvoOrder(this.selectedDemandData.ORDERID, oData);
		},
		/**
		 *	Navigates to evoOrder detail page with static url.
		 */
		OnClickOrderId : function(oEvent){
			var sOrderId = oEvent.getSource().getText();
			this.openEvoOrder(sOrderId);
		},
        /**
		 * Event will triggered when the filter is initialized
         * @param oEvent
         */
        onInitialized: function (oEvent) {
            this._setDefaultFilters(oEvent.getSource());
        },
        /**
		 * Fetch filters from component data and set the initial filters to smart filterbar
         * @param oFilterBar
         * @private
         */
        _setDefaultFilters: function (oFilterBar) {
            var	oComponent = this.getOwnerComponent(),
                oStartupData = oComponent.getComponentData().startupParameters,
                oServiceMetadata = this.getModel().getServiceMetadata(),
                oSchema = oServiceMetadata.dataServices.schema[0],
                aEntityTypes = oSchema.entityType,
                oAnnotations = this.getModel().getServiceAnnotations(),
                oFilterData = {},
                bValueHelp = false,
                bTypeDate = false;
            if (!oStartupData) {
                return;
            }
            var aKeys = Object.keys(oStartupData);
            for (var i in aKeys) {
                var sKey = aKeys[i];
                oFilterData[aKeys[i]] = {
                    items: [],
                    ranges: [],
                    value: ""
                };

                bValueHelp = this._checkValueHelp(sKey, oAnnotations);
                bTypeDate = this._checkType(sKey, aEntityTypes);
                if (bValueHelp) {
                    var aValues = [];
                    for (var j in oStartupData[sKey]) {
                        aValues.push({
                            key: oStartupData[sKey][j],
                            text: oStartupData[sKey][j]
                        });
                    }
                    oFilterData[aKeys[i]].items = aValues;
                } else if (bTypeDate) {
                    var aRanges = [];
                    for (var k in oStartupData[sKey]) {
                        aRanges.push({
                            exclude: false,
                            keyField: sKey,
                            operation: "BT",
                            value1: oStartupData[sKey][k],
                            value2: oStartupData[sKey][k]
                        });
                    }
                    oFilterData[aKeys[i]].ranges = aRanges;
                } else {
                    var aTexts = [];
                    for (var l=0; l<oStartupData[sKey].length-1; l++) {
                        aTexts.push({
                            exclude: false,
                            keyField: sKey,
                            operation: "EQ",
                            tokenText: "="+oStartupData[sKey][l],
                            value1: oStartupData[sKey][l]
                        });
                    }
                    oFilterData[aKeys[i]].ranges = aTexts;
                    oFilterData[aKeys[i]].value = oStartupData[sKey][oStartupData[sKey].length - 1];
                }
            }
            oFilterBar.setFilterData(oFilterData);
        },
        /**
         * @Author Rahul
         * Checks for the given key is there a value help or not
		 * Basically checking for ValueList annotaion
         */
        _checkValueHelp: function (sKey, oAnnotations) {
            var oPropAnnotations = oAnnotations.propertyAnnotations,
                akeys = Object.keys(oPropAnnotations),
                sEntity = "com.evorait.evoplan.Demand";
            for (var i in akeys) {
                if (akeys[i] === sEntity) {
                    if (oPropAnnotations[akeys[i]][sKey] && oPropAnnotations[akeys[i]][sKey]["com.sap.vocabularies.Common.v1.ValueList"]) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }
            return false;
        },
        /**
		 * Checks the given key property type as Date or not
         * @param sKey
         * @param aEntityTypes
         * @return {boolean}
         * @private
         */
        _checkType: function (sKey, aEntityTypes) {
            var sEntity = "Demand";
            for (var i in aEntityTypes) {
                if (aEntityTypes[i].name === sEntity) {
                    for (var j in aEntityTypes[i].property) {
                        if (aEntityTypes[i].property[j].name === sKey && (aEntityTypes[i].property[j].name.type === "Edm.DateTime" || aEntityTypes[i].property[
                                j].name.type === "Edm.DateTimeOffset")) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
	});
});