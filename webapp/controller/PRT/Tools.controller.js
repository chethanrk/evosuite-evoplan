sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
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

	return BaseController.extend("com.evorait.evoplan.controller.PRT.Tools", {

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

		},
		/**
		 * after rendering of view
		 * @param oEvent
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
		 * @param oEvent
		 */
		onBeforeRebindToolsTable: function (oEvent) {
			oEvent.getParameter("bindingParams").filters.push(new Filter("TOOL_TYPE", FilterOperator.EQ, "EQ"));
		},

		/**
		 * Event handler to switch between Demand and Tool list
		 * @param oEvent
		 */
		handleViewSelectionChange: function (oEvent) {
			this.getOwnerComponent().bIsFromPRTSwitch = true;
			var sSelectedKey = this._oViewModel.getProperty("/PRT/btnSelectedKey"),
				sCurrentHash = this._oRouter.getHashChanger().getHash();

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
		 * @param oEvent
		 */
		onToolsDragStart: function (oEvent) {
			var oDragSession = oEvent.getParameter("dragSession"),
				oDraggedControl = oDragSession.getDragControl(),
				oToolsTable = this._oDraggableToolsTable.getTable(),
				aIndices = oToolsTable.getSelectedIndices(),
				oSelectedPaths;

			if (aIndices.length > 0) {
				oSelectedPaths = this._getSelectedToolsPaths(this._oToolsTable, aIndices);
			} else {
				oSelectedPaths = this._getSelectedToolsPaths(this._oToolsTable, [oDraggedControl.getIndex()]);
			}
			// keeping the data in drag session
			this.getModel("viewModel").setProperty("/dragSession", oSelectedPaths.aPathsData);
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
		 * @param oTable Tools list
		 * @param aIndices Array of selected Row indices
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
		_refreshToolsTable: function () {
			this._oDraggableToolsTable.rebindTable();
		}
	});
});