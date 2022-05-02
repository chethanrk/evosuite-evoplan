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
	 * TODO: actualize docs according to new props
	 * 
	 * @class Provides set of methods to communicate to PTV xServer v2 (xserver2-europe-eu-test.cloud.ptvgroup.com - test server).
	 * The class contain only explanatory comments for its methods. 
	 * For detailed interface description check the com.evorait.evoplan.controller.map.MapProvider class.
	 * 
	 * Note:
	 * In the current implementation logic that is regarding data integration 
	 * (e.g. property names for input parameters, like TRAVEL_TIME or TRAVEL_BACK_TIME) is mixed with communication to PTV.
	 * In future, if needed, the logic could be extracted to a separate layer between the PTV.js and controller that uses the PTV.js 
	 * 
	 * @property {string} _sAuthToken - Authorisation token to pass as a header in requests to PTV 
	 * @property {string} _sRouteCalculationUrl - Url for the `calculateRoute` operation
	 * @property {string} _sCreateDistanceMatrixUrl - Url for the `createDistanceMatrix` operation
	 */
	return MapProvider.extend("com.evorait.evoplan.controller.map.PTV", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {}
		},
		
		_sAuthToken: "",
		_sRouteCalculationUrl: "",
		_sCreateDistanceMatrixUrl: "",
		_sPlanToursUrl: "",
		
		/**
		 * Creates a new instance of the PTV map provider. 
		 * Calls the parent constructor, defines URLs for different operations
		 * @constructor
		 * @param {sap.ui.core.Component} oComponent - The app component.
		 * @param {sap.ui.model.json.JSONModel} oMapModel - JSON model containing all the needed settings for communication with Map services.
		 * PTV.js expects a particular structure for the Model. See the `PTVMapModelObject` type described in 'Data types' section.
		 */
		constructor: function(oComponent, oMapModel) {
			MapProvider.prototype.constructor.call(this, oComponent, oMapModel);
			
			var oServiceData = oMapModel.getData().MapServiceLinks.results[0];
			this._sRouteCalculationUrl = this.sServiceUrl + ROUTE_SERVICE_PATH + CALCULATE_ROUTE_PATH;
			this._sCreateDistanceMatrixUrl = this.sServiceUrl + DIMA_SERVICE_PATH + CREATE_DISTANCE_MATRIX_PATH;
			this._sPlanToursUrl = this.sServiceUrl + TOUR_SERVICE_PATH + PLAN_TOURS_PATH;
			this._sAuthToken = btoa(oServiceData.Username + ":" + oServiceData.Password);
		},
		
		/**
		 * Makes request to calculate a route with polyline
		 * Corresponding documentation:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.XRoute.calculateRoute
		 */
		calculateRoute: function(oResource, aAssignments) {
			// add the recource coordinates at the beginning and to the end of route
			aAssignments.unshift(oResource);
			aAssignments.push(oResource);
			var oRequestBody = this._createPayloadForRouteRequest(aAssignments, true);
			
			return this._sendPOSTRequestToPTV(this._sRouteCalculationUrl, oRequestBody);
		},
		
		/**
		 * Makes request to calculate a route between **two** points. Requests only time and distance information
		 * Corresponding documentation:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.XRoute.calculateRoute
		 */
		calculateSingleTravelTime: function(oStartPoint, oEndPoint) {
			var oRequestBody = this._createPayloadForRouteRequest([oStartPoint, oEndPoint], false);
			return this._sendPOSTRequestToPTV(this._sRouteCalculationUrl, oRequestBody).then(function(oRouteResponse) {
					return oRouteResponse.data.travelTime / 60; // return the travel time in minutes
				}.bind(this));
		},
		
		/**
		 * Makes request to calculate a route travel time for each leg between waypoints (Assignments)
		 * See the resultFields.legs property of the RouteRequest type:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Content/API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.LegResultFields
		 */
		calculateTravelTimeForMultipleAssignments: function(oResource, aAssignments) {
			var aWaypoints = _.cloneDeep(aAssignments);
			// add the recource coordinates at the beginning and to the end of route
			aWaypoints.unshift(oResource);
			aWaypoints.push(oResource);
			var oRequestBody = this._createPayloadForRouteRequest(aWaypoints, false, true);
			
			return this._sendPOSTRequestToPTV(this._sRouteCalculationUrl, oRequestBody);
		},
		
		/**
		 * @return {Assignment[]} a new array that includes provided assignments with updated TRAVEL_TIME and TRAVEL_BACK_TIME properties.
		 * The properties updated according to results returned by PTV `calculateRoute` function.
		 */
		updateAssignmentsWithTravelTime: function(oResource, aAssignments) {
			return this.calculateTravelTimeForMultipleAssignments(oResource, aAssignments).then(function(oPTVResponse) {
				var aUpdatedAssignments = _.cloneDeep(aAssignments);
				if(oPTVResponse.data.legs) {
					aUpdatedAssignments.forEach(function(oAssignment, index) {
						var sCalculatedTime =  (oPTVResponse.data.legs[index].travelTime / 60).toFixed(2).toString();
						oAssignment.TRAVEL_TIME = sCalculatedTime;
					});
				}
				// TODO assign TRAVEL_BACK_TIME for thte last assignment
				var nLastLegIndex = oPTVResponse.data.legs.length - 1;
				var nLastAssignmentIndex = aUpdatedAssignments.length - 1;
				
				//assign TRAVEL_BACK_TIME for the last assignment
				var sTravelHomeTime =  (oPTVResponse.data.legs[nLastLegIndex].travelTime / 60).toFixed(2).toString();
				aUpdatedAssignments[nLastAssignmentIndex].TRAVEL_BACK_TIME = sTravelHomeTime;
				return aUpdatedAssignments;
			});
		},
		
		/**
		 * Optimizes a route to reduce distance and travel time. Returned route may have different sequence of points to visit.
		 * TODO: add comments regarding the distance matrix
		 * Corresponding documentation:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#TechnicalConcepts/Routing/DSC_Distance_Matrices.htm
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#UseCases/Routing/UC_Accessing_DistanceMatrixContents.htm
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xdima.html#com.ptvgroup.xserver.xdima.XDima.createDistanceMatrix
		 */
		optimizeRoute: function(oResource, aAssignments) {
			// TODO: implement call to the xTour service
			
			return this._createDistanceMatrix(oResource, aAssignments).then(function(sMatrixId) {
				return this._planTours(oResource, aAssignments, sMatrixId);
			}.bind(this));
		},
		
		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
		
		/**
		 * Creates payload according to RouteRequest type:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Content/API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.RouteRequest
		 * @param {Waypoint[]} aPointsToVisit - Array of Waypoint to be visisted.
		 * @param {boolean} bIncludePolyline - Flag to indicate, whether the polyline should be requested.
		 * Polyline is set of coordinates representing a route.
		 * @return {Object} - Payload for a reoute request
		 */
		_createPayloadForRouteRequest: function(aPointsToVisit, bIncludePolyline, bIncludeLegs) {
			var oPointTemplate = {
				"$type": "OffRoadWaypoint",
				"location": {
				   "offRoadCoordinate": {
					   "x": "",
					   "y": ""
				   }
				}
			};
			var aPoints = aPointsToVisit.reduce(function(prev, next) {
				var oPoint = _.cloneDeep(oPointTemplate);
				oPoint.location.offRoadCoordinate.x = next.LONGITUDE;
				oPoint.location.offRoadCoordinate.y = next.LATITUDE;
				prev.push(oPoint);
				return prev;
			}, []);
			
			var oPayload = {};
			oPayload.waypoints = aPoints;
			
			// Defiend the `car` profile as it's not supposed to use trucks to deliver cargos.
			// Only service is supposed.
			oPayload.storedProfile = "car";
			
			if(bIncludePolyline) {
				oPayload.resultFields = {
					polyline: true
				};
				oPayload.geometryOptions = {
			        "responseGeometryTypes": ["GEOJSON"]
			    };
			}
			
			if(bIncludeLegs && oPayload.resultFields) {
				oPayload.resultFields.legs = {
					enabled: true
				};
			} else if(bIncludeLegs) {
				oPayload.resultFields = {
					legs: {
						enabled: true
					}
				};
			}
			
			return oPayload;
		},
		
		/**
		 * TODO: docs
		 */
		_createDistanceMatrix: function(oStartPoint, aPointsToVisit) {
			var oRequestBody = this._createPayloadForDistanceMatrixRequest([oStartPoint].concat(aPointsToVisit));
			return this._sendPOSTRequestToPTV(this._sCreateDistanceMatrixUrl, oRequestBody).then(function(oCreateMatrixResponse) {
					return oCreateMatrixResponse.data.summary.id;
				}.bind(this));
		},
		
		/**
		 * TODO: docs
		 */
		_createPayloadForDistanceMatrixRequest: function(aWaypoints) {
			var oPointTemplate = {
				"$type": "OffRoadRouteLocation",
				"offRoadCoordinate": {
					"x": "",
					"y": ""
				}
			};
			
			var aPreparedPoints = aWaypoints.reduce(function(prev, next) {
				var oPoint = _.cloneDeep(oPointTemplate);
				oPoint.offRoadCoordinate.x = next.LONGITUDE;
				oPoint.offRoadCoordinate.y = next.LATITUDE;
				prev.push(oPoint);
				return prev;
			}, []);
			
			var oPayload = {};
			oPayload.startLocations = aPreparedPoints;
			oPayload.storedProfile = "car";
			
			return oPayload;
		},
		
		/**
		 * TODO: docs
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xtour.html#com.ptvgroup.xserver.xtour.PlanToursRequest
		 */
		_planTours: function(oResource, aAssignments, sMatrixId) {
			var oRequestBody = this._createPayloadForPlanToursRequest(oResource, aAssignments, sMatrixId);
			return this._sendPOSTRequestToPTV(this._sPlanToursUrl, oRequestBody);
		},
		
		/**
		 * TODO: docs
		 */
		_createPayloadForPlanToursRequest: function(oResource, aAssignments, sMatrixId) {
			var oLocationTemplate = {
				"$type": "CustomerSite",
				"id": "",
				"routeLocation": {
					"$type": "OffRoadRouteLocation",
					"offRoadCoordinate": {
						"x": "",
						"y": ""
					}
				}
			};
			
			var oOrderTemplate = {
				"$type": "VisitOrder",
				"id": "",
				"locationId": "",
				"serviceTime": ""
			};
			
			var aXTourLocations = [];
			var aXTourOrders = [];
			
			aAssignments.forEach(function(oAssignment) {
				var oLocation = _.cloneDeep(oLocationTemplate);
				oLocation.id = oAssignment.ObjectId;
				oLocation.routeLocation.offRoadCoordinate.x = oAssignment.LONGITUDE;
				oLocation.routeLocation.offRoadCoordinate.y = oAssignment.LATITUDE;
				aXTourLocations.push(oLocation);
				
				var oOrder = _.cloneDeep(oOrderTemplate);
				oOrder.id = oAssignment.ObjectId;
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
			oPayload.fleet = {
				vehicles: [{
					ids: ["vehicle1"],
					startLocationId: "ResourceHomeLocation",
					endLocationId: "ResourceHomeLocation"
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
				}
			};
			
			return oPayload;
		},
		
		
		/**
		 * Sends a POST request to PTV. In case of error returned from service, displays the message within sap.m.MessageBox
		 * @param {string} sUrl - Url to send the request to
		 * @param {Object} oRequestBody - The request body
		 * @return @return {Promise<Object>} Promise object represents the response from Map Provider service.
		 * Documentation for the PTV ResponseBase type:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/service.html#com.ptvgroup.xserver.service.ResponseBase
		 */
		_sendPOSTRequestToPTV: function(sUrl, oRequestBody) {
			return axios.post(sUrl, oRequestBody, {
				headers: {
					"Authorization": "Basic " + this._sAuthToken
				}
			}).catch(function(oError) {
				var sErrorMessage = oError.response.data.message ? 
					oError.response.data.message : this.oComponent.getModel("i18n").getResourceBundle().getText("errorMessage");
				MessageBox.error(sErrorMessage);
			}.bind(this));
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
	});
});
