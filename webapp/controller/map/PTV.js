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
	
	/**
	 * @class Provides set of methods to communicate to PTV xServer v2 (xserver2-europe-eu-test.cloud.ptvgroup.com - test server).
	 * The class contain only explanatory comments for its methods. 
	 * For detailed interface description check the com.evorait.evoplan.controller.map.MapProvider class.
	 * @property {string} _sAuthToken - Authorisation token to pass as a header in requests to PTV 
	 * @property {string} _sRouteCalculationUrl - Url for the `calculateRoute` operation
	 */
	return MapProvider.extend("com.evorait.evoplan.controller.map.PTV", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {}
		},
		
		_sAuthToken: "",
		_sRouteCalculationUrl: "",
		
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
		 * Makes request to calculate a route. Requests only time and distance information
		 * Corresponding documentation:
		 * https://xserver2-europe-eu-test.cloud.ptvgroup.com/dashboard/Default.htm#API-Documentation/xroute.html#com.ptvgroup.xserver.xroute.XRoute.calculateRoute
		 */
		calculateTravelTime: function(oStartPoint, oEndPoint) {
			var oRequestBody = this._createPayloadForRouteRequest([oStartPoint, oEndPoint], false);
			return this._sendPOSTRequestToPTV(this._sRouteCalculationUrl, oRequestBody);
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
		_createPayloadForRouteRequest: function(aPointsToVisit, bIncludePolyline) {
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
					"polyline": true
				};
				oPayload.geometryOptions = {
			        "responseGeometryTypes": ["GEOJSON"]
			    };
			}
			
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
		
	});
});
