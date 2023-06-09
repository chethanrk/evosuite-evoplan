sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/m/MessageToast",
	'sap/ui/model/json/JSONModel',
], function (BaseController, MessageBox, formatter, Constants, Fragment, OverrideExecution, MessageToast, JSONModel) {
	
	return BaseController.extend("com.evorait.evoplan.controller.Scheduling.SchedulingDialog", {

		/* =========================================================== */
		/* Public methods                                              */
		/* =========================================================== */

		init: function () {
			
		},
		/**
		 * This method is used to open the dialog box
		 * @param oView source view
		 */

		/**
		 * This method is used to open the dialog box and call the 
		 * relevant methods post that.
		 */
		openSchedulingDialog: function (oView) {
			this._oView=oView;
			this._InitializeDialogModel();
			// create Dialog
			if (!this._ScheduleDialog) {
				this._ScheduleDialog = Fragment.load({
					id: oView.getId(),
					name: "com.evorait.evoplan.view.Scheduling.SchedulingDialog",
					controller: this
				}).then(function (oDialog) {
					oDialog.attachAfterOpen(this.onDialogAfterOpen, this);
					oView.addDependent(oDialog);
					return oDialog;
				}.bind(this));
			}
			this._ScheduleDialog.then(function (oDialog) {
				oDialog.open();
			});
			
		},
		/**
		 * This method is used to set properties once the 
		 * dialog has been opened.
		 */
		onDialogAfterOpen: function () {
			this._oWizard = this._oView.byId("WizardScheduling");
			this._iSelectedStepIndex = 0;
			this._oSelectedStep = this._oWizard.getSteps()[this._iSelectedStepIndex];
			// set busy indicator
			this._handleButtonsVisibility();
		},
		/**
		 * This method is used to handle the press event of 
		 * Next button in the dialog box
		 */
		onDialogNextButton: function () {
			this._iSelectedStepIndex = this._oWizard.getSteps().indexOf(this._oSelectedStep);
			var oNextStep = this._oWizard.getSteps()[this._iSelectedStepIndex + 1];

			if (this._oSelectedStep && !this._oSelectedStep.bLast) {
				this._oWizard.goToStep(oNextStep, true);
			} else {
				this._oWizard.nextStep();
			}

			this._iSelectedStepIndex++;
			this._oSelectedStep = oNextStep;

			this._handleButtonsVisibility();
		},
		/**
		 * This method is used to handle the press event of 
		 * back button in the dialog box
		 */
		onDialogBackButton: function () {
			this._iSelectedStepIndex = this._oWizard.getSteps().indexOf(this._oSelectedStep);
			var oPreviousStep = this._oWizard.getSteps()[this._iSelectedStepIndex - 1];

			if (this._oSelectedStep) {
				this._oWizard.goToStep(oPreviousStep, true);
			} else {
				this._oWizard.previousStep();
			}

			this._iSelectedStepIndex--;
			this._oSelectedStep = oPreviousStep;

			this._handleButtonsVisibility();
		},
		/**
		 * Tis method is used to handle the activation/validation of the 
		 * first step of the wizard.
		 */
		additionalInfoValidation: function () {
			// to be added code later;
		},
		/**
		 * Tis method is used to handle the activation/validation of the 
		 * second step of the wizard.
		 */
		optionalStepActivation: function () {
			// to be added code later;
		},
		/**
		 * This method is used to handle press event of the cancel button 
		 * in the dialog
		 */
		handleWizardCancel: function () {
			var sMessage = this._ResourceModel.getText("ymsg.CancelOfReSecheduling");
			this._handleMessageBoxOpen(sMessage, "warning");
		},
		/**
		 * Tis method is used to handle press event of the subnut button 
		 * in the dialog
		 */
		handleWizardSubmit: function () {
			var sMessage = this._ResourceModel.getText("ymsg.SubmitOfReSecheduling");
			this._handleMessageBoxOpen(sMessage, "confirm");
		},

		/* =========================================================== */
		/* Private methods                                              */
		/* =========================================================== */

		/**
		 * This below method is used to assign the initialize the model and assign 
		 * property binded to controls of the dialog box and wizard
		 */
		_InitializeDialogModel: function () {
			this._ResourceModel = this._oView.getController().getModel("i18n").getResourceBundle();
			if(!this._oViewModel){
				this._oViewModel = this._oView.getModel("viewModel")
			}
			var oData = {
				bBackButtonVisible: false,
				bNextButtonVisible: true,
				bFinishButtonVisible: false
			};
			var oInitialModelState = Object.assign({}, oData);
			this._oViewModel.setProperty("/Scheduling/SchedulingDialogFlags",oInitialModelState);
		},
		/**
		 * This method is used to handle the button visibility/invisibility
		 * based on selection of wizard sectopm in the footer of the dialog
		 */
		_handleButtonsVisibility: function () {
			var oModel = this._oViewModel;
			switch (this._iSelectedStepIndex) {
				case 0:
					oModel.setProperty("/Scheduling/SchedulingDialogFlags/bNextButtonVisible", true);
					oModel.setProperty("/Scheduling/SchedulingDialogFlags/bBackButtonVisible", false);
					oModel.setProperty("/Scheduling/SchedulingDialogFlags/bFinishButtonVisible", false);
					break;
				case 1:
					oModel.setProperty("/Scheduling/SchedulingDialogFlags/bNextButtonVisible", false);
					oModel.setProperty("/Scheduling/SchedulingDialogFlags/bFinishButtonVisible", true);
					oModel.setProperty("/Scheduling/SchedulingDialogFlags/bBackButtonVisible", true);
					break;
				default: break;
			}
			oModel.refresh();

		},
		/**
		 * This method used to handle the open of the message box.
		 */
		_handleMessageBoxOpen: function (sMessage, sMessageBoxType) {
			// later to be replaced with the generic method based on avaiability in base controller.
			MessageBox[sMessageBoxType](sMessage, {
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.YES) {
						this._oWizard.discardProgress(this._oWizard.getSteps()[0]);
						this._oView.byId("SchedulingDialog").close();
						this._InitializeDialogModel();
					}
				}.bind(this)
			});
		},


	});
});