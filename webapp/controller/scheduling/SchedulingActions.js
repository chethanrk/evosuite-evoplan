sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	'sap/ui/model/Filter',
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/IconColor",
	"sap/ui/core/MessageType"
], function (BaseController, formatter, Filter, Constants, IconColor, MessageType) {

	return BaseController.extend("com.evorait.evoplan.controller.Scheduling.SchedulingActions", {

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
		 * @return {boolean} - 'false' if only all pools are selected | 'true' if any resource/resource group is also selected
		 */
		validateScheduleAfterPress:function(){
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
				oSelectedDemandItem = this.oDataModel.getProperty(oScheduling.selectedDemandPath);
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
		 * @return {boolean} - 'false' if only all pools are selected | 'true' if any resource/resource group is also selected
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
				this.showMessageToast(this.oResourceBundle.getText("ysmg.DemandRescheduleError"));
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
			aResourceList = this.oViewModel.getProperty("/Scheduling/resourceList");

			this.oAppViewModel.setProperty("/busy", true);
			//to fetch the assigned resource to the selected demand
			return this._controller.getOwnerComponent().readData(sDemandPath, [], "$expand=DemandToAssignment").then(function (oData) {
				this.oAppViewModel.setProperty("/busy", false);
				oData.DemandToAssignment.results.forEach(function (item) {
					aResourceList.forEach(function (resourceItem) {
						if (resourceItem.ResourceGuid === item.ResourceGuid) {
							aAssignedList.push(item.RESOURCE_DESCRIPTION);
						}
					});
				});
				if (aAssignedList.length > 0) {
					return {
						bNotAssigned: false,
						resourceNames: aAssignedList.join("\n")
					}
				}
				return { bNotAssigned: true };
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
				aResourceList.forEach(function (oResource) {
					if (oResource.ResourceGuid) {
						if (oUniqueResourceList[oResource.ResourceGuid]) {
							bValidateState = false;
							aResourceNameList.indexOf(oResource.Description) === -1 && aResourceNameList.push(oResource.Description);
						} else {
							oUniqueResourceList[oResource.ResourceGuid] = true;
						}
					}
				});
				if (bValidateState) {
					//storing the final resource list into viewModel>/Scheduling/resourceList

					oViewModel.setProperty("/Scheduling/resourceList", aResourceList);
				}
				return {
					bNoDuplicate: bValidateState,
					resourceNames: aResourceNameList.join("\n"),
					bIsPoolExist: bIsPoolExist,
					poolResource: aPoolResource.join("\n")
				};
			};
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
				} else if (oResourceObj.NodeId.split(":")[0] === "POOL") {
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
				minDate: moment().add(1, "days").startOf("day").toDate(),
				maxDate: moment().add(15, "days").endOf("day").toDate(),
				startDate: null,
				endDate: null,
				initialFocusedDateValue: moment().add(1, "days").toDate(),
				bInvalidDateRange: false,
				sInvalidDateRangeMsg: "",
				btnInsideDateRangeText: this.oResourceBundle.getText("xbut.scheduleToogleInside"),
				btnOutsideDateRangeText: this.oResourceBundle.getText("xbut.scheduleToogleOutside"),
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
						this.createScheduleData();
					}

				} else {
					this._showErrorMessage(this.oResourceBundle.getText("ymsg.DuplicateResource", oResult.resourceNames));
					if (oSelectedPaths.aNonAssignable.length > 0) {
						this._showAssignErrorDialog(oSelectedPaths.aNonAssignable, null, this.oResourceBundle.getText("ymsg.invalidSelectedDemands"));
					}
				}
			}.bind(this));
		},

		/**
		 * Method read the Qualification, WorkSchedule, Break, Absense, Project Blocker, Assignment and store in a model
		 * Method returns the promise, and the promise will return the data
		 * @return {object}
		 */
		createScheduleData: function () {
			var aResourceList = this.oViewModel.getProperty("/Scheduling/resourceList"),
				oStartDate = this.oViewModel.getProperty("/Scheduling/minDate"),
				oEndDate = this.oViewModel.getProperty("/Scheduling/maxDate"),
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
				aDemandList.forEach(function (oDemand) {
					oTempDemandData = {
						"location": {
							"x": oDemand.oData.LATITUDE,
							"y": oDemand.oData.LONGITUDE
						},
						"qualification": oDemand.oData.QUALIFICATION_DESCRIPTION.split(","),
						"priority": oDemand.oData.PRIORITY ? parseInt(oDemand.oData.PRIORITY) : 0,
						"serviceTime": oDemand.oData.Effort ? (parseFloat(oDemand.oData.Effort) * 60 * 60 * 1000) : 0
					}
					oDemandData[oDemand.oData.Guid] = oTempDemandData;
				});
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
				startDate = oStartDate ? moment(oStartDate) : null,
				endDate = oEndDate ? moment(oEndDate) : null,
				aDemands = oSchedulingModel.getProperty("/step1/dataSet"),
				inside = 0,
				outside = 0;

			if (startDate && endDate) {
				//check if endDate before startDate
				//check if end date bigger than 14 days
				if ((endDate.diff(startDate) < 0) || endDate.diff(startDate, 'days') > 14) {
					if (bEndDateChanged) {
						this.oViewModel.setProperty("/Scheduling/startDate", null);
						startDate = null;
					} else {
						this.oViewModel.setProperty("/Scheduling/endDate", null);
						endDate = null;
					}
				}
			}
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
		handleScheduleDemands: function (aPayload) {
			var aResourceData = this.oViewModel.getProperty("/Scheduling/resourceData"),
				aDemandsData = {};
			var aPayload = this.oOwnerComponent.SchedulingMapProvider.getPTVPayload(aResourceData, aDemandsData);

			// After creation of payload, method to call the PTV service will be added here ;
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
				oData, oContext, sPath;

			oTable.clearSelection();

			for (var i = 0; i < aSelectedRowsIdx.length; i++) {
				oContext = oTable.getContextByIndex(aSelectedRowsIdx[i]);
				sPath = oContext.getPath();
				oData = this.oDataModel.getProperty(sPath);

				//Added condition to check for number of assignments to plan demands via scheduling
				if (oData.ALLOW_AUTOSCHEDULE) {
					aPathsData.push({
						sPath: sPath,
						oData: oData,
						index: aSelectedRowsIdx[i]
					});
					oTable.addSelectionInterval(aSelectedRowsIdx[i], aSelectedRowsIdx[i]);
				} else {
					aNonAssignableDemands.push(this.getMessageDescWithOrderID(oData, null, true));
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
		}

	});
});