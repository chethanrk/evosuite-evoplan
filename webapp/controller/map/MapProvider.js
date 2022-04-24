sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/base/Log"
], function (Controller, OverrideExecution, Log) {
	"use strict";
	
	/**
	 * @class Provides interface for communication with a Map Provider. 
	 * All the particular provider-related implementations (e.g. PTV) should use the class as a parent and provide the same interface.
	 * @abstract
	 * 
	 */
	return Controller.extend("com.evorait.evoplan.controller.map.MapProvider", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {}
		},
		
		sServiceUrl: "",
		oComponent: null,
		
		constructor: function(oComponent, oMapModel) {
			this.oComponent = oComponent;
			this.sServiceUrl = oMapModel.getData().MapServiceLinks.results[0].Link;
		},
		
		/**
		 * 
		 * @abstract
		 */
		calculateRoute: function() {
			Log.error("The 'calculateRoute' method is not implemented!" );
		},
		
		calculateTravelTime: function(oStartPoint, oEndPoint) {
			Log.error("The 'calculateTravelTime' method is not implemented!" );
		}
	});
});
