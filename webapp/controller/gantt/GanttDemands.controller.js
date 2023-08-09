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
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/controller/scheduling/SchedulingActions"
], function (AssignmentsController, JSONModel, formatter, ganttFormatter, Filter, FilterOperator, MessageToast, RowAction, RowActionItem,
	Constants, Fragment, SchedulingActions) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.gantt.GanttDemands", {

		formatter: formatter,
		oSchedulingActions: undefined,

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
			this._oRouter = this.getRouter();
			if (this.oAppModel.getProperty("/currentRoute") === "splitDemands") {
				this._mParameters = {
					bFromDemandSplit: true
				};
			}
			this._oEventBus = sap.ui.getCore().getEventBus();

			this._oEventBus.subscribe("BaseController", "refreshDemandGanttTable", this._refreshDemandTable, this);

			this._oDemandsViewPage = this.byId("draggableList");
			this._oToolsViewPage = this.byId("idToolsTable");
			this._oDataTable = this._oDemandsViewPage.getTable();
			this._oRouter.getRoute("splitDemands").attachMatched(function () {
				this._routeName = Constants.GANTT.SPLITDMD;
				this._viewModel.setProperty("/PRT/bIsGantt", true);
				this._mParameters = {
					bFromDemandSplit: true
				};
			}.bind(this));
			this._oRouter.getRoute("newgantt").attachPatternMatched(function () {
				this._routeName = "newgantt";
				this._mParameters = {
					bFromNewGantt: true
				};
				this._viewModel.setProperty("/PRT/bIsGantt", true);
				this._viewModel.setProperty("/PRT/btnSelectedKey", "demands");
			}.bind(this));
			this._setRowActionTemplate(this._oDataTable, onClickNavigation, openActionSheet);

			//to initialize Gantt Demand Filter Dialog
			this._oGanttDemandFilter = this.getView().byId("idGanttDemandFilterDialog");
			this._oGanttDemandFilter.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			this._aSelectedIndices = [];
			// add binging change event forthe demands table
			this._addDemandTblBindingChangeEvent();
			this.oSchedulingActions = new SchedulingActions(this);
			this._oEventBus.subscribe("DemandTableOperation", "clearDemandsSelection", this.clearDemandsSelection, this);

		},

		/**
		 * on page exit
		 */
		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshDemandGanttTable", this._refreshDemandTable, this);
			this._oEventBus.unsubscribe("DemandTableOperation", "clearDemandsSelection", this.clearDemandsSelection, this);
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
			this.localStorage.put("Evo-toolDrag", "");

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
		/**
		 * enable/disable buttons on footer when there is some/no selected rows
		 * @param oEvent
		 * @since 3.0
		 */
		onRowSelectionChange: function (oEvent) {
			var selected = this._oDataTable.getSelectedIndices(),
				iMaxRowSelection = this.oUserModel.getProperty("/DEFAULT_DEMAND_SELECT_ALL"),
				bEnable = this._viewModel.getProperty("/validateIW32Auth"),
				index = oEvent.getParameter("rowIndex"),
				sDemandPath, bComponentExist, sMsg,
				oViewModel=this.getModel("viewModel");

			this._aSelectedRowsIdx = _.clone(selected);
			if (this._aSelectedRowsIdx.length > 0) {
				this._aSelectedRowsIdx.length = this._aSelectedRowsIdx.length > 0 && this._aSelectedRowsIdx.length <= iMaxRowSelection ? this._aSelectedRowsIdx
					.length : iMaxRowSelection;
			}
			if (this._aSelectedRowsIdx.length > 0 && this._aSelectedRowsIdx.length <= iMaxRowSelection) {
				this.byId("assignButton").setEnabled(bEnable);
				this.byId("changeStatusButton").setEnabled(bEnable);
				this.byId("idUnassignButton").setEnabled(bEnable);
				this.byId("idAssignmentStatusButton").setEnabled(bEnable);
				this.byId("idOverallStatusButton").setEnabled(true);
			} else {
				this.byId("assignButton").setEnabled(false);
				this.byId("changeStatusButton").setEnabled(false);
				this.byId("idAssignmentStatusButton").setEnabled(false);
				this.byId("idOverallStatusButton").setEnabled(false);
				this.byId("materialInfo").setEnabled(false);
				this.byId("idUnassignButton").setEnabled(false);
			}

			//If the selected demands exceeds more than the maintained selected configuration value
			if (oEvent.getParameter("selectAll")) {
				sMsg = this.getResourceBundle().getText("ymsg.allSelect", [this._aSelectedRowsIdx.length]);
				this.showMessageToast(sMsg);
			} else if (iMaxRowSelection <= this._aSelectedRowsIdx.length) {
				sMsg = this.getResourceBundle().getText("ymsg.maxRowSelection", [iMaxRowSelection]);
				this.showMessageToast(sMsg);
			}

			//Enabling/Disabling the Material Status Button based on Component_Exit flag
			for (var i = 0; i < this._aSelectedRowsIdx.length; i++) {
				sDemandPath = this._oDataTable.getContextByIndex(this._aSelectedRowsIdx[i]).getPath();
				bComponentExist = this.getModel().getProperty(sDemandPath + "/COMPONENT_EXISTS");
				if (bComponentExist) {
					this.byId("materialInfo").setEnabled(true);
					this.byId("idOverallStatusButton").setEnabled(true);
					break;
				} else {
					this.byId("materialInfo").setEnabled(false);
					this.byId("idOverallStatusButton").setEnabled(false);
				}
			}

			// To get sequence of selection 
			if (oEvent.getParameter("selectAll")) {
				this._aSelectedIndices = oEvent.getParameter("rowIndices");
			} else if (oEvent.getParameter("rowIndex") === -1) {
				this._aSelectedIndices = [];
			} else {
				if (!this._aSelectedIndices.includes(index)) {
					this._aSelectedIndices.push(index);
				} else {
					this._aSelectedIndices.splice(this._aSelectedIndices.indexOf(index), 1);
				}
			}

			//Enabling or disabling Re-Schedule button based on status and flag
			if (this._aSelectedRowsIdx && this._aSelectedRowsIdx.length > 0) {
				oViewModel.setProperty("/Scheduling/selectedDemandPath", this._oDataTable.getContextByIndex(this._aSelectedRowsIdx[0]).getPath());
			} else {
				oViewModel.setProperty("/Scheduling/selectedDemandPath", null);
			}
			oViewModel.setProperty("/Scheduling/aSelectedDemandPath",this._aSelectedRowsIdx);
			this.oSchedulingActions.validateScheduleButtons();
			this.oSchedulingActions.validateReScheduleButton();
		},
		onPressFilterGantChart: function () {
			var aPplicationFilters = this.getView().byId("draggableList").getTable().getBinding("rows").aApplicationFilters;
			var aFilters = [];
			this.getOwnerComponent().readData("/DemandSet", aPplicationFilters, "$select=Guid").then(function (data) {
				for (var x in data["results"]) {
					aFilters.push(new Filter("DemandGuid", FilterOperator.EQ, data["results"][x]["Guid"]));
				}
				this._oEventBus.publish("BaseController", "refreshFullGantt", aFilters);
				var sMsg = this.getResourceBundle().getText("msg.filterGanttSave");
				this.showMessageToast(sMsg);
			}.bind(this));
		},
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
		 *On Change filters event in the Gantt Demands Filter Dialog 
		 */
		onGanttDemandFilterChange: function (oEvent) {
			var oView = this.getView(),
				oResourceBundle = oView.getModel("i18n").getResourceBundle(),
				oViewModel = oView.getModel("viewModel"),
				sFilterText = oResourceBundle.getText("xbut.filters"),
				sFilterCount = Object.keys(oEvent.getSource().getFilterData()).length;
			if (sFilterCount > 0) {
				oViewModel.setProperty("/aFilterBtntextGanttDemandTbl", sFilterText + "(" + sFilterCount + ")");
			} else {
				oViewModel.setProperty("/aFilterBtntextGanttDemandTbl", sFilterText);
			}
		},
		/**
		 * Close the Gantt Demands Filter Dialog 
		 */
		onCloseGanttFilter: function () {
			this._oGanttDemandFilter.close();
		},

		/**
		 * Event handler to switch between Demand and Tool list
		 * @param oEvent
		 */
		handleViewSelectionChange: function (oEvent) {
			this.getOwnerComponent().bIsFromPRTSwitch = true;
			var sSelectedKey = this._viewModel.getProperty("/PRT/btnSelectedKey");
			if (sSelectedKey === "tools" && this._mParameters.bFromNewGantt) {
				this._oRouter.navTo("ganttTools", {});
			} else if (sSelectedKey === "tools" && this._mParameters.bFromDemandSplit) {
				this._oRouter.navTo("GanttSplitTools", {});
			} else {
				this._oRouter.navTo("newgantt", {});
			}
		},

		/**
		 * On press of auto-schedule button
		 * Function to handle press event Plan Demands
		 * @param {sap.ui.base.Event} oEvent - press event for auto schedule button
		 */
		onAutoscheduleButtonPress: function (oEvent) {
			this.oSchedulingActions.validateSelectedDemands(this._oDataTable, this._aSelectedRowsIdx);
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
				this._oDemandsViewPage.rebindTable();
			}
			this._bLoaded = true;
		},

		/**
		 * This method is trigerred on refresh of the binding of the table
		 * @Author Manik
		 */
		_addDemandTblBindingChangeEvent: function () {
			/*Here we are checking if the demands table binding change
				is due to  the applied flter based on that we have written logic to 
				enable to disable the filter gantt button(in table toolbar)
			*/
			var oTable = this._oDataTable,
				oViewModel = this._viewModel; //Get hold of Table
			oTable.addEventDelegate({ //Table onAfterRendering event
				onAfterRendering: function () {
					if (this.getBinding("rows")) {
						this.getBinding("rows").attachChange(function (oEvent) {
							if (oEvent.getParameter("reason") === "filter") {
								if (oEvent.getSource().aApplicationFilters.length > 0) {
									oViewModel.setProperty("/bFilterGantBtnDemandtsGantt", true);
								} else {
									oViewModel.setProperty("/bFilterGantBtnDemandtsGantt", false);
								}
							}
						});
					}
				}
			}, oTable);
		}

	});

});