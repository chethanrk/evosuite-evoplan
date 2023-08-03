/* globals axios */
/* globals _ */
sap.ui.define([
	"com/evorait/evoplan/controller/scheduling/mapProvider/MapProvider",
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
	return MapProvider.extend("com.evorait.evoplan.controller.scheduling.mapProvider.PTV", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {
				constructor: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				getPTVPayload: {
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
		 * Generates the full payload to pass to PTV.
		 * To generate payload, need to need to get the data for resource and Demands from other helper methods.
		 * @returns {Object} - Payload object
		 * Please see the PTV API documentation to find out, what affect the properties:
		 * https://xserver2-dashboard.cloud.ptvgroup.com/dashboard/Default.htm#Welcome/Home.htm
		 */
		getPTVPayload: function (aResourceData, aDemandsData) {
			var oPayload = this._getPayloadStructure();

			oPayload = this._setResourceData(oPayload, aResourceData);//adding Resource data to payload 
			oPayload = this._setDemandsData(oPayload, aDemandsData);//adding Demand data to payload

			return oPayload;
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

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
		 * get the Structure of Payload to Pass to PTV call.
		 * Used in the Auto/Re-Schduling both.
		 * @return {object} Empty structure of payload.
		 */
		_getPayloadStructure: function () {
			return {
				"locations": [],
				"orders": [],
				"fleet": {
					"vehicles": [],
					"drivers": []
				},
				"distanceMode": {
					"$type": "DirectDistance"
				},
				"planToursOptions": {
					"tweaksToObjective": {
						"minimizeNumberOfTours": false
					},
					"considerOrderPriorities": true,
					"calculationMode": "PERFORMANCE",
					"planningHorizon": {
						"$type": "StartEndInterval",
						"start": "",
						"end": ""
					}
				}
			};
		},

		/**
		 * set the resource data in the payload Structure to Pass to call PTV.
		 * Used in the Auto/Re-Schduling both.
		 * @return {object} Payload structure with resource data.
		 */
		_setResourceData: function (oPayload, aResourceData) {
			var aResourceLocations = [],
				aVehicles = [],
				aDrivers = [];
			for (var sGuid in aResourceData) {
				//Resource location coordinates added as DepotSite to add in Locations
				aResourceLocations.push({
					"$type": "DepotSite",
					"id": sGuid + "_location",
					"routeLocation": {
						"$type": "OffRoadRouteLocation",
						"offRoadCoordinate": {
							"x": aResourceData[sGuid].aData.LONGITUDE,
							"y": aResourceData[sGuid].aData.LONGITUDE
						}
					}
				});

				// Vehicle objects added as for the resource
				aVehicles.push({
					"ids": [
						sGuid
					],
					"startLocationId": sGuid + "_location",
					"endLocationId": sGuid + "_location"
				});
				aDrivers.push({
					"id": sGuid + "_driver",
					"vehicleId": sGuid,
					"operatingIntervals": [],
					"breakIntervals": []
				});
			};

			return oPayload;
		},

		/**
		 * set the demands data in the payload Structure to Pass to call PTV.
		 * @return {object} Payload structure with demands data.
		 */
		_setDemandsData: function (oPayload, aDemandsData) {
			//code for payload creation with demands data needs to place here
			return oPayload;
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