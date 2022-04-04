/* globals axios */
/* globals _ */
sap.ui.define([
	"com/evorait/evoplan/controller/map/MapProvider",
	"sap/ui/core/mvc/OverrideExecution"
], function (MapProvider, OverrideExecution) {
	"use strict";
	
	/**
	 * @class Provides set of methods to communicate to PTV xServer v2 (xserver2-europe-eu-test.cloud.ptvgroup.com).
	 * 
	 */
	return MapProvider.extend("com.evorait.evoplan.controller.map.PTVProvider", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {}
		},
		
		_sAuthToken: "",
		
		constructor: function() {
			// TODO: fetch the settings from backend (should be defined in customizing)
			MapProvider.prototype.constructor.call(this);
			this._sRouteCalculationUrl = "https://xserver2-europe-eu-test.cloud.ptvgroup.com/services/rs/XRoute/calculateRoute";
			this._sAuthToken = btoa("xtok" + ":" + "c70879b0-46a5-4f7e-b93f-7efb3bc2bf77");
		},
		
		createPayloadForRouteRequest: function(aPointsToVisit) {
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
			
			var oPayload = {
				"resultFields": {
					"polyline": true
				},
				"geometryOptions" : {
			        "responseGeometryTypes": ["GEOJSON"]
			    }
			};
			oPayload.waypoints = aPoints;
			
			return oPayload;
		},
		
		calculateRoute: function(oResource, aAssignments) {
			// add the recource coordinates at the beginning and to the end of route
			aAssignments.unshift(oResource);
			aAssignments.push(oResource);
			var oRequestBody = this.createPayloadForRouteRequest(aAssignments);
			
			return axios.post(this._sRouteCalculationUrl, oRequestBody, {
				headers: {
					"Authorization": "Basic " + this._sAuthToken
				}
			}).catch(function(oError) {
				// TODO parse response, display demand, that led to error
			});
		}
	});
});
