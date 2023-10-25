sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/table/Table",
	"sap/ui/table/Row",
	"sap/m/MessageToast",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem",
	"sap/ui/core/Fragment"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Table, Row, MessageToast,
	RowAction, RowActionItem, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.prt.Tools", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the Tools controller is instantiated.
		 * @public
		 */
		onInit: function () {
			this._oRouter = this.getOwnerComponent().getRouter();
			this._oViewModel = this.getModel("viewModel");
			this._oUserModel = this.getModel("user");
			this._oDraggableToolsTable = this.byId("idToolsTable");
			this._oToolsTable = this.byId("idToolsTable").getTable();
			this._configureToolDataTable(this._oToolsTable);
			this._eventBus = sap.ui.getCore().getEventBus();

			this._mParameters = {
				bFromDemandTools: true
			};

			this._eventBus.subscribe("BaseController", "refreshToolsTable", this._refreshToolsTable, this);

			this._oRouter.getRoute("demandTools").attachPatternMatched(function () {
				this._oViewModel.setProperty("/PRT/bIsGantt", false);
			}.bind(this));
			this._oRouter.getRoute("ganttTools").attachPatternMatched(function () {
				this._oViewModel.setProperty("/PRT/bIsGantt", true);
			}.bind(this));
			this._oRouter.getRoute("GanttSplitTools").attachPatternMatched(function () {
				this._oViewModel.setProperty("/PRT/bIsGantt", true);
			}.bind(this));

			//Tool filter dialog to show in Gantt/Split-Gantt
			this._oGanttToolsFilter = this.getView().byId("idGanttToolsFilterDialog");
			this._oGanttToolsFilter ? this._oGanttToolsFilter.addStyleClass(this.getOwnerComponent().getContentDensityClass()) : null;

			//Set default tool assign days
			var iDefNum = this._oUserModel.getProperty("/DEFAULT_TOOL_ASGN_DAYS") ? this._oUserModel.getProperty("/DEFAULT_TOOL_ASGN_DAYS") : 0;
			this._oViewModel.setProperty("/iDefToolAsgnDays", iDefNum);
		},

		/**
		 * after rendering of view
		 * @param {object}  oEvent
		 */
		onAfterRendering: function (oEvent) {
			if (!this._oUserModel.getProperty("/ENABLE_PRT")) {
				this._oRouter.navTo("demands", {});
			}
			this._oViewModel.setProperty("/PRT/btnSelectedKey", "tools");
			this._oViewModel.setProperty("/PRT/bIsGantt", false);
			this._oViewModel.refresh();
		},

		/**
		 * Called when view attached is destroyed
		 */
		onExit: function () {
			this._eventBus.unsubscribe("BaseController", "refreshToolsTable", this._refreshToolsTable, this);
		},

		/* =========================================================== */
		/* event handlers &  Public methods                            */
		/* =========================================================== */

		/**
		 * event before loading the the tool list
		 * adding default filters
		 * @param {object} oEvent
		 */
		onBeforeRebindToolsTable: function (oEvent) {
			oEvent.getParameter("bindingParams").filters.push(new Filter("TOOL_TYPE", FilterOperator.EQ, "EQUI"));
		},

		/**
		 * Event handler to switch between Demand and Tool list
		 * @param {object} oEvent
		 */
		handleViewSelectionChange: function (oEvent) {
			this.getOwnerComponent().bIsFromPRTSwitch = true;
			var sCurrentHash = this._oRouter.getHashChanger().getHash();

			// go back to demand list view based on current page
			if (sCurrentHash === "DemandTools") {
				this._oRouter.navTo("demands", {});
			} else if (sCurrentHash === "GanttTools") {
				this._oRouter.navTo("newgantt", {});
			} else if (sCurrentHash === "SplitPage/SplitGanttTools") {
				this._oRouter.navTo("splitDemands", {});
			}
		},

		/**
		 * Drag items from Tool list
		 * to store dragged items in local JSON model
		 * @param {object} oEvent
		 */
		onToolsDragStart: function (oEvent) {
			var oDragSession = oEvent.getParameter("dragSession"),
				oDraggedControl = oDragSession.getDragControl(),
				oToolsTable = this._oDraggableToolsTable.getTable(),
				aIndices = oToolsTable.getSelectedIndices(),
				oSelectedPaths, aSelectedToolObject = [];

			if (aIndices.length > 1) {
				oSelectedPaths = this._getSelectedToolsPaths(this._oToolsTable, aIndices);
			} else {
				oSelectedPaths = this._getSelectedToolsPaths(this._oToolsTable, [oDraggedControl.getIndex()]);
			}
			oSelectedPaths.aPathsData.forEach(function (item) {
				aSelectedToolObject.push({
					sPath: item.sPath,
					oDemandObject: item.oData
				});
			});
			// keeping the data in drag session
			this._oViewModel.setProperty("/dragSession", oSelectedPaths.aPathsData);
			this.localStorage.put("Evo-Tools-guid", JSON.stringify(aSelectedToolObject));
			this.localStorage.put("Evo-aPathsData", JSON.stringify(oSelectedPaths.aPathsData));
			this.localStorage.put("Evo-toolDrag", "Tools");
		},

		/**
		 * Open the Gantt Toolss Filter Dialog 
		 */
		onPressGanttToolsFilters: function () {
			this._oGanttToolsFilter.open();
		},

		/**
		 * Close the Gantt Tools Filter Dialog 
		 */
		onCloseGanttToolsFilters: function () {
			this._oGanttToolsFilter.close();
		},

		/* =========================================================== */
		/* Private methods                                             */
		/* =========================================================== */

		/**
		 * reading context and getting path of selected items from Tool list
		 * helper method for tools assignment process
		 * @param {object} oTable Tools list
		 * @param {array} aIndices Array of selected Row indices
		 */
		_getSelectedToolsPaths: function (oTable, aIndices) {
			var aPathsData = [],
				oData, oContext, sPath;

			for (var j in aIndices) {
				oContext = oTable.getContextByIndex(aIndices[j]);
				sPath = oContext.getPath();
				oData = this.getModel().getProperty(sPath);
				aPathsData.push({
					sPath: sPath,
					oData: oData
				});
			}
			return {
				aPathsData: aPathsData,
				aNonAssignable: []
			};
		},

		/**
		 * Refresh tools list table
		 * @private
		 */
		_refreshToolsTable: function () {
			this._oDraggableToolsTable.rebindTable();
		},

		/**
		 * add configuration to Tools table
		 * @param {object} oDataTable
		 * @private
		 */
		_configureToolDataTable: function (oDataTable) {
			oDataTable.attachRowSelectionChange(function (oEvent) {
				var aSelectedIndices = this._oToolsTable.getSelectedIndices(),
					iMaxRowSelection = this._oUserModel.getProperty("/DEFAULT_TOOLS_SELECT_ALL"),
					sMsg, iLastIndex;

				// condition to deselect All when max selection limit is already reach but pressing select All checkbox
				if (oEvent.getParameter("selectAll") && this._nSelectedToolsCount === iMaxRowSelection) {
					this._oToolsTable.clearSelection();
					return;
				}
				if (aSelectedIndices.length > iMaxRowSelection) {
					if (oEvent.getParameter("selectAll")) {
						iLastIndex = aSelectedIndices.pop();
						this._oToolsTable.removeSelectionInterval(iMaxRowSelection, iLastIndex);
						sMsg = this.getResourceBundle().getText("ymsg.allToolSelect", [iMaxRowSelection]);
					} else {
						iLastIndex = oEvent.getParameter("rowIndex");
						this._oToolsTable.removeSelectionInterval(iLastIndex, iLastIndex);
						sMsg = this.getResourceBundle().getText("ymsg.maxRowSelection", [iMaxRowSelection]);
					}
					this.showMessageToast(sMsg);
				}
				this._nSelectedToolsCount = this._oToolsTable.getSelectedIndices().length;
			}.bind(this));
		}
	});
});