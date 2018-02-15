sap.ui.define([
		"sap/ui/base/Object",
		"sap/m/MessageBox",
		"sap/m/MessageToast"
	], function (UI5Object, MessageBox, MessageToast) {
		"use strict";

		return UI5Object.extend("com.evorait.evoplan.controller.ErrorHandler", {

			/**
			 * Handles application errors by automatically attaching to the model events and displaying errors when needed.
			 * @class
			 * @param {sap.ui.core.UIComponent} oComponent reference to the app's component
			 * @public
			 * @alias com.evorait.evoplan.controller.ErrorHandler
			 */
			constructor : function (oComponent) {
				this._oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
				this._oComponent = oComponent;
				this._oModel = oComponent.getModel();
				this._bMessageOpen = false;
				this._sErrorText = this._oResourceBundle.getText("errorText");
				
				this._oModel.attachMetadataFailed(function (oEvent) {
					var oParams = oEvent.getParameters();
					this._showServiceError(oParams.response);
				}, this);
				/*
				this._oModel.attachRequestFailed(function (oEvent) {
					var oParams = oEvent.getParameters();
					// An entity that was not found in the service is also throwing a 404 error in oData.
					// We already cover this case with a notFound target so we skip it here.
					// A request that cannot be sent to the server is a technical error that we have to handle though
					if (oParams.response.statusCode !== "404" || (oParams.response.statusCode === 404 && oParams.response.responseText.indexOf("Cannot POST") === 0)) {
						//this._showServiceError(oParams.response);
					}
					this.onError(oParams.response);
				}, this);*/
				this._oModel.attachRequestCompleted(function (oEvent) {
					var oParams = oEvent.getParameters();
					if(oParams.success){
						this._oComponent.createMessages();
					}else{
						this.onError(oParams.response);
					}
				}, this);
			},

			/**
			 * Shows a {@link sap.m.MessageBox} when a service call has failed.
			 * Only the first error message will be display.
			 * @param {string} sDetails a technical error to be displayed on request
			 * @private
			 */
			_showServiceError : function (sDetails) {
				if (this._bMessageOpen) {
					return;
				}
				this._bMessageOpen = true;
				MessageBox.error(
					this._sErrorText,
					{
						id : "serviceErrorMessageBox",
						details: this._extractError(sDetails),
						styleClass: this._oComponent.getContentDensityClass(),
						actions: [MessageBox.Action.CLOSE],
						onClose: function () {
							this._bMessageOpen = false;
						}.bind(this)
					}
				);
			},

			/**
			 * Extract errors from a backend message class.
			 * @param {object} sDetails a technical error
			 * @return a either messages from the backend message class or return the initial error object
			 * @function
			 * @private
			 */

			_extractError: function(sDetails) {
				if (sDetails.responseText) {
					var parsedJSError = null;
					try {
						parsedJSError = jQuery.sap.parseJS(sDetails.responseText);
					} catch (err) {
						return sDetails;
					}

					if (parsedJSError && parsedJSError.error && parsedJSError.error.code) {
						var strError = "";
						//check if the error is from our backend error class
						if (parsedJSError.error.code.split("/")[0] === "MY_MSG_CLASS") {
							var array = parsedJSError.error.innererror.errordetails;
							for (var i = 0; i < array.length; i++) {
								strError += String.fromCharCode("8226") + " " + array[i].message + "\n";
							}
						} else {
							//if there is no message class found
							return sDetails;
						}
						return strError;
					}
				}
				return sDetails;
			},
			
			
			/**
			* on Error of oData call capture messages
			*/
			onError: function (oError){
	 		 	try{
	 		 		JSON.parse(oError.responseText);
	 		 		this._oComponent.createMessages();
	 		 	}catch(ex){
	 		 		this._showServiceError(oError);
	 		 	}
			}
		});
	}
);