sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/controller/scheduling/SchedulingActions",
	"com/evorait/evoplan/controller/prt/PRTActions",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/OverrideExecution"
], function (BaseController, SchedulingActions, PRTActions, MessageBox, formatter, Constants, Fragment, OverrideExecution) {

	return BaseController.extend("com.evorait.evoplan.controller.common.DemandTableOperations", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			// lyfecycle methods are not mentioned in methods list. They always have dafault properties
			methods: {
				onChangeStatusButtonPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onDragEnd: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				OnClickOrderId: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onClickAssignCount: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onClickLongText: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onClickOprationLongText: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onDemandQualificationIconPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onPressUnassignDemand: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onAssignmentStatusButtonPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				openActionSheet: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				handleResponse: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onRescheduleButtonPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onAutoscheduleButtonPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				}
			}
		},

		oSchedulingActions: undefined,
		oPRTActions: undefined,

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 **/
		onInit: function () {
			this.oSchedulingActions = new SchedulingActions(this);
			this.oPRTActions = new PRTActions(this);
			this._viewModel = this.getModel("viewModel");
			this._appViewModel = this.getModel("appView");
		},
		/**
		 * open change status dialog
		 * @param oEvent
		 */
		onChangeStatusButtonPress: function (oEvent) {
			//checking if the status button is pressed in the map view
			if (this._mParameters.bFromMap) {
				var sParentId = oEvent.getSource().getParent().getId();
				if (sParentId.includes("menu")) {
					//Operation performed from Spot context Menu
					var oModel = this.getModel(),
						sPath = this.selectedDemandPath,
						oData = oModel.getProperty(sPath),
						oSelectedData = [{
							sPath: sPath,
							oData: oData
						}];
					this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedData, this._mParameters);
				} else {
					this._proceedToChangeStatus();
				}
			} else {
				this._proceedToChangeStatus();
			}
		},

		/**
		 * Called on rebind demand smart table 
		 * to set batch Group ID to binding params to separate batch calls
		 * @param oEvent
		 */
		onBeforeRebindDemandTable: function (oEvent) {
			var oParams = oEvent.getParameter("bindingParams");
			oParams.parameters.batchGroupId = "DemandBatch";
		},

		/**
		 * On Drag end check for dropped control, If dropped control not found
		 * then make reset the selection
		 */
		onDragEnd: function () {
			this._deselectAll();
		},

		/**
		 *	Navigates to evoOrder detail page with static url.
		 * @param oEvent
		 */
		OnClickOrderId: function (oEvent) {
			var sOrderId = oEvent.getSource().getText();
			this.openEvoOrder(sOrderId);
		},

		/**
		 * Open's assignments list
		 * @param oEvent
		 */
		onClickAssignCount: function (oEvent) {
			this.getOwnerComponent().assignmentList.open(this.getView(), oEvent, this._mParameters);
		},

		/**
		 * on press order long text icon in Demand table
		 * @param oEvent
		 */
		onClickLongText: function (oEvent) {
			this._viewModel.setProperty("/isOpetationLongTextPressed", false);
			this._openLongTextPopover(oEvent.getSource());
		},

		/**
		 * on press operation long text icon in Demand table
		 * @param oEvent
		 */
		onClickOprationLongText: function (oEvent) {
			this._viewModel.setProperty("/isOpetationLongTextPressed", true);
			this._openLongTextPopover(oEvent.getSource());
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
		 * on press unassign button in footer
		 */
		onPressUnassignDemand: function () {
			var oSelectedPaths = this.getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, true);
			//checking if the selected demands have any unassignable demands or not
			if (oSelectedPaths.aUnAssignDemands.length > 0) {
				this.getOwnerComponent().assignActionsDialog.open(this.getView(), oSelectedPaths, true, this._mParameters);
				//showing the error message along with displaying non assignable data
			} else {
				this.showAssignErrorDialog(oSelectedPaths.aNonAssignable);
			}
		},

		/**
		 * On Press of Change Assignment Status Button
		 * Since 2205
		 */
		onAssignmentStatusButtonPress: function () {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			var aSelectedPaths = this.getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx);
			//checking if the selected demands have any assignment or not
			if (aSelectedPaths.aAssignmentDemands.length > 0) {
				this._viewModel.setProperty("/Show_Assignment_Status_Button", true);
				this._viewModel.setProperty("/Disable_Assignment_Status_Button", false);
				this.getOwnerComponent().assignActionsDialog.open(this.getView(), aSelectedPaths, true, this._mParameters);
				//showing a message toast if there are no assignments
			} else {
				this.showMessageToast(this.getResourceBundle().getText("ymsg.noAssignments"));
			}
		},

		/**
		 * Opens the popup containing button to nav to Evo Order App
		 * @param oEvent
		 */
		openActionSheet: function (oEvent) {
			var oContext = oEvent.getSource().getParent().getParent().getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath();
			this.selectedDemandData = oModel.getProperty(sPath);
			this.getOwnerComponent().NavigationActionSheet.open(this.getView(), oEvent.getSource().getParent(), this.selectedDemandData);
		},

		/**
		 * handle message popover response to save data/ open longtext popover
		 * @param {sap.ui.base.Event} bResponse - press event for the long text button
		 */
		handleResponse: function (bResponse) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				oModel = this.getModel(),
				sDiscard = oResourceBundle.getText("xbut.discard&Nav"),
				sSave = oResourceBundle.getText("xbut.buttonSave");

			//checking if the response is to discard then resetting the changes
			if (bResponse === sDiscard) {
				oModel.resetChanges();
				this._viewModel.setProperty("/bDemandEditMode", false);
				this.getOwnerComponent().longTextPopover.open(this.getView(), this._oSource);
				//if save is pressed then submiting the table changes
			} else if (bResponse === sSave) {
				this._viewModel.setProperty("/bDemandEditMode", false);
				this.submitDemandTableChanges();
			}
		},

		/**
		 * On press of auto-schedule button
		 * Since 2309
		 */
		onAutoscheduleButtonPress: function () {
			this._viewModel.setProperty("/Scheduling/bSchedBtnBusy", true);
			this._viewModel.setProperty("/Scheduling/sScheduleType", "A");

			//incase all the selected demands are invalid then the selections are cleared and the message toast will be displayed
			if (!this.oSchedulingActions.validateScheduleAfterPress()) {
				this._viewModel.setProperty("/Scheduling/bSchedBtnBusy", false);
				return;
			}
			this.oSchedulingActions.validateSelectedDemands(this._oDataTable, this._aSelectedRowsIdx);
		},

		/**
		 * On press of reschedule button
		 * since 2309
		 */
		onRescheduleButtonPress: function () {
			var oMsgParam = {};
			this._viewModel.setProperty("/Scheduling/bReSchedBtnBusy", true);
			this._viewModel.setProperty("/Scheduling/sScheduleType", "R");
			this._viewModel.setProperty("/busy", true);
			//incase the selected demand is invalid then the selection is cleared and the message toast will be displayed
			if (!this.oSchedulingActions.validateReScheduleAfterPress()) {
				this._viewModel.setProperty("/Scheduling/bReSchedBtnBusy", false);
				this._appViewModel.setProperty("/busy", false);
				return;
			}
			this.oSchedulingActions.checkDuplicateResource().then(function (oResult) {
				//calling below method to check if the resource is already assigned or not
				return this.fnCheckReturnedDuplicates(oResult);
			}.bind(this)).then(function (oResult) {
				//below method is to fetch the assignment id required for rescheduling
				return this.fnFetchAssignmentIdForReschedule(oResult);
			}.bind(this)).then(function (bParam) {
				//check if the valid assignment exists
				if (bParam) {
					var mParams = {
						entitySet: "DemandSet"
					};
					this.getOwnerComponent().SchedulingDialog.openSchedulingDialog(this.getView(), mParams, oMsgParam, this.oSchedulingActions);
				}
				this._viewModel.setProperty("/Scheduling/bReSchedBtnBusy", false);
				this._appViewModel.setProperty("/busy", false);

			}.bind(this));

		},

		/**
		 * This method is used to clear the selections of the demands table in
		 * Demands, NewGantt and Maps view.
		 */
		clearDemandsSelection: function () {
			this._oDataTable.clearSelection();
		},

		/**
		 * @param {Object} oResult - contains the results returned from checkDuplicateResource promise
		 * @returns {Boolean} false if duplicate resource exists else return true
		 * currently we are allowing demand to be re-assigned to the same resource using ReSchedule as planning can be done for different timings
		 */
		fnCheckReturnedDuplicates: function (oResult) {
			var oMsgParam = {},
				oResourceBundle = this.getResourceBundle();
			//if no duplicate resource then check the assigned resources
			if (oResult.bNoDuplicate) {
				this._appViewModel.setProperty("/busy", true);
				oMsgParam.bIsPoolExist = oResult.bIsPoolExist;
				oMsgParam.sPoolNames = oResult.poolResource;
				//calling function to check if the demand already is assigned to one of the selected resource
				this.oSchedulingActions.checkAssignedResource();
				return {
					bNotAssigned: true
				};
				//display the error message along with the duplicate resource names
			} else {
				this._showErrorMessage(oResourceBundle.getText("ymsg.DuplicateResource", oResult.resourceNames));
				this._viewModel.setProperty("/Scheduling/bReSchedBtnBusy", false);
				this._appViewModel.setProperty("/busy", false);
				return false;
			}
		},

		/**
		 * 
		 * @param {Object} oResult - contains the results returned from fnCheckReturnedDuplicates promise
		 * @returns {Boolean} true if assignment Id is found
		 */
		fnFetchAssignmentIdForReschedule: function (oResult) {
			var aDemandList = [],
				oDataModel = this.getModel(),
				sPath = this._viewModel.getProperty("/Scheduling/selectedDemandPath");
			//always allowed as currently we are allowing the demands to be r-assigned to the same resource for some other time or date
			if (oResult.bNotAssigned) {
				aDemandList = [{
					sPath: sPath,
					oData: oDataModel.getProperty(sPath)
				}];
				this._viewModel.setProperty("/Scheduling/demandList", aDemandList);
				this._viewModel.setProperty("/Scheduling/sType", Constants.SCHEDULING.RESCHEDULING);
				// calling below method to get the assignment id for the resource so that 
				return this.oSchedulingActions.getAssignmentIdForReschedule();
			}
		},

		/* =========================================================== */
		/* Private methods                                             */
		/* =========================================================== */

		/**
		 * On Open change status dialog after validating all conditions in all the views
		 */
		_proceedToChangeStatus: function () {
			var oSelectedPaths = this.getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);
			//check if atleast one item is selected or not
			if (this._aSelectedRowsIdx.length > 0) {
				//adding a paramter into localStorage in case it is from New Gantt. It is being used in websocket.js
				if (this._mParameters.bFromNewGantt) {
					this.localStorage.put("Evo-Action-page", "splitDemands");
				}
				this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedPaths.aPathsData, this._mParameters);
				//show a validation to select minimum one item
			} else {
				var msg = this.getResourceBundle().getText("ymsg.selectMinItem");
				this.showMessageToast(msg);
			}
		},

		/**
		 * deselect all checkboxes in table
		 * @private
		 */
		_deselectAll: function () {
			//check if the event is triggered from map and set a flag in case it does
			if (this._mParameters && this._mParameters.bFromMap) {
				//Flag to identify Demand List row is selected and scrolled or not
				this._bDemandListScroll = false;
			}
			this._oDataTable.clearSelection();
		},

		/**
		 * Opens long text view/edit popover
		 * @param {sap.ui.base.Event} oSource - press event for the long text button
		 */
		_openLongTextPopover: function (oSource) {
			this.getOwnerComponent().longTextPopover.open(this.getView(), oSource);
		}

	});
});