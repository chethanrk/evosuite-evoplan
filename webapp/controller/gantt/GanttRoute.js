sap.ui.define([
	"com/evorait/evoplan/controller/gantt/GanttQualificationChecks",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Token",
	"sap/m/Tokenizer",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
	"sap/base/util/deepClone",
	"sap/base/util/deepEqual"
], function (GanttQualificationChecks, formatter, Filter, FilterOperator, Token, Tokenizer, Fragment, MessageToast) {
	"use strict";

	return GanttQualificationChecks.extend("com.evorait.evoplan.controller.gantt.GanttRoute", {
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 */
		onInit: function () {
			GanttQualificationChecks.prototype.onInit.apply(this, arguments);
		},
		/*
		 * Handle press of Calculate travel time Button in gantt toolbar
		 * @param oEvent
		 * since 2205
		 */
		onCalculateRoutePress: function (oEvent) {
			var oButton = oEvent.getSource(),
				oView = this.getView(),
				oStarDate = this.getModel("user").getProperty("/DEFAULT_GANT_START_DATE"),
				oEndDate = this.getModel("user").getProperty("/DEFAULT_GANT_END_DATE"),
				sSourceId = oEvent.getSource().getId();

			this.routeOperation = sSourceId.includes("Optimize") ? "Optimize" : "Calculate";
			if (!this._oCalendarPopover) {
				Fragment.load({
					name: "com.evorait.evoplan.view.map.fragments.RouteDateFilter",
					id: oView.getId(),
					controller: this
				}).then(function (oPopover) {
					this._oCalendarPopover = oPopover;
					this.getView().addDependent(this._oCalendarPopover);
					this._oCalendarPopover.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					this.getView().byId("DRSMap").setMinDate(oStarDate);
					this.getView().byId("DRSMap").setMaxDate(oEndDate);
					this._oCalendarPopover.openBy(oButton);
				}.bind(this));
			} else {
				this.getView().byId("DRSMap").setMinDate(oStarDate);
				this.getView().byId("DRSMap").setMaxDate(oEndDate);
				this._oCalendarPopover.openBy(oButton);
			}
		},

		/*
		 * Closing the calendar popover for route calculation
		 * @param oEvent
		 * since 2205
		 */
		onCloseDialog: function (oEvent) {
			this._oCalendarPopover.close();
		},
		/**
		 * resetting the assignment and children node after route calculation/optimization
		 * @param {Object} result
		 * @param {Boolean} bNoChangeGanttView
		 * @Author Rakesh Sahu
		 */
		updateResourceAfterRouting: function (result, bNoChangeGanttView) {
			this.oResource.AssignmentSet = result;
			if (this.oResource.AssignmentSet && this.oResource.AssignmentSet.results.length > 0) {
				this.oResource.children = this.oResource.AssignmentSet.results;
				this.oResource.children.forEach(function (oAssignItem, idx) {
					this.oResource.AssignmentSet.results[idx].NodeType = "ASSIGNMENT";
					this.oResource.AssignmentSet.results[idx].ResourceAvailabilitySet = this.oResource.ResourceAvailabilitySet;
					var clonedObj = _.cloneDeep(this.oResource.AssignmentSet.results[idx]);
					//Appending Object_ID_RELATION field with ResourceGuid for Assignment Children Nodes @since 2205 for Relationships
					clonedObj.OBJECT_ID_RELATION = clonedObj.OBJECT_ID_RELATION + "//" + clonedObj.ResourceGuid;
					this.oResource.children[idx].AssignmentSet = {
						results: [clonedObj]
					};
				}.bind(this));
			}
			if (!bNoChangeGanttView) {
				this._setGanttVisibleHorizon(new Date(this.oSelectedDate));
			}
		},
		/**
		 * handle date select form calandar to get the travel time calculation
		 * @param oEvent
		 * since 2205
		 */
		handleCalendarSelect: function (oEvent) {
			var oSelectedDate = oEvent.getSource().getSelectedDates()[0].getStartDate(),
				oFilter,
				sMsg;
			this.oResource = this.oGanttModel.getProperty(this.selectedResources[0]);
			this.oSelectedDate = oSelectedDate;

			//preparing filters to get the Assignment of selected date
			oFilter = this.oMapUtilities.getAssignmentsFiltersWithinDateFrame(this.oResource, this.oSelectedDate);

			//Reading oData to get the Assignment of selected date
			this.getOwnerComponent()._getData("/AssignmentSet", [oFilter]).then(function (result) {
				this.aData = result.results;
				if (this.aData.length === 0) {
					// in case of no assignments, showing messageToast
					sMsg = this.getResourceBundle().getText("ymsg.noAssignmentsOnDate");
					this.showMessageToast(sMsg);
				} else {
					this.aData.sort(function (a, b) {
						return a.DateFrom - b.DateFrom;
					});
					// if there are assignments, then proceed to calculate the travel time
					this._getTravelTimeFromPTV();
				}
			}.bind(this));

		},
		/**
		 * getting the unavailibility of type "B" (Breaks) to pass into Route Calculation/Optimization PTV service
		 * since 2209
		 */
		getBreaks: function () {
			var aAvailabilitySet = this.oResource.ResourceAvailabilitySet.results,
				oStartTime = new Date(_.cloneDeep(this.oSelectedDate).setHours("0", "0", "0")),
				oEndTime = new Date(_.cloneDeep(this.oSelectedDate).setHours("23", "59", "59")),
				aUnavailability = [];

			aAvailabilitySet.forEach(function (oItem) {
				if (oItem.AvailabilityTypeGroup === "B" && oItem.DateFrom >= oStartTime && oItem.DateTo <= oEndTime) {
					aUnavailability.push({
						sModelPath: "/ResourceAvailabilitySet" + "('" + oItem.Guid + "')",
						title: oItem.Description,
						text: moment(oItem.DateFrom).format("HH:mm") + " - " + moment(oItem.DateTo).format("HH:mm"),
						color: oItem.BlockPercentageColor || oItem.GANTT_UNAVAILABILITY_COLOR,
						icon: null,
						type: "Blocker",
						DateFrom: oItem.DateFrom,
						DateTo: oItem.DateTo
					});
				}
			});
			return aUnavailability;
		},

		/* =========================================================== */
		/* Private methods                                             */
		/* =========================================================== */
		/**
		 * Reading assignments with travel time from PTV
		 * since 2205
		 */
		_getTravelTimeFromPTV: function () {
			this.oAppViewModel.setProperty("/busy", true);
			if (this.routeOperation === "Calculate") {
				//Sending the assignments and resource to PTV to calculte the travel time between Assignments
				this.getOwnerComponent().MapProvider.calculateRoute(this.oResource, this.aData).then(this._setTravelTimeToGantt.bind(
					this));
			} else {
				//Sending the assignments and resource to PTV to get Optimized travel time between assignments
				this.getOwnerComponent().MapProvider.optimizeRoute(this.oResource, this.aData, this.getBreaks()).then(this._setTravelTimeToGantt.bind(
					this));
			}

		},

		/**
		 * setting Travel Time object to Gantt and updating new date time for assignments based on travel Time
		 * @param {Array} results
		 * since 2205
		 */
		_setTravelTimeToGantt: function (results) {
			var oAssignment;

			this.aData = results;
			this.aAssignmetsWithTravelTime = [];
			this.aTravelTimes = [];

			//Setting the gantt char Visible horizon to see selected date assignments
			this._setGanttVisibleHorizon(new Date(this.oSelectedDate));

			//Route Creation in Map (changing the date and time of assignments according to travel)
			for (var i = 0; i < this.aData.length; i++) {
				//creating object for shape to show Travel Time in Gantt Chart
				oAssignment = this._getTravelTimeObject(i);

				//condition to check whether travel is 0 then no need to create travel time object 
				if (this.aData[i].TRAVEL_TIME != 0) {
					this.aTravelTimes.push(oAssignment);
				}

				//pushing the updated assignments to show into the gantt
				this.aAssignmetsWithTravelTime.push(this.aData[i]);

				//creating object for shape to show Travel back Time in Gantt Chart. This is travel time from last assignment to home
				if (i === this.aData.length - 1) {
					oAssignment = this._getTravelTimeObject(i, true);
					this.aTravelTimes.push(oAssignment);
				}
			}

			//adding updated assignments
			this.oResource.AssignmentSet = {
				results: this.aAssignmetsWithTravelTime
			};
			//adding Travel time object to show in gantt
			this.oResource.TravelTimes = {
				results: this.aTravelTimes
			};
			this.oGanttModel.refresh();

			// method call to save the updated assignments into the backend
			this._updateAssignments(this.aAssignmetsWithTravelTime);

		},
		/**
		 * Create object for Travel time between the assignments to show in Gantt
		 * @param {Integer} nIndex
		 * @param {Boolean} bIsTravelBackTime
		 * since 2205
		 */
		_getTravelTimeObject: function (nIndex, bIsTravelBackTime) {
			var oTempDate,
				oStartDate,
				oEndDate,
				nEffort = bIsTravelBackTime ? (this.aData[nIndex].TRAVEL_BACK_TIME / 60).toFixed(1) : (this.aData[nIndex].TRAVEL_TIME / 60).toFixed(
					1),
				nTravelTime = bIsTravelBackTime ? parseFloat(this.aData[nIndex].TRAVEL_BACK_TIME).toFixed(2) : parseFloat(this.aData[nIndex].TRAVEL_TIME)
				.toFixed(2);
			if (bIsTravelBackTime) {
				oTempDate = new Date(this.aData[nIndex].DateTo.toString());
				oStartDate = new Date(oTempDate.setMinutes(oTempDate.getMinutes() + 1));
				oEndDate = new Date(oTempDate.setMinutes(oTempDate.getMinutes() + parseFloat(this.aData[nIndex].TRAVEL_BACK_TIME) - 1));
			} else if (nIndex === 0) {
				// Setting the Travel time for First Assignment
				oTempDate = new Date(this.aData[nIndex].DateFrom.toString());
				oStartDate = new Date(oTempDate.setMinutes(oTempDate.getMinutes() - this.aData[nIndex].TRAVEL_TIME - 1));
				oEndDate = new Date(oTempDate.setMinutes(oTempDate.getMinutes() + parseFloat(this.aData[nIndex].TRAVEL_TIME) - 1));
			} else {
				// Setting the Travel time for other than First Assignment
				oTempDate = new Date(this.aData[nIndex -
					1].DateTo.toString());
				oStartDate = new Date(oTempDate.setMinutes(oTempDate.getMinutes() + 1));
				oEndDate = new Date(oTempDate.setMinutes(oTempDate.getMinutes() + parseFloat(this.aData[nIndex].TRAVEL_TIME)));
			}
			return {
				DateFrom: oStartDate,
				DateTo: oEndDate,
				Description: "Travel Time",
				Effort: nEffort,
				TRAVEL_TIME: nTravelTime
			};
		},
		/**
		 * Method to save the updated assignments to backend after calculating the route
		 * @param {Array} aAssignments
		 * since 2205
		 */
		_updateAssignments: function (aAssignments) {
			var oParams = {},
				bIsLast = false;

			//flags to prevent refresh after saving the updated assignments into the backend
			this.bDoNotRefreshTree = true;
			this.bDoNotRefreshCapacity = true;
			for (var i = 0; i < aAssignments.length; i++) {
				oParams = {
					DateFrom: aAssignments[i].DateFrom,
					TimeFrom: {
						ms: aAssignments[i].DateFrom.getTime()
					},
					DateTo: aAssignments[i].DateTo,
					TimeTo: {
						ms: aAssignments[i].DateTo.getTime()
					},
					AssignmentGUID: aAssignments[i].Guid,
					EffortUnit: aAssignments[i].EffortUnit,
					Effort: aAssignments[i].Effort,
					ResourceGroupGuid: aAssignments[i].ResourceGroupGuid,
					ResourceGuid: aAssignments[i].ResourceGuid,
					TravelTime: aAssignments[i].TRAVEL_TIME,
					Distance: aAssignments[i].DISTANCE,
					DistanceBack: aAssignments[i].DISTANCE_BACK
				};
				if (i === aAssignments.length - 1) {
					bIsLast = true;
					oParams.TravelBackTime = aAssignments[i].TRAVEL_BACK_TIME;
				}
				this.callFunctionImport(oParams, "UpdateAssignment", "POST", this._mParameters, bIsLast);
			}
		}
	});
});