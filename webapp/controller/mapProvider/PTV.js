/* globals axios */
/* globals _ */
sap.ui.define([
	"com/evorait/evoplan/controller/mapProvider/MapProvider",
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
	var VEHICLE_ID = "EvoPlanVehicle";
	var DRIVER_ID = "EvoPlanDriver";

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
	 * @property {string} _sDefaultResourceEndtHour - Number representing ending working hour (e.g. 17)
	 * @property {sap.ui.model.json.JSONModel} oUserModel - User model containing system parameters for a user
	 */
	return MapProvider.extend("com.evorait.evoplan.controller.mapProvider.PTV", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {
				constructor: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead	
				},
				getRoutePolyline: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				calculateSingleTravelTime: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				calculateTravelTimeForMultipleAssignments: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				calculateRoute: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				optimizeRoute: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				}
			}
		},

		_sAuthToken: "",
		_sRouteCalculationUrl: "",
		_sCreateDistanceMatrixUrl: "",
		_sPlanToursUrl: "",
		_sDefaultResourceStartHour: "",
		_sDefaultResourceEndHour: "",
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
			this._sDefaultResourceStartHour = parseInt(this.oUserModel.getProperty("/DEFAULT_SINGLE_PLNNR_STARTHR")) || 0;
			this._sDefaultResourceEndHour = parseInt(this.oUserModel.getProperty("/DEFAULT_SINGLE_PLNNR_ENDHR")) || 24;
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
			});
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
		 * @return {{Promise<Assignment[]>} a new array that includes provided assignments with the following updated properties: 
		 * - TRAVEL_TIME 
		 * - TRAVEL_BACK_TIME
		 * - DateFrom
		 * - DateTo
		 * - DISTANCE
		 * - DISTANCE_BACK
		 * The properties updated according to results returned by PTV `calculateRoute` function.
		 */
		calculateRoute: function(oResource, aAssignments, oDateForRoute) {
			return this.calculateTravelTimeForMultipleAssignments(oResource, aAssignments, oDateForRoute).then(function(oResponse) {
				if(!this._isCalculatedRouteValid(oResponse)) {
					return aAssignments;
				}
				var aAssignmentsWithTravelTime = this._updateAssignmentsWithTravelTimeAndDistance(aAssignments, oResponse);
				if(oResponse.data.events && oResponse.data.events.length) {
					var aTourEvents = oResponse.data.events;
					var nEventIndex = 1; // start with 1 because the aTourEvents[0] is corresponding to the resource home location
					
					// update DateFrom and DateTo for assignments
					aAssignmentsWithTravelTime.forEach(function(oAssignment) {
						if(oAssignment.FIXED_APPOINTMENT) {
							return;
						}
						nEventIndex = this._getServiceEventIndexForAssignment(oAssignment, aTourEvents);
						var oServiceEvent = aTourEvents[nEventIndex];
						
						var oStartDate = moment(oServiceEvent.startsAt);
						oAssignment.DateFrom = oStartDate.toDate();
						
						var oEndDate = oStartDate.clone();
						oEndDate.add(oAssignment.Effort, "hours");
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
		optimizeRoute: function (oResource, aAssignments, aBreaks) {
			var oDate = aAssignments[0].DateFrom;
			return this._createDistanceMatrix(oResource, aAssignments, oDate).then(function (sMatrixId) {
					return this._planTours(oResource, aAssignments, sMatrixId, oDate, aBreaks);
				}.bind(this)).then(function (oTourResponse) {
						
					this._isOptimizedRouteValid(oTourResponse, aAssignments); // don't interrupt current function execution to show, what's plannable

					var aUpdatedAssignments = _.cloneDeep(aAssignments);
					if (oTourResponse.data.tourReports && oTourResponse.data.tourReports.length === 1) {
						var aTourEvents = oTourResponse.data.tourReports[0].tourEvents;
						var aLegs = oTourResponse.data.tourReports[0].legReports;

						aTourEvents.forEach(function (oTourEvent, nEventIndex) {
							if (oTourEvent.eventTypes[0] === "SERVICE") {
								var nAssIndex = _.findIndex(aUpdatedAssignments, function (oAssignment) {
									return oTourEvent.orderId === oAssignment.Guid; // the orderId was defined as Guid value in moment of making the request
								});
								
								aUpdatedAssignments[nAssIndex].TRAVEL_BACK_TIME = 0;
								
								var oCorrespondingDriving = this._getCorrespondingDriving(aTourEvents, nEventIndex);
								var nTravelTime = Math.ceil(oCorrespondingDriving.travelTime / 60);
								
								aUpdatedAssignments[nAssIndex].TRAVEL_TIME = nTravelTime.toString();
								
								if(!aUpdatedAssignments[nAssIndex].FIXED_APPOINTMENT) {
									var oStartDate = moment(aTourEvents[nEventIndex].startTime);
									aUpdatedAssignments[nAssIndex].DateFrom = oStartDate.toDate();
									var oEndDate = oStartDate.clone();
									oEndDate.add(aUpdatedAssignments[nAssIndex].Effort, "hours");
									aUpdatedAssignments[nAssIndex].DateTo = oEndDate.toDate();
								}
								
								var oLeg = this._getCorrespondingLeg(oCorrespondingDriving.index, aLegs);
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
					};
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
			});
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
		_planTours: function (oResource, aAssignments, sMatrixId, oDate, aBreaks) {
			var oRequestBody = this._createPayloadForPlanToursRequest(oResource, aAssignments, sMatrixId, oDate, aBreaks);
			return this._sendPOSTRequestToPTV(this._sPlanToursUrl, oRequestBody);
		},

		/**
		 * Creates payload according to PlanToursRequest type:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xtour.html#com.ptvgroup.xserver.xtour.PlanToursRequest
		 * @param {Waypoint} oResource - starting point for the route
		 * @param {Waypoint[]} aAssignments - Array of Waypoint to be visisted.
		 * @param {string} sMatrixId - Id of the corresponding distance matrix, returned by `_createDistanceMatrix`.
		 * @param {Date} oDateForRoute - Date for which the route calculation should be performed
		 * @param {TimePeriod[]} aBreaks - Arroy of breaks to be considered.
		 * @return {Object} - Payload for a planTours request
		 */
		_createPayloadForPlanToursRequest: function (oResource, aAssignments, sMatrixId, oDate, aBreaks) {
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
					};
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
			oResourceLocation.$type = "DepotSite";
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
			oEndDate.setHours(this._sDefaultResourceEndHour - 1, 59, 59, 999);

			// use oStartDate for `start` as well as for `end` in the tourStartInterval property to restrict start tour time
			oPayload.fleet = {
				vehicles: [{
					ids: [VEHICLE_ID],
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
			
			if(aBreaks) {
				oPayload.fleet.drivers = [];
				var oDriver = {
					id: DRIVER_ID,
					vehicleId: VEHICLE_ID,
					breakIntervals: []
				};
				aBreaks.forEach(function(oBreak) {
					
					var nBreakTime = Math.floor((oBreak.DateTo.getTime() - oBreak.DateFrom.getTime()) / 1000);
					var oBreakInterval = {
						breakTime: nBreakTime,
						interval: {
							$type: "StartEndInterval",
							start: oBreak.DateFrom,
							end: oBreak.DateTo
						}
					};
					oDriver.breakIntervals.push(oBreakInterval);
				});
				oPayload.fleet.drivers.push(oDriver);
			}

			return oPayload;
		},
		
		/**
		 * Return corresponding leg for a needed driving event.
		 * Works ONLY with TourResponse:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Content/API-Documentation/xtour.html#com.ptvgroup.xserver.xtour.ToursResponse
		 * @param {number} nEventId - sequence number of the needed driving event (in the returned by PTV events array)
		 * @param {LegReport[]} aLegs - array or returned by PTV Legs. See the documentation for the data type:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xtour.html#com.ptvgroup.xserver.xtour.LegReport
		 * @return {LegReport} Corresponding leg.
		 */
		_getCorrespondingLeg: function(nEventId, aLegs) {
			return _.find(aLegs, function(oLeg) {
				return nEventId === oLeg.startTourEventIndex;
			});
		},

		/**
		 * Sends a POST request to PTV. In case of error returned from service, displays the message within sap.m.MessageBox.
		 * @param {string} sUrl - Url to send the request to.
		 * @param {Object} oRequestBody - The request body.
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
		 * Searches for a corresponding driving event in an array of Tour events.
		 * Works ONLY with TourResponse:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Content/API-Documentation/xtour.html#com.ptvgroup.xserver.xtour.ToursResponse
		 * @param {com.ptvgroup.xserver.xtour.TourEvent[]} aEvents - array of returned from PTV Tour events. See the documentation:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xtour.html#com.ptvgroup.xserver.xtour.TourEvent
		 * @param {Number} nCurrentIndex - index of the service event, for which driving event should be found.
		 * @return {Driving} - js Object containing index of corresponding driving event and travel time.
		 * @throws {Error} in case the driving event wasn't found.
		 */
		_getCorrespondingDriving: function(aEvents, nCurrentIndex) {
			var nDrivingEventIndex;
			var nTravelTime = 0;
			for(var nEventIndex = nCurrentIndex - 1; nEventIndex >= 0; nEventIndex--) {
				if(aEvents[nEventIndex].eventTypes[0] === "DRIVING") {
					nTravelTime += aEvents[nEventIndex].duration;
					nDrivingEventIndex = nEventIndex;
				} else if(aEvents[nEventIndex].eventTypes[0] === "SERVICE" || aEvents[nEventIndex].eventTypes[0] === "TRIP_START") {
					break;
				}
			}
			if(!nDrivingEventIndex) {
				// in case there were no corresponding driving event throw an error
				var sErrorMessage = this.oComponent.getModel("i18n").getResourceBundle().getText("noDrivingEvent");
				throw new Error(sErrorMessage);
			}
			
			return {
				index: nDrivingEventIndex,
				travelTime: nTravelTime
			};
		},
		
		/**
		 * Calculate travel time and distance for a particular assignment instance based on provided by PTV response.
		 * Works ONLY with RouteResponse:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.RouteResponse
		 * @param {com.evorait.evoplan.Assignment} oAssignment - Assignment object for which the calculation should be done.
		 * @param {com.ptvgroup.xserver.xroute.TourEvent[]} aEvents - Array of returned by PTV events. See the data type documentation:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.TourEvent
		 * @param {boolean} - if travel time and distance should be calculated for a way home (after the last assignment).
		 * @return {TimeDistance} js object containing calculated time and distance.
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
		 * Get index of the corresponding service event.
		 * Works ONLY with RouteResponse:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.RouteResponse
		 * @param {com.evorait.evoplan.Assignment} oAssignment - Assignment object, for which the service event should be found.
		 * @param {com.ptvgroup.xserver.xroute.TourEvent[]} aEvents - Array of returned by PTV events. See the data type documentation:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.TourEvent
		 * @return {number} - index of the corresponding service event.
		 */
		_getServiceEventIndexForAssignment: function(oAssignment, aEvents) {
			return _.findIndex(aEvents, function(event) {
				return event.coordinate.y.toFixed(6) === parseFloat(oAssignment.LATITUDE).toFixed(6) &&
					event.coordinate.x.toFixed(6) === parseFloat(oAssignment.LONGITUDE).toFixed(6) &&
					event.tourEventTypes[0] === "SERVICE";
			});
		},
		
		/**
		 * Update provided Assignments with travel time and distance returned from PTV.
		 * Used in the route calculation.
		 * @param {com.evorait.evoplan.Assignment[]} aAssignments - array of assignments to update.
		 * @param {com.ptvgroup.xserver.xroute.RouteResponse} oPTVResponse - response from PTV for calculateRoute operation. See the data type documentation:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.RouteResponse
		 * @return {com.evorait.evoplan.Assignment[]} array of updated assignments.
		 */
		_updateAssignmentsWithTravelTimeAndDistance: function(aAssignments, oPTVResponse) {
			var aUpdatedAssignments = _.cloneDeep(aAssignments);
			// sort to get the same sequence, as was used in _calculateRoute
			aUpdatedAssignments.sort(function(a,b) {
				return a.DateFrom - b.DateFrom;
			});
			if(oPTVResponse.data.legs && oPTVResponse.data.events && oPTVResponse.data.events.length) {
				var aTourEvents = oPTVResponse.data.events;
				
				for(var nAssIndex = 0; nAssIndex < aUpdatedAssignments.length; nAssIndex++) { // skip the last assignment
					var oCalculated = this._getTravelTimeAndDistanceForAssignment(aUpdatedAssignments[nAssIndex], aTourEvents);
					// var nTravelTime = oCalculated.time;
					
					aUpdatedAssignments[nAssIndex].TRAVEL_TIME = oCalculated.time;
					aUpdatedAssignments[nAssIndex].DISTANCE = oCalculated.distance;
					// set TRAVEL_BACK_TIME to zero to make sure that only one assignment has non-zero TRAVEL_BACK_TIME
					aUpdatedAssignments[nAssIndex].TRAVEL_BACK_TIME = 0;
					
				}
			}
			var nLastAssignmentIndex = aUpdatedAssignments.length - 1;
			
			// assign time and distance for travelling home
			var oCalculatedHome = this._getTravelTimeAndDistanceForAssignment(aUpdatedAssignments[nLastAssignmentIndex], aTourEvents, true);
			aUpdatedAssignments[nLastAssignmentIndex].TRAVEL_BACK_TIME = oCalculatedHome.time;
			aUpdatedAssignments[nLastAssignmentIndex].DISTANCE_BACK = oCalculatedHome.distance;
			return aUpdatedAssignments;
		},
		
		/**
		 * Check if the calculated route is within working hours and if all the fixed appointments have been met.
		 * Used in the route calculation.
		 * @param {com.ptvgroup.xserver.xroute.RouteResponse} oPTVResponse - response from PTV for calculateRoute operation. See the data type documentation:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.RouteResponse
		 * @return {boolean} if the route is valid.
		 */
		_isCalculatedRouteValid: function(oResponse) {
			var oWorkingDayEnd = new Date(oResponse.data.tourReport.startTime);
			var oRouteEnd = new Date(oResponse.data.tourReport.endTime);
			oWorkingDayEnd.setHours(this._sDefaultResourceEndHour - 1, 59, 59, 999);
			var bValid = true;
			var sErrorMessage;
			if(oRouteEnd > oWorkingDayEnd) {
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
			});
			
			return bValid;
		},
		
		/**
		 * Check if the optimized route is within working hours and if all the fixed appointments have been met.
		 * Used in the route optimization.
		 * @param {com.ptvgroup.xserver.xtour.ToursResponse} oPTVResponse - response from PTV for planTours operation. See the data type documentation:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xtour.html#com.ptvgroup.xserver.xtour.ToursResponse
		 * @return {boolean} if the route is valid.
		 */
		_isOptimizedRouteValid: function(oResponse, aAssignments) {
			var bValid = true;
			var aNotPlannedAssignments = [];
			if(oResponse.data.orderIdsNotPlanned) {
				oResponse.data.orderIdsNotPlanned.forEach(function(sAssGuid) {
					var oNotPlannedAssignment = _.find(aAssignments, function(oAssignment) {
						return sAssGuid === oAssignment.Guid;
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
		 * @typedef {Object} TimeDistance
		 * @property {number} time - Travel time
		 * @property {number} distance - Travel distance
		 */
		 
		 /**
		 * @typedef {Object} Driving
		 * @property {number} travelTime - Travel time
		 * @property {number} index - Index of the corresponding driving event.
		 * The corresponding driving can be divided into multiple driving events due to break. 
		 * In case there are multiple driving events for the Driving between two Assignments,
		 * returned index reflects to the very first driving event because exactly the first one corresponds to LegReport.
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