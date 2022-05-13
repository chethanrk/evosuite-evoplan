sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/base/Log"
], function (Controller, OverrideExecution, Log) {
	"use strict";
	
	// TODO dibrovv: update interface and docs according to current implementation
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
				getRoutePolyline: {
					
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
		 * Calculates a route polyline based on a resource-home address and a list of assignments to visit.
		 * @abstract
		 * @param {Waypoint} oResource - A Resource object that defines home address.
		 * @param {Waypoint[]} aAssignments - Array of assignments to be visited.
		 * @return {Promise<RouteResponse>} - Promise object represents the response from Map Provider service.
		 */
		getRoutePolyline: function(oResource, aAssignments) {
			Log.error("The 'getRoutePolyline' method is not implemented!" );
		},
		
		/**
		 * Calculates travel time between **two** waypoints
		 * @abstract
		 * @param {Waypoint} oStartPoint - Point to calculate a route **from**.
		 * @param {Waypoint} oEndPoint - Point to calculate a route **to**.
		 * @return {Promise<number>} Promise object represents travel time in minutes.
		 */
		calculateSingleTravelTime: function(oStartPoint, oEndPoint) {
			Log.error("The 'calculateTravelTime' method is not implemented!" );
		},
		
		/**
		 * Calculates travel times for each leg between resource and it's assignments.
		 * Doesn't change assignments sequence.
		 * @abstract
		 * @param {Waypoint} oResource -A Resource object that defines home address.
		 * @param {Waypoint[]} aAssignments - Array of assignments to be visited.
		 * @return {Promise<RouteResponseWithLegs>} Promise object represents response from PTV.
		 */
		calculateTravelTimeForMultipleAssignments: function(oResource, aAssignments) {
			Log.error("The 'calculateTravelTimeForMultipleAssignments' method is not implemented!" );
		},
		
		/**
		 * Updates Assignment list with travel timeas according to sequence provided in parameters.
		 * @abstract
		 * @param {Waypoint} oResource - A Resource object that defines home address.
		 * @param {Waypoint} aAssignments - Array of assignments to be visited.
		 * @return {Promise<Assignment[]>} Promise object represents array of updated Assignments.
		 */
		updateAssignmentsWithTravelTime: function(oResource, aAssignments) {
			Log.error("The 'updateAssignmentsWithTravelTime' method is not implemented!" );
		},
		
		/**
		 * Optimizes a route to reduce distance and travel time. Returned route may have different sequence of points to visit.
		 * @abstract
		 * @param {Waypoint} oResource - A Resource object that defines home address.
		 * @param {Waypoint[]} aAssignments - Arroy of assignments to be visited.
		 * @return {Promise<RouteResponse>} - Promise object represents the response from Map Provider service.
		 */
		optimizeRoute: function(oResource, aAssignments) {
			Log.error("The 'optimizeRoute' method is not implemented!" );
		},
		
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
		 * @property {Object} data - all the data returned by map provider
		 * @property {number} data.distance - distance to be covered within the route
		 * @property {number} data.travelTime - time to travel in seconds
		 */
		
		/**
		 * @typedef {Object} RouteResponse
		 * @property {Object} data - all the data returned by map provider
		 * @property {number} data.distance - distance to be covered within the route
		 * @property {number} data.travelTime - time to travel in seconds
		 * @property {Object} data.polyline - Wrapper object around a set of coordinates representing the route
		 * @property {string} data.polyline.geoJSON - string containing object in format of GeoJSON. See the specification: https://geojson.org/
		 * The object represents the route itself; it contains the whole set of the needed coordinates to build a route.
		 */
		 
		 /**
		 * @typedef {Object} RouteResponseWithLegs
		 * @property {Object} data - all the data returned by map provider
		 * @property {number} data.distance - distance to be covered within the route
		 * @property {number} data.travelTime - time to travel in seconds
		 * @property {Leg[]} legs - array of legs to be covered within the route
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
		 
		 /**
		 * Waypoint with travel time. Usually it's an Assignment.
		 * @typedef {Object} WaypointWithTravelTime
		 * @property {string} LONGITUDE - Longitude value at geographic coordinate system
		 * @property {string} LATITUDE - Latitude value at geographic coordinate system
		 * @property {string} TRAVEL_TIME - Travel time to the point
		 * @property {string} TRAVEL_BACK_TIME - Travel time from the point till Resource location. 
		 * Is not zero in case the point is the last one in route sequence.
		 */
		 
		 /**
		 * @typedef {Object} Assignment
		 * The type includes many properties, see the `com.evorait.evoplan.Assignment` in EvoPlan metadata
		 */
		 
		 /**
		 * @typedef {Object} Leg
		 * @property {string} distance - distance to be covered within the leg
		 * @property {string} travelTime - time to travel in seconds
		 */
	});
});
