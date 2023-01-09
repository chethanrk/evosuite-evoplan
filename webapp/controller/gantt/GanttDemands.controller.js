sap.ui.define([
	"com/evorait/evoplan/controller/gantt/GanttActions",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/ganttFormatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment"
], function (AssignmentsController, JSONModel, formatter, ganttFormatter, Filter, FilterOperator, MessageToast, RowAction, RowActionItem,
	Constants, Fragment) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.gantt.GanttDemands", {

		formatter: formatter,

		_bLoaded: false,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the Gantt demand controller is instantiated.
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 * @public
		 */
		onInit: function () {
			// Row Action template to navigate to Detail page
			var onClickNavigation = this.onActionPress.bind(this),
				openActionSheet = this.openActionSheet.bind(this);

			this.oAppModel = this.getModel("appView");
			this.oUserModel = this.getModel("user");
			this._viewModel = this.getModel("viewModel");
			this._mParameters = {
				bFromGantt: true
			};

			if (this.oAppModel.getProperty("/currentRoute") === "splitDemands") {
				this._mParameters = {
					bFromDemandSplit: true
				};
			}
			this._oEventBus = sap.ui.getCore().getEventBus();

			this._oEventBus.subscribe("BaseController", "refreshDemandGanttTable", this._refreshDemandTable, this);

			this._oDraggableTable = this.byId("draggableList");
			this._oDataTable = this._oDraggableTable.getTable();
			this.getRouter().getRoute("splitDemands").attachMatched(function () {
				this._routeName = Constants.GANTT.SPLITDMD;
			}.bind(this));
			this.getRouter().getRoute("newgantt").attachPatternMatched(function () {
				this._routeName = "newgantt";
				this._mParameters = {
					bFromNewGantt: true
				};
			}.bind(this));
			this._setRowActionTemplate(this._oDataTable, onClickNavigation, openActionSheet);

			//to initialize Gantt Demand Filter Dialog
			this._oGanttDemandFilter = this.getView().byId("idGanttDemandFilterDialog");
			this._oGanttDemandFilter.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			this._aSelectedIndices = [];
		},

		/**
		 * on page exit
		 */
		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshDemandGanttTable", this._refreshDemandTable, this);
		},

		/* =========================================================== */
		/* Event & Public methods                                      */
		/* =========================================================== */

		/** 
		 * On Drag start restrict demand having status other init
		 * @param oEvent
		 */

		onDragStart: function (oEvent) {
			var sMsg = this.getResourceBundle().getText("msg.notAuthorizedForAssign");
			if (!this._viewModel.getProperty("/validateIW32Auth")) {
				this.showMessageToast(sMsg);
				oEvent.preventDefault();
				return;
			}
			var oDragSession = oEvent.getParameter("dragSession"),
				oDraggedControl = oDragSession.getDragControl(),
				aIndices = this._oDataTable.getSelectedIndices(),
				oSelectedPaths, aPathsData, aSelDemandGuid = [],
				aSelectedDemandObject = [];

			oDragSession.setTextData("Hi I am dragging");
			//get all selected rows when checkboxes in table selected
			if (aIndices.length > 0) {
				oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedIndices, true);
				aPathsData = oSelectedPaths.aPathsData;
			} else {
				//table tr single dragged element
				oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, [oDraggedControl.getIndex()], true);
				aPathsData = oSelectedPaths.aPathsData;
			}

			aPathsData.forEach(function (item) {
				aSelDemandGuid.push(item.sPath);
				aSelectedDemandObject.push({
					sPath: item.sPath,
					oDemandObject: item.oData
				});
			});

			this._viewModel.setProperty("/gantDragSession", aSelDemandGuid);
			this._viewModel.setProperty("/dragSession", aPathsData);
			this.localStorage.put("Evo-Dmnd-guid", JSON.stringify(aSelectedDemandObject));
			this.localStorage.put("Evo-aPathsData", JSON.stringify(aPathsData));

			if (oSelectedPaths && oSelectedPaths.aNonAssignable && oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
				oEvent.preventDefault();
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
			this._viewModel.setProperty("/dragSession", oSelectedPaths.aPathsData);

			if (oSelectedPaths.aPathsData.length > 0) {
				// TODO comment
				this.localStorage.put("Evo-Action-page", "splitDemands");
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedPaths.aPathsData, false, this._mParameters);
			}
			if (oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
			}
		},

		//TODO comment
		onClickSplit: function (oEvent) {
			window.open("#Gantt/SplitDemands", "_blank");
		},

		/**
		 * Open the Gantt Demands Filter Dialog 
		 */
		onPressGanttFilters: function () {
			this._oGanttDemandFilter.open();
		},

		/**
		 * Close the Gantt Demands Filter Dialog 
		 */
		onCloseGanttFilter: function () {
			this._oGanttDemandFilter.close();
		},

		/* =========================================================== */
		/* Private methods                                             */
		/* =========================================================== */

		/**
		 * Refresh the demand table 
		 * 
		 */
		_refreshDemandTable: function () {
			if (this._bLoaded) {
				this._oDraggableTable.rebindTable();
			}
			this._bLoaded = true;
		},
	
	});

});