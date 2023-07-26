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
			this.userModel = controller.getModel("user");
			this.oResourceBundle = controller.getResourceBundle();

		},

		/* =========================================================== */
		/* Public methods                                              */
		/* =========================================================== */

		/**
		 * Function to validate auto-scheduling button
		 */
		validateScheduleButtons: function () {
			var oSelectedDemandItem, oScheduling;
			oScheduling = this.oViewModel.getProperty("/Scheduling");

			//TODO - check if global config is enabled for multiple demands

			if (oScheduling.selectedDemandPath) {
				oSelectedDemandItem = this.oDataModel.getProperty(oScheduling.selectedDemandPath);
				if (oScheduling.selectedResources && (oScheduling.selectedResources.length > 0)) {
					this.oViewModel.setProperty("/Scheduling/bEnableAutoschedule", true);
				} else {
					this.oViewModel.setProperty("/Scheduling/bEnableAutoschedule", false);
				}
			} else {
				this.oViewModel.setProperty("/Scheduling/bEnableAutoschedule", false);
			}
		},
		/**
		 * Function to validate rescheduling button
		 */
		validateReScheduleButton: function () {
			var oSelectedDemandItem, oScheduling;
			oScheduling = this.oViewModel.getProperty("/Scheduling");
			if (!this.userModel.getProperty("/ENABLE_RESCHEDULE_BUTTON")) {
				return;
			}
			if (oScheduling.selectedDemandPath && oScheduling.selectedResources && (oScheduling.selectedResources.length > 0) && oScheduling.aSelectedDemandPath.length === 1) {
				oSelectedDemandItem = this.oDataModel.getProperty(oScheduling.selectedDemandPath);

				if (oSelectedDemandItem.ALLOW_REASSIGN && !(oSelectedDemandItem.NUMBER_OF_CAPACITIES > 1)) {
					this.oViewModel.setProperty("/Scheduling/bEnableReschedule",true);
					
				}else {
					this.oViewModel.setProperty("/Scheduling/bEnableReschedule", false);
				}
			} else {
				this.oViewModel.setProperty("/Scheduling/bEnableReschedule", false);
			}
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
				aFilters = [];


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
				if(bValidateState){
					//storing the final resource list into viewModel>/Scheduling/resourceList
					oViewModel.setProperty("/Scheduling/resourceList", aResourceList); 
				}
				return {
					bNoDuplicate: bValidateState,
					resourceNames: aResourceNameList.join("\n")
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
				} else if (oResourceObj.ResourceGroupGuid) {
					aFilters.push(new Filter("ParentNodeId", "EQ", oResourceObj.NodeId));
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
				selectedResources:null,
				selectedDemandPath:null,
				resourceList:[],
				resourceData:{},
				demandList: [],
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
			var oSelectedPaths = this._checkAllowedDemands(oTable, aSelectedRowsIdx);

			this.checkDuplicateResource().then(function (oResult) {
				if (oResult.bNoDuplicate) {
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
						this._controller.getOwnerComponent().SchedulingDialog.openSchedulingDialog(this._controller.getView(), mParams);
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
				oEndDate =  this.oViewModel.getProperty("/Scheduling/maxDate"),
				aAssignmentPromise=[],
				aAssignmentFilter=[],
				aAvailabilityPromise=[],
				aAvailibilityFilter=[],
				aAllPromise=[],
				oResourceData={};
		
			aResourceList.forEach(function(oResource){
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
		 * loop all demands in wizard and check if they are out of selected dates
		 * @param {Date} oStartDate 
		 * @param {Date} oEndDate 
		 * @param {boolean} bEndDateChanged 
		 */
		validateDemandDateRanges: function(oStartDate, oEndDate, bEndDateChanged){
			var oSchedulingModel = this._controller.getModel("SchedulingModel"),
				startDate = oStartDate ? moment(oStartDate) : null,
				endDate = oEndDate ? moment(oEndDate) : null,
				aDemands = oSchedulingModel.getProperty("/step1/dataSet"),
				inside = 0,
				outside = 0;

			if(startDate && endDate) {
				//check if endDate before startDate
				//check if end date bigger than 14 days
				if((endDate.diff(startDate) < 0) || endDate.diff(startDate, 'days') > 14){
					if(bEndDateChanged){
						this.oViewModel.setProperty("/Scheduling/startDate", null);
						startDate = null;
					}else{
						this.oViewModel.setProperty("/Scheduling/endDate", null);
						endDate = null;
					}	
				}
			}
			if(startDate){
				//when enddate datepicker opens set new focused date
				this.oViewModel.setProperty("/Scheduling/initialFocusedDateValue", oStartDate);
				//max date for datepicker is always startdate + 14 days
				this.oViewModel.setProperty("/Scheduling/maxDate", moment(oStartDate).add(14, "days").endOf("day").toDate());
			}

			//If its Auto scheduling
			if(oSchedulingModel.getProperty("/isAutoSchedule") || oSchedulingModel.getProperty("/isReschuduling")){
				for(var i = 0, len = aDemands.length; i < len; i++){
					var demandStartDate = moment(aDemands[i].DateFrom),
						demandEndDate = moment(aDemands[i].DateTo);
	
					if(!startDate || !endDate){
						//when datepickers was set empty by user
						aDemands[i].dateRangeIconStatus = IconColor.Neutral;
						aDemands[i].dateRangeStatus = MessageType.None;
						aDemands[i].dateRangeStatusText = this.oResourceBundle.getText("ymsg.scheduleDateStatusNeutral");
	
					} else if(demandStartDate.diff(startDate) > 0 && demandEndDate.diff(endDate) < 0){
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
			}
			
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
				if (oData.ALLOW_ASSIGN && oData.NUMBER_OF_CAPACITIES === 1 && oData.OBJECT_SOURCE_TYPE === "DEM_PMWO") {
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
	});
});