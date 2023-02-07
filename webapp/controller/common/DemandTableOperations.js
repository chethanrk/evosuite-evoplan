sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/OverrideExecution"
], function (BaseController, MessageBox, formatter, Constants, Fragment, OverrideExecution) {

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
				}
			}
		},

		/**
		 * open change status dialog
		 * @param oEvent
		 */
		onChangeStatusButtonPress: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();

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
		 * On Drag end check for dropped control, If dropped control not found
		 * then make reset the selection
		 * @param oEvent
		 */
		onDragEnd: function (oEvent) {
			this._deselectAll();
		},

		/**
		 *	Navigates to evoOrder detail page with static url.
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
		 */
		onAssignmentStatusButtonPress: function () {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			var aSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx);
			if (aSelectedPaths.aAssignmentDemands.length > 0) {
				this._viewModel.setProperty("/Show_Assignment_Status_Button", true);
				this._viewModel.setProperty("/Disable_Assignment_Status_Button", false);
				this.getOwnerComponent().assignActionsDialog.open(this.getView(), aSelectedPaths, true, this._mParameters);
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
		 * @param {sap.ui.base.Event} oEvent - press event for the long text button
		 */
		handleResponse: function (bResponse) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				oViewModel = this.getModel("viewModel"),
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

		/* =========================================================== */
		/* Private methods                                             */
		/* =========================================================== */
	
		/**
		 * On Open change status dialog after validating all conditions in all the views
		 */
		_proceedToChangeStatus: function () {
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);
			if (this._aSelectedRowsIdx.length > 0) {
				if (this._mParameters.bFromNewGantt) {
					this.localStorage.put("Evo-Action-page", "splitDemands");
				}
				this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedPaths.aPathsData, this._mParameters);
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
			if (this._mParameters && this._mParameters.bFromMap) {
				this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not
			}
			this._oDataTable.clearSelection();
		},
		
		/**
		 * Opens long text view/edit popover
		 * @param {sap.ui.base.Event} oEvent - press event for the long text button
		 */
		_openLongTextPopover: function (oSource) {
			this.getOwnerComponent().longTextPopover.open(this.getView(), oSource);
		},

	});
});