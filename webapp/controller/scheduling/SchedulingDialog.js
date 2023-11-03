sap.ui.define([
	"com/evorait/evoplan/controller/TemplateRenderController",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/model/models",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/ui/core/IconColor"
], function (TemplateRenderController, MessageBox, formatter, Constants, Fragment, models, OverrideExecution, IconColor) {

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
			//checking if the scheduling model is already defined or not. If not then defining and setting to default values
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
		 * @param {Object} oSchedulingActions - controller object passed here
		 */
		openSchedulingDialog: function (oView, mParams, oMsgParam, oSchedulingActions) {
			this._oView = oView;
			this._mParams = mParams || {};
			this.oSchedulingActions = oSchedulingActions;

			this._initializeDialogModel();
			this._resortSelectedDemands();

			// create Dialog if it is already not instantiated
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
				this._oViewModel.setProperty("/Scheduling/InputDataChanged", "");
				this._oSchedulingModel.setProperty("/step2/dataSet", []);
				// validation added below so that user is not able to select the date and time less than current time.
				this._oViewModel.setProperty("/Scheduling/minDate", new Date());
				oDialog.open();
				//if oMsgParam is not empty then display the message
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
			//if called from new gantt then reset the selections from the gantt model
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
			this._iSelectedStepIndex = 0;
			var oNextStep = this._oWizard.getSteps()[this._iSelectedStepIndex + 1];

			//in the step 1 if validations are not passed then return
			if (this._iSelectedStepIndex === 0 && !this.step1Validation()) {
				return;
			}

			this._oViewModel.setProperty("/Scheduling/InputDataChanged", "");
			this._component.ProgressBarDialog.open(this._oView);
			this.oSchedulingActions.handleScheduleDemands().then(function (oResponse) {
				//if selected data is valid then proceed to step 2
				if (oResponse) {
					if (this._oViewModel.getProperty("/sViewRoute") === "NEWGANTT") {
						this._oViewModel.setProperty("/Scheduling/PTVResponse", oResponse[0].data);
						this._oEventBus.publish("AutoSchedule", "calculateTravelTime", {});
					}
					this._component.ProgressBarDialog.close();

					this._iSelectedStepIndex = 1;
					this._oSelectedStep = oNextStep;
					this._oWizard.setCurrentStep(this._oWizard.getSteps()[1]);
					this._oWizard.goToStep(oNextStep, true);

					this._handleButtonsVisibility();
					//(Response, Resources, Demands)
					this._designResponse(oResponse[0], oResponse[1], oResponse[2]);

					this._renderWizardStep2Binding();
				}
			}.bind(this));
		},
		/**
		 * Validates step1 fields, if error then return false, or else true
		 * @returns {boolean}
		 */
		step1Validation: function () {
			var startDate = this._oViewModel.getProperty("/Scheduling/startDate") ? moment(this._oViewModel.getProperty("/Scheduling/startDate")) : null,
				endDate = this._oViewModel.getProperty("/Scheduling/endDate") ? moment(this._oViewModel.getProperty("/Scheduling/endDate")) : null,
				bEndDateChanged = this._oViewModel.getProperty("/Scheduling/bDateChanged");
			return this.oSchedulingActions.validateDateSchedule(startDate, endDate, bEndDateChanged);

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
			this._handleMessageBoxOpen(sMessage, "confirm", "createAssignment");
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

			//In case of Autoschedule, new entity is being used to fetch the annotations
			if (this._mParams.isAutoSchedule) {
				this._mParams.viewName = "com.evorait.evoplan.view.scheduling.AutoScheduling.AutoScheduleStep1#AutoScheduleStep1";
				this._mParams.annotationPath = "com.sap.vocabularies.UI.v1.LineItem";
				this._mParams.modelName = "SchedulingModel";
				this._mParams.modelDataSetPath = "/step1/dataSet";
				this._mParams.entitySet = "ScheduleSelectSet";
				//for reschedule, demandset is used along with qualifier
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
			//changing the dialog title in case of rescheduling
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

			//reset the toggle button pressed state
			this._oSchedulingModel.setProperty("btnInsidePressed", false);
			this._oSchedulingModel.setProperty("btnOutsidePressed", false);

			//resetting filters in both smartFilterBar if they are already instantiated
			if (this._component.demandFilterDialog) {
				this._component.demandFilterDialog.getContent()[0].clear();
			}
			if (this._component._oResponseFilterDialog) {
				this._component._oResponseFilterDialog.getContent()[0].clear();
			}
		},

		/**
		 * Get selected valid demands and remap demands for better PTV usage
		 * Add flag for visibility if demand is out of date range
		 */
		_resortSelectedDemands: function () {
			var aSelectedDemands = this._oViewModel.getProperty("/Scheduling/demandList"),
				aTableDataset = [];

			for (var i = 0, len = aSelectedDemands.length; i < len; i++) {
				let oItemData = aSelectedDemands[i].oData;
				oItemData.sPath = aSelectedDemands[i].sPath;
				oItemData.dateRangeIconStatus = sap.ui.core.IconColor.Neutral;
				oItemData.dateRangeStatus = sap.ui.core.MessageType.None;
				oItemData.dateRangeStatusText = this._oResourceBundle.getText("ymsg.scheduleDateStatusNeutral");
				aTableDataset.push(oItemData);
			}

			//Todo set table counter after data was load
			this._setScheduleTableTitle(this._mParams.isAutoSchedule, aSelectedDemands.length);
			this._oSchedulingModel.setProperty("/step1/dataSet", aTableDataset);
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
					dataSet: []
				},
				step2: {
					dataSet: []
				},
				iPlanned: 0,
				iNonPlanned: 0,
				btnInsidePressed: false,
				btnOutsidePressed: false
			});
		},

		/**
		 * This method used to handle the open of the message box.
		 * @param {string} sMessage - the type of message what we are going to display in the box.
		 * @param {string} sMessageBoxType - type of the message box.
		 * @param {string} sOperationType - the operation to be performed once we click on confirm
		 */
		_handleMessageBoxOpen: function (sMessage, sMessageBoxType, sOperationType) {
			// later to be replaced with the generic method based on avaiability in base controller.
			MessageBox[sMessageBoxType](sMessage, {
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.YES) {
						//on click of accept proposal, assignment(s) will be created
						if (sOperationType === "createAssignment") {
							this._ScheduleDialog.then(function (oDialog) {
								oDialog.setBusy(true);
								this.oSchedulingActions.handleCreateAssignment(this._oSchedulingModel).then(function () {
									this._oWizard.discardProgress(this._oWizard.getSteps()[0]);
									oDialog.close();
									oDialog.setBusy(false);
									this._initializeDialogModel();
								}.bind(this));

							}.bind(this));
							//in case of cancel the progress is discarded and the scheduling model is initialized
						} else {
							this._oWizard.discardProgress(this._oWizard.getSteps()[0]);
							this._ScheduleDialog.then(function (oDialog) {
								oDialog.close();
								this._initializeDialogModel();

							}.bind(this));
						}


					}
				}.bind(this)
			});
		},
		/**
		 * After step1 template rendering was completed
		 * @param {Object} oDialog - dialog to be used for setting busy indicator
		 */
		_afterStepRenderSuccess: function (oDialog) {
			oDialog.setBusy(false);
		},

		/**
		 * set table title with counter for scheduling wizard
		 * @param {Boolean} isAutoSchedule  - to set different table title depending on this flag
		 * @param {String} sCounter - contains the count of the table items 
		 */
		_setScheduleTableTitle: function (isAutoSchedule, sCounter) {
			if (isAutoSchedule) {
				this._oViewModel.setProperty("/Scheduling/sScheduleTableTitle", this._oResourceBundle.getText("xtit.itemAssignmentListCount", [sCounter]));
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
			//if POOL resource is selected
			if (mParam.bIsPoolExist) {
				message = message + this._oResourceBundle.getText("ymsg.poolResourceExist", mParam.sPoolNames);
			}
			//if message is defined then display messagetoast
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
		 */
		_renderWizardStep2Binding: function () {
			sContainerId = "ConfirmationStep";

			this._mParams.viewName = "com.evorait.evoplan.view.scheduling.AutoScheduling.AutoScheduleStep2#AutoScheduleStep2";
			this._mParams.annotationPath = "com.sap.vocabularies.UI.v1.LineItem";
			this._mParams.modelName = "SchedulingModel";
			this._mParams.modelDataSetPath = "/step2/dataSet";
			this._mParams.entitySet = "ScheduleResponseSet";

			this._oModel.metadataLoaded().then(function () {
				//get template and create views
				this._mParams.oView = this._oView;
				this.setTemplateProperties(this._mParams);
				this.insertTemplateFragment(null, this._mParams.viewName, sContainerId, null, this._mParams);
			}.bind(this));
		},

		/**
		 * modify PTV API response as per table needs
		 * Response from PTV API will be displayed in table format
		 * 
		 * @param {oResponse} - Response from PTV API
		 * @param {aResourceData} - Selected resources list
		 * @param {aDemandsData} - Selected demands list
		 */
		_designResponse: function (oResponse, aResourceData, aDemandsData) {
			//if the response and the data exists
			if (oResponse && oResponse.data) {
				var aDataSet = [],
					aData = {},
					iNotPlanned = 0,
					iPlanned = 0,
					iNotPlannedRes = 0,
					sResourceGuid,
					aNonPlannableIds = [],
					fTravelTime = 0.0,
					fTravelBackTime = 0.0,
					violatedAssignments = [],
					aListOfAssignments = this._oViewModel.getProperty("/Scheduling/aListOfAssignments"),
					aViolationsTypes = [];

				//if tourReports are generated in the response
				if (oResponse.data.tourReports) {
					for (var i = 0; i < oResponse.data.tourReports.length; i++) {
						oTour = oResponse.data.tourReports[i];
						sResourceGuid = oTour.vehicleId.split("_")[0];

						oTour.tourEvents.forEach(function (tourItem, index) {
							aViolationsTypes = [];
							//check if any violations for each OrderId
							if (tourItem.tourViolations && tourItem.orderId) {
								for (var violationIndex in tourItem.tourViolations) {
									//checking so that any duplicates shouldnt be pushed in the array
									if (aViolationsTypes.indexOf(tourItem.tourViolations[violationIndex].$type) === -1) {
										aViolationsTypes.push(tourItem.tourViolations[violationIndex].$type);
									}
								}

								aListOfAssignments[tourItem.orderId].ViolationType = aViolationsTypes.join(",");
							}

							//Saving travel times 
							if (tourItem.eventTypes.indexOf("DRIVING") !== -1) {
								//Going back travel
								if (oTour.tourEvents[index + 1].eventTypes.indexOf("TRIP_END") !== -1) {
									fTravelBackTime = tourItem.duration;
									//Forward travel
								} else {
									// If ['Driving' 'Break' 'Driving'] is the sequence then both driving times must be added
									fTravelTime = fTravelTime + tourItem.duration;
								}
							}
							//condition for service event for existing assignments without violation
							if (tourItem.eventTypes.indexOf("SERVICE") !== -1 && aListOfAssignments[tourItem.orderId]) {
								aData = {};
								aData = _.clone(aListOfAssignments[tourItem.orderId]);
								// Converting Travel/Travel_back time for existing assignment into hour from minute
								aData.TRAVEL_TIME = parseFloat(aData.TRAVEL_TIME / 60).toFixed(2)
								aData.TRAVEL_BACK_TIME = parseFloat(aData.TRAVEL_BACK_TIME / 60).toFixed(2);

								// flag to identify if Travel/Travel_back time has been changed for existing assignment
								bIsTravelTimeUpdated = false;

								// check if travel time is changed
								if (aListOfAssignments[tourItem.orderId].TRAVEL_TIME !== (fTravelTime / 60).toFixed(1)){
									aData.TRAVEL_TIME = (fTravelTime / 3600);
									aData.TRAVEL_TIME_UNIT = "H";   //Travel time unit will be hour
									aData.ResourceGuid = sResourceGuid;
									aData.ResourceGroupGuid = aResourceData[sResourceGuid].aData.ResourceGroupGuid;
									bIsTravelTimeUpdated = true;	
								}

								// check if travel time has to be reset 
								if ((oTour.tourEvents[index + 2].eventTypes.indexOf('TRIP_END') === -1 && parseFloat(aData.TRAVEL_BACK_TIME) > 0)) {
									aData.TRAVEL_BACK_TIME = 0.0;
									bIsTravelTimeUpdated = true;
								} else if (oTour.tourEvents[index + 2].eventTypes.indexOf('TRIP_END') !== -1 && aData.TRAVEL_BACK_TIME !== (oTour.tourEvents[index + 1].duration / 3600).toFixed(2)) {
									// travel back time is changed
									aData.TRAVEL_BACK_TIME = (oTour.tourEvents[index + 1].duration / 3600);
									bIsTravelTimeUpdated = true;
								}

								// adding the changed existing assignment to an array to call update service further
								if (bIsTravelTimeUpdated){
									aChangedExistingAssignments.push(aData);
								}

								// reset travel time for next assignment
								fTravelTime = 0.0;
							}
							//condition for service event for new planned demands
							if (tourItem.eventTypes.indexOf("SERVICE") !== -1 && aDemandsData[tourItem.orderId]) {
								aData = {};

								//Demand related info
								aData = _.clone(aDemandsData[tourItem.orderId].data);

								//Resource related info
								aData.ResourceGuid = sResourceGuid;
								aData.ResourceGroupGuid = aResourceData[sResourceGuid].aData.ResourceGroupGuid;
								aData.ResourceName = aResourceData[sResourceGuid].aData.Description;
								aData.ResourceGroup = this.oSchedulingActions.getResourceGroupName(aResourceData[sResourceGuid].aData.ParentNodeId);

								//Servicing times
								tourStartDate = new Date(tourItem.startTime);
								aData.DateFrom = new Date(tourItem.startTime);
								aData.TimeFrom = _.clone(aDemandsData[tourItem.orderId].data.TimeFrom); //To initialise TimeFrom property to be type of EdmTime
								aData.TimeFrom.ms = tourStartDate.getTime() - tourStartDate.getTimezoneOffset() * 60 * 1000;

								tourEndDate = new Date(tourStartDate.setSeconds(tourStartDate.getSeconds() + tourItem.duration));
								aData.DateTo = tourEndDate;
								aData.TimeTo = _.clone(aDemandsData[tourItem.orderId].data.TimeTo); //To initialise TimeTo property to be type of EdmTime
								aData.TimeTo.ms = tourEndDate.getTime() - tourEndDate.getTimezoneOffset() * 60 * 1000;

								aData.DemandGuid = tourItem.orderId;
								aData.PLANNED = true;
								//Appending Duration and Duration Unit
								// aData.DURATION = aData.DURATION + aData.DURATION_UNIT;
								// commenting this code due to causing issue | decimal field type is diplaying black for string

								//Forward travel time
								aData.TRAVEL_TIME = fTravelTime / 3600;
								aData.TRAVEL_BACK_TIME = fTravelBackTime;

								aData.TRAVEL_TIME_UNIT = "H";   //Travel time unit will be hour

								fTravelTime = 0.0;

								iPlanned++;
								aDataSet.push(aData);
							}

							//Backward travel time
							if (tourItem.eventTypes.indexOf("TRIP_END") !== -1) {
								aData.TRAVEL_BACK_TIME = fTravelBackTime / 3600;
								fTravelBackTime = 0.0;
							}
						}.bind(this));
					}
				}

				//Non-plannable demands
				if (oResponse.data.orderIdsNotPlannable) {
					for (var h = 0; h < oResponse.data.orderIdsNotPlannable.length; h++) {
						aOrder = oResponse.data.orderIdsNotPlannable[h];
						//find the order in the array of demands
						if (aDemandsData[aOrder]) {
							aData = {};
							aData.DemandGuid = aOrder;
							aData = _.clone(aDemandsData[aOrder].data);
							aData.NotPlanState = IconColor.Critical;
							aData.NotPlanText = this._oResourceBundle.getText("ymsg.nonPlannable");
							aData.PLANNED = false;
							aNonPlannableIds.push(aOrder);
							aDataSet.push(aData);
						}
					}
				}

				//Non-planned demands
				if (oResponse.data.orderIdsNotPlanned) {
					iNotPlanned = 0;
					for (var j = 0; j < oResponse.data.orderIdsNotPlanned.length; j++) {
						aOrder = oResponse.data.orderIdsNotPlanned[j];
						// if the order exists in the demands list
						if (aDemandsData[aOrder]) {
							//incrementing the count of iNotPlanned index in case it is already not done
							if (aNonPlannableIds.indexOf(aOrder) !== -1) {
								iNotPlanned++;
							}
							//Bcz non-plannable is subset of not-planned
							if (aNonPlannableIds.indexOf(aOrder) === -1) {
								aData = {};
								iNotPlanned++;
								aData.DemandGuid = aOrder;
								aData = _.clone(aDemandsData[aOrder].data);
								aData.NotPlanState = IconColor.Negative;
								aData.NotPlanText = this._oResourceBundle.getText("ymsg.nonPlanned");
								aData.PLANNED = false;

								//Appending Duration and Duration Unit
								// aData.DURATION = aData.DURATION + aData.DURATION_UNIT;
								// commenting this code due to causing issue | decimal field type is diplaying black for string

								aDataSet.push(aData);
							}
						}
					}
				}

				//Non-scheduled resources
				if (oResponse.data.vehicleIdsNotPlanned) {
					// for (var k = 0; k < oResponse.data.vehicleIdsNotPlanned.length; k++) {
					// 	sResourceGuid = oResponse.data.vehicleIdsNotPlanned[k].split("_")[0];

					// 	if (aNonScheduledResIds.indexOf(sResourceGuid) === -1) {
					// 		aData = {};
					// 		aNonScheduledResIds.push(sResourceGuid);

					// 		//Resource related info
					// 		aData.ResourceGuid = sResourceGuid;
					// 		aData.ResourceGroupGuid = aResourceData[sResourceGuid].aData.ResourceGroupGuid;
					// 		aData.ResourceName = aResourceData[sResourceGuid].aData.Description;
					// 		aData.ResourceGroup = this.oSchedulingActions.getResourceGroupName(aResourceData[sResourceGuid].aData.ParentNodeId);
					// 		aData.Qualifications = aResourceData[sResourceGuid].qualifications.join();

					// 		if (aResourceData[sResourceGuid].absenses.length !== 0) {
					// 			aResourceData[sResourceGuid].absenses.forEach(function (oAbs) {
					// 				aData.AbsenceFrom = oAbs.DateFrom;
					// 				aData.AbsenceTo = oAbs.DateTo;

					// 				aData.PLANNED = "RES";

					// 				iNotPlannedRes++;
					// 				aDataSet.push(JSON.parse(JSON.stringify(aData)));
					// 			}.bind(this));
					// 		} else {
					// 			aData.PLANNED = "RES";

					// 			iNotPlannedRes++;
					// 			aDataSet.push(aData);
					// 		}

					// 	}
					// }
				}

				//Setting the values in Schdeuling model
				this._oSchedulingModel.setProperty("/step2/iPlanned", iPlanned);
				this._oSchedulingModel.setProperty("/step2/iNonPlanned", iNotPlanned);
				this._oSchedulingModel.setProperty("/step2/iNonPlannedRes", iNotPlannedRes);
				this._oSchedulingModel.setProperty("/step2/dataSet", aDataSet);

				//Setting button visibility for scheduling
				if (!iPlanned) {
					this._oViewModel.setProperty("/Scheduling/SchedulingDialogFlags/bFinishButtonVisible", false);
				}
				//preparing error message for the violated assignments
				if (oResponse.data.violated) {
					for (var sGuid in aListOfAssignments) {
						if (aListOfAssignments[sGuid].ViolationType) {
							violatedAssignments.push(aListOfAssignments[sGuid]);
						}
					}
					this._oViewModel.setProperty("/Scheduling/aViolatedAssignments", violatedAssignments);
					this.oSchedulingActions.showViolationError();
				}
				this._oViewModel.setProperty("/Scheduling/aUpdatedExistingAssignments", aChangedExistingAssignments);
			}
		}
	});
});