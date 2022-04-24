/* globals axios */
/* globals _ */
sap.ui.define([
	"com/evorait/evoplan/controller/map/MapProvider",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/m/MessageBox"
], function (MapProvider, OverrideExecution, MessageBox) {
	"use strict";
	
	var ROUTE_SERVICE_PATH = "/XRoute";
	var CALCULATE_ROUTE_PATH = "/calculateRoute";
	
	/**
	 * @class Provides set of methods to communicate to PTV xServer v2 (xserver2-europe-eu-test.cloud.ptvgroup.com).
	 * 
	 */
	return MapProvider.extend("com.evorait.evoplan.controller.map.PTV", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {}
		},
		
		_sAuthToken: "",
		_sRouteCalculationUrl: "",
		
		constructor: function(oComponent, oMapModel) {
			MapProvider.prototype.constructor.call(this, oComponent, oMapModel);
			
			var oServiceData = oMapModel.getData().MapServiceLinks.results[0];
			this._sRouteCalculationUrl = this.sServiceUrl + ROUTE_SERVICE_PATH + CALCULATE_ROUTE_PATH;
			this._sAuthToken = btoa(oServiceData.Username + ":" + oServiceData.Password);
		},
		
		createPayloadForRouteRequest: function(aPointsToVisit, bIncludePolyline) {
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
		
		calculateRoute: function(oResource, aAssignments) {
			// add the recource coordinates at the beginning and to the end of route
			aAssignments.unshift(oResource);
			aAssignments.push(oResource);
			var oRequestBody = this.createPayloadForRouteRequest(aAssignments, true);
			
			return this._sendRouteRequest(this._sRouteCalculationUrl, oRequestBody);
		},
		
		calculateTravelTime: function(oStartPoint, oEndPoint) {
			var oRequestBody = this.createPayloadForRouteRequest([oStartPoint, oEndPoint], false);
			return this._sendRouteRequest(this._sRouteCalculationUrl, oRequestBody);
		},
		
		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
		
		_sendRouteRequest: function(sUrl, oRequestBody) {
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
	});
});
