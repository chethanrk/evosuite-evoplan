sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentActionsController",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/base/Log",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/model/models",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/base/util/deepClone",
	"sap/base/util/deepEqual",
	"sap/m/MessageBox"
], function (Controller, OverrideExecution, Log, Fragment, models, Filter, FilterOperator, deepClone, deepEqual, MessageBox) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.map.SingleDayPlanner", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {
				open: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onOpen: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onPressClose: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onChangeStartDate: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onDropAppointment: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onPressSaveAppointments: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onPressCalculateRoute: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onPressOptimizeRoute: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				}
			}
		},

		mTypes: {
			APPOINTMENT: "ASSIGNMENT",
			TRAVEL_BEFORE: "TravelBefore",
			TRAVEL_AFTER: "TravelAfter",
			BLOCKER: "Blocker"
		},

		oSinglePlanningModel: null,

		aOriginalData: [],
		
		init: function() {
			
		},

		/* =========================================================== */
		/* public methods                                              */
		/* =========================================================== */

		/**
		 * open single planning calendar dialog
		 */
		 
		 open: function (oView, sPath, oTreeData, sNodeType, oParentData, bFromMap) {
			// create dialog lazily
			if (!this.oPlannerDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.map.fragments.SingleDayPlanner",
					controller: this
				}).then(function (content) {
					this.oPlannerDialog = content;
					// get legend for assignments and unavailabilies from Gantt Chart
					oView.getModel("appView").setProperty("/busy", false);
					this.onOpen(oView, sPath, oTreeData, sNodeType, oParentData, bFromMap);
				}.bind(this));
			} else {
				this.onOpen(oView, sPath, oTreeData, sNodeType, oParentData, bFromMap);
			}
		},
		 
		onOpen: function (oView, sPath, oTreeData, sNodeType, oParentData, bFromMap) {
			this.oParentController = oView.getController();
			
			oView.addDependent(this.oPlannerDialog);
			this.oPlannerDialog.addStyleClass(this.oParentController.getOwnerComponent().getContentDensityClass());
			
			this.oResourceBundle = this.oParentController.getResourceBundle();
			this.oSinglePlanner = sap.ui.getCore().byId("idSinglePlanningCalendar");
			this.oSelectedData = oTreeData;
			this.sSelectedPath = sPath;
			this._bFromMap = bFromMap;
			this.oUserModel = this.oParentController.getModel("user");
			
			this.oSinglePlanningModel = oView.getController().getOwnerComponent().getModel("mapSinglePlanning");
			
			//set view for this calendar base on NodeType
			this._setCalenderViews(sNodeType);
			this.oSinglePlanningModel.setProperty("/startDate", oTreeData.StartDate);
			this.oSinglePlanningModel.setProperty("/parentData", oParentData);
			this.oSinglePlanningModel.setProperty("/startHour", parseInt(this.oUserModel.getProperty("/DEFAULT_SINGLE_PLNNR_STARTHR")) || 0);
			this.oSinglePlanningModel.setProperty("/endHour", parseInt(this.oUserModel.getProperty("/DEFAULT_SINGLE_PLNNR_ENDHR")) || 24);
			this.oSinglePlanningModel.setProperty("/appointments", []);
			this.oPlanningDate = oTreeData.StartDate;

			//load all unavailabilities and blockers for this day
			this._loadAvailabilitiesForDay(oTreeData.StartDate);

			if (oTreeData.ChildCount > 0) {
				//load assignments for this day, resource and resource group
				this._loadAssignmentsForDay(oTreeData);
			}
			this._loadLegendData();
			this.oSinglePlanningModel.setProperty("/overallTravelTime", 0);
			this.oPlannerDialog.open();
		},

		/**
		 * show full day or only working hour day
		 */
		toggleFullDay: function () {
			this.oSinglePlanner.setFullDay(!this.oSinglePlanner.getFullDay());
		},

		/**
		 * Close single planning calendar dialog
		 * When there are some unsaved changes user has to decide between:
		 * Yes - Save changes for last visible date and close dialog
		 * Abort - Review changes for last visible date
		 * No - Reset last changes and close dialog 
		 * 
		 * @param {object} oEvent - button close press in dialog
		 */
		onPressClose: function (oEvent) {
			var sMsg = this.oResourceBundle.getText("ymsg.saveDayChangesConfirm", [moment(this.oPlanningDate).format("DD MMM YYYY")]),
				sDiscardMsg = this.oResourceBundle.getText("ymsg.discardAssignmentsConfirm");
			//check if there was changes for appointments before loading new
			if (this.oSinglePlanningModel.getProperty("/hasChanges")) {
				var reviewFn = function () {
					//go back to old date for review appointments
					this.oSinglePlanningModel.setProperty("/startDate", this.oPlanningDate);
				};
				var yesFn = function () {
					//save changes of assignments afterwards close dialog
					this._saveChangedAssignments(function () {
						this.oPlannerDialog.close();
					}.bind(this));
				};
				var noFn = function () {
					//don't save and just close dialog
					this._unAssignDraggedDemands(sDiscardMsg);
				};
				this._showConfirmMessage(sMsg, yesFn.bind(this), reviewFn.bind(this), noFn.bind(this));
			} else {
				this._unAssignDraggedDemands(sDiscardMsg);
			}
		},
		/**
		 * Unassign dragged demands when user dont want to plan them
		 * 
		 * @Author Rahul
		 * 
		 */
		_unAssignDraggedDemands: function (sDiscardMsg) {
			var oViewModel = this.oParentController.getModel("viewModel");
			if (!this._bFromMap) {
				this.oPlannerDialog.close();
				return;
			}
			if (this.oUserModel.getProperty("/ENABLE_DISCARD_ASGN_CHECK") && !oViewModel.getProperty("/mapSettings/bIsSignlePlnAsgnSaved")) {
				this.showConfirmMessageBox.call(this.oParentController, sDiscardMsg, function (sAction) {
					if (sAction === "YES") {
						this._unAssignAssigments();
					} else {
						this.oPlannerDialog.close();
						var oEventBus = sap.ui.getCore().getEventBus();
						oEventBus.publish("BaseController", "refreshMapView", {});
						oEventBus.publish("BaseController", "resetMapSelection", {});
						oEventBus.publish("BaseController", "refreshMapTreeTable", {});
					}
				}.bind(this));
			} else {
				this.oPlannerDialog.close();
			}
		},

		/**
		 * Get all assignments when day navigation happens
		 * When there are some unsaved changes ask user if he wants save last changes
		 * Choices: 
		 * Yes - Save changes for last visible date and show new date appointments
		 * Abort - Review changes for last visible date
		 * No - Reset last changes and show new date appointments 
		 * 
		 * @param {object} oEvent - startDate is changed while navigating in the SinglePlanningCalendar
		 */
		onChangeStartDate: function (oEvent) {
			var newDate = oEvent.getParameter("date"),
				sMsg = this.oResourceBundle.getText("ymsg.saveDayChangesConfirm", [moment(this.oPlanningDate).format("DD MMM YYYY")]);
			//check if there was changes for appointments before loading new
			if (this.oSinglePlanningModel.getProperty("/hasChanges")) {
				var reviewFn = function () {
					//go back to old date for review appointments
					this.oSinglePlanningModel.setProperty("/startDate", this.oPlanningDate);
				};
				var yesFn = function () {
					//save changes of assignments and load for new date assignment
					this._saveChangedAssignments(function () {
						this._setNewDateAndLoad(newDate);
					}.bind(this));
				};
				var noFn = function () {
					//don't save and just load new date assignments
					this._setNewDateAndLoad(newDate);
				};
				this._showConfirmMessage(sMsg, yesFn.bind(this, newDate), reviewFn.bind(this), noFn.bind(this, newDate));
			} else {
				this._setNewDateAndLoad(newDate);
			}
		},

		/**
		 * Move appointment to another time
		 * and set also their travel times new
		 * 
		 * @param {object} oEvent - 
		 */
		onDropAppointment: function (oEvent) {
			var oAppointment = oEvent.getParameter("appointment"),
				oContext = oAppointment.getBindingContext("mapSinglePlanning"),
				oResource = null;

			if (oContext) {
				this.oSinglePlanner.setBusy(true);
				var oData = oContext.getObject();
				if (oData.type === this.mTypes.APPOINTMENT) {
					if (!oData.Demand.ASGNMNT_CHANGE_ALLOWED || oData.FIXED_APPOINTMENT) {
						this.oParentController.showMessageToast(this.oResourceBundle.getText("ymsg.notAllowedChangeAssign"));
					} else {

						oAppointment.setStartDate(oEvent.getParameter("startDate"));
						oAppointment.setEndDate(oEvent.getParameter("endDate"));

						var aAssignments = this._getOnlyAppointmentsByKeyValue("type", this.mTypes.APPOINTMENT);
						oResource = aAssignments[0].Resource;

						this.oParentController.getOwnerComponent().MapProvider.calculateRoute(oResource, aAssignments)
							.then(function (aUpdatedAssignments) {
								this._setAssignmentsData(aUpdatedAssignments);
								this.oSinglePlanningModel.setProperty("/hasChanges", true);
								this.oSinglePlanner.setBusy(false);
						}.bind(this)).catch(function(oError) {
							Log.error(oError.message);
							this.oSinglePlanner.setBusy(false);
						}.bind(this));
					}
				} else if (oData.type === this.mTypes.BLOCKER) {
					this.oParentController.showMessageToast(this.oResourceBundle.getText("ymsg.notAllowedChangeUnavailable"));
				}
				this.oSinglePlanner.setBusy(false);
			}
		},

		/**
		 * Save new start,end dates for assignments
		 * @param {object} oEvent
		 */
		onPressSaveAppointments: function (oEvent) {
			var oViewModel = this.oParentController.getModel("viewModel");
			this._saveChangedAssignments(function () {
				oViewModel.setProperty("/mapSettings/bIsSignlePlnAsgnSaved", true);
				this._loadAssignmentsForDay(this.oSelectedData); // TODO: _loadAssignmentsForDay called multiple times after saving. Find out, what's wrong.
				
			}.bind(this));
		},

		/**
		 * cancel changes in planner for this day
		 * @param {object} oEvent
		 */
		onPressCancelAppointments: function (oEvent) {
			this.oSinglePlanningModel.setProperty("/appointments", this.aOriginalData);
			this.oSinglePlanningModel.setProperty("/hasChanges", false);
		},

		/**
		 * 
		 * @param {object} oEvent
		 */
		onPressCalculateRoute: function (oEvent) {
			var oStartDate = this.oSinglePlanningModel.getProperty("/startDate");
			var aAssignments = this._getOnlyAppointmentsByKeyValue("type", this.mTypes.APPOINTMENT);
			if (aAssignments.length > 0) {
				this.oSinglePlanner.setBusy(true);
				this.oParentController.getOwnerComponent().MapProvider.calculateRoute(
					aAssignments[0].Resource, aAssignments, oStartDate)
					.then(function(aUpdatedAssignments) {
						this._setAssignmentsData(aUpdatedAssignments);
						this.oSinglePlanningModel.setProperty("/hasChanges", true);
						this.oSinglePlanner.setBusy(false);
					}.bind(this)).catch(function(oError) {
						Log.error(oError.message);
						this.oSinglePlanner.setBusy(false);
					}.bind(this));
			}
		},

		/**
		 * @param {object} oEvent - 
		 */
		onPressOptimizeRoute: function (oEvent) {
			var aAssignments = this._getOnlyAppointmentsByKeyValue("type", this.mTypes.APPOINTMENT);
			if (aAssignments.length > 0) {
				var sResourceLong = aAssignments[0].Resource.LONGITUDE,
					sResourceLat = aAssignments[0].Resource.LATITUDE;
			}
			if (aAssignments.length > 0) {
				this.oSinglePlanner.setBusy(true);
				this.oParentController.getOwnerComponent().MapProvider.optimizeRoute(
						aAssignments[0].Resource, aAssignments)
					.then(function (aUpdatedAssignments) {
						this._setAssignmentsData(aUpdatedAssignments);
						this.oSinglePlanningModel.setProperty("/hasChanges", true);
						this.oSinglePlanner.setBusy(false);
						this.oParentController.showMessageToast(this.oResourceBundle.getText("ymsg.routeOptimized"));
					}.bind(this)).catch(function(oError) {
						Log.error(oError.message);
						this.oSinglePlanner.setBusy(false);
					}.bind(this));
			}
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * get special appointsments filtered by property key and value
		 * @param {string} oEvent - key of object
		 * @param {string} oEvent - value for key
		 */
		_getOnlyAppointmentsByKeyValue: function (sKey, sValue) {
			var aAppointments = this.oSinglePlanningModel.getProperty("/appointments");
			return aAppointments.filter(function (el) {
				return el[sKey] === sValue;
			});
		},

		/**
		 * set new start date for planning calender 
		 * and load assignments for this day
		 * @param {object} oDate
		 */
		_setNewDateAndLoad: function (oDate) {
			this.oPlanningDate = oDate;
			this.oSinglePlanningModel.setProperty("/appointments", []);
			this._loadAssignmentsForDay(this.oSelectedData);
			this._loadAvailabilitiesForDay(this.oPlanningDate);
		},

		/**
		 * show confirmation dialog with multiple choice of yes, abort, no
		 * @param {string} sMsg - message for confirmation
		 * @param {callback} yesFn - what happens on yes
		 * @param {callback} abortFn - what happens on abort
		 */
		_showConfirmMessage: function (sMsg, yesFn, abortFn, noFn) {
			var btnReview = this.oResourceBundle.getText("xbut.review");
			MessageBox.confirm(
				sMsg, {
					styleClass: this.oParentController.getOwnerComponent().getContentDensityClass(),
					icon: MessageBox.Icon.CONFIRM,
					title: this.oResourceBundle.getText("xtit.confirm"),
					actions: [MessageBox.Action.YES, btnReview, MessageBox.Action.NO],
					onClose: function (oAction) {
						if (oAction === MessageBox.Action.YES) {
							yesFn();
						} else if (oAction === btnReview) {
							abortFn();
						} else if (oAction === MessageBox.Action.NO) {
							noFn();
						}
					}
				}
			);
		},

		/**
		 * @param {string} sType
		 */
		_setCalenderViews: function (sType) {
			if (sType === "TIMEDAY" && !this._oDayView) {
				this._oDayView = new sap.m.SinglePlanningCalendarDayView({
					title: "Day",
					key: sType
				});
				this.oSinglePlanner.addView(this._oDayView);
			} else if (sType === "TIMEWEEK" && !this._oWeekView) {
				this._oWeekView = new sap.m.SinglePlanningCalendarDayView({
					title: "Week",
					key: sType
				});
				this.oSinglePlanner.addView(this._oWeekView);
			}
		},

		/**
		 * save all changed appointments 
		 * after save success callback function is executed
		 * @param {callback} successFn
		 */
		_saveChangedAssignments: function (successFn) {
			var aAppointments = this.oSinglePlanningModel.getProperty("/appointments"),
				oModel = this.oParentController.getModel();

			if (this.oSinglePlanningModel.getProperty("/hasChanges")) {
				//check all changes for appointments
				aAppointments.forEach(function (oItem) {
					if (oItem.type === this.mTypes.APPOINTMENT) {
						var originData = _.find(this.aOriginalData, function (origObj) {
							return origObj.Guid === oItem.Guid;
						});
						if (originData && (originData.DateTo.getTime() !== oItem.DateTo.getTime() ||
								oItem.TRAVEL_TIME !== originData.TRAVEL_TIME ||
								oItem.TRAVEL_BACK_TIME !== originData.TRAVEL_BACK_TIME)) {

							oModel.setProperty(oItem.sModelPath + "/DateTo", oItem.DateTo);
							oModel.setProperty(oItem.sModelPath + "/DateFrom", oItem.DateFrom);
							oModel.setProperty(oItem.sModelPath + "/TRAVEL_TIME", oItem.TRAVEL_TIME);
							oModel.setProperty(oItem.sModelPath + "/TRAVEL_BACK_TIME", oItem.TRAVEL_BACK_TIME);
							// TODO: write real distance values to the properties
							oModel.setProperty(oItem.sModelPath + "/DISTANCE", oItem.DISTANCE);
							oModel.setProperty(oItem.sModelPath + "/DISTANCE_BACK", oItem.DISTANCE_BACK);

							//save changed assignment
							this.oSinglePlanner.setBusy(true);
							this._updateAssignment(oModel, oItem.sModelPath).then(function (oResData) {
								this.oSinglePlanner.setBusy(false);
								if (successFn) {
									successFn();
								}
							}.bind(this));
						}
					}
				}.bind(this));
			}
		},

		/**
		 * Update changed data from assignment
		 * @param {object} oModel - oData Model
		 * @param {string} sPath - path of assignment
		 */
		_updateAssignment: function (oModel, sPath) {
			var oData = oModel.getProperty(sPath),
				oParams = {
					DateFrom: oData.DateFrom || 0,
					TimeFrom: {
						__edmtype: "Edm.Time",
						ms: oData.DateFrom.getTime()
					},
					DateTo: oData.DateTo || 0,
					TimeTo: {
						__edmtype: "Edm.Time",
						ms: oData.DateTo.getTime()
					},
					AssignmentGUID: oData.Guid,
					TravelTime: oData.TRAVEL_TIME,
					TravelBackTime: oData.TRAVEL_BACK_TIME,
					Distance: oData.DISTANCE,
					DistanceBack: oData.DISTANCE_BACK,
					EffortUnit: oData.EffortUnit,
					Effort: oData.Effort,
					ResourceGroupGuid: oData.ResourceGroupGuid,
					ResourceGuid: oData.ResourceGuid
				};
			return this.oParentController.executeFunctionImport(oModel, oParams, "UpdateAssignment", "POST", null, true);
		},

		/**
		 * get legend colors and description from Gantt Chart legend set
		 */
		_loadLegendData: function () {
			var aLegendAppointmentItems = this.oSinglePlanningModel.getProperty("/legendAppointmentItems"),
				aLegendItems = this.oSinglePlanningModel.getProperty("/legendItems");

			//add travel time legend to appointments
			aLegendAppointmentItems.push({
				CharactersticDescription: this.oResourceBundle.getText("xlab.appointTravel"),
				Colourcode: this.oUserModel.getProperty("/DEFAULT_TRAVEL_TIME_COLOR")
			});

			this.oParentController.getOwnerComponent().readData("/GanttLegendSet", []).then(function (oResults) {
				oResults.results.forEach(function (oItem) {
					if (oItem.CharactersticCode === "STATUS") {
						//is legend for assignment
						aLegendAppointmentItems.push(oItem);
					} else {
						aLegendItems.push(oItem);
					}
				}.bind(this));
			}.bind(this));
		},

		/**
		 * load all availble times, blockers, trainings etc.
		 * When its available worktime set startHour and endHour
		 * Other types will be added as appointments
		 * 
		 * @param oDate - date for availabilitites
		 */
		_loadAvailabilitiesForDay: function (oDate) {
			var sEntitySetPath = "/ResourceAvailabilitySet",
				aFilters = [],
				aAppointments = this.oSinglePlanningModel.getProperty("/appointments"),
				appoints = [];

			aFilters.push(new Filter("ResourceGuid", FilterOperator.EQ, this.oSelectedData.ResourceGuid));
			aFilters.push(new Filter("DateFrom", FilterOperator.EQ, moment(oDate).startOf("day").format("YYYY-MM-DDTHH:mm:ss")));
			aFilters.push(new Filter("DateTo", FilterOperator.EQ, moment(oDate).endOf("day").format("YYYY-MM-DDTHH:mm:ss")));
			var oFilter = new Filter(aFilters, true);

			this.oParentController.getOwnerComponent().readData(sEntitySetPath, [oFilter]).then(function (oResults) {
				if (oResults.results.length > 0) {
					oResults.results.forEach(function (oItem) {
						//available work time
						if (oItem.AvailabilityTypeGroup === "A") {
							this.oSinglePlanningModel.setProperty("/startHour", moment(oItem.DateFrom).hour());
							this.oSinglePlanningModel.setProperty("/endHour", moment(oItem.DateTo).hour());
						} else {
							//show all other types as own appointmen
							appoints.push({
								sModelPath: sEntitySetPath + "('" + oItem.Guid + "')",
								title: oItem.Description,
								text: moment(oItem.DateFrom).format("HH:mm") + " - " + moment(oItem.DateTo).format("HH:mm"),
								color: oItem.BlockPercentageColor || oItem.GANTT_UNAVAILABILITY_COLOR,
								icon: null,
								type: this.mTypes.BLOCKER,
								DateFrom: oItem.DateFrom,
								DateTo: oItem.DateTo
							});
						}
					}.bind(this));
					this.oSinglePlanningModel.setProperty("/appointments", aAppointments.concat(appoints));
				}
			}.bind(this));
		},

		/**
		 * Load assignments of a special resource and resource group for a special date
		 * @param {obejct} oDate - date for what day assignments should be loaded
		 */
		_loadAssignmentsForDay: function (oResourseHierachyData) {
			var sEntitySetPath = "/AssignmentSet";
			
			if (this.oParentController.oMapUtilities.getAssignmentsFiltersWithinDateFrame) {
				this.oSinglePlanningModel.setProperty("/hasChanges", false);
				this.oSinglePlanner.setBusy(true);

				var mParams = {
					"$expand": "Demand,Resource"
				};

				var oFilter = new Filter(this.oParentController.oMapUtilities.getAssignmentsFiltersWithinDateFrame(oResourseHierachyData), true);
				this.oParentController.getOwnerComponent().readData(sEntitySetPath, [oFilter], mParams).then(function (oResults) {
					this.aOriginalData = _.cloneDeep(this._setAssignmentsData(oResults.results)); // set current assignments and save it to this.aOriginalData
				}.bind(this));
			}
		},
		
		/**
		 * Create an appointments array and set it to local model according to provided assignments and its travel times.
		 * @param {com.evorait.evoplan.Assignment[]} aAssignments - array of assignments to be set to single planner
		 * @return {Object[]} array of appointments including assignments as well as travel appointments
		 */
		_setAssignmentsData: function(aAssignments) {
			var sEntitySetPath = "/AssignmentSet",
				sTravelAppointments = [],
				oTravelItem = null,
				nOverallTravelTime = 0;
				
			this.oSinglePlanner.setBusy(true);

			if (aAssignments.length && aAssignments.length > 0) {
				aAssignments.forEach(function (oAssignment, idx) {
					oAssignment.sModelPath = sEntitySetPath + "('" + oAssignment.Guid + "')";
					oAssignment.title = oAssignment.DemandDesc;
					oAssignment.text = "Effort: " + oAssignment.Effort + " " + oAssignment.EffortUnit;
					oAssignment.color = oAssignment.DEMAND_STATUS_COLOR;
					oAssignment.icon = oAssignment.DEMAND_STATUS_ICON;
					oAssignment.type = this.mTypes.APPOINTMENT;

					if (parseInt(oAssignment.TRAVEL_TIME)) {
						oTravelItem = _.cloneDeep(oAssignment);
						oTravelItem.title = this.oResourceBundle.getText("xlab.appointTravel");
						oTravelItem.text = oAssignment.TRAVEL_TIME + " " + this.oResourceBundle.getText("xlab.minutes");
						oTravelItem.color = this.oUserModel.getProperty("/DEFAULT_TRAVEL_TIME_COLOR");
						oTravelItem.icon = this.oUserModel.getProperty("/DEFAULT_TRAVEL_TIME_ICON");
						oTravelItem.DateFrom = moment(oAssignment.DateFrom).subtract(oAssignment.TRAVEL_TIME, "minutes").toDate();
						oTravelItem.DateTo = oAssignment.DateFrom;
						oTravelItem.Guid = oAssignment.Guid + "_before";
						oTravelItem.type = this.mTypes.TRAVEL_BEFORE;
						sTravelAppointments.push(oTravelItem);
						nOverallTravelTime += parseFloat(oAssignment.TRAVEL_TIME);
					}

					if (parseInt(oAssignment.TRAVEL_BACK_TIME)) {
						oTravelItem = _.cloneDeep(oAssignment);
						oTravelItem.title = this.oResourceBundle.getText("xlab.appointTravelBack");
						oTravelItem.text = oAssignment.TRAVEL_BACK_TIME + " " + this.oResourceBundle.getText("xlab.minutes");
						oTravelItem.color = this.oUserModel.getProperty("/DEFAULT_TRAVEL_TIME_COLOR");
						oTravelItem.icon = this.oUserModel.getProperty("/DEFAULT_TRAVEL_TIME_ICON");
						oTravelItem.DateFrom = oAssignment.DateTo;
						oTravelItem.DateTo = moment(oAssignment.DateTo).add(oAssignment.TRAVEL_BACK_TIME, "minutes").toDate();
						oTravelItem.Guid = oAssignment.Guid + "_after";
						oTravelItem.type = this.mTypes.TRAVEL_AFTER;
						sTravelAppointments.push(oTravelItem);
						nOverallTravelTime += parseFloat(oAssignment.TRAVEL_BACK_TIME);
					}
				}.bind(this));
			}
			var appoints = aAssignments.concat(sTravelAppointments);
			this.oSinglePlanningModel.setProperty("/appointments", appoints);
			this.oSinglePlanningModel.setProperty("/overallTravelTime", nOverallTravelTime);
			this.oSinglePlanner.rerender(); // to prevent buggy display of appointments
			this.oSinglePlanner.setBusy(false);

			return appoints;
		},
		/**
		 * Un assigning the dragged demand when user discards the planing in single planner
		 * 
		 * @Author Rahul
		 * 
		 */
		_unAssignAssigments: function () {
			var aAssignments = this.oParentController.getModel("viewModel").getProperty("/mapSettings/aAssignedAsignmentsForPlanning"),
				aPromises = [];
			for (var i in aAssignments) {
				aPromises.push(this.deleteAssignment.call(this.oParentController, this.oParentController.getModel(), aAssignments[i].Guid));
			}
			Promise.all(aPromises).then(function () {
				this.oPlannerDialog.close();
				var oEventBus = sap.ui.getCore().getEventBus();
				oEventBus.publish("BaseController", "refreshMapView", {});
				oEventBus.publish("BaseController", "resetMapSelection", {});
				oEventBus.publish("BaseController", "refreshMapTreeTable", {});
			}.bind(this));
		}
	});
});