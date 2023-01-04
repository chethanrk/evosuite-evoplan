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
			localStorage.setItem("Evo-Dmnd-guid", JSON.stringify(aSelectedDemandObject));
			localStorage.setItem("Evo-aPathsData", JSON.stringify(aPathsData));

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
			this._viewModel.setProperty("/dragSession", oSelectedPaths.aPathsData);

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
		onRowSelectionChange: function (oEvent) {
			var selected = this._oDataTable.getSelectedIndices(),
				iMaxRowSelection = this.oUserModel.getProperty("/DEFAULT_DEMAND_SELECT_ALL"),
				selected = this._oDataTable.getSelectedIndices(),
				bEnable = this._viewModel.getProperty("/validateIW32Auth"),
				index = oEvent.getParameter("rowIndex"),
				sDemandPath, bComponentExist;
			if (selected.length > 0 && selected.length <= iMaxRowSelection) {
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
				//If the selected demands exceeds more than the maintained selected configuration value
				if (iMaxRowSelection <= selected.length) {
					var sMsg = this.getResourceBundle().getText("ymsg.maxRowSelection", [iMaxRowSelection]);
					MessageToast.show(sMsg);
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
		 * Opens long text view/edit popover
		 * @param {sap.ui.base.Event} oEvent - press event for the long text button
		 */
		openLongTextPopover: function (oSource) {
			this.getOwnerComponent().longTextPopover.open(this.getView(), oSource);
		},
		/**
		 * handle message popover response to save data/ open longtext popover
		 * @param {sap.ui.base.Event} oEvent - press event for the long text button
		 */
		handleResponse: function (bResponse) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				oViewModel = this._viewModel,
				oModel = this.getModel(),
				bDemandEditMode = oViewModel.getProperty("/bDemandEditMode"),
				sDiscard = oResourceBundle.getText("xbut.discard&Nav"),
				sSave = oResourceBundle.getText("xbut.buttonSave");

			if (bResponse === sDiscard) {
				oModel.resetChanges();
				oViewModel.setProperty("/bDemandEditMode", false);
				this.getOwnerComponent().longTextPopover.open(this.getView(), this._oSource);
			} else if (bResponse === sSave) {
				oViewModel.setProperty("/bDemandEditMode", false);
				this.submitDemandTableChanges();
			}
		},
		/**
		 * on press order long text icon in Demand table
		 */
		onClickLongText: function (oEvent) {
			this._viewModel.setProperty("/isOpetationLongTextPressed", false);
			this.openLongTextPopover(oEvent.getSource());
		},
		/**
		 * on press operation long text icon in Demand table
		 */
		onClickOprationLongText: function (oEvent) {
			this._viewModel.setProperty("/isOpetationLongTextPressed", true);
			this.openLongTextPopover(oEvent.getSource());
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
				this._viewModel.setProperty("/Show_Assignment_Status_Button", true);
				this._viewModel.setProperty("/Disable_Assignment_Status_Button", false);
				this.getOwnerComponent().assignActionsDialog.open(this.getView(), aSelectedPaths, true, this._mParameters);
			} else {
				MessageToast.show(this.getResourceBundle().getText("ymsg.noAssignments"));
			}
		},

		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshDemandGanttTable", this._refreshDemandTable, this);
		}

	});

});