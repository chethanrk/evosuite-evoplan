sap.ui.define([
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/controller/ErrorHandler",
	"sap/m/MessageToast"
], function(Device, JSONModel, Filter, FilterOperator, FilterType, formatter, BaseController,ErrorHandler,MessageToast) {
	"use strict";

    return BaseController.extend('com.evorait.evoplan.controller.SplitPage', {

        formatter: formatter,

        /**
        * Called when a controller is instantiated and its View controls (if available) are already created.
        * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
        **/
        onInit: function() {
        },

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 **/
		onAfterRendering: function(oEvent) {},


        /**
         * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
         */
        onExit: function() {}


        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

	});
});
