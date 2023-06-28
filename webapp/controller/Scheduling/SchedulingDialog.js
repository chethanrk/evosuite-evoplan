sap.ui.define([
	"com/evorait/evoplan/controller/TemplateRenderController",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/OverrideExecution"
], function (TemplateRenderController, MessageBox, formatter, Constants, Fragment, OverrideExecution) {
	
	return TemplateRenderController.extend("com.evorait.evoplan.controller.Scheduling.SchedulingDialog", {

		/* =========================================================== */
		/* Public methods                                              */
		/* =========================================================== */
		_oViewModel: null,
		_component: null,
		_oView: null,
		_mParams: {},
		_oResourceBundle: null,
		_oModel: null,

		/**
		 * overwrite constructor
		 * set manuel owner component for nested xml views
		 */
		constructor: function (oComponent) {
			this.setOwnerComponent(oComponent);
			TemplateRenderController.apply(this, arguments);
		},


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
		openSchedulingDialog: function (oView, mParams) {
			this._oView = oView;
			this._mParams = mParams || {};
			this._component = this._oView.getController().getOwnerComponent();
			this._oModel = oView.getModel();

			this._initializeDialogModel();

			// create Dialog
			if (!this._ScheduleDialog) {
				this._ScheduleDialog = Fragment.load({
					name: "com.evorait.evoplan.view.Scheduling.SchedulingDialog",
					controller: this,
					type: "XML"
				}).then(function (oDialog) {
					oDialog.attachAfterOpen(this.onDialogAfterOpen, this);
					oView.addDependent(oDialog);
					this._renderWizardStep1Binding(oDialog);
					return oDialog;
				}.bind(this));
			}
			this._ScheduleDialog.then(function (oDialog) {
				oDialog.open();
			}.bind(this));
			
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
		 * set wizard content for step1 
		 * make difference between Auto and Re-Scheduling
		 * Based on schedule type another view gets rendered bei TemplateRenderer
		 * 
		 * In template views the Json model and path to Json data are set instead of an entitySet
		 * Table columns are rendered from EntitySet LineItems but Table data are from Json Model
		 * 
		 * @param {*} oDialog 
		 */
		_renderWizardStep1Binding: function(oDialog){
			var sPath = this.getEntityPath(this._mParams.entitySet, null, this._oView),
			sContainerId = "DateRangeStep";
			oDialog.setBusyIndicatorDelay(0);
			oDialog.setBusy(true);

			if (this._mParams.isAutoSchedule) {
				//sContainerId = "AutoScheduling-DemandTable";
				this._mParams.viewName = "com.evorait.evoplan.view.Scheduling.AutoScheduling.AutoScheduleStep1#AutoScheduleStep1";
				this._mParams.modelName = "viewModel";
				this._mParams.modelDataSetPath = "/Scheduling/AutoSchedule/DataSet";
			} else {
				//sContainerId = "ReScheduling-AssignmentTable";
				this._mParams.viewName = "com.evorait.evoplan.view.Scheduling.ReScheduling.ReScheduleStep1#ReScheduleStep1";
				this._mParams.modelName = "viewModel";
				this._mParams.modelDataSetPath = "/Scheduling/ReSchedule/DataSet";
			}

			this._oModel.metadataLoaded().then(function () {
				//get template and create views
				this._mParams.oView = this._oView;
				this.insertTemplateFragment(sPath, this._mParams.viewName, sContainerId, this._afterStep1RenderSuccess.bind(this, sPath), this._mParams);
			}.bind(this));
		},

		/**
		 * This below method is used to assign the initialize the model and assign 
		 * property binded to controls of the dialog box and wizard
		 */
		_initializeDialogModel: function () {
			this._ResourceModel = this._oView.getController().getModel("i18n").getResourceBundle();
			if(!this._oViewModel){
				this._oViewModel = this._oView.getModel("viewModel")
			}
			var sType = this._oViewModel.getProperty("/Scheduling/sType");
			this._mParams.isAutoSchedule = sType === Constants.SCHEDULING.AUTOSCHEDULING;
			this._mParams.isReschuduling = sType === Constants.SCHEDULING.RESCHEDULING;
			
			// setting the dialog title based on flag in viewMiodel
			let sDialogTitle = this._ResourceModel.getText("xtit.AutoscheduleDialogTitle");
			if(this._mParams.isReschuduling){
				sDialogTitle = this._ResourceModel.getText("xtit.RescheduleDialogTitle");
			}
			this._oViewModel.setProperty("/Scheduling/sScheduleDialogTitle", sDialogTitle);

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
						this._initializeDialogModel();
					}
				}.bind(this)
			});
		},
		/**
		 * After step1 template rendering was completed
		 * @param {*} oEvent 
		 */
		_afterStep1RenderSuccess: function(oEvent){
			console.log(oEvent);
		}

	});
});