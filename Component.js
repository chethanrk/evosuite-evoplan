sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/controller/ErrorHandler",
	"sap/ui/model/json/JSONModel",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text",
	"sap/m/MessageToast"
], function(UIComponent, Device, models, ErrorHandler, JSONModel, Dialog, Button, Text, MessageToast) {
	"use strict";

	return UIComponent.extend("com.evorait.evoplan.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this function, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);


			// handle the main oData model based on the environment
			// the path for mobile applications depends on the current information from
			// the logon plugin - if it's not running as hybrid application then the initialization
			// of the oData service happens by the entries in the manifest.json which is used
			// as metadata reference
			var oModel;
			var appContext;
		    var externalURL;

			if (com.evorait.evoplan.dev.devapp.externalURL) {
				externalURL = com.evorait.evoplan.dev.devapp.externalURL;
			}

		    if (com.evorait.evoplan.dev.devapp.devLogon) {
			  appContext = com.evorait.evoplan.dev.devapp.devLogon.appContext;
		    }

		    if (window.cordova && appContext && !window.sap_webide_companion && !externalURL) {
				var url = appContext.applicationEndpointURL + "/";
				var oHeader = {
					"X-SMP-APPCID": appContext.applicationConnectionId
				};
				
				// this would allow to pass basic authentication from the user registration to the
				// backend request - do not do this yet
				/**
				if (appContext.registrationContext.user) {
					oHeader.Authorization = "Basic " + btoa(appContext.registrationContext.user + ":" + appContext.registrationContext.password);
				}
				**/
				// set the central model (default model has no name)
				oModel = new sap.ui.model.odata.ODataModel(url, true, null, null, oHeader);
				this.setModel(oModel);
			}

			// initialize the error handler with the component
			this._oErrorHandler = new ErrorHandler(this);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

            var oViewModel = new JSONModel({
                treeSet: "ResourceHierarchySet",
                subFilterEntity: "Demand",
                subTableSet: "DemandSet",
                tableBusyDelay : 0,
                persistencyKey: "evoPlan_ui"
            });
            this.setModel(oViewModel, "viewModel");

			// create the views based on the url/hash
			this.getRouter().initialize();
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ErrorHandler is destroyed.
		 * @public
		 * @override
		 */
		destroy: function() {
			this._oErrorHandler.destroy();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function() {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					//sapUiSizeCompact
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}

	});

});