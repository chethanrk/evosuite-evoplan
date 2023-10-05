sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	'sap/ui/model/Filter',
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/IconColor",
	"sap/ui/core/MessageType",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment",
], function (BaseController, formatter, Filter, Constants, IconColor, MessageType, Filter, FilterOperator, Fragment) {

	return BaseController.extend("com.evorait.evoplan.controller.Scheduling.SchedulingActions", {
		formatter: formatter,
		_controller: undefined, //controller from where this class was initialized
		oViewModel: undefined,
		oDataModel: undefined,
		oGanttModel: undefined,
		oResourceBundle: undefined,

		/**
		 * Set here all global properties you need from other controller
		 * @param {*} controller 
		 */
		constructor: function (controller) {
			this._controller = controller;
			this.oViewModel = controller.getModel("viewModel");
			this.oAppViewModel = controller.getModel("appView");
			this.oDataModel = controller.getModel();
			this.oGanttModel = controller.getModel("ganttModel");
			this.oUserModel = controller.getModel("user");
			this.oResourceBundle = controller.getResourceBundle();
			this._oEventBus = sap.ui.getCore().getEventBus();
			this.oOwnerComponent = controller.getOwnerComponent();
		},

		/* =========================================================== */
		/* Public methods                                              */
		/* =========================================================== */

		/**
		 * Function to validate auto-scheduling button
		 */
		validateScheduleButtons: function () {
			var oScheduling;
			oScheduling = this.oViewModel.getProperty("/Scheduling"),
				oResourceDataModel = this.oDataModel;
			if (!this.oUserModel.getProperty("/ENABLE_AUTO_SCHEDULE_BUTTON")) {
				return;
			}
			if (this.oViewModel.getProperty("/sViewRoute") === "NEWGANTT") {
				oResourceDataModel = this.oGanttModel;
			}
			if (oScheduling.selectedDemandPath && oScheduling.selectedResources && (oScheduling.selectedResources.length > 0)) {
				this.oViewModel.setProperty("/Scheduling/bEnableAutoschedule", true);
				return;
			}
			this.oViewModel.setProperty("/Scheduling/bEnableAutoschedule", false);
			return;
		},
		/**
		 * This method is used to display the validation messages once the Schedule/PlanDemands
		 * button is enabled.
		 * This method is applicable for the demands, gantt chart and maps view.
		 * @return {boolean} - 'false' if only all pools are selected | 'true' if any resource/resource group is also selected.
		 */
		validateScheduleAfterPress: function () {
			var oScheduling = this.oViewModel.getProperty("/Scheduling"),
				oResourceDataModel = this.oDataModel,
				sRoute = this.oViewModel.getProperty("/sViewRoute");
			if (sRoute === "NEWGANTT") {
				oResourceDataModel = this.oGanttModel;
			}
			// first if we are checking if only pools are selected in the resource tree.
			if (!this._checkDuplicatePoolSelection(oResourceDataModel, oScheduling)) {
				this.showMessageToast(this.oResourceBundle.getText("ysmg.PoolSelectedReSchError"));
				if (sRoute === "NEWGANTT") {
					this._oEventBus.publish("BaseController", "resetSelections", {});
				} else {
					this._oEventBus.publish("ManageAbsences", "ClearSelection", {});
				}
				return false;
			};
			return true;
		},
		/**
		 * Function to validate rescheduling button
		 */
		validateReScheduleButton: function () {
			var oSelectedDemandItem,
				oScheduling = this.oViewModel.getProperty("/Scheduling"),
				oResourceDataModel = this.oDataModel;
			if (!this.oUserModel.getProperty("/ENABLE_RESCHEDULE_BUTTON")) {
				return;
			};
			if (this.oViewModel.getProperty("/sViewRoute") === "NEWGANTT") {
				oResourceDataModel = this.oGanttModel;
			}
			if (oScheduling.selectedDemandPath && oScheduling.selectedResources && (oScheduling.selectedResources.length > 0) && oScheduling.aSelectedDemandPath.length === 1) {
				this.oViewModel.setProperty("/Scheduling/bEnableReschedule", true);
				return;
			}
			this.oViewModel.setProperty("/Scheduling/bEnableReschedule", false);
			return;
		},
		/**
		 * This method is used to display the validation messages once the Re-Schedule 
		 * button is enabled.
		 * This method is applicable for the demands, gantt chart and maps view.
		 * @return {boolean} - 'false' if validation not met | 'true' validation met.
		 */
		validateReScheduleAfterPress: function () {
			var oScheduling = this.oViewModel.getProperty("/Scheduling"),
				oResourceDataModel = this.oDataModel,
				sRoute = this.oViewModel.getProperty("/sViewRoute");
			if (sRoute === "NEWGANTT") {
				oResourceDataModel = this.oGanttModel;
			}
			// first if we are checking if only pools are selected in the resource tree.
			if (!this._checkDuplicatePoolSelection(oResourceDataModel, oScheduling)) {
				this.showMessageToast(this.oResourceBundle.getText("ysmg.PoolSelectedError"));
				if (sRoute === "NEWGANTT") {
					this._oEventBus.publish("BaseController", "resetSelections", {});
				} else {
					this._oEventBus.publish("ManageAbsences", "ClearSelection", {});
				}
				return false;
			};

			// check if the allow re-schedule flag is enabled or not.
			oSelectedDemandItem = this.oDataModel.getProperty(oScheduling.selectedDemandPath);
			if (!oSelectedDemandItem.ALLOW_RESCHEDULE) {
				var aNonAssignableDemands = [];
				aNonAssignableDemands.push(this.getMessageDescWithOrderID(oSelectedDemandItem, null, null, true));
				this._showAssignErrorDialog(aNonAssignableDemands, null, this.oResourceBundle.getText("ymsg.invalidSelectedDemands"));
				return false;
			};
			return true;
		},

		/** 
		 *	This method will check if the selected resources contain already assigned resource to a demand for rescheduling  
		 *   @returns  Promise - String if the selected resource is already assigned to the selected demand
		 **/
		checkAssignedResource: function () {
			var sDemandPath, sSelectedDemand, aResourceList, aAssignedList = [];
			sDemandPath = this.oViewModel.getProperty("/Scheduling/selectedDemandPath");
			sSelectedDemand = this.oDataModel.getProperty(sDemandPath);
			aResourceList = this.oViewModel.getProperty("/Scheduling/resourceList"),
				aFilterResource = [];
			for (var x in aResourceList) {
				aFilterResource.push(new Filter("ResourceGuid", FilterOperator.EQ, aResourceList[x].ResourceGuid))
			}
			aFilterResource.push(new Filter("DemandGuid", FilterOperator.EQ, sSelectedDemand.Guid));
			
			//to fetch the assigned resource to the selected demand
			//we are using AssignmentSet instead of DemandSet as demandset was taking more time than assignmentset.
			return this._controller.getOwnerComponent().readData("/AssignmentSet", aFilterResource, "$select=FIRSTNAME,LASTNAME,Guid,DateFrom,DateTo,TimeFrom,TimeTo,NODE_ID").then(function (oData) {
				this.oViewModel.setProperty("/Scheduling/selectedAssignment", oData.results);				
			}.bind(this));
		},


		/**
		 * This method will check for the duplicate resource selected or not and display the error message
		 * @return {boolean} - 'true' if no duplicate found | 'false' if duplicate found
		 */
		checkDuplicateResource: function () {
			var oViewModel = this.oViewModel,
				oAppViewModel = this.oAppViewModel,
				oDataModel = this.oDataModel,
				oGanttModel = this.oGanttModel,
				aResourcePath = oViewModel.getProperty("/Scheduling/selectedResources"),
				aResourceData = [],
				oResourceObj = {},
				aResourceGroupPromise = [],
				aFilters = [],
				aResourceFilters = oViewModel.getProperty("/Scheduling/aResourceTblFilters"),
				aPoolResource = [],
				bIsPoolExist = false;


			//method will check for the duplicate resource
			var checkDuplicate = function (aResourceList) {
				var bValidateState = true,
					aResourceNameList = [],
					oUniqueResourceList = {};
				sResourceGroupName = "";
				sResourceFullName = "";
				sResourceFullNameOld = "";
				aResourceList.forEach(function (oResource) {
					if (oResource.ResourceGuid) {
						if (oUniqueResourceList[oResource.ResourceGuid]) {
							//to check for the existing resource
							sResourceFullNameOld = oResource.Description + " : " + oUniqueResourceList[oResource.ResourceGuid].Group;
							aResourceNameList.indexOf(sResourceFullNameOld) === -1 && aResourceNameList.push(sResourceFullNameOld);
							bValidateState = false;
							sResourceGroupName = this.getResourceGroupName(oResource.ParentNodeId);
							//to check the current resource
							sResourceFullName = oResource.Description + " : " + sResourceGroupName;
							aResourceNameList.indexOf(sResourceFullName) === -1 && aResourceNameList.push(sResourceFullName);

						} else {
							oUniqueResourceList[oResource.ResourceGuid] = {
								Group: this.getResourceGroupName(oResource.ParentNodeId)
							};
						}
					}
				}.bind(this));
				if (bValidateState) {
					//storing the final resource list into viewModel>/Scheduling/resourceList

					oViewModel.setProperty("/Scheduling/resourceList", aResourceList);
				}
				//sorting the list
				aResourceNameList.sort();
				return {
					bNoDuplicate: bValidateState,
					resourceNames: aResourceNameList.join("\n"),
					bIsPoolExist: bIsPoolExist,
					poolResource: aPoolResource.join("\n")
				};
			}.bind(this);
			//Read all resource selected
			aResourcePath.forEach(function (sPath) {
				if (sPath.indexOf("children") === -1) {
					oResourceObj = _.clone(oDataModel.getProperty(sPath));
				} else {
					oResourceObj = _.clone(oGanttModel.getProperty(sPath));
				}
				aFilters = [];
				if (oResourceObj.ResourceGuid) {
					aResourceData.push(oResourceObj);
				} else if (oResourceObj.NodeId.indexOf("POOL") >= 0) {
					aPoolResource.push(oResourceObj.Description);
					bIsPoolExist = true;
				} else if (oResourceObj.ResourceGroupGuid) {
					aFilters.push(new Filter("ParentNodeId", "EQ", oResourceObj.NodeId));
					if (aResourceFilters.length > 0) {
						for (var x in aResourceFilters) {
							aFilters.push(aResourceFilters[x])
						}
					}
					aResourceGroupPromise.push(this._controller.getOwnerComponent()._getData("/ResourceHierarchySet", aFilters));
				}
			}.bind(this));
			//Read all resource selected
			//Read all Resource from Resource group
			oAppViewModel.setProperty("/busy", true);
			return Promise.all(aResourceGroupPromise).then(function (aResult) {
				oAppViewModel.setProperty("/busy", false);
				aResult.forEach(function (oResult) {
					aResourceData = aResourceData.concat(oResult.results);
					aResourceData = aResourceData.filter(function (oParam1) {
						return (oParam1.NodeId.indexOf("POOL") < 0);
					});
				});
				return checkDuplicate(aResourceData);
			}.bind(this));
			//Read all Resource from Resource group

		},
		/**
		 * This method will reset the scheduling json model
		 */
		resetSchedulingJson: function () {
			var oBj = {
				sType: "",
				sScheduleDialogTitle: "",
				sScheduleTableTitle: "",
				sDistanceMatrixId: "",
				bEnableReschedule: false,
				bEnableAutoschedule: false,
				SchedulingDialogFlags: {

				},
				selectedResources: null,
				selectedDemandPath: null,
				resourceList: [],
				resourceData: {},
				aSelectedDemandPath: [],
				aResourceTblFilters: [],
				demandList: [],
				demandData: {},
				minDate: moment().startOf("day").toDate(),
				maxDate: moment().add(14, "days").endOf("day").toDate(),
				startDate: "",
				endDate: "",
				startDateValue: "",
				endDateValue: "",
				initialFocusedDateValue: moment().toDate(),
				bInvalidDateRange: false,
				sInvalidDateRangeMsg: "",
				sStartDateValueState: "None",
				sEndDateValueState: "None",
				btnInsideDateRangeText: this.oResourceBundle.getText("xbut.scheduleToogleInside"),
				btnOutsideDateRangeText: this.oResourceBundle.getText("xbut.scheduleToogleOutside"),
				iSelectedResponse: 0,
				sScheduleType: "",
				bDateChanged: false,
				bSchedBtnBusy: false,
				bReSchedBtnBusy: false,
				sReSchAssignGuid: null
			}
			this.oViewModel.setProperty("/Scheduling", oBj);
		},

		/**
		 * This method will validate demands and selected resource if its eligible to Auto-Schedule
		 * @param {object} oTable 
		 * @param {Array} aSelectedRowsIdx 
		 */
		validateSelectedDemands: function (oTable, aSelectedRowsIdx) {
			var oSelectedPaths = this._checkAllowedDemands(oTable, aSelectedRowsIdx),
				oMsgParam = {};

			this.checkDuplicateResource().then(function (oResult) {
				if (oResult.bNoDuplicate) {
					oMsgParam["bIsPoolExist"] = oResult.bIsPoolExist;
					oMsgParam["sPoolNames"] = oResult.poolResource;
					if (oSelectedPaths.aNonAssignable.length > 0) {
						//show popup with list of demands who are not allow for assign
						this._showAssignErrorDialog(oSelectedPaths.aNonAssignable, null, this.oResourceBundle.getText("ymsg.invalidSelectedDemands"));

					} else if (oSelectedPaths.aPathsData.length > 0) {
						//open auto schedule wizard with selected demands
						this.oViewModel.setProperty("/Scheduling/demandList", oSelectedPaths.aPathsData);
						this.oViewModel.setProperty("/Scheduling/sType", Constants.SCHEDULING.AUTOSCHEDULING);
						var mParams = {
							entitySet: "DemandSet"
						}
						this._controller.getOwnerComponent().SchedulingDialog.openSchedulingDialog(this._controller.getView(), mParams, oMsgParam, this);
					}

				} else {
					this._showErrorMessage(this.oResourceBundle.getText("ymsg.DuplicateResource", oResult.resourceNames));
					if (oSelectedPaths.aNonAssignable.length > 0) {
						this._showAssignErrorDialog(oSelectedPaths.aNonAssignable, null, this.oResourceBundle.getText("ymsg.invalidSelectedDemands"));
					}
				}
				this.oViewModel.setProperty("/Scheduling/bSchedBtnBusy", false);
			}.bind(this));
		},

		/**
		 * Method read the Qualification, WorkSchedule, Break, Absense, Project Blocker, Assignment and store in a model
		 * Method returns the promise, and the promise will return the data
		 * @return {object}
		 */
		createScheduleData: function () {
			var aResourceList = this.oViewModel.getProperty("/Scheduling/resourceList"),
				oStartDate = this.oViewModel.getProperty("/Scheduling/startDate"),
				oEndDate = this.oViewModel.getProperty("/Scheduling/endDate"),
				aAssignmentPromise = [],
				aAssignmentFilter = [],
				aAvailabilityPromise = [],
				aAvailibilityFilter = [],
				aAllPromise = [],
				oResourceData = {};
			aResourceList.forEach(function (oResource) {
				//Read Assignment
				aAssignmentFilter = [
					new Filter("ResourceGuid", "EQ", oResource.ResourceGuid),
					new Filter("DateFrom", "GE", oStartDate),
					new Filter("DateTo", "LE", oEndDate)
				];
				aAssignmentPromise.push(this._controller.getOwnerComponent().readData("/AssignmentSet", aAssignmentFilter, {}, "idAssignmentSet"));

				//Read WorkSchedule, Break, Absense, Project Blocker
				//AvailibilityTypeGroup - A --WorkSchedule, -B --Break, -L --ProjectBlocker, -[N,O] --Absenses
				aAvailibilityFilter = [
					new Filter("ResourceGuid", "EQ", oResource.ResourceGuid),
					new Filter("DateFrom", "LE", oEndDate),
					new Filter("DateTo", "GE", oStartDate)
				];
				aAvailabilityPromise.push(this._controller.getOwnerComponent().readData("/ResourceAvailabilitySet", aAvailibilityFilter, {}, "idResourceAvailabilitySet"));
			}.bind(this));
			aAllPromise = aAssignmentPromise.concat(aAvailabilityPromise);
			this.oAppViewModel.setProperty("/busy", true);
			return Promise.all(aAllPromise).then(function (oResult) {
				this.oAppViewModel.setProperty("/busy", false);
				oResourceData = this.modelResourceData(oResult);
				this.oViewModel.setProperty("/Scheduling/resourceData", oResourceData); //storing the final modelled resource data into viewModel>/Scheduling/resourcesData
				return oResourceData;
			}.bind(this)).catch(function (oError) {
				this.oAppViewModel.setProperty("/busy", false);
				return false;
			});

		},
		/**
		 * 
		 * @param {object} aResourceData - will contain assignment, availability data
		 * @returns {object} 
		 */
		modelResourceData: function (aResourceData) {
			var aResourceList = this.oViewModel.getProperty("/Scheduling/resourceList"),
				iResourceLength = aResourceList.length,
				oTempResourceData = {},
				oResourceData = {},
				aAssignmentData = aResourceData.slice(0, iResourceLength), //reading assignment data
				aAvailabilityData = aResourceData.slice(iResourceLength, (iResourceLength * 2)); //reading availibility data
			//looping resource list to create data
			aResourceList.forEach(function (oResource, i) {
				oTempResourceData = {
					aData: oResource,
					assignments: aAssignmentData[i].results,
					breaks: [],
					workSchedules: [],
					projectBlockers: [],
					absenses: [],
					qualifications: oResource["QUALIFICATION_DESCRIPTION"] ? oResource["QUALIFICATION_DESCRIPTION"].split(",") : [] //qualification added from ResourcehierarchySet
				};
				//looping availibility data of resource to segragate based on AvailabilityTypeGroup
				aAvailabilityData[i].results.forEach(function (oAvail) {
					if (oAvail.AvailabilityTypeGroup === "A") {
						oTempResourceData["workSchedules"].push(oAvail);
					} else if (oAvail.AvailabilityTypeGroup === "B") {
						oTempResourceData["breaks"].push(oAvail);
					} else if (oAvail.AvailabilityTypeGroup === "L") {
						oTempResourceData["projectBlockers"].push(oAvail);
					} else if (oAvail.AvailabilityTypeGroup === "N" || oAvail.AvailabilityTypeGroup === "O") {
						oTempResourceData["absenses"].push(oAvail);
					}
				});
				oResourceData[oResource.ResourceGuid] = oTempResourceData;
			});

			return oResourceData;
		},
		/**
		 * Method will create and return hash map data fro seleted demand for Auto/Re-schedule
		 * Hash map will have demand guid as key
		 * Hash map will have object with location, qualification, priority, serviceTime as value
		 * Method returns propmise, promise will return hash map
		 * @returns {object} 
		 */
		createDemandScheduleData: function () {
			var aDemandList = this.oViewModel.getProperty("/Scheduling/demandList"),
				oTempDemandData = {},
				oDemandData = {};
			return new Promise(function (resolve, reject) {
				var iServiceTime;
				aDemandList.forEach(function (oDemand) {
					
					iServiceTime = this._getDemandDurationInSeconds(oDemand.oData.DURATION, oDemand.oData.DURATION_UNIT);
					
					oTempDemandData = {
						"data": oDemand.oData,
						"location": {
							"x": oDemand.oData.LONGITUDE,
							"y": oDemand.oData.LATITUDE
						},
						"qualification": oDemand.oData.QUALIFICATION_DESCRIPTION ? oDemand.oData.QUALIFICATION_DESCRIPTION.split(",") : [],
						"priority": oDemand.oData.DEMAND_WEIGHTAGE ? parseInt(oDemand.oData.DEMAND_WEIGHTAGE) : 0,
						"serviceTime": iServiceTime
					}
					oDemandData[oDemand.oData.Guid] = oTempDemandData;
				}.bind(this));
				this.oViewModel.setProperty("/Scheduling/demandData", oDemandData);
				resolve(oDemandData);
			}.bind(this));

		},

		/**
		 * loop all demands in wizard and check if they are out of selected dates
		 * @param {Date} oStartDate 
		 * @param {Date} oEndDate 
		 * @param {boolean} bEndDateChanged 
		 */
		validateDemandDateRanges: function (oStartDate, oEndDate, bEndDateChanged) {
			var oSchedulingModel = this._controller.getModel("SchedulingModel"),
				startDate = (oStartDate && !isNaN(oStartDate)) ? moment(oStartDate) : null,
				endDate = (oEndDate && !isNaN(oEndDate)) ? moment(oEndDate) : null,
				aDemands = oSchedulingModel.getProperty("/step1/dataSet"),
				inside = 0,
				outside = 0;
			this.oViewModel.setProperty("/Scheduling/bDateChanged", bEndDateChanged);
			if (startDate) {
				//when enddate datepicker opens set new focused date
				this.oViewModel.setProperty("/Scheduling/initialFocusedDateValue", oStartDate);
				//max date for datepicker is always startdate + 14 days
				this.oViewModel.setProperty("/Scheduling/maxDate", moment(oStartDate).add(14, "days").endOf("day").toDate());
			}

			for (var i = 0, len = aDemands.length; i < len; i++) {
				var demandStartDate = moment(aDemands[i].DateFrom),
					demandEndDate = moment(aDemands[i].DateTo);

				if (!startDate || !endDate) {
					//when datepickers was set empty by user
					aDemands[i].dateRangeIconStatus = IconColor.Neutral;
					aDemands[i].dateRangeStatus = MessageType.None;
					aDemands[i].dateRangeStatusText = this.oResourceBundle.getText("ymsg.scheduleDateStatusNeutral");

				} else if (demandStartDate.diff(startDate) > 0 && demandEndDate.diff(endDate) < 0) {
					//only when startdate and enddate of demand is inside of picked dates then its inside
					aDemands[i].dateRangeIconStatus = IconColor.Positive;
					aDemands[i].dateRangeStatus = MessageType.Success;
					aDemands[i].dateRangeStatusText = this.oResourceBundle.getText("ymsg.scheduleDateStatusPositiv");
					++inside;

				} else {
					//when start date or end date is outside selected range
					aDemands[i].dateRangeIconStatus = IconColor.Negative;
					aDemands[i].dateRangeStatus = MessageType.Error;
					aDemands[i].dateRangeStatusText = this.oResourceBundle.getText("ymsg.scheduleDateStatusNegativ");
					++outside;
				}
			}
			oSchedulingModel.setProperty("/step1/dataSet", aDemands);
			oSchedulingModel.setProperty("/inside", inside);
			oSchedulingModel.setProperty("/outside", outside);
			oSchedulingModel.refresh();    //required as sometimes the change in the model is not getting reflected

			this.validateDateSchedule(startDate, endDate, bEndDateChanged);
		},
		/** This method is used to validate the dates -
		 * 	1. checks if dates are empty 
		 *  2. checks if the diff b/w start and end date is not more than 14 days
		 *  @param {object} startDate 
		 *  @param {object} endDate
		 *  @param {boolean} bEndDateChanged
		 *  @return {boolean} - 'false' if validation fails | 'true' if validations meets the criteria.
		 */
		validateDateSchedule: function (startDate, endDate, bEndDateChanged) {
			var oMinDate = this.oViewModel.getProperty("/Scheduling/minDate");
			var oMaxDate = this.oViewModel.getProperty("/Scheduling/maxDate");
			var bValidate = true;
			if (!startDate) {
				bValidate = false;
				this.oViewModel.setProperty("/Scheduling/sStartDateValueState", "Error");
				return bValidate
			}
			if (!endDate) {
				bValidate = false;
				this.oViewModel.setProperty("/Scheduling/sEndDateValueState", "Error");
				return bValidate
			}
			if (startDate.toDate() < oMinDate || startDate.toDate() > oMaxDate) {
				bValidate = false;
				this.showMessageToast(this.oResourceBundle.getText("ymsg.ValidateDateStart"));
				return bValidate;
			}
			if (startDate && endDate) {
				//check if endDate before startDate
				//check if end date bigger than 14 days
				if ((endDate.diff(startDate) < 0)) {
					if (bEndDateChanged) {
						this.showMessageToast(this.oResourceBundle.getText("ymsg.DateFromErrorMsg"));
						bValidate = false;

					} else {
						this.showMessageToast(this.oResourceBundle.getText("ymsg.DateToErrorMsg"));
						bValidate = false
					}
				} else if (endDate.diff(startDate, 'days') > 13) {
					if (bEndDateChanged) {
						this.showMessageToast(this.oResourceBundle.getText("ymsg.ValidateDateEnd"));
					} else {
						this.showMessageToast(this.oResourceBundle.getText("ymsg.ValidateDateStart"));
					}
					bValidate = false;
				}
			}
			return bValidate;
		},
		/**
		 * On refresh of the resource table we have to call this method reset the resource data
		 * so that we can 
		 */
		resetResourceForScheduling: function () {
			this.oViewModel.setProperty("/Scheduling/selectedResources", []);
			this.validateScheduleButtons();
			this.validateReScheduleButton();
		},
		/**
		 * This method gets trigerred from the resource tree table on before bind method 
		 * of demand and maps view. We are setting the filters of start and end date to the 
		 * scheduling model so that we can use the values in check duplicate method.
		 * @param {Array} aParam
		 */
		setResourceTreeFilter: function (aParam) {
			var aSchedulingFilter = [];
			if (aParam instanceof Array) {
				aSchedulingFilter = aParam.filter(function (mParam1) {
					return (mParam1.sPath === "StartDate" || mParam1.sPath === "EndDate");
				});
			}
			this.oViewModel.setProperty("/Scheduling/aResourceTblFilters", aSchedulingFilter);
		},

		/**
		 * This method to handle payload creation
		 * @return {Object} - Payload object
		 */
		handleScheduleDemands: function () {
			var aResourceData, aDemandsData,
				sDialogMsg = this.oResourceBundle.getText("ymsg.fetchingData");
			this.oOwnerComponent.ProgressBarDialog.setProgressData({
				description: sDialogMsg
			});
			return Promise.all([this.createScheduleData(), this.createDemandScheduleData()]).then(function (aResult) {
				this.oOwnerComponent.ProgressBarDialog.setProgressData({
					progress: "10"
				});
				aResourceData = aResult[0];
				aDemandsData = aResult[1];
				return this.oOwnerComponent.SchedulingMapProvider.getPTVPayload(aResourceData, aDemandsData);
			}.bind(this)).then(function (aPayload) {
				if (!aPayload) {
					return;
				} else {
					return Promise.all([this.oOwnerComponent.SchedulingMapProvider.callPTVPlanTours(aPayload), aResourceData, aDemandsData]);
				}
			}.bind(this));
		},

		/**
		 * 
		 * @param {string} sResourceGuid - Resource guid of the child node of which group name is required
		 * @returns {string} sResourceGroupName - Resource Group name of the child node
		 */
		getResourceGroupName: function (sParentNodeId) {
			var sResourceGroupName, sCurrentView, sModelName;
			sCurrentView = this.oViewModel.getProperty("/sViewRoute");
			sCurrentView === "NEWGANTT" ? sModelName = "GanttResourceHierarchySet" : sModelName = "ResourceHierarchySet";
			sResourceGroupName = this.oDataModel.getProperty("/" + sModelName + "('" + sParentNodeId + "')").Description;
			return sResourceGroupName;
		},
		/**
		 * This method is used to handle the create assignment for the PTV selected Demands.
		 * @param {object} oDialog - This has the referrence of the scheduling dialog.
		 */
		handleCreateAssignment: function (oModelDialog) {
			//1. get the existing data from the model.
			//2.send the call for the assignemnt.

			var iArraySize = 100;
			var sViewRoute = this.oViewModel.getProperty("/sViewRoute"),
				mRefreshParam = {},
				oAssignment = this.oViewModel.getProperty("/Scheduling/selectedAssignment"),
				oPlanData = oModelDialog.getProperty("/step2/dataSet")[0],
				sMessage;

			if (oModelDialog.getProperty("/isReschuduling") && oAssignment.length && oPlanData.ResourceGuid === oAssignment[0].NODE_ID.split("//")[0] && oAssignment[0].DateFrom.toString().substr(0, 21) === oPlanData.DateFrom.toString().substr(0, 21)) {
				sMessage = this.oResourceBundle.getText("ymsg.alreadyAssigned", oPlanData.ORDERID) + oAssignment[0].FIRSTNAME + " " + oAssignment[0].LASTNAME ;
				this.showMessageToast(sMessage);				
				return Promise.all([]);
			} 

			if (sViewRoute === "NEWGANTT") {
				mRefreshParam.bFromNewGantt = true;
			} else if (sViewRoute === "MAP") {
				mRefreshParam.bFromMap = true
			} else {
				mRefreshParam.bFromHome = true;
			}
			//this is written to store the updated resources data so that we can refresh it inside the gantt view
			if(sViewRoute !== "NEWGANTT"){
				this._fnStoreUpdatedDemandResources(oModelDialog);
			}

			var oDataArr = this._getDemandsDataForAssignment(oModelDialog);

			return Promise.all(oDataArr).then(function (oResponse) {
				this.afterUpdateOperations(mRefreshParam);
				return oResponse;
			}.bind(this));

		},
		/**
		 * This method is used to call the assignment to get the assignment guid which will be required for the 
		 * update assignment call at the time of re-schedule functionality.
		 * @param {object} mParam model to ge the 
		 * @param mParam {object} this is the parmeter from the last function and this is used to reuturn on sucessfull retrival of the assignment guid.
		 * @return {boolean} true.
		 */
		getAssignmentIdForReschedule: function () {
			var sDemandPath, sSelectedDemand, aResourceList, aAssignedList = [];
			sDemandPath = this.oViewModel.getProperty("/Scheduling/selectedDemandPath");
			sSelectedDemand = this.oDataModel.getProperty(sDemandPath);
			aFilterResource = [];
			aFilterResource.push(new Filter("DemandGuid", FilterOperator.EQ, sSelectedDemand.Guid));
			
			return this._controller.getOwnerComponent().readData("/AssignmentSet", aFilterResource, "$select=Guid").then(function (oData) {
				
				if (oData.results.length > 0) {
					this.oViewModel.setProperty("/Scheduling/sReSchAssignGuid", oData.results[0].Guid);
				}
				
				return true;
				
			}.bind(this));
		},
		showViolationError: function () {

			if (!this.oOwnerComponent.ViolationDisplayDialog) {
				Fragment.load({
					name: "com.evorait.evoplan.view.scheduling.fragments.ViolationDisplayDialog",
					controller: this,
					type: "XML"
				}).then(function (ViolationDisplayDialog) {
					this._controller.getView().addDependent(ViolationDisplayDialog)
					this.oOwnerComponent.ViolationDisplayDialog = ViolationDisplayDialog;
					ViolationDisplayDialog.open();
				}.bind(this));
			} else {
				this.oOwnerComponent.ViolationDisplayDialog.open();
			}
		},
		closeViolationDisplayDialog: function () {
			this.oOwnerComponent.ViolationDisplayDialog.close();
		},

		/* =========================================================== */
		/* Private methods                                              */
		/* =========================================================== */
		/**
		 * This method will check for the Allowed flag for each selected Demands
		 * @return {Object} - Array of allowed and not allowed demands in separate properties
		 */
		_checkAllowedDemands: function (oTable, aSelectedRowsIdx) {


			var aPathsData = [],
				aNonAssignableDemands = [],
				oData, oContext, sPath, aSelection = [], nDuration;

			oTable.clearSelection();

			for (var i = 0; i < aSelectedRowsIdx.length; i++) {
				oContext = oTable.getContextByIndex(aSelectedRowsIdx[i]);
				sPath = oContext.getPath();
				oData = this.oDataModel.getProperty(sPath);
				nDuration = this._getDemandDurationInSeconds(oData.DURATION, oData.DURATION_UNIT);

				//Added condition to check for number of assignments to plan demands via scheduling
				if (oData.ALLOW_AUTOSCHEDULE && nDuration <= 1209600) {
					aPathsData.push({
						sPath: sPath,
						oData: oData,
						index: aSelectedRowsIdx[i]
					});

					aSelection.push(aSelectedRowsIdx[i]);
				} else {
					aNonAssignableDemands.push(this.getMessageDescWithOrderID(oData, null, true));
				}
			}
			if (aSelection.length > 1) {
				/* Here we are creating groups of array in sequence like [[1...n]]
					so to limit the call of addSelectionInterval based on start and end index.
				 */
				var result = aSelection.reduce((r, n) => {
					var lastSubArray = r[r.length - 1];
					if (!lastSubArray || lastSubArray[lastSubArray.length - 1] !== n - 1) {
						r.push([]);
					}
					r[r.length - 1].push(n);
					return r;
				}, []);

				for (var j = 0; j < result.length; j++) {
					if (result[j].length > 0) {
						oTable.addSelectionInterval(result[j][0], result[j][result[j].length - 1]);
					} else {
						oTable.addSelectionInterval(result[j][0], result[j][0]);
					}
				}
			}

			return {
				aPathsData: aPathsData,
				aNonAssignable: aNonAssignableDemands,
			};
		},
		/**
		 * This method will check for the Allowed flag for each selected Demands
		 * @param {object} oParamModel model to ge the 
		 * @param {object} oSchedulingObj json object from
		 * @return {boolean} It will boolean based on conditon specidied in the logic.
		 */
		_checkDuplicatePoolSelection: function (oParamModel, oSchedulingObj) {
			var aPoolSelection = oSchedulingObj.selectedResources.filter(function (mPath) {
				return (oParamModel.getProperty(mPath)["NodeId"].indexOf("POOL") > -1);
			});
			if (aPoolSelection.length !== oSchedulingObj.selectedResources.length) {
				return true;
			}
			return false;
		},
		/**
		 * This method is used to create the data of the deamnds that will be used by CreateAssignmentSet.
		 *  Here we will create array of all the demands with the service all using callfunctionImport with mParam as the 
		 * demand detail. The array retured here will later later be used for promise.all.
		 * @return {array} 
		 */
		_getDemandsDataForAssignment: function (oModelDialog) {
			var aData = oModelDialog.getProperty("/step2/dataSet"),
				sSchedulingType = this.oViewModel.getProperty("/Scheduling/sScheduleType"),
				sSchType = this.oViewModel.getProperty("/Scheduling/sType"),
				iBatchCount = this.oUserModel.getProperty("/DEFAULT_PTV_SCHEDUL_BATCH_SIZE"),
				sGroupId,
				mParams,
				i = 0,
				oBjectInitial,
				aNewArray = [],
				bIsLast = false,
				aPropReq,
				sFunctionImp,
				mParam2="Scheduling";


			iBatchCount = iBatchCount ? parseInt(iBatchCount) : 100;
			for (var x = 0; x < aData.length; x++) {
				if (x % iBatchCount === 0) {
					sGroupId = "groupId" + i;
					mParams = {
						batchGroupId: sGroupId
					};
					i++;
				}
				if (x === (aData.length - 1)) {
					bIsLast = true;
				}
				if (aData[x].PLANNED) {
					if (sSchType === Constants.SCHEDULING.AUTOSCHEDULING) {
						sFunctionImp = "CreateAssignment";
						aPropReq = ["DemandGuid", "ResourceGroupGuid", "ResourceGuid", "DateFrom", "TimeFrom", "DateTo", "TimeTo", "Effort", "EffortUnit"];
						aData[x].TimeFrom.ms = aData[x].DateFrom.getTime();
						aData[x].TimeTo.ms = aData[x].DateTo.getTime();
						oBjectInitial = Object.assign({}, aData[x]);
						Object.keys(oBjectInitial).forEach(function (key) {
							if (aPropReq.indexOf(key) < 0) {
								delete oBjectInitial[key];
							};
						});
						oBjectInitial.MapAssignmentType = sSchedulingType;
						// Adding travel time to Pass to create assignment call
						// converting it into minutes as in Backend travel time unit is hardcoded as 'MIN'
						oBjectInitial.TravelTime = (aData[x].TRAVEL_TIME * 60).toFixed(2);
						oBjectInitial.TravelBackTime = (aData[x].TRAVEL_BACK_TIME * 60).toFixed(2);
						aNewArray.push(this._callFunctionImportScheduling(oBjectInitial, sFunctionImp, "POST", mParams,bIsLast));
					} else {
						sFunctionImp = "UpdateAssignment";
						aPropReq = ["ResourceGroupGuid", "ResourceGuid", "DateFrom", "TimeFrom", "DateTo", "TimeTo", "Effort", "EffortUnit"];
						aData[x].TimeFrom.ms = aData[x].DateFrom.getTime();
						aData[x].TimeTo.ms = aData[x].DateTo.getTime();
						oBjectInitial = Object.assign({}, aData[x]);
						Object.keys(oBjectInitial).forEach(function (key) {
							if (aPropReq.indexOf(key) < 0) {
								delete oBjectInitial[key];
							};
						});
						oBjectInitial.MapAssignmentType = sSchedulingType;
						oBjectInitial.AssignmentGUID = this.oViewModel.getProperty("/Scheduling/sReSchAssignGuid");
						
						// Adding travel time to Pass to create assignment call
						// converting it into minutes as in Backend travel time unit is hardcoded as 'MIN'
						oBjectInitial.TravelTime = (aData[x].TRAVEL_TIME * 60).toFixed(2);
						oBjectInitial.TravelBackTime = (aData[x].TRAVEL_BACK_TIME * 60).toFixed(2);
						aNewArray.push(this._callFunctionImportScheduling(oBjectInitial, sFunctionImp, "POST", mParams,bIsLast));
					}

				}
			};

			return aNewArray;
		},
		/**
     * This method is used to call function import and returns the function import as promise.
     * @param {json} oParams -JSON that is passed as url parameter.
     * @param {string} sFuncName - function name to be called.
     * @param {string} sMethod - method it could be post or anyother.
     * @param {object} mRefreshParam - this method is passed to afterUpdateOperations method
     */
		_callFunctionImportScheduling: function (oData, sFuncName, sMethod, mParams, bIsLast) {
			// TODO. 1 check for utilization
			// 2. check for message toast to be displyaed after the success of this call
			// 3. Refractor this code.
	  
			return new Promise(function (resolve, reject) {
			  var oModel = this.oDataModel,
				oViewModel = this.oAppViewModel,
				oResourceBundle = this.oResourceBundle;
	  
			  oViewModel.setProperty("/busy", true);
			  oModel.callFunction("/" + sFuncName, {
				method: sMethod || "POST",
				urlParameters: oData,
				batchGroupId: mParams.batchGroupId,
				refreshAfterChange: false,
				success: function (oData, oResponse) {
				  //Handle Success
				  oViewModel.setProperty("/busy", false);
				  if (bIsLast) {
					this.showMessage(oResponse);
				  }
				  resolve(oData)
				}.bind(this),
				error: function (oError) {
				  //set first dragged index to set initial
				  this.oViewModel.setProperty("/iFirstVisibleRowIndex", -1);
				  if (bIsLast) {
					this.showMessageToast(oResourceBundle.getText("errorMessage"));
				  }
				  reject(oError);
				}.bind(this)
			  });
			}.bind(this))
		  },
	  
		/**
		 * This method is used to convert Duration into seconds based on duration Unit 
		 * @param {number} nDuration - Demand duration
		 * @param {string} sDurationUnit - Demand duration Unit.
		 */
		_getDemandDurationInSeconds: function (nDuration, sDurationUnit) {
			if (parseInt(nDuration)) {
				if (sDurationUnit === 'H') {
					return parseFloat(nDuration) * 3600;
				} else if (sDurationUnit === 'MIN') {
					return parseFloat(nDuration) * 60;
				} else {
					return parseFloat(nDuration) * 86400;
				}
			} else {
				return 1;
			}
		},

		/**
		 * This function is used for storing the updated resources so that 
		 * it can be used to refresh the resources in Gantt view
		 * @param {Object} oModelDialog - Dialog model; used for fetching the resource data 
		 */
		_fnStoreUpdatedDemandResources: function(oModelDialog){
			var aData = oModelDialog.getProperty("/step2/dataSet");
			aData.forEach(function (item) {
				this._updatedDmdResources(this.oViewModel, item);
			}.bind(this));				
		},
	});
});