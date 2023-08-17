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
		_oUserModel: null,

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
			if (!this._oSchedulingModel) {
				this._oSchedulingModel = models.createSchedulingModel();
				this._setJsonModelDefaults();
			}
			this._component.setModel(this._oSchedulingModel, "SchedulingModel");
			this._oUserModel = this._component.getModel("user");
			this._oEventBus = sap.ui.getCore().getEventBus();
		},

		/**
		 * This method is used to open the dialog box and call the 
		 * relevant methods post that.
		 * @param {*} oView 
		 * @param {*} mParams
		 * @param {object} oMsgParam - To display message toast on Scheduling Dialog
		 */
		openSchedulingDialog: function (oView, mParams, oMsgParam, oSchedulingActions) {
			this._oView = oView;
			this._mParams = mParams || {};
			this.oSchedulingActions = oSchedulingActions;

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
				if (!_.isEmpty(oMsgParam)) {
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
		 * This method is used to set properties once the dialog is closed.
		 * Once the dialog is closed we are -
		 * 1. REemovig the selection from demands and resource tree table.
		 * 2. Resetting the scheduling json model.
		 */
		onSchedDialogClose: function () {
			var sRoute = this._oViewModel.getProperty("/sViewRoute");
			this.oSchedulingActions.resetSchedulingJson();
			if (sRoute === "NEWGANTT") {
				this._oEventBus.publish("BaseController", "resetSelections", {});
			} else {
				this._oEventBus.publish("ManageAbsences", "ClearSelection", {});
			}
			this._oEventBus.publish("DemandTableOperation", "clearDemandsSelection", {});
		},
		/**
		 * This method is used to handle the press event of 
		 * Next button in the dialog box
		 */
		onDialogNextButton: function () {
			this._iSelectedStepIndex = this._oWizard.getSteps().indexOf(this._oSelectedStep);
			var oNextStep = this._oWizard.getSteps()[this._iSelectedStepIndex + 1],
				sLoadingMsg = this._oResourceBundle.getText("ymsg.Loading");

			if (this._iSelectedStepIndex === 0 && !this.step1Validation()) {
				return;
			}

			//TODO: new busy dialog will be developed
			var oBusyDialog = new sap.m.BusyDialog({
				text: sLoadingMsg
			});
			oBusyDialog.open();
			this.oSchedulingActions.handleScheduleDemands().then(function (oResponse) {
				oBusyDialog.close();
				if (this._oSelectedStep && !this._oSelectedStep.bLast) {
					this._oWizard.goToStep(oNextStep, true);
				} else {
					this._oWizard.nextStep();
				}

				this._iSelectedStepIndex++;
				this._oSelectedStep = oNextStep;

				this._handleButtonsVisibility();

				this._designResponse(oResponse[0], oResponse[1], oResponse[2]); //(Response, Resources, Demands)

				this._renderWizardStep2Binding();
			}.bind(this));
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
		 * Validates step1 fields, if error then return false, or else true
		 * @returns {boolean}
		 */
		step1Validation: function () {
			var oStartDate = this._oViewModel.getProperty("/Scheduling/startDate"),
				oEndDate = this._oViewModel.getProperty("/Scheduling/endDate"),
				validateState = true;

			if (!oStartDate) {
				validateState = false;
				this._oViewModel.setProperty("/Scheduling/sStartDateValueState", "Error");
			}
			if (!oEndDate) {
				validateState = false;
				this._oViewModel.setProperty("/Scheduling/sEndDateValueState", "Error");
			}
			return validateState;
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
		_renderWizardStep1Binding: function (oDialog) {
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
			this._oViewModel.setProperty("/Scheduling/sUtilizationSlider", this._oUserModel.getProperty("/DEFAULT_UTILIZATION_BAR_MAPS"));

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
			if (this._mParams.isReschuduling) {
				sDialogTitle = this._oResourceBundle.getText("xtit.RescheduleDialogTitle");
			}
			this._oViewModel.setProperty("/Scheduling/sScheduleDialogTitle", sDialogTitle);
			this._oViewModel.setProperty("/Scheduling/bSchedulingTableBusy", true);

			this._oViewModel.setProperty("/Scheduling/startDate", null);
			this._oViewModel.setProperty("/Scheduling/endDate", null);


			var oData = {
				bBackButtonVisible: false,
				bNextButtonVisible: true,
				bFinishButtonVisible: false
			};
			var oInitialModelState = Object.assign({}, oData);
			this._oViewModel.setProperty("/Scheduling/SchedulingDialogFlags", oInitialModelState);
		},

		/**
		 * Get selected valid demands and remap demands for better PTV usage
		 * Add flag for visibility if demand is out of date range
		 */
		_resortSelectedDemands: function () {
			var aSelectedDemands = this._oViewModel.getProperty("/Scheduling/demandList"),
				aTableDataset = [];
			oReorderedDemands = {};

			for (var i = 0, len = aSelectedDemands.length; i < len; i++) {
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
				default:
					break;
			}
			oModel.refresh();
		},

		/**
		 * set SchedulingModel defaults
		 * @param {*} isAutoSchedule 
		 * @param {*} isReSchedule 
		 */
		_setJsonModelDefaults: function (isAutoSchedule, isReSchedule) {
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
				},
				iPlanned: 0,
				iNonPlanned: 0
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
		_afterStepRenderSuccess: function (oDialog) {
			oDialog.setBusy(false);
		},

		/**
		 * set table title with counter for scheduling wizard
		 * @param {*} isAutoSchedule 
		 * @param {*} sCounter 
		 */
		_setScheduleTableTitle: function (isAutoSchedule, sCounter) {
			if (isAutoSchedule) {
				this._oViewModel.setProperty("/Scheduling/sScheduleTableTitle", this._oResourceBundle.getText("xtit.itemDemandListCount", [sCounter]));
			} else {
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
		_showSchedulingMessageToast: function (oSource, mParam) {
			var message = "";
			if (mParam.bIsPoolExist) {
				message = message + this._oResourceBundle.getText("ymsg.poolResourceExist", mParam.sPoolNames);
			}
			if (message) {
				this.showMessageToast(message, {
					width: "auto",
					source: oSource
				});
			}
		},

		/**
		 * set wizard content for step2 
		 * Response from PTV API will be displayed in table format
		 * 
		 * In template views the Json model and path to Json data are set instead of an entitySet
		 * Table columns are rendered from EntitySet LineItems but Table data are from Json Model
		 * 
		 * @param {*} oDialog 
		 */
		_renderWizardStep2Binding: function (oDialog) {
			sContainerId = "ConfirmationStep";

			this._mParams.viewName = "com.evorait.evoplan.view.scheduling.AutoScheduling.AutoScheduleStep2#AutoScheduleStep2";
			this._mParams.annotationPath = "com.sap.vocabularies.UI.v1.FieldGroup#ResponseTable";
			this._mParams.modelName = "SchedulingModel";
			this._mParams.modelDataSetPath = "/step2/dataSet";

			this._oModel.metadataLoaded().then(function () {
				//get template and create views
				this._mParams.oView = this._oView;
				this.setTemplateProperties(this._mParams);
				this.insertTemplateFragment(null, this._mParams.viewName, sContainerId, null, this._mParams);
			}.bind(this));
		},

		_designResponse: function (oResponse, aResourceData, aDemandsData) {
			debugger;
			// var oResponse = {
			// 	"$type": "ToursResponse",
			// 	"costReport": {
			// 		"travelTime": 37491,
			// 		"drivingTime": 15291,
			// 		"serviceTime": 22200,
			// 		"distance": 254791,
			// 		"monetaryCostsReport": {
			// 			"totalCost": 0,
			// 			"travelTimeCost": 0,
			// 			"distanceCost": 0,
			// 			"fixedCost": 0
			// 		}
			// 	},
			// 	"tours": [{
			// 			"vehicleId": "Resource_1",
			// 			"vehicleStartLocationId": "Resource_1_location",
			// 			"vehicleEndLocationId": "Resource_1_location",
			// 			"trips": [{
			// 				"id": "f8d80d7a-7add-4091-83b0-302b682a3cf2",
			// 				"stops": [{
			// 						"locationId": "Demand_2_location",
			// 						"tasks": [{
			// 							"orderId": "Demand_2",
			// 							"taskType": "VISIT"
			// 						}]
			// 					},
			// 					{
			// 						"locationId": "Demand_1_location",
			// 						"tasks": [{
			// 							"orderId": "Demand_1",
			// 							"taskType": "VISIT"
			// 						}]
			// 					}
			// 				]
			// 			}]
			// 		},
			// 		{
			// 			"vehicleId": "Resource_2",
			// 			"vehicleStartLocationId": "Resource_2_location",
			// 			"vehicleEndLocationId": "Resource_2_location",
			// 			"trips": [{
			// 				"id": "cdac73d5-7f6d-4fd8-ba8e-c902503108fc",
			// 				"stops": [{
			// 						"locationId": "Demand_3_location",
			// 						"tasks": [{
			// 							"orderId": "Demand_3",
			// 							"taskType": "VISIT"
			// 						}]
			// 					},
			// 					{
			// 						"locationId": "Demand_5_location",
			// 						"tasks": [{
			// 							"orderId": "Demand_5",
			// 							"taskType": "VISIT"
			// 						}]
			// 					},
			// 					{
			// 						"locationId": "Demand_4_location",
			// 						"tasks": [{
			// 							"orderId": "Demand_4",
			// 							"taskType": "VISIT"
			// 						}]
			// 					}
			// 				]
			// 			}]
			// 		}
			// 	],
			// 	"tourReports": [{
			// 			"vehicleId": "Resource_1",
			// 			"costReport": {
			// 				"travelTime": 15600,
			// 				"drivingTime": 1200,
			// 				"serviceTime": 14400,
			// 				"distance": 19976,
			// 				"monetaryCostsReport": {
			// 					"totalCost": 0,
			// 					"travelTimeCost": 0,
			// 					"distanceCost": 0,
			// 					"fixedCost": 0
			// 				}
			// 			},
			// 			"tripReports": [{
			// 				"tripId": "f8d80d7a-7add-4091-83b0-302b682a3cf2",
			// 				"costReport": {
			// 					"travelTime": 15600,
			// 					"drivingTime": 1200,
			// 					"serviceTime": 14400,
			// 					"distance": 19976,
			// 					"monetaryCostsReport": {
			// 						"totalCost": 0,
			// 						"travelTimeCost": 0,
			// 						"distanceCost": 0,
			// 						"fixedCost": 0
			// 					}
			// 				}
			// 			}],
			// 			"tourEvents": [{
			// 					"startTime": "2023-05-19T09:00:00.000Z",
			// 					"locationId": "Resource_1_location",
			// 					"eventTypes": [
			// 						"TOUR_START"
			// 					],
			// 					"duration": 0
			// 				},
			// 				{
			// 					"startTime": "2023-05-19T09:00:00.000Z",
			// 					"tripId": "f8d80d7a-7add-4091-83b0-302b682a3cf2",
			// 					"locationId": "Resource_1_location",
			// 					"eventTypes": [
			// 						"TRIP_START"
			// 					],
			// 					"duration": 0
			// 				},
			// 				{
			// 					"startTime": "2023-05-19T09:00:00.000Z",
			// 					"tripId": "f8d80d7a-7add-4091-83b0-302b682a3cf2",
			// 					"eventTypes": [
			// 						"DRIVING"
			// 					],
			// 					"duration": 29
			// 				},
			// 				{
			// 					"startTime": "2023-05-19T09:00:29.000Z",
			// 					"tripId": "f8d80d7a-7add-4091-83b0-302b682a3cf2",
			// 					"locationId": "Demand_2_location",
			// 					"orderId": "Demand_2",
			// 					"eventTypes": [
			// 						"SERVICE"
			// 					],
			// 					"duration": 7200
			// 				},
			// 				{
			// 					"startTime": "2023-05-19T11:00:29.000Z",
			// 					"tripId": "f8d80d7a-7add-4091-83b0-302b682a3cf2",
			// 					"eventTypes": [
			// 						"DRIVING"
			// 					],
			// 					"duration": 598
			// 				},
			// 				{
			// 					"startTime": "2023-05-19T11:10:27.000Z",
			// 					"tripId": "f8d80d7a-7add-4091-83b0-302b682a3cf2",
			// 					"locationId": "Demand_1_location",
			// 					"orderId": "Demand_1",
			// 					"eventTypes": [
			// 						"SERVICE"
			// 					],
			// 					"duration": 7200
			// 				},
			// 				{
			// 					"startTime": "2023-05-19T13:10:27.000Z",
			// 					"tripId": "f8d80d7a-7add-4091-83b0-302b682a3cf2",
			// 					"eventTypes": [
			// 						"DRIVING"
			// 					],
			// 					"duration": 573
			// 				},
			// 				{
			// 					"startTime": "2023-05-19T13:20:00.000Z",
			// 					"tripId": "f8d80d7a-7add-4091-83b0-302b682a3cf2",
			// 					"locationId": "Resource_1_location",
			// 					"eventTypes": [
			// 						"TRIP_END"
			// 					],
			// 					"duration": 0
			// 				},
			// 				{
			// 					"startTime": "2023-05-19T13:20:00.000Z",
			// 					"locationId": "Resource_1_location",
			// 					"eventTypes": [
			// 						"TOUR_END"
			// 					],
			// 					"duration": 0
			// 				}
			// 			],
			// 			"legReports": [{
			// 					"startTourEventIndex": 2,
			// 					"endTourEventIndex": 2,
			// 					"drivingTime": 29,
			// 					"distance": 482,
			// 					"estimatedByDirectDistance": true,
			// 					"routeViolated": false,
			// 					"maximumQuantityScenarioIndex": 0
			// 				},
			// 				{
			// 					"startTourEventIndex": 4,
			// 					"endTourEventIndex": 4,
			// 					"drivingTime": 598,
			// 					"distance": 9958,
			// 					"estimatedByDirectDistance": true,
			// 					"routeViolated": false,
			// 					"maximumQuantityScenarioIndex": 0
			// 				},
			// 				{
			// 					"startTourEventIndex": 6,
			// 					"endTourEventIndex": 6,
			// 					"drivingTime": 573,
			// 					"distance": 9536,
			// 					"estimatedByDirectDistance": true,
			// 					"routeViolated": false,
			// 					"maximumQuantityScenarioIndex": 0
			// 				}
			// 			]
			// 		},
			// 		{
			// 			"vehicleId": "Resource_2",
			// 			"costReport": {
			// 				"travelTime": 21891,
			// 				"drivingTime": 14091,
			// 				"serviceTime": 7800,
			// 				"distance": 234815,
			// 				"monetaryCostsReport": {
			// 					"totalCost": 0,
			// 					"travelTimeCost": 0,
			// 					"distanceCost": 0,
			// 					"fixedCost": 0
			// 				}
			// 			},
			// 			"tripReports": [{
			// 				"tripId": "cdac73d5-7f6d-4fd8-ba8e-c902503108fc",
			// 				"costReport": {
			// 					"travelTime": 21891,
			// 					"drivingTime": 14091,
			// 					"serviceTime": 7800,
			// 					"distance": 234815,
			// 					"monetaryCostsReport": {
			// 						"totalCost": 0,
			// 						"travelTimeCost": 0,
			// 						"distanceCost": 0,
			// 						"fixedCost": 0
			// 					}
			// 				}
			// 			}],
			// 			"tourEvents": [{
			// 					"startTime": "2023-05-21T09:00:00.000Z",
			// 					"locationId": "Resource_2_location",
			// 					"eventTypes": [
			// 						"TOUR_START"
			// 					],
			// 					"duration": 0
			// 				},
			// 				{
			// 					"startTime": "2023-05-21T09:00:00.000Z",
			// 					"tripId": "cdac73d5-7f6d-4fd8-ba8e-c902503108fc",
			// 					"locationId": "Resource_2_location",
			// 					"eventTypes": [
			// 						"TRIP_START"
			// 					],
			// 					"duration": 0
			// 				},
			// 				{
			// 					"startTime": "2023-05-21T09:00:00.000Z",
			// 					"tripId": "cdac73d5-7f6d-4fd8-ba8e-c902503108fc",
			// 					"eventTypes": [
			// 						"DRIVING"
			// 					],
			// 					"duration": 1138
			// 				},
			// 				{
			// 					"startTime": "2023-05-21T09:18:58.000Z",
			// 					"tripId": "cdac73d5-7f6d-4fd8-ba8e-c902503108fc",
			// 					"locationId": "Demand_3_location",
			// 					"orderId": "Demand_3",
			// 					"eventTypes": [
			// 						"SERVICE"
			// 					],
			// 					"duration": 3600
			// 				},
			// 				{
			// 					"startTime": "2023-05-21T10:18:58.000Z",
			// 					"tripId": "cdac73d5-7f6d-4fd8-ba8e-c902503108fc",
			// 					"eventTypes": [
			// 						"DRIVING"
			// 					],
			// 					"duration": 6524
			// 				},
			// 				{
			// 					"startTime": "2023-05-21T12:07:42.000Z",
			// 					"tripId": "cdac73d5-7f6d-4fd8-ba8e-c902503108fc",
			// 					"locationId": "Demand_5_location",
			// 					"orderId": "Demand_5",
			// 					"eventTypes": [
			// 						"SERVICE"
			// 					],
			// 					"duration": 600
			// 				},
			// 				{
			// 					"startTime": "2023-05-21T12:17:42.000Z",
			// 					"tripId": "cdac73d5-7f6d-4fd8-ba8e-c902503108fc",
			// 					"eventTypes": [
			// 						"DRIVING"
			// 					],
			// 					"duration": 0
			// 				},
			// 				{
			// 					"startTime": "2023-05-21T12:17:42.000Z",
			// 					"tripId": "cdac73d5-7f6d-4fd8-ba8e-c902503108fc",
			// 					"locationId": "Demand_4_location",
			// 					"orderId": "Demand_4",
			// 					"eventTypes": [
			// 						"SERVICE"
			// 					],
			// 					"duration": 3600
			// 				},
			// 				{
			// 					"startTime": "2023-05-21T13:17:42.000Z",
			// 					"tripId": "cdac73d5-7f6d-4fd8-ba8e-c902503108fc",
			// 					"eventTypes": [
			// 						"DRIVING"
			// 					],
			// 					"duration": 6429
			// 				},
			// 				{
			// 					"startTime": "2023-05-21T15:04:51.000Z",
			// 					"tripId": "cdac73d5-7f6d-4fd8-ba8e-c902503108fc",
			// 					"locationId": "Resource_2_location",
			// 					"eventTypes": [
			// 						"TRIP_END"
			// 					],
			// 					"duration": 0
			// 				},
			// 				{
			// 					"startTime": "2023-05-21T15:04:51.000Z",
			// 					"locationId": "Resource_2_location",
			// 					"eventTypes": [
			// 						"TOUR_END"
			// 					],
			// 					"duration": 0
			// 				}
			// 			],
			// 			"legReports": [{
			// 					"startTourEventIndex": 2,
			// 					"endTourEventIndex": 2,
			// 					"drivingTime": 1138,
			// 					"distance": 18957,
			// 					"estimatedByDirectDistance": true,
			// 					"routeViolated": false,
			// 					"maximumQuantityScenarioIndex": 0
			// 				},
			// 				{
			// 					"startTourEventIndex": 4,
			// 					"endTourEventIndex": 4,
			// 					"drivingTime": 6524,
			// 					"distance": 108721,
			// 					"estimatedByDirectDistance": true,
			// 					"routeViolated": false,
			// 					"maximumQuantityScenarioIndex": 0
			// 				},
			// 				{
			// 					"startTourEventIndex": 6,
			// 					"endTourEventIndex": 6,
			// 					"drivingTime": 0,
			// 					"distance": 0,
			// 					"estimatedByDirectDistance": true,
			// 					"routeViolated": false,
			// 					"maximumQuantityScenarioIndex": 0
			// 				},
			// 				{
			// 					"startTourEventIndex": 8,
			// 					"endTourEventIndex": 8,
			// 					"drivingTime": 6429,
			// 					"distance": 107137,
			// 					"estimatedByDirectDistance": true,
			// 					"routeViolated": false,
			// 					"maximumQuantityScenarioIndex": 0
			// 				}
			// 			]
			// 		}
			// 	],
			// 	"orderIdsNotPlanned": [
			// 		"Demand_5",
			// 		"Demand_3"
			// 	],
			// 	"vehicleIdsWithDirectDistanceEstimation": [
			// 		"Resource_1",
			// 		"Resource_2"
			// 	],
			// 	"violated": false,
			// 	"routeViolated": false
			// };

			if (oResponse.data) {
				var aDataSet = [],
					aData = {},
					iNotPlanned = 0,
					iPlanned = 0;

				if (oResponse.data.tourReports) {
					for (var i = 0; i < oResponse.data.tourReports.length; i++) {
						oTour = oResponse.data.tourReports[i];
						aData = {};

						aData.ResourceGuid = oTour.vehicleId.split("_")[0];
						aData.ResourceGroupGuid = aResourceData[oTour.vehicleId.split("_")[0]].aData.ResourceGroupGuid;
						aData.ResourceName = aResourceData[oTour.vehicleId.split("_")[0]].aData.Description;

						oTour.tourEvents.forEach(function (tourItem) {
							if (tourItem.eventTypes.indexOf('SERVICE') !== -1) {
								tourStartDate = new Date(tourItem.startTime);
								aData.DateFrom = tourStartDate.toDateString();
								aData.TimeFrom = tourStartDate.toTimeString();

								aData.DateTo = tourItem.duration + tourItem.startTime;
								aData.TimeTo = "";
								
								aData.DemandGuid = tourItem.orderId;
								aData.ORDERID = aDemandsData[tourItem.orderId].ORDERID;
								aData.PLANNED = true;

							}
						}.bind(this));

						iPlanned++;
						aDataSet.push(aData);
					}
				}

				if (oResponse.data.orderIdsNotPlanned) {
					iNotPlanned = oResponse.data.orderIdsNotPlanned.length;
					for (var j = 0; j < oResponse.data.orderIdsNotPlanned.length; j++) {
						aOrder = oResponse.data.orderIdsNotPlanned[j];
						aData = {};

						aData.DemandGuid = aOrder.orderId;
						aData.PLANNED = false;

						aDataSet.push(aData);
					}
				}

				this._oSchedulingModel.setProperty("/step2/iPlanned", iPlanned);
				this._oSchedulingModel.setProperty("/step2/iNonPlanned", iNotPlanned);
				this._oSchedulingModel.setProperty("/step2/dataSet", aDataSet);
			}
		}

	});
});