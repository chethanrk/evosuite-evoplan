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
		},
		/**
		 * check for unsaved data in Demand table
		 * on click on navigate acion navigate to Demand Detail Page
		 * modified method since 2201, by Rakesh Sahu
		 * @param oEvent
		 */
		_onActionPress: function (oEvent) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				oViewModel = this.getModel("viewModel"),
				oModel = this.getModel(),
				bDemandEditMode = oViewModel.getProperty("/bDemandEditMode");

			this.oRow = oEvent.getParameter("row");

			if (bDemandEditMode && oModel.hasPendingChanges()) {
				this.showDemandEditModeWarningMessage().then(function (bResponse) {
					var sDiscard = oResourceBundle.getText("xbut.discard&Nav"),
						sSave = oResourceBundle.getText("xbut.buttonSave");

					if (bResponse === sDiscard) {
						oModel.resetChanges();
						oViewModel.setProperty("/bDemandEditMode", false);
						this._navToDetail(null, this.oRow);
					} else
					if (bResponse === sSave) {
						oViewModel.setProperty("/bDemandEditMode", false);
						this.submitDemandTableChanges();
					}
				}.bind(this));

			} else {
				if (bDemandEditMode) {
					oViewModel.setProperty("/bDemandEditMode", false);
				}
				this._navToDetail(oEvent);
			}
		},
		/**
		 * navigation to demand detail page
		 * added method since 2201, by Rakesh Sahu
		 * @param oEvent
		 * @param oRow
		 */
		_navToDetail: function (oEvent, oRow) {
			oRow = oRow ? oRow : oEvent.getParameter("row");
			var oRouter = this.getRouter(),
				oContext = oRow.getBindingContext(),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				oData = oModel.getProperty(sPath),
				oUserDetail = this.getModel("appView");
				this.getModel("viewModel").setProperty("/Disable_Assignment_Status_Button", false);
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
				oSelectedPaths, aPathsData, aSelDemandGuid = [],
				aSelectedDemandObject = [];

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
				aSelectedDemandObject.push({
					sPath: item.sPath,
					oDemandObject: item.oData
				});
			});

			this.getModel("viewModel").setProperty("/gantDragSession", aSelDemandGuid);
			this.getModel("viewModel").setProperty("/dragSession", aPathsData);
			localStorage.setItem("Evo-Dmnd-guid", JSON.stringify(aSelectedDemandObject));

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
			this.getModel("viewModel").setProperty("/dragSession", oSelectedPaths.aPathsData);

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
			var iMaxRowSelection = this.getModel("user").getProperty("/DEFAULT_DEMAND_SELECT_ALL");
			var selected = this._oDataTable.getSelectedIndices(),
				sDemandPath, bComponentExist;
			if (selected.length > 0 && selected.length <= iMaxRowSelection) {
				this.byId("assignButton").setEnabled(true);
				this.byId("changeStatusButton").setEnabled(true);
				this.byId("idAssignmentStatusButton").setEnabled(true);
				this.byId("idOverallStatusButton").setEnabled(true);
				this.byId("idUnassignButton").setEnabled(true);
			} else {
				this.byId("assignButton").setEnabled(false);
				this.byId("changeStatusButton").setEnabled(false);
				this.byId("idAssignmentStatusButton").setEnabled(false);
				this.byId("idOverallStatusButton").setEnabled(false);
				this.byId("materialInfo").setEnabled(false);
				this.byId("idUnassignButton").setEnabled(false);
				//If the selected demands exceeds more than the maintained selected configuration value
				if (iMaxRowSelection <= selected.length) {
					var sMsg = this.getResourceBundle().getText("ymsg.maxRowSelection");
					MessageToast.show(sMsg + " " + iMaxRowSelection);
				}
			}
			//Enabling/Disabling the Material Status Button based on Component_Exit flag
			for (var i = 0; i < selected.length; i++) {
				sDemandPath = this._oDataTable.getContextByIndex(selected[i]).getPath();
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

		/**
		 * Open's assignments list
		 * 
		 */
		onClickAssignCount: function (oEvent) {
			this.getOwnerComponent().assignmentList.open(this.getView(), oEvent, this._mParameters);
		},
		/**
		 * On Material Info Button press event 
		 * 
		 */
		onMaterialInfoButtonPress: function () {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			if (this._aSelectedRowsIdx.length > 100) {
				this._aSelectedRowsIdx.length = 100;
			}
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);
			var iMaxSelcRow = this.getModel("user").getProperty("/DEFAULT_MAX_DEM_SEL_MAT_LIST");
			if (oSelectedPaths.aPathsData.length > 0 && iMaxSelcRow >= this._aSelectedRowsIdx.length) {
				this.getOwnerComponent().materialInfoDialog.open(this.getView(), false, oSelectedPaths.aPathsData);
			} else {
				var msg = this.getResourceBundle().getText("ymsg.selectMaxItemMaterialInfo");
				MessageToast.show(msg + " " + iMaxSelcRow);
			}
		},
		/**
		 * On Refresh Status Button press in Demand Table 
		 * 
		 */
		onMaterialStatusPress: function (oEvent) {
			var oSelectedIndices = this._oDataTable.getSelectedIndices(),
				oViewModel = this.getModel("appView"),
				sDemandPath;
			oViewModel.setProperty("/busy", true);
			for (var i = 0; i < oSelectedIndices.length; i++) {
				sDemandPath = this._oDataTable.getContextByIndex(oSelectedIndices[i]).getPath();
				this.getOwnerComponent()._getData(sDemandPath).then(function (result) {
					oViewModel.setProperty("/busy", false);
				}.bind(this));
			}
		},

		/**
		 * Opens long text view/edit popover
		 * @param {sap.ui.base.Event} oEvent - press event for the long text button
		 */
		onClickLongText: function (oEvent) {
			this.getModel("viewModel").setProperty("/isOpetationLongTextPressed", false);
			this.getOwnerComponent().longTextPopover.open(this.getView(), oEvent);
		},
		onClickOprationLongText: function (oEvent) {
			this.getModel("viewModel").setProperty("/isOpetationLongTextPressed", true);
			this.getOwnerComponent().longTextPopover.open(this.getView(), oEvent);
		},

		/**
		 * on press unassign button in Demand Table header
		 */
		onPressUnassignDemand: function () {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, true);
			if (oSelectedPaths.aUnAssignDemands.length > 0) {
				this.getOwnerComponent().assignActionsDialog.open(this.getView(), oSelectedPaths, true, this._mParameters);
			} else {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
			}
		},

		/**
		 * On Press of Change Assignment Status Button
		 * Since 2205
		 * @Author Chethan RK
		 */
		onAssignmentStatusButtonPress: function () {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			var aSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx);
			if (aSelectedPaths.aAssignmentDemands.length > 0) {
				this.getModel("viewModel").setProperty("/Show_Assignment_Status_Button", true);
				this.getModel("viewModel").setProperty("/Disable_Assignment_Status_Button", false);
				this.getOwnerComponent().assignActionsDialog.open(this.getView(), aSelectedPaths, true, this._mParameters);
			} else {
				sap.m.MessageToast.show(this.getResourceBundle().getText("ymsg.noAssignments"));
			}
		},

		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshDemandGanttTable", this._refreshDemandTable, this);
		}

	});

});