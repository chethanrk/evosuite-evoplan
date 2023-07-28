sap.ui.define([
	"com/evorait/evoplan/controller/TemplateRenderController",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/model/models",
	"sap/ui/core/mvc/OverrideExecution"
], function (TemplateRenderController, MessageBox, formatter, Constants, Fragment, models, OverrideExecution) {
	
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
		_oSchedulingModel: null,
		_oUserModel:null,

		/**
		 * overwrite constructor
		 * set manuel owner component for nested xml views
		 */
		constructor: function (oComponent) {
			this._component = oComponent;
			this.setOwnerComponent(oComponent);
			TemplateRenderController.apply(this, arguments);
		},

		/**
		 * initialize dialogs amin functionality
		 */
		init: function () {
			this._oResourceBundle = this._component.getModel("i18n").getResourceBundle();
			this._oViewModel = this._component.getModel("viewModel");
			this._oModel = this._component.getModel();

			this._oSchedulingModel = this._component.getModel("SchedulingModel");
			if(!this._oSchedulingModel){
				this._oSchedulingModel = models.createSchedulingModel();
				this._setJsonModelDefaults();
			}
			this._component.setModel(this._oSchedulingModel, "SchedulingModel");
			this._oUserModel = this._component.getModel("user");
		},

		/**
		 * This method is used to open the dialog box and call the 
		 * relevant methods post that.
		 * @param {*} oView 
		 * @param {*} mParams
		 * @param {object} oMsgParam - To display message toast on Scheduling Dialog
		 */
		openSchedulingDialog: function (oView, mParams, oMsgParam) {
			this._oView = oView;
			this._mParams = mParams || {};

			this._initializeDialogModel();
			this._resortSelectedDemands();

			// create Dialog
			if (!this._ScheduleDialog) {
				this._ScheduleDialog = Fragment.load({
					name: "com.evorait.evoplan.view.scheduling.fragments.SchedulingDialog",
					controller: this,
					type: "XML"
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					oDialog.attachAfterOpen(this.onDialogAfterOpen, this);
					return oDialog;
				}.bind(this));
			}
			this._ScheduleDialog.then(function (oDialog) {
				this._renderWizardStep1Binding(oDialog);
				oDialog.open();
				if(!_.isEmpty(oMsgParam)){
					this._showSchedulingMessageToast(oDialog, oMsgParam);
				}
			}.bind(this));
			
		},
		/**
		 * This method is used to set properties once the 
		 * dialog has been opened.
		 */
		onDialogAfterOpen: function () {
			this._oWizard = sap.ui.getCore().byId("WizardScheduling");
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
			var sMessage = this._oResourceBundle.getText("ymsg.CancelOfReSecheduling");
			this._handleMessageBoxOpen(sMessage, "warning");
		},
		/**
		 * Tis method is used to handle press event of the subnut button 
		 * in the dialog
		 */
		handleWizardSubmit: function () {
			var sMessage = this._oResourceBundle.getText("ymsg.SubmitOfReSecheduling");
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
			sContainerId = "DateRangeStep";
			oDialog.setBusyIndicatorDelay(0);
			oDialog.setBusy(true);

			if (this._mParams.isAutoSchedule) {
				this._mParams.viewName = "com.evorait.evoplan.view.scheduling.AutoScheduling.AutoScheduleStep1#AutoScheduleStep1";
				this._mParams.annotationPath = "com.sap.vocabularies.UI.v1.FieldGroup#ScheduleTable";
				this._mParams.modelName = "SchedulingModel";
				this._mParams.modelDataSetPath = "/step1/dataSet";
			} else {
				this._mParams.viewName = "com.evorait.evoplan.view.scheduling.ReScheduling.ReScheduleStep1#ReScheduleStep1";
				this._mParams.annotationPath = "com.sap.vocabularies.UI.v1.FieldGroup#ReScheduleTable";
				this._mParams.modelName = "SchedulingModel";
				this._mParams.modelDataSetPath = "/step1/dataSet";
			}
			this._oViewModel.setProperty("/Scheduling/sUtilizationSlider",this._oUserModel.getProperty("/DEFAULT_UTILIZATION_BAR_MAPS"));

			this._oModel.metadataLoaded().then(function () {
				//get template and create views
				this._mParams.oView = this._oView;
				this.setTemplateProperties(this._mParams);
				this.insertTemplateFragment(null, this._mParams.viewName, sContainerId, this._afterStepRenderSuccess.bind(this, oDialog), this._mParams);
			}.bind(this));
		},

		/**
		 * This below method is used to assign the initialize the model and assign 
		 * property binded to controls of the dialog box and wizard
		 */
		_initializeDialogModel: function () {
			//is it Autoscheduling or Rescheduling?
			var sType = this._oViewModel.getProperty("/Scheduling/sType");
			this._mParams.isAutoSchedule = sType === Constants.SCHEDULING.AUTOSCHEDULING;
			this._mParams.isReschuduling = sType === Constants.SCHEDULING.RESCHEDULING;

			//set SchedulingModel defaults
			this._setJsonModelDefaults(this._mParams.isAutoSchedule, this._mParams.isReschuduling);
			
			// setting the dialog title based on flag in viewMiodel
			let sDialogTitle = this._oResourceBundle.getText("xtit.AutoscheduleDialogTitle");
			if(this._mParams.isReschuduling){
				sDialogTitle = this._oResourceBundle.getText("xtit.RescheduleDialogTitle");
			}
			this._oViewModel.setProperty("/Scheduling/sScheduleDialogTitle", sDialogTitle);
			this._oViewModel.setProperty("/Scheduling/bSchedulingTableBusy", true);


			var oData = {
				bBackButtonVisible: false,
				bNextButtonVisible: true,
				bFinishButtonVisible: false
			};
			var oInitialModelState = Object.assign({}, oData);
			this._oViewModel.setProperty("/Scheduling/SchedulingDialogFlags",oInitialModelState);
		},

		/**
		 * Get selected valid demands and remap demands for better PTV usage
		 * Add flag for visibility if demand is out of date range
		 */
		_resortSelectedDemands: function(){
			var aSelectedDemands = this._oViewModel.getProperty("/Scheduling/demandList"),
				aTableDataset = [];
				oReorderedDemands = {};

			for(var i = 0, len = aSelectedDemands.length; i < len; i++){
				let oItemData = aSelectedDemands[i].oData;
				oItemData.sPath = aSelectedDemands[i].sPath;
				oItemData["dateRangeIconStatus"] = sap.ui.core.IconColor.Neutral;
				oItemData["dateRangeStatus"] = sap.ui.core.MessageType.None;
				oItemData["dateRangeStatusText"] = this._oResourceBundle.getText("ymsg.scheduleDateStatusNeutral");
				oReorderedDemands[oItemData.Guid] = oItemData;
				aTableDataset.push(oItemData);
			}

			//Todo set table counter after data was load
			this._setScheduleTableTitle(this._mParams.isAutoSchedule, aSelectedDemands.length);
			this._oSchedulingModel.setProperty("/step1/dataSet", aTableDataset);
			this._oSchedulingModel.setProperty("/oDemandMapping", oReorderedDemands);
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
		 * set SchedulingModel defaults
		 * @param {*} isAutoSchedule 
		 * @param {*} isReSchedule 
		 */
		_setJsonModelDefaults: function(isAutoSchedule, isReSchedule){
			this._oSchedulingModel.setData({
				isAutoSchedule: isAutoSchedule || false,
				isReschuduling: isReSchedule || false,
				oDemandMapping: {},
				inside: 0,
				outside: 0,
				step1: {
					dataSet: [],
				},
				step2: {
					dataSet: []
				}
			});
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
						this._ScheduleDialog.then(function (oDialog) {
							oDialog.close();
							this._initializeDialogModel();
						}.bind(this));
					}
				}.bind(this)
			});
		},
		/**
		 * After step1 template rendering was completed
		 * @param {*} oEvent 
		 */
		_afterStepRenderSuccess: function(oDialog){
			oDialog.setBusy(false);
		},

		/**
		 * set table title with counter for scheduling wizard
		 * @param {*} isAutoSchedule 
		 * @param {*} sCounter 
		 */
		_setScheduleTableTitle: function(isAutoSchedule, sCounter){
			if(isAutoSchedule){
				this._oViewModel.setProperty("/Scheduling/sScheduleTableTitle", this._oResourceBundle.getText("xtit.itemDemandListCount", [sCounter]));
			}else{
				this._oViewModel.setProperty("/Scheduling/sScheduleTableTitle", this._oResourceBundle.getText("xtit.itemAssignmentListCount", [sCounter]));
			}
		},
		/**
		 * Method creates message toast for scheduling dialog and displays it.
		 * @param {object} oSource - source control for MessageToast display
		 * @param {object} mParam - parameters for message creation and display
		 * Possible value of mParam:
		 * bIsPoolExist - Boolean - If true, then POOL resource is selected.
		 * sPoolNames - Strin.g - All POOL name selected, it is seperated by \n
		 */
		_showSchedulingMessageToast: function(oSource, mParam){
			var message = "";
			if(mParam.bIsPoolExist){
				message = message + this._oResourceBundle.getText("ymsg.poolResourceExist", mParam.sPoolNames);
			}
			this.showMessageToast(message,{
				width:"auto",
				source: oSource
			})
		}

	});
});