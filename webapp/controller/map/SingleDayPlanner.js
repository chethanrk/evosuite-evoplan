sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/base/Log",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/model/models",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/base/util/deepClone",
	"sap/base/util/deepEqual"
], function (Controller, OverrideExecution, Log, Fragment, models, Filter, FilterOperator, deepClone, deepEqual) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.map.SingleDayPlanner", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {
				open: {

				}
			}
		},

		oSinglePlanningModel: null,

		oOriginalData: {},

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

		/**
		 * open single planning calendar dialog
		 */
		open: function (sPath, oTreeData, sNodeType, oParentData) {
			this.oSinglePlanner = sap.ui.getCore().byId("idSinglePlanningCalendar");
			this.oSelectedData = oTreeData;
			this.sSelectedPath = sPath;
			//set view for this calendar base on NodeType
			this._setCalenderViews(sNodeType);
			this.oSinglePlanningModel.setProperty("/startDate", oTreeData.StartDate);
			this.oSinglePlanningModel.setProperty("/parentData", oParentData);

			if (oTreeData.ChildCount > 0) {
				//load assignments for this day, resource and resource group
				this._loadAssignmentsForDay(oTreeData.StartDate);
			}
			this.oPlannerDialog.open();
			console.log(this.oParentController.getModel("user").getData());
		},

		/**
		 * close single planning calendar dialog
		 * @param {object} oEvent - button close press in dialog toolbar
		 */
		onPressClose: function (oEvent) {
			//todo when there are some unsaved changes show warning when user wants close dialog
			this.oPlannerDialog.close();
		},

		/**
		 * Get all assignments when day navigation happens
		 * @param {object} oEvent - startDate is changed while navigating in the SinglePlanningCalendar
		 */
		onChangeStartDate: function (oEvent) {
			var sNewStartDate = oEvent.getParameter("date");
			this._loadAssignmentsForDay(sNewStartDate);
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
				oContext = oAppointment.getBindingContext("mapSinglePlanning");

			if (oContext) {
				var oData = oContext.getObject();
				if (oData.type === "APPOINTMENT") {
					oAppointment.setStartDate(oEvent.getParameter("startDate"));
					oAppointment.setEndDate(oEvent.getParameter("endDate"));
					this._setNewTravelTimes(oContext.getPath());
					this.oSinglePlanningModel.setProperty("/hasChanges", true);
				}
			}
		},

		/**
		 * Todo save new start,end dates for assignments
		 * save travel times
		 * @param {object} oEvent
		 */
		onPressSaveAppointments: function (oEvent) {
			var aAppointments = this.oSinglePlanningModel.getProperty("/appointments");

			if (this.oSinglePlanningModel.getProperty("/hasChanges")) {
				//check all changes for appointments
				aAppointments.forEach(function (oItem, idx) {
					if (oItem.type === "APPOINTMENT") {
						var originData = this.oOriginalData[idx];
						if (originData.Guid === oItem.Guid && originData.DateFrom.getTime() !== oItem.DateFrom.getTime()) {
							//todo save new start and end date
						}
					}
				}.bind(this));
			}
		},

		/**
		 * Todo calculate route for appointments
		 * and show travel times
		 * 
		 * @param {object} oEvent
		 */
		onPressCalculateRoute: function (oEvent) {
			var aAppointments = this.oSinglePlanningModel.getProperty("/appointments");
		},

		/**
		 * Todo optimize route for given appointments
		 * @param {object} oEvent - 
		 */
		onPressOptimizeRoute: function (oEvent) {
			var aAppointments = this.oSinglePlanningModel.getProperty("/appointments");
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
		 * set new start and end travel times for a dragged appointment
		 * @param {string} sPath - appointment path inside json model
		 */
		_setNewTravelTimes: function (sPath) {
			var aAppointments = this.oSinglePlanningModel.getProperty("/appointments"),
				oAppData = this.oSinglePlanningModel.getProperty(sPath);

			aAppointments.forEach(function (oItem) {
				if (oItem.sModelPath === oAppData.sModelPath) {
					if (oItem.type === "TRAVEL_BEFORE") {
						oItem.DateTo = oAppData.DateFrom;
						oItem.DateFrom = moment(oAppData.DateFrom).subtract(oAppData.startTravelTime, "minutes").toDate();
					} else if (oItem.type === "TRAVEL_AFTER") {
						oItem.DateFrom = oAppData.DateTo;
						oItem.DateTo = moment(oAppData.DateTo).add(oAppData.endTravelTime, "minutes").toDate();
					}
				}
			});
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

				var oFilter = new Filter(this.oParentController._getResourceFilters([this.sSelectedPath], oDate), true);
				this.oParentController.getOwnerComponent()._getData(sEntitySetPath, [oFilter]).then(function (oResults) {
					if (oResults.results.length > 0) {
						oResults.results.forEach(function (oItem) {
							oItem.sModelPath = sEntitySetPath + "('" + oItem.Guid + "')";
							oItem.title = oItem.DemandDesc;
							oItem.text = "Effort: " + oItem.Effort + " " + oItem.EffortUnit;
							oItem.color = oItem.DEMAND_STATUS_COLOR;
							oItem.icon = oItem.DEMAND_STATUS_ICON;
							oItem.type = "APPOINTMENT";

							oItem.startTravelTime = 30;
							oItem.endTravelTime = 30;

							if (oItem.startTravelTime) {
								oTravelItem = deepClone(oItem);
								oTravelItem.title = this.oResourceBundle.getText("xlab.appointTravel");
								oTravelItem.text = oItem.startTravelTime + +this.oResourceBundle.getText("xlab.minutes");
								oTravelItem.color = "#CCC";
								oTravelItem.icon = "sap-icon://travel-itinerary";
								oTravelItem.DateFrom = moment(oItem.DateFrom).subtract(oItem.startTravelTime, "minutes").toDate();
								oTravelItem.DateTo = oItem.DateFrom;
								oTravelItem.Guid = oItem.Guid + "_before";
								oTravelItem.type = "TRAVEL_BEFORE";

								sTravelAppointments.push(oTravelItem);
							}

							if (oItem.endTravelTime) {
								oTravelItem = deepClone(oItem);
								oTravelItem.title = this.oResourceBundle.getText("xlab.appointTravel");
								oTravelItem.text = oItem.startTravelTime + this.oResourceBundle.getText("xlab.minutes");
								oTravelItem.color = "#CCC";
								oTravelItem.icon = "sap-icon://travel-itinerary";
								oTravelItem.DateFrom = oItem.DateTo;
								oTravelItem.DateTo = moment(oItem.DateTo).add(oItem.endTravelTime, "minutes").toDate();
								oTravelItem.Guid = oItem.Guid + "_after";
								oTravelItem.type = "TRAVEL_AFTER";

								sTravelAppointments.push(oTravelItem);
							}
						}.bind(this));
					}
					var appoints = oResults.results.concat(sTravelAppointments);
					console.log(appoints);
					this.oOriginalData = deepClone(appoints);
					this.oSinglePlanningModel.setProperty("/appointments", appoints);
					this.oSinglePlanner.setBusy(false);
				}.bind(this));
			}
		}
	});
});