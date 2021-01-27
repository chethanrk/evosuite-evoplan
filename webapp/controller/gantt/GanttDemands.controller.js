sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
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

		onInit: function () {
			// Row Action template to navigate to Detail page
			var onClickNavigation = this._onActionPress.bind(this),
				openActionSheet = this.openActionSheet.bind(this),
				oAppModel = this.getModel("appView");

			this._mParameters = {
				bFromGantt: true
			};

			if (oAppModel.getProperty("/currentRoute") === "splitDemands") {
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
				this.initializeGanttDemandFilter();
			}.bind(this));
			this.getRouter().getRoute("gantt").attachMatched(function () {
				this.initializeGanttDemandFilter();
			}.bind(this));
			this._setRowActionTemplate(this._oDataTable, onClickNavigation, openActionSheet);

		},
		/**
		 * 
		 * On click on demand actions to navigate to demand detail page 
		 */
		_onActionPress: function (oEvent) {
			var oRouter = this.getRouter(),
				oRow = oEvent.getParameter("row"),
				oContext = oRow.getBindingContext(),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				oData = oModel.getProperty(sPath),
				oUserDetail = this.getModel("appView");

			if (oUserDetail.getProperty("/currentRoute") === "splitDemands") {
				oRouter.navTo("splitDemandDetails", {
					guid: oData.Guid
				});
			} else {
				oRouter.navTo("ganttDemandDetails", {
					guid: oData.Guid
				});
			}
		},
		/** 
		 * On Drag start restrict demand having status other init
		 * @param oEvent
		 */
		onDragStart: function (oEvent) {
			var oDragSession = oEvent.getParameter("dragSession"),
				oDraggedControl = oDragSession.getDragControl(),
				aIndices = this._oDataTable.getSelectedIndices(),
				oSelectedPaths, aPathsData, aSelDemandGuid = [];

			oDragSession.setTextData("Hi I am dragging");
			//get all selected rows when checkboxes in table selected
			if (aIndices.length > 0) {
				oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, [aIndices[0]], true);
				aPathsData = oSelectedPaths.aPathsData;
			} else {
				//table tr single dragged element
				oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, [oDraggedControl.getIndex()], true);
				aPathsData = oSelectedPaths.aPathsData;
			}

			aPathsData.forEach(function (item) {
				aSelDemandGuid.push(item.sPath);
			});

			this.getModel("viewModel").setProperty("/gantDragSession", aSelDemandGuid);
			localStorage.setItem("Evo-Dmnd-guid", aSelDemandGuid);

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
		onDragEnd: function (oEvent) {
			this._deselectAll();
		},
		/**
		 * deselect all checkboxes in table
		 * @private
		 */
		_deselectAll: function () {
			this._oDataTable.clearSelection();
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
				// TODO comment
				localStorage.setItem("Evo-Action-page", "splitDemands");
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedPaths.aPathsData, false, this._mParameters);
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
				// TODO comment
				localStorage.setItem("Evo-Action-page", "splitDemands");
				this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedPaths.aPathsData, this._mParameters);
			} else {
				var msg = this.getResourceBundle().getText("ymsg.selectMinItem");
				MessageToast.show(msg);
			}
		},

		/**
		 * enable/disable buttons on footer when there is some/no selected rows
		 * @since 3.0
		 */
		onRowSelectionChange: function () {
			var selected = this._oDataTable.getSelectedIndices();
			if (selected.length > 0) {
				this.byId("assignButton").setEnabled(true);
				this.byId("changeStatusButton").setEnabled(true);
			} else {
				this.byId("assignButton").setEnabled(false);
				this.byId("changeStatusButton").setEnabled(false);
			}
		},
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
		/**
		 *  opens the action sheet
		 */
		openActionSheet: function (oEvent) {
			var oContext = oEvent.getSource().getParent().getParent().getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath();
			this.selectedDemandData = oModel.getProperty(sPath);
			this.getOwnerComponent().NavigationActionSheet.open(this.getView(), oEvent.getSource().getParent(), this.selectedDemandData);
		},
		/**
		 *	Navigates to evoOrder detail page with static url. 
		 */
		OnClickOrderId: function (oEvent) {
			var sOrderId = oEvent.getSource().getText();
			this.openEvoOrder(sOrderId);
		},

		onClickSplit: function (oEvent) {
			window.open("#Gantt/SplitDemands", "_blank");
		},

		/**
		 * Open the Qualification dialog for Gantt demand
		 * @param oEvent
		 */
		onDemandQualificationIconPress: function (oEvent) {
			var oRow = oEvent.getSource().getParent(),
				oContext = oRow.getBindingContext(),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				oResourceNode = oModel.getProperty(sPath),
				sDemandGuid = oResourceNode.Guid;
			this.getOwnerComponent().DemandQualifications.open(this.getView(), sDemandGuid);
		},
		/**
		 * Initialize the Gantt Demands Filter 
		 */
		initializeGanttDemandFilter: function () {
			if (!this._oGanttDemandFilter) {
				Fragment.load({
					name: "com.evorait.evoplan.view.gantt.fragments.GanttDemandFilter",
					controller: this
				}).then(function (oFilter) {
					this._oGanttDemandFilter = oFilter;
					this.getView().addDependent(this._oGanttDemandFilter);
					this._oGanttDemandFilter.addStyleClass(this.getOwnerComponent().getContentDensityClass());
				}.bind(this));
			} else {
				// if Gantt Demand filter is already initialize then applying the Filters from Demand View
				this.onGanttDemandFilterInitialized();
			}
		},
		/**
		 * Open the Gantt Demands Filter Dialog 
		 */
		onPressGanttFilters: function () {
			this._oGanttDemandFilter.open();
		},
		/**
		 * Applying the Filters from Demand View to Gantt Demand Table
		 */
		onGanttDemandFilterInitialized: function () {
			var oDemandFilter = this.getModel("viewModel").getProperty("/DemandFilters"),
				oGanttFilter = sap.ui.getCore().byId("listReportFilter");
			oGanttFilter.setFilterData(oDemandFilter);
			setTimeout(function () {
				this._oDataTable.getBinding("rows").filter(oGanttFilter.getFilters(), "Application");
			}.bind(this), 15);

		},
		/**
		 * Applying the Filters to Gantt Demand Table
		 */
		onGanttDemandFilterChange: function (oEvent) {
			var oGanttFilters = oEvent.getSource().getFilters();
			this._oDataTable.getBinding("rows").filter(oGanttFilters, "Application");
		},
		/**
		 * Close the Gantt Demands Filter Dialog 
		 */
		onCloseGanttFilter: function () {
			this._oGanttDemandFilter.close();
		},
		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshDemandGanttTable", this._refreshDemandTable, this);
		}

	});

});