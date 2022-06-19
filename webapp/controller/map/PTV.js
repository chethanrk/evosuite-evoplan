/* globals axios */
/* globals _ */
sap.ui.define([
	"com/evorait/evoplan/controller/map/MapProvider",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/m/MessageBox"
], function (MapProvider, OverrideExecution, MessageBox) {
	"use strict";

	// constants representing subpaths for services and operations
	var ROUTE_SERVICE_PATH = "/XRoute";
	var CALCULATE_ROUTE_PATH = "/calculateRoute";
	var DIMA_SERVICE_PATH = "/XDima";
	var CREATE_DISTANCE_MATRIX_PATH = "/createDistanceMatrix";
	var TOUR_SERVICE_PATH = "/XTour";
	var PLAN_TOURS_PATH = "/planTours";

	/**
	 * @class Provides set of methods to communicate to PTV xServer v2 (xserver2-europe-eu-test.cloud.ptvgroup.com - test server).
	 * The class contain only explanatory comments for its methods. 
	 * For detailed interface description check the com.evorait.evoplan.controller.map.MapProvider class.
	 * 
	 * @property {string} _sAuthToken - Authorisation token to pass as a header in requests to PTV 
	 * @property {string} _sRouteCalculationUrl - Url for the `calculateRoute` operation
	 * @property {string} _sCreateDistanceMatrixUrl - Url for the `createDistanceMatrix` operation
	 * @property {string} _sPlanToursUrl - Url for the `planTours` operation
	 * @property {string} _sDefaultResourceStartHour - Number representing starting working hour (e.g. 8)
	 * @property {sap.ui.model.json.JSONModel} oUserModel - User model containing system parameters for a user
	 */
	return MapProvider.extend("com.evorait.evoplan.controller.map.PTV", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {
				getRoutePolyline: {
					"public": true,
					"final": false,
					overrideExecution: OverrideExecution.Instead
				},
				calculateSingleTravelTime: {
					"public": true,
					"final": false,
					overrideExecution: OverrideExecution.Instead
				},
				calculateTravelTimeForMultipleAssignments: {
					"public": true,
					"final": false,
					overrideExecution: OverrideExecution.Instead
				},
				updateAssignmentsWithTravelTime: {
					"public": true,
					"final": false,
					overrideExecution: OverrideExecution.Instead
				},
				calculateRoute: {
					"public": true,
					"final": false,
					overrideExecution: OverrideExecution.Instead
				},
				optimizeRoute: {
					"public": true,
					"final": false,
					overrideExecution: OverrideExecution.Instead
				},
			}
		},

		_sAuthToken: "",
		_sRouteCalculationUrl: "",
		_sCreateDistanceMatrixUrl: "",
		_sPlanToursUrl: "",
		_sDefaultResourceStartHour: "",
		oUserModel: null,

		/**
		 * Creates a new instance of the PTV map provider. 
		 * Calls the parent constructor, defines URLs for different operations
		 * @constructor
		 * @param {sap.ui.core.Component} oComponent - The app component.
		 * @param {sap.ui.model.json.JSONModel} oMapModel - JSON model containing all the needed settings for communication with Map services.
		 * PTV.js expects a particular structure for the Model. See the `PTVMapModelObject` type described in 'Data types' section.
		 */
		constructor: function (oComponent, oMapModel) {
			MapProvider.prototype.constructor.call(this, oComponent, oMapModel);

			var oServiceData = oMapModel.getData().MapServiceLinks.results[0];
			this._sRouteCalculationUrl = this.sServiceUrl + ROUTE_SERVICE_PATH + CALCULATE_ROUTE_PATH;
			this._sCreateDistanceMatrixUrl = this.sServiceUrl + DIMA_SERVICE_PATH + CREATE_DISTANCE_MATRIX_PATH;
			this._sPlanToursUrl = this.sServiceUrl + TOUR_SERVICE_PATH + PLAN_TOURS_PATH;
			this._sAuthToken = btoa(oServiceData.Username + ":" + oServiceData.Password);
			this.oUserModel = this.oComponent.getModel("user");
			this._sDefaultResourceStartHour = parseInt(this.oUserModel.getProperty("/DEFAULT_SINGLE_PLNNR_STARTHR")) || 8;
		},

		/**
		 * Makes request to calculate a route with polyline
		 * Corresponding documentation:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.XRoute.calculateRoute
		 */
		getRoutePolyline: function (oResource, aAssignments) {
			return this._calculateRoute(oResource, aAssignments, null, true);
		},

		/**
		 * Makes request to calculate a route between **two** points. Requests only time and distance information
		 * Corresponding documentation:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.XRoute.calculateRoute
		 */
		calculateSingleTravelTime: function (oStartPoint, oEndPoint) {
			var oRequestBody = this._createPayloadForRouteRequest([oStartPoint, oEndPoint], false, null); // default date will be used
			return this._sendPOSTRequestToPTV(this._sRouteCalculationUrl, oRequestBody).then(function (oRouteResponse) {
				return oRouteResponse.data.travelTime / 60; // return the travel time in minutes
			}.bind(this));
		},

		/**
		 * Makes request to calculate a route travel time for each leg between waypoints (Assignments)
		 * See the resultFields.legs property of the RouteRequest type:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Content/API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.LegResultFields
		 */
		calculateTravelTimeForMultipleAssignments: function (oResource, aAssignments, oDateForRoute) {
			return this._calculateRoute(oResource, aAssignments, oDateForRoute, false);
		},

		/**
		 * @return {{Promise<Assignment[]>} a new array that includes provided assignments with updated TRAVEL_TIME and TRAVEL_BACK_TIME properties.
		 * The properties updated according to results returned by PTV `calculateRoute` function.
		 */
		updateAssignmentsWithTravelTime: function(oResource, aAssignments, oDateForRoute) {
			return this.calculateTravelTimeForMultipleAssignments(oResource, aAssignments, oDateForRoute).then(function(oResponse) {
				return this._updateAssignmentsWithTravelTime(aAssignments, oResponse);
			}.bind(this));
		},

		/**
		 * TODO: docs
		 */
		calculateRoute: function(oResource, aAssignments, oDateForRoute) {
			return this.calculateTravelTimeForMultipleAssignments(oResource, aAssignments, oDateForRoute).then(function(oResponse) {
				if(!this._isCalculatedRouteValid(oResponse)) {
					return aAssignments;
				}
				var aAssignmentsWithTravelTime = this._updateAssignmentsWithTravelTime(aAssignments, oResponse);
				if(oResponse.data.events && oResponse.data.events.length) {
					var aTourEvents = oResponse.data.events;
					var nEventIndex = 1; // start with 1 because the aTourEvents[0] is corresponding to the resource home location
					
					aAssignmentsWithTravelTime.forEach(function(oAssignment) {
						if(oAssignment.FIXED_APPOINTMENT) {
							return;
						}
						nEventIndex = this._getServiceEventIndexForAssignment(oAssignment, aTourEvents);
						var oServiceEvent = aTourEvents[nEventIndex]
						
						var oStartDate = moment(oServiceEvent.startsAt);
						oAssignment.DateFrom = oStartDate.toDate();
						
						var oEndDate = oStartDate.clone();
						oEndDate.add(oAssignment.Effort, 'hours');
						oAssignment.DateTo = oEndDate.toDate();
					}.bind(this));
				}
				return aAssignmentsWithTravelTime;
				
				
			}.bind(this));
		},
		
		/**
		 * Optimizes a route to reduce distance and travel time. Returned route may have different sequence of points to visit.
		 * To perform a route optimization PTV need to build so named 'Distance Matrix' at first. Based on the matrix, the route optimisation performed then.
		 * 
		 * Corresponding documentation:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#TechnicalConcepts/Routing/DSC_Distance_Matrices.htm
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#UseCases/Routing/UC_Accessing_DistanceMatrixContents.htm
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xdima.html#com.ptvgroup.xserver.xdima.XDima.createDistanceMatrix
		 * 
		 * All the needed properties for request to PTV are maintained in methods `_createPayloadForPlanToursRequest` and `_createPayloadForDistanceMatrixRequest`
		 * Please see the PTV API documentation to find out, what affect the properties:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#Welcome/Home.htm
		 */
		optimizeRoute: function (oResource, aAssignments) {
			var oDate = aAssignments[0].DateFrom;
			return this._createDistanceMatrix(oResource, aAssignments, oDate).then(function (sMatrixId) {
				return this._planTours(oResource, aAssignments, sMatrixId, oDate).then(function (oTourResponse) {
					
					this._isOptimizedRouteValid(oTourResponse, aAssignments); // don't interrupt current function execution to show, what's plannable

					var aUpdatedAssignments = _.cloneDeep(aAssignments);
					var nOverallEffort = 0;
					if (oTourResponse.data.tourReports && oTourResponse.data.tourReports.length === 1) {
						var aTourEvents = oTourResponse.data.tourReports[0].tourEvents;
						var aLegs = oTourResponse.data.tourReports[0].legReports;

						aTourEvents.forEach(function (oTourEvent, nEventIndex) {
							if (oTourEvent.eventTypes[0] === "SERVICE") {
								var nAssIndex = _.findIndex(aUpdatedAssignments, function (oAssignment) {
									return oTourEvent.orderId === oAssignment.Guid; // the orderId was defined as Guid value in moment of making the request
								});
								
								aUpdatedAssignments[nAssIndex].TRAVEL_BACK_TIME = 0;
								var oCorrespondingDrivingEventIndex = this._getPreviousDrivingEventIndex(aTourEvents, nEventIndex);
								var nTravelTime = Math.ceil(aTourEvents[oCorrespondingDrivingEventIndex].duration / 60);
								
								aUpdatedAssignments[nAssIndex].TRAVEL_TIME = nTravelTime.toString();
								
								if(!aUpdatedAssignments[nAssIndex].FIXED_APPOINTMENT) {
									var oStartDate = moment(aTourEvents[nEventIndex].startTime);
									aUpdatedAssignments[nAssIndex].DateFrom = oStartDate.toDate();
									var oEndDate = oStartDate.clone();
									oEndDate.add(aUpdatedAssignments[nAssIndex].Effort, 'hours');
									aUpdatedAssignments[nAssIndex].DateTo = oEndDate.toDate();
								}
								
								var oLeg = this._getCorrespondingLeg(oCorrespondingDrivingEventIndex, aLegs);
								aUpdatedAssignments[nAssIndex].DISTANCE = (oLeg.distance / 1000).toFixed(1);

								if (aTourEvents[nEventIndex + 2].eventTypes[0] === "TRIP_END") {
									aUpdatedAssignments[nAssIndex].TRAVEL_BACK_TIME = Math.ceil(aTourEvents[nEventIndex + 1].duration / 60).toString();
									oLeg = this._getCorrespondingLeg(nEventIndex + 1, aLegs);
									aUpdatedAssignments[nAssIndex].DISTANCE_BACK = (oLeg.distance / 1000).toFixed(1);
								}
							}
						}.bind(this));
					}
					// sort the assignments to make the further processing simpler
					aUpdatedAssignments.sort(function(a,b) {
						return a.DateFrom - b.DateFrom;
					});
					return aUpdatedAssignments;
				}.bind(this));
			}.bind(this));
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Common method to call the `calculateRoute` operation of XRoute service
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.XRoute.calculateRoute
		 */
		_calculateRoute: function (oResource, aAssignments, oDateForRoute, bDisplayPolyline) {
			var aWaypoints = _.cloneDeep(aAssignments);
			// sort assignments according to sequence defined within date frame
			// it's needed, as the sequence could be broken after fetching the assignments from backend
			aWaypoints.sort(function (a, b) {
				return a.DateFrom - b.DateFrom;
			});
			// add the recource coordinates at the beginning and to the end of route
			aWaypoints.unshift(oResource);
			aWaypoints.push(oResource);
			// create payload with option to request information for legs
			var oRequestBody = this._createPayloadForRouteRequest(aWaypoints, bDisplayPolyline, oDateForRoute);

			return this._sendPOSTRequestToPTV(this._sRouteCalculationUrl, oRequestBody);
		},

		/**
		 * Creates payload according to RouteRequest type:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Content/API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.RouteRequest
		 * @param {Waypoint[]} aPointsToVisit - Array of Waypoint to be visisted.
		 * @param {boolean} bIncludePolyline - Flag to indicate, whether the polyline should be requested.
		 * @param {Date} oDateForRoute - Date for which the route calculation should be performed
		 * Polyline is set of coordinates representing a route.
		 * @return {Object} - Payload for a route request
		 */
		_createPayloadForRouteRequest: function (aPointsToVisit, bIncludePolyline, oDateForRoute) {
			var oPointTemplate = {
				$type: "OffRoadWaypoint",
				location: {
					offRoadCoordinate: {
						x: "",
						y: ""
					}
				},
				tourStopOptions: {
					serviceTime: 0
				}
			};
			var aPoints = aPointsToVisit.reduce(function (prev, next) {
				var oPoint = _.cloneDeep(oPointTemplate);
				oPoint.location.offRoadCoordinate.x = next.LONGITUDE;
				oPoint.location.offRoadCoordinate.y = next.LATITUDE;

				if (next.Effort && parseFloat(next.Effort) !== 0) {
					oPoint.tourStopOptions.serviceTime = parseFloat(next.Effort) * 3600;
				}

				if (next.FIXED_APPOINTMENT) {
					oPoint.tourStopOptions.openingIntervals = [];
					var oInterval = {
						$type: "StartDurationInterval",
						start: next.DateFrom,
						duration: 1
					}
					oPoint.tourStopOptions.openingIntervals.push(oInterval);
				}
				prev.push(oPoint);
				return prev;
			}, []);

			var oPayload = {};
			oPayload.waypoints = aPoints;

			// Defined the `car` profile as it's not supposed to use trucks to deliver cargos.
			oPayload.storedProfile = "car";

			oPayload.resultFields = {
				eventTypes: ["TOUR_EVENT"],
				legs: {
					enabled: true
				},
				tourReport: true
			};

			// `PTV_SpeedPatterns` is a standard predefined PTV profile. See the docs:
			// https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#TechnicalConcepts/FeatureLayer/PTV_SpeedPatterns.htm
			oPayload.requestProfile = {
				featureLayerProfile: {
					themes: [{
						enabled: true,
						id: "PTV_SpeedPatterns"
					}]
				}
			};

			var oStartRouteDate;
			if (oDateForRoute) {
				oStartRouteDate = oDateForRoute;
			} else {
				oStartRouteDate = _.cloneDeep(aPointsToVisit[1].DateFrom);
			}

			oStartRouteDate.setHours(this._sDefaultResourceStartHour, 0, 0, 0);
			oPayload.routeOptions = {
				timeConsideration: {
					$type: "ExactTimeConsiderationAtStart",
					referenceTime: oStartRouteDate
				},
				routingType: "HIGH_PERFORMANCE_ROUTING_WITH_FALLBACK_CONVENTIONAL"
			};

			if (bIncludePolyline) {
				oPayload.resultFields.polyline = true;
				oPayload.geometryOptions = {
					responseGeometryTypes: ["GEOJSON"]
				};
			}

			return oPayload;
		},

		/**
		 * Make a request to create distance matrix for route optimization.
		 * @param {Waypoint} oStartPoint - Starting point of the route
		 * @param {Waypoint[]} aPointsToVisit - Array of Waypoint to be visisted.
		 * @param {Date} oDateForRoute - Date for which the route optimization should be performed
		 * @return {Promise<string>} Promise representing id of the distance matrix. The matrix itself stored in PTV service after its creation.
		 */
		_createDistanceMatrix: function (oStartPoint, aPointsToVisit, oDate) {
			var oRequestBody = this._createPayloadForDistanceMatrixRequest([oStartPoint].concat(aPointsToVisit), oDate);
			return this._sendPOSTRequestToPTV(this._sCreateDistanceMatrixUrl, oRequestBody).then(function (oCreateMatrixResponse) {
				return oCreateMatrixResponse.data.summary.id;
			}.bind(this));
		},

		/**
		 * Creates payload according to CreateDistanceMatrix type:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xdima.html#com.ptvgroup.xserver.xdima.CreateDistanceMatrixRequest
		 * @param {Waypoint[]} aPointsToVisit - Array of Waypoint to be visisted.
		 * @param {Date} oDateForRoute - Date for which the route optimization should be performed
		 * @return {Object} - Payload for a distance matrix request
		 */
		_createPayloadForDistanceMatrixRequest: function (aWaypoints, oDate) {
			var oPointTemplate = {
				$type: "OffRoadRouteLocation",
				offRoadCoordinate: {
					x: "",
					y: ""
				}
			};

			var aPreparedPoints = aWaypoints.reduce(function (prev, next) {
				var oPoint = _.cloneDeep(oPointTemplate);
				oPoint.offRoadCoordinate.x = next.LONGITUDE;
				oPoint.offRoadCoordinate.y = next.LATITUDE;
				prev.push(oPoint);
				return prev;
			}, []);

			var oPayload = {};
			oPayload.startLocations = aPreparedPoints;
			oPayload.storedProfile = "car";

			oPayload.requestProfile = {
				featureLayerProfile: {
					themes: [{
						enabled: true,
						id: "PTV_SpeedPatterns"
					}]
				}
			};

			var oStartDate = _.cloneDeep(oDate);
			var oEndDate = _.cloneDeep(oDate);
			oStartDate.setHours(this._sDefaultResourceStartHour, 0, 0);
			oEndDate.setHours(23, 59, 0);

			oPayload.distanceMatrixOptions = {
				routingType: "HIGH_PERFORMANCE_ROUTING_WITH_FALLBACK_CONVENTIONAL",
				timeConsideration: {
					$type: "MultipleTravelTimesConsideration",
					horizon: {
						$type: "StartEndInterval",
						start: oStartDate,
						end: oEndDate
					}
				}
			};

			return oPayload;
		},
		 
		 /**
		 * Common method to call the `planTours` operation of XTour service
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xtour.html#com.ptvgroup.xserver.xtour.PlanToursRequest
		 */
		_planTours: function (oResource, aAssignments, sMatrixId, oDate) {
			var oRequestBody = this._createPayloadForPlanToursRequest(oResource, aAssignments, sMatrixId, oDate);
			return this._sendPOSTRequestToPTV(this._sPlanToursUrl, oRequestBody);
		},

		/**
		 * Creates payload according to PlanToursRequest type:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xtour.html#com.ptvgroup.xserver.xtour.PlanToursRequest
		 * @param {Waypoint} oResource - starting point for the route
		 * @param {Waypoint[]} aAssignments - Array of Waypoint to be visisted.
		 * @param {string} sMatrixId - Id of the corresponding distance matrix, returned by `_createDistanceMatrix`.
		 * @param {Date} oDateForRoute - Date for which the route calculation should be performed
		 * @return {Object} - Payload for a planTours request
		 */
		_createPayloadForPlanToursRequest: function (oResource, aAssignments, sMatrixId, oDate) {
			var oLocationTemplate = {
				$type: "CustomerSite",
				id: "",
				routeLocation: {
					$type: "OffRoadRouteLocation",
					offRoadCoordinate: {
						x: "",
						y: ""
					}
				}
			};

			var oOrderTemplate = {
				$type: "VisitOrder",
				id: "",
				locationId: "",
				serviceTime: ""
			};

			var aXTourLocations = [];
			var aXTourOrders = [];

			aAssignments.forEach(function (oAssignment) {
				var oLocation = _.cloneDeep(oLocationTemplate);
				oLocation.id = oAssignment.Guid + "_location";
				oLocation.routeLocation.offRoadCoordinate.x = oAssignment.LONGITUDE;
				oLocation.routeLocation.offRoadCoordinate.y = oAssignment.LATITUDE;
				
				if(oAssignment.FIXED_APPOINTMENT) {
					oLocation.openingIntervals = [];
					var oInterval = {
						$type: "StartDurationInterval",
						start: oAssignment.DateFrom,
						duration: 1
					}
					oLocation.openingIntervals.push(oInterval);
				}

				aXTourLocations.push(oLocation);

				var oOrder = _.cloneDeep(oOrderTemplate);
				oOrder.id = oAssignment.Guid;
				oOrder.locationId = oLocation.id;
				oOrder.serviceTime = parseFloat(oAssignment.Effort) * 3600;
				aXTourOrders.push(oOrder);
			});

			var oResourceLocation = _.cloneDeep(oLocationTemplate);
			oResourceLocation["$type"] = "DepotSite";
			oResourceLocation.id = "ResourceHomeLocation";
			oResourceLocation.routeLocation.offRoadCoordinate.x = oResource.LONGITUDE;
			oResourceLocation.routeLocation.offRoadCoordinate.y = oResource.LATITUDE;

			aXTourLocations.push(oResourceLocation);

			var oPayload = {};
			oPayload.locations = aXTourLocations;
			oPayload.orders = aXTourOrders;

			var oStartDate = _.cloneDeep(oDate);
			var oEndDate = _.cloneDeep(oDate);
			oStartDate.setHours(this._sDefaultResourceStartHour, 0, 0);
			oEndDate.setHours(23, 59, 0);

			// use oStartDate for `start` as well as for `end` in the tourStartInterval property to restrict start tour time
			oPayload.fleet = {
				vehicles: [{
					ids: ["vehicle1"],
					startLocationId: "ResourceHomeLocation",
					endLocationId: "ResourceHomeLocation",
					tourStartInterval: {
						start: oStartDate,
						end: oStartDate
					}
				}]
			};
			oPayload.distanceMode = {
				$type: "ExistingDistanceMatrix",
				id: sMatrixId
			};

			oPayload.planToursOptions = {
				restrictions: {
					singleTripPerTour: true,
					singleDepotPerTour: true
				},
				calculationMode: "STANDARD",
				planningHorizon: {
					$type: "StartEndInterval",
					start: oStartDate,
					end: oEndDate
				}
			};

			return oPayload;
		},
		
		/**
		 * TODO: docs
		 * Works ONLY with TourResponse:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Content/API-Documentation/xtour.html#com.ptvgroup.xserver.xtour.ToursResponse
		 */
		_getCorrespondingLeg: function(nEventId, aLegs) {
			return _.find(aLegs, function(oLeg) {
				return nEventId === oLeg.startTourEventIndex;
			})
		},

		/**
		 * Sends a POST request to PTV. In case of error returned from service, displays the message within sap.m.MessageBox
		 * @param {string} sUrl - Url to send the request to
		 * @param {Object} oRequestBody - The request body
		 * @return @return {Promise<Object>} Promise object represents the response from Map Provider service.
		 * Documentation for the PTV ResponseBase type:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/service.html#com.ptvgroup.xserver.service.ResponseBase
		 */
		_sendPOSTRequestToPTV: function (sUrl, oRequestBody) {
			return axios.post(sUrl, oRequestBody, {
				headers: {
					Authorization: "Basic " + this._sAuthToken
				}
			}).catch(function (oError) {
				var sErrorMessage = oError.response.data.message ?
					oError.response.data.message : this.oComponent.getModel("i18n").getResourceBundle().getText("errorMessage");
				MessageBox.error(sErrorMessage);
			}.bind(this));
		},
		
		/**
		 * Searches for a corresponding driving event in an array of Tour events
		 * @param {TourEvent[]} aEvents - array of returned from PTV Tour events. See the documentation:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xtour.html#com.ptvgroup.xserver.xtour.TourEvent
		 * @param {Number} nCurrentIndex - index of the service event, for which driving event should be found.
		 * @return {TourEvent} the corresponding driving event.
		 * @throws {Error} in case the driving event wasn't found.
		 */
		_getPreviousDrivingEventIndex: function(aEvents, nCurrentIndex) {
			var nDrivingEventIndex = nCurrentIndex;
			for(nDrivingEventIndex; nDrivingEventIndex >= 0; nDrivingEventIndex--) {
				if(aEvents[nDrivingEventIndex].eventTypes[0] === "DRIVING") {
					return nDrivingEventIndex;
				}
			}
			// in case there were no corresponding driving event throw an error
			var sErrorMessage = this.oComponent.getModel("i18n").getResourceBundle().getText("noDrivingEvent");
			throw new Error(sErrorMessage);
		},
		
		/**
		 * TODO: docs
		 * Works ONLY with RouteResponse:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.RouteResponse
		 */
		_getTravelTimeAndDistanceForAssignment: function(oAssignment, aEvents, bTravelHome) {
			var nCorrespondingEventIndex = this._getServiceEventIndexForAssignment(oAssignment, aEvents);
			var nCostsTime = 0;
			var nCalculatedTime = 0;
			var nCalculatedDistance = 0;
			var nPreviosDistanceFromStart = 0;
			
			if(bTravelHome) {
				nCostsTime += aEvents[nCorrespondingEventIndex].travelTimeFromStart;
				nCostsTime += aEvents[nCorrespondingEventIndex].duration;
				nCalculatedTime = aEvents[nCorrespondingEventIndex + 1].travelTimeFromStart - nCostsTime;
				nCalculatedDistance = aEvents[nCorrespondingEventIndex + 1].distanceFromStart - aEvents[nCorrespondingEventIndex].distanceFromStart;
			} else {
				var nEventIndex = nCorrespondingEventIndex -1; // to get previous event
				
				for(nEventIndex; nEventIndex >= 0; nEventIndex--) {
					if(aEvents[nEventIndex].tourEventTypes[0] === "SERVICE") {
						nCostsTime += aEvents[nEventIndex].duration;
						nCostsTime += aEvents[nEventIndex].travelTimeFromStart;
						nPreviosDistanceFromStart = aEvents[nEventIndex].distanceFromStart;
						break;
					} else if(aEvents[nEventIndex].tourEventTypes[0] !== "SERVICE") {
						nCostsTime += aEvents[nEventIndex].duration;
					}
				}
				nCalculatedTime = aEvents[nCorrespondingEventIndex].travelTimeFromStart - nCostsTime;
				nCalculatedDistance = aEvents[nCorrespondingEventIndex].distanceFromStart - nPreviosDistanceFromStart;
			}
			
			var nResultTime = Math.ceil(nCalculatedTime / 60);
			var nResultDistance = (nCalculatedDistance / 1000).toFixed(1);
			
			return {time: nResultTime, distance: nResultDistance};
		},
		
		/**
		 * TODO: docs
		 * Works ONLY with RouteResponse:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.RouteResponse
		 */
		_getServiceEventIndexForAssignment: function(oAssignment, aEvents) {
			return _.findIndex(aEvents, function(event) {
				return event.coordinate.y.toFixed(6) === parseFloat(oAssignment.LATITUDE).toFixed(6) &&
					event.coordinate.x.toFixed(6) === parseFloat(oAssignment.LONGITUDE).toFixed(6) &&
					event.tourEventTypes[0] === "SERVICE";
			});
		},
		
		// TODO: docs
		_updateAssignmentsWithTravelTime: function(aAssignments, oPTVResponse) {
			var aUpdatedAssignments = _.cloneDeep(aAssignments);
			// sort to get the same sequence, as was used in _calculateRoute
			aUpdatedAssignments.sort(function(a,b) {
				return a.DateFrom - b.DateFrom;
			});
			if(oPTVResponse.data.legs && oPTVResponse.data.events && oPTVResponse.data.events.length) {
				var aTourEvents = oPTVResponse.data.events;
				var aLegs = oPTVResponse.data.legs;
				
				for(var nAssIndex = 0; nAssIndex < aUpdatedAssignments.length; nAssIndex++) { // skip the last assignment
					var oCalculated = this._getTravelTimeAndDistanceForAssignment(aUpdatedAssignments[nAssIndex], aTourEvents);
					// var nTravelTime = oCalculated.time;
					
					aUpdatedAssignments[nAssIndex].TRAVEL_TIME = oCalculated.time;
					aUpdatedAssignments[nAssIndex].DISTANCE = oCalculated.distance;
					// set TRAVEL_BACK_TIME to zero to make sure that only one assignment has non-zero TRAVEL_BACK_TIME
					aUpdatedAssignments[nAssIndex].TRAVEL_BACK_TIME = 0;
					
				}
			}
			var nLastLegIndex = oPTVResponse.data.legs.length - 1;
			var nLastAssignmentIndex = aUpdatedAssignments.length - 1;
			
			//assign TRAVEL_BACK_TIME for the last assignment
			// var sTravelHomeTime = Math.ceil((oPTVResponse.data.legs[nLastLegIndex].travelTime - 
			// 	aUpdatedAssignments[nLastAssignmentIndex].Effort * 3600) / 60).toString();
			
			var oCalculatedHome = this._getTravelTimeAndDistanceForAssignment(aUpdatedAssignments[nLastAssignmentIndex], aTourEvents, true);
			var nTravelHomeTime = oCalculatedHome.time;
			aUpdatedAssignments[nLastAssignmentIndex].TRAVEL_BACK_TIME = oCalculatedHome.time;
			aUpdatedAssignments[nLastAssignmentIndex].DISTANCE_BACK = oCalculatedHome.distance;
			return aUpdatedAssignments;
		},
		
		// TODO: docs
		_isCalculatedRouteValid: function(oResponse) {
			var oRouteStart = new Date(oResponse.data.tourReport.startTime);
			var oRouteEnd = new Date(oResponse.data.tourReport.endTime);
			var bValid = true;
			var sErrorMessage;
			if(oRouteStart.getDay() !== oRouteEnd.getDay()) {
				sErrorMessage = this.oComponent.getModel("i18n").getResourceBundle().getText("ymsg.tooMuchPlanned");
				MessageBox.error(sErrorMessage);
				bValid = false;
			}
			
			oResponse.data.events.forEach(function(oEvent) {
				if(oEvent.tourViolations && oEvent.tourViolations.type === "OPENING_INTERVAL") {
					sErrorMessage = this.oComponent.getModel("i18n").getResourceBundle().getText("ymsg.fixedAppointmentNotReachable");
					MessageBox.error(sErrorMessage);
					bValid = false;
				}
			})
			
			return bValid;
		},
		
		// TODO: docs
		_isOptimizedRouteValid: function(oResponse, aAssignments) {
			var bValid = true;
			var aNotPlannedAssignments = [];
			if(oResponse.data.orderIdsNotPlanned) {
				oResponse.data.orderIdsNotPlanned.forEach(function(sAssGuid) {
					var oNotPlannedAssignment = _.find(aAssignments, function(oAssignment) {
						return sAssGuid = oAssignment.Guid;
					});
					aNotPlannedAssignments.push(oNotPlannedAssignment.ORDERID);
				});
				var sErrorMessage = this.oComponent.getModel("i18n").getResourceBundle().getText("ymsg.notPlannedAssignments");
				MessageBox.error(sErrorMessage + " " + aNotPlannedAssignments);
				bValid = false;
			}
			
			return bValid;
		}
		
		
		/* ============================================================================== */
		/* Data types                                                                     */
		/* ------------------------------------------------------------------------------ */
		/* The section below describes types of objects that are used as parameters or    */
		/* return types for the MapProvider interface                                     */
		/* ============================================================================== */

		/**
		 * @typedef {Object} Waypoint
		 * @property {string} LONGITUDE - Longitude value at geographic coordinate system
		 * @property {string} LATITUDE - Latitude value at geographic coordinate system
		 */

		/**
		 * Object structure for the oMapModel provided to constructor of the class. 
		 * Such a structure should has the object returned by `oMapModel.getObject()`
		 * @typedef {Object} PTVMapModelObject
		 * @property {Object} MapServiceLinks
		 * @property {Object[]} MapServiceLinks.results
		 * @property {string} MapServiceLinks.results[i].Link - Base URL for the Map Provider
		 * @property {string} MapServiceLinks.results[i].Username - Username to access the PTV services. As a rule, for PTV the property should be 'xtok'.
		 * @property {string} MapServiceLinks.results[i].Password - Token to access PTV services.
		 */

		/**
		 * @typedef {Object} Assignment
		 * The type includes many properties, see the `com.evorait.evoplan.Assignment` in EvoPlan metadata
		 */

		/**
		 * potential refactoring:
		 * 1) Redefine return value from methods so that in Promise would be wrappen single value instead of whole object from PTV.
		 * That requres refactoring in all modules that uses the PTV.js
		 * 2) Integrate layer describing structure of provided objects (in order to get rid of properties names inside the module, like 
		 * 'TRAVEL_TIME', 'DateFrom', 'Effort', etc). So that the module could work with different data structures.
		 */
	});
});