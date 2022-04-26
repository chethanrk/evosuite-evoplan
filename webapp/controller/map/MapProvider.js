sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/base/Log"
], function (Controller, OverrideExecution, Log) {
	"use strict";
	
	/**
	 * @class Provides interface for communication with a Map Provider. 
	 * All the particular provider-related implementations (e.g. PTV) should use the class as a parent and provide the same interface.
	 * The class is abstract and should not be used directly. Please always implement the interface in an inheritor.
	 * @abstract
	 * @property {sap.ui.core.Component} oComponent - Component of an application, where the MapProvider is applied
	 * @property {string} sServiceUrl - Base URL for the Map Provider 
	 * e.g. it should be 'https://xserver2-europe-eu-test.cloud.ptvgroup.com/services/rs' for the PTV test service.
	 */
	return Controller.extend("com.evorait.evoplan.controller.map.MapProvider", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {
				constructor: {
					
				},
				calculateRoute: {
					
				},
				calculateTravelTime: {
					
				}
			}
		},
		
		sServiceUrl: "",
		oComponent: null,
		
		/**
		 * Creates a new instance of the MapProvider type. 
		 * Initializes its properties `oComponent` and `sServiceUrl` with provided values
		 * @constructor
		 * @param {sap.ui.core.Component} oComponent - the app component
		 * @param {sap.ui.model.json.JSONModel} oMapModel - JSON model containing all the needed settings for communication with Map services.
		 * The model should be based on the data received from `MapProviderSet` Entity Set with expand for navigation property `MapServiceLinks`.
		 * MapProvider.js expects a particular structure for the Model. See the `MapProviderModelObject` type described in 'Data types' section.
		 */
		constructor: function(oComponent, oMapModel) {
			this.oComponent = oComponent;
			this.sServiceUrl = oMapModel.getData().MapServiceLinks.results[0].Link;
		},
		
		/**
		 * Calculates a route based on a resource-home address and a list of assignments to visit.
		 * @abstract
		 * @param {Waypoint} oResource - A Resource object that defines home address.
		 * @param {Waypoint[]} aAssignments - Arroy of assignments to be visited.
		 * @return {Promise<RouteResponse>} - Promise object represents the response from Map Provider service.
		 */
		calculateRoute: function(oResource, aAssignments) {
			Log.error("The 'calculateRoute' method is not implemented!" );
		},
		
		/**
		 * Calculates travel time between two waypoints
		 * @abstract
		 * @param {Waypoint} oStartPoint - Point to calculate a route **from**.
		 * @param {Waypoint} oEndPoint - Point to calculate a route **to**.
		 * @return {Promise<RouteSimpleResponse>} Promise object represents the response from Map Provider service.
		 */
		calculateTravelTime: function(oStartPoint, oEndPoint) {
			Log.error("The 'calculateTravelTime' method is not implemented!" );
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
		 * @typedef {Object} RouteSimpleResponse
		 * @property {number} distance - distance to be covered within the route
		 * @property {number} travelTime - time to travel in seconds
		 */
		
		/**
		 * @typedef {Object} RouteResponse
		 * @property {number} distance - distance to be covered within the route
		 * @property {number} travelTime - time to travel in seconds
		 * @property {Object} polyline - Wrapper object around a set of coordinates representing the route
		 * @property {string} polyline.geoJSON - string containing object in format of GeoJSON. See the specification: https://geojson.org/
		 * The object represents the route itself; it contains the whole set of the needed coordinates to build a route.
		 */
		
		/**
		 * Object structure for the oMapModel provided to constructor of the class. 
		 * Such a structure should has the object returned by `oMapModel.getObject()`
		 * @typedef {Object} MapProviderModelObject
		 * @property {Object} MapServiceLinks
		 * @property {Object[]} MapServiceLinks.results
		 * @property {string} MapServiceLinks.results[i].Link - Base URL for the Map Provider
		 */
	});
});
