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
			this._oToolsTable = this.byId("idToolsTable").getTable();
			this._mParameters = {
				bFromDemandTools: true
			};
		},
		/**
		 * after rendering of view
		 * @param oEvent
		 */
		onAfterRendering: function (oEvent) {
			this._oViewModel.setProperty("/PRT/btnSelectedKey", "tools");
			this._oViewModel.setProperty("/PRT/bIsGantt", false);
			this._oViewModel.refresh();
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
			oEvent.getParameter("bindingParams").filters.push(new Filter("TOOL_TYPE", FilterOperator.EQ, this._oUserModel.getProperty(
				"/ENABLE_TOOL_TYPE")));
		},

		/**
		 * Event handler to switch between Demand and Tool list
		 * @param oEvent
		 */
		handleViewSelectionChange: function (oEvent) {
			this.getOwnerComponent().bIsFromPRTSwitch = true;
			var sSelectedKey = this._oViewModel.getProperty("/PRT/btnSelectedKey");
			if (sSelectedKey === "demands") {
				this._oRouter.navTo("demands", {});
			} else {
				this._oRouter.navTo("demandTools", {});
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
				aIndices = this._oToolsTable.getSelectedIndices(),
				oSelectedPaths;

			if (aIndices.length > 0) {
				oSelectedPaths = this._getSelectedToolsPaths(this._oToolsTable, aIndices);
			} else {
				oSelectedPaths = this._getSelectedToolsPaths(this._oToolsTable, [oDraggedControl.getIndex()]);
			}
			// keeping the data in drag session
			this.getModel("viewModel").setProperty("/dragSession", oSelectedPaths.aPathsData);
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
	});
});