sap.ui.define([
	"sap/ui/core/mvc/Controller",
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
					overrideExecution: OverrideExecution.After
				},
				onPressClose: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Before
				},
				onChangeStartDate: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.After
				},
				onDropAppointment: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Before
				},
				onPressSaveAppointments: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Before
				},
				onPressCalculateRoute: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.After
				},
				onPressOptimizeRoute: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.After
				}
			}
		},

		mTypes: {
			APPOINTMENT: "ASSIGNMENT",
			TRAVEL_BEFORE: "TravelBefore",
			TRAVEL_AFTER: "TravelAfter"
		},

		oSinglePlanningModel: null,

		aOriginalData: [],

		/**
		 * when new single planner is initialized then fragment of dialog are loaded
		 * create new json model for Single planning calendar
		 */
		constructor: function (oController) {
			this.oParentController = oController;
			this.oResourceBundle = oController.getResourceBundle();
			this.oModel = oController.getView().getModel();
			this.oSinglePlanningModel = models.createHelperModel({
				hasChanges: false,
				appointments: []
			});
			this.oSinglePlanningModel.setDefaultBindingMode("TwoWay");
			oController.getOwnerComponent().setModel(this.oSinglePlanningModel, "mapSinglePlanning");

			if (!this.oPlannerDialog) {
				Fragment.load({
					name: "com.evorait.evoplan.view.map.fragments.SingleDayPlanner",
					controller: this
				}).then(function (content) {
					this.oPlannerDialog = content;
					oController.getView().addDependent(this.oPlannerDialog);
					this.oPlannerDialog.addStyleClass(this.oParentController.getOwnerComponent().getContentDensityClass());
				}.bind(this));
			}
		},

		/* =========================================================== */
		/* public methods                                              */
		/* =========================================================== */

		/**
		 * open single planning calendar dialog
		 */
		open: function (sPath, oTreeData, sNodeType, oParentData) {
			this.oUserModel = this.oParentController.getModel("user");
			this.oSinglePlanner = sap.ui.getCore().byId("idSinglePlanningCalendar");
			this.oSelectedData = oTreeData;
			this.sSelectedPath = sPath;
			//set view for this calendar base on NodeType
			this._setCalenderViews(sNodeType);
			this.oSinglePlanningModel.setProperty("/startDate", oTreeData.StartDate);
			this.oSinglePlanningModel.setProperty("/parentData", oParentData);
			this.oSinglePlanningModel.setProperty("/startHour", parseInt(this.oUserModel.getProperty("/DEFAULT_SINGLE_PLNNR_STARTHR")) || 0);
			this.oSinglePlanningModel.setProperty("/endHour", parseInt(this.oUserModel.getProperty("/DEFAULT_SINGLE_PLNNR_ENDHR")) || 24);
			this.oPlanningDate = oTreeData.StartDate;

			if (oTreeData.ChildCount > 0) {
				//load assignments for this day, resource and resource group
				this._loadAssignmentsForDay(oTreeData.StartDate);
			}
			console.log(this.oUserModel.getData());
			this.oPlannerDialog.open();
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
			var sMsg = this.oResourceBundle.getText("ymsg.saveDayChangesConfirm", [moment(this.oPlanningDate).format("DD MMM YYYY")]);
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
					this.oPlannerDialog.close();
				};
				this._showConfirmMessage(sMsg, yesFn.bind(this), reviewFn.bind(this), noFn.bind(this));
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
		 * Todo new route calculation
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
					if (!oData.Demand.ASGNMNT_CHANGE_ALLOWED) {
						this.oParentController.showMessageToast(this.oResourceBundle.getText("ymsg.notAllowedChangeAssign"));
					} else {
						
						oAppointment.setStartDate(oEvent.getParameter("startDate"));
						oAppointment.setEndDate(oEvent.getParameter("endDate"));
						
						var aAssignments = this._getOnlyAppointmentsByKeyValue("type", this.mTypes.APPOINTMENT);
						oResource = aAssignments[0].Resource;
						
						this.oParentController.getOwnerComponent().MapProvider.updateAssignmentsWithTravelTime(oResource, aAssignments)
							.then(function(aUpdatedAssignments) {
								this._setAssignmentsData(aUpdatedAssignments);
								this.oSinglePlanningModel.setProperty("/hasChanges", true);
								this.oSinglePlanner.setBusy(false);
						}.bind(this));
					}
				}
			}
		},

		/**
		 * Save new start,end dates for assignments
		 * @param {object} oEvent
		 */
		onPressSaveAppointments: function (oEvent) {
			this._saveChangedAssignments(function () {
				this._loadAssignmentsForDay(this.oPlanningDate);
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
		 * Todo calculate route for appointments
		 * and show travel times
		 * 
		 * @param {object} oEvent
		 */
		onPressCalculateRoute: function (oEvent) {
			var oStartDate = this.oSinglePlanningModel.getProperty("/startDate");
			var aAssignments = this._getOnlyAppointmentsByKeyValue("type", this.mTypes.APPOINTMENT);
			if (aAssignments.length > 0) {
				this.oParentController.getOwnerComponent().MapProvider.calculateTravelTimeAndDatesForDay(
					aAssignments[0].Resource, aAssignments, oStartDate)
					.then(function(aUpdatedAssignments) {
						// TODO dibrovv: update appointments for the Single Planner
						this._setAssignmentsData(aUpdatedAssignments);
						this.oSinglePlanningModel.setProperty("/hasChanges", true);
					}.bind(this));
			}
		},

		/**
		 * Todo optimize route for given appointments
		 * @param {object} oEvent - 
		 */
		onPressOptimizeRoute: function (oEvent) {
			var aAssignments = this._getOnlyAppointmentsByKeyValue("type", this.mTypes.APPOINTMENT);
			if (aAssignments.length > 0) {
				var sResourceLong = aAssignments[0].Resource.LONGITUDE,
					sResourceLat = aAssignments[0].Resource.LATITUDE;
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
			this._loadAssignmentsForDay(this.oPlanningDate);
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
			if (sType === "TIMEDAY") {
				var oDayView = new sap.m.SinglePlanningCalendarDayView({
					title: "Day",
					key: sType
				});
				this.oSinglePlanner.addView(oDayView);
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
						var originData = _.find(this.aOriginalData, function(origObj) {
							return origObj.Guid === oItem.Guid;
						});
						if (originData && (originData.DateTo.getTime() !== oItem.DateTo.getTime() ||
								oItem.TRAVEL_TIME !== originData.TRAVEL_TIME ||
								oItem.TRAVEL_BACK_TIME !== originData.TRAVEL_BACK_TIME)) {

							oModel.setProperty(oItem.sModelPath + "/DateTo", oItem.DateTo);
							oModel.setProperty(oItem.sModelPath + "/DateFrom", oItem.DateFrom);
							oModel.setProperty(oItem.sModelPath + "/TRAVEL_TIME", oItem.TRAVEL_TIME);
							oModel.setProperty(oItem.sModelPath + "/TRAVEL_BACK_TIME", oItem.TRAVEL_BACK_TIME);

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
					EffortUnit: oData.EffortUnit,
					Effort: oData.Effort,
					ResourceGroupGuid: oData.ResourceGroupGuid,
					ResourceGuid: oData.ResourceGuid
				};
			return this.oParentController.executeFunctionImport(oModel, oParams, "UpdateAssignment", "POST", null, true);
		},

		/**
		 * Load assignments of a special resource and resource group for a special date
		 * @param {obejct} oDate - date for what day assignments should be loaded
		 */
		_loadAssignmentsForDay: function (oDate) {
			var sEntitySetPath = "/AssignmentSet",
				sTravelAppointments = [],
				oTravelItem = null;

			if (this.oParentController._getResourceFilters) {
				this.oSinglePlanningModel.setProperty("/hasChanges", false);
				this.oSinglePlanner.setBusy(true);

				var mParams = {
					"$expand": "Demand,Resource"
				};

				var oFilter = new Filter(this.oParentController._getResourceFilters([this.sSelectedPath], oDate), true);
				this.oParentController.getOwnerComponent().readData(sEntitySetPath, [oFilter], mParams).then(function (oResults) {
					this.aOriginalData = deepClone(this._setAssignmentsData(oResults.results)); // set current assignments and save it to this.aOriginalData
				}.bind(this));
			}
		},
		
		// TODO dibrovv: docs
		_setAssignmentsData: function(aAssignments) {
			var sEntitySetPath = "/AssignmentSet",
				sTravelAppointments = [],
				oTravelItem = null;
				
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
						oTravelItem = deepClone(oAssignment);
						oTravelItem.title = this.oResourceBundle.getText("xlab.appointTravel");
						oTravelItem.text = oAssignment.TRAVEL_TIME + " " + this.oResourceBundle.getText("xlab.minutes");
						oTravelItem.color = this.oUserModel.getProperty("/DEFAULT_TRAVEL_TIME_COLOR");
						oTravelItem.icon = this.oUserModel.getProperty("/DEFAULT_TRAVEL_TIME_ICON");
						oTravelItem.DateFrom = moment(oAssignment.DateFrom).subtract(oAssignment.TRAVEL_TIME, "minutes").toDate();
						oTravelItem.DateTo = oAssignment.DateFrom;
						oTravelItem.Guid = oAssignment.Guid + "_before";
						oTravelItem.type = this.mTypes.TRAVEL_BEFORE;
						sTravelAppointments.push(oTravelItem);
					}

					if (parseInt(oAssignment.TRAVEL_BACK_TIME)) {
						oTravelItem = deepClone(oAssignment);
						oTravelItem.title = this.oResourceBundle.getText("xlab.appointTravelBack");
						oTravelItem.text = oAssignment.TRAVEL_TIME + " " + this.oResourceBundle.getText("xlab.minutes");
						oTravelItem.color = this.oUserModel.getProperty("/DEFAULT_TRAVEL_TIME_COLOR");
						oTravelItem.icon = this.oUserModel.getProperty("/DEFAULT_TRAVEL_TIME_ICON");
						oTravelItem.DateFrom = oAssignment.DateTo;
						oTravelItem.DateTo = moment(oAssignment.DateTo).add(oAssignment.TRAVEL_BACK_TIME, "minutes").toDate();
						oTravelItem.Guid = oAssignment.Guid + "_after";
						oTravelItem.type = this.mTypes.TRAVEL_AFTER;
						sTravelAppointments.push(oTravelItem);
					}
				}.bind(this));
			}
			var appoints = aAssignments.concat(sTravelAppointments);
			this.oSinglePlanningModel.setProperty("/appointments", appoints);
			this.oSinglePlanner.rerender(); // to prevent buggy display of appointments
			this.oSinglePlanner.setBusy(false);
			
			return appoints;
			
			// TODO dibrovv: do I need to save the new data to the default model? (for unsubmitted changes)
			// need to check, whether the further actions (after calculation or optimization) could depend on default model
			// e.g. drag-n-drop
			
		}
	});
});