/*global history */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text",
	"sap/m/MessageToast",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/model/json/JSONModel',
	"sap/m/MessageBox"
], function(Controller, History, Dialog, Button, Text, MessageToast, Filter, FilterOperator, JSONModel,MessageBox) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.BaseController", {
		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function() {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function(sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function(oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function() {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function() {
			var sPreviousHash = History.getInstance().getPreviousHash();
			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		},

		/**
		 * Convenience method
		 * @returns {object} the application controller
		 */
		getApplication: function() {
			return this.getGlobalModel().getProperty("/application");
		},
		/**
		 * Helper method to show the error and success information on the scree
		 * @param {oResponse} Response object of success or error callback of oData service
		 * @returns
		 */
		showMessage : function(oResponse){
			var oData,
				oResourceBundle = this.getResourceBundle();
			if(oResponse && oResponse.headers["sap-message"]){
				try{
					oData = JSON.parse(oResponse.headers["sap-message"]);
				}catch(ex){
					jQuery.sap.log.error("Failed to parse the message header");
				}
					if(oData && oData.severity === "error"){
						var sMessage = oData.message+"\n"+oResourceBundle.getText("errorMessage");
						this._showErrorMessage(sMessage);
					}else{
						MessageToast.show(oData.message, {duration: 5000});
					}
			}else{
				try{
					oData = JSON.parse(oResponse.responseText);
				}catch(ex){
					jQuery.sap.log.error("Failed to parse the message header");
				}
				if(oData && oData.error){
					this._showErrorMessage(oData.error.message.value);
				}else{
					MessageToast.show(oResourceBundle.getText("errorMessage"), {duration: 5000});
				}
			}
		},
		
		_showErrorMessage: function(sMessage){
				if (this._bMessageOpen) {
					return;
				}
				this._bMessageOpen = true;
				MessageBox.error(sMessage,{
						id : "errorMessageBox",
						styleClass: this.getOwnerComponent().getContentDensityClass(),
						actions: [MessageBox.Action.CLOSE],
						onClose: function () {
							this._bMessageOpen = false;
						}.bind(this)
					}
				);
		},
		/**
		 * save assignment after drop
		 * @param aSourcePaths
		 * @param sTargetPath
		 */
		assignedDemands: function(aSourcePaths, sTargetPath) {
			var oModel = this.getModel(),
				eventBus = sap.ui.getCore().getEventBus(),
				targetObj = oModel.getProperty(sTargetPath),
				oResourceBundle = this.getResourceBundle();
			sap.ui.getCore().getMessageManager().removeAllMessages(); // removing existing messages in message model
			for (var i = 0; i < aSourcePaths.length; i++) {
				var obj = aSourcePaths[i],
					demandObj = oModel.getProperty(obj.sPath),
					oParams = {
						"DateFrom": targetObj.StartDate || 0,
						"DateTo": targetObj.EndDate || 0,
						"DemandGuid": demandObj.Guid,
						"ResourceGroupGuid": targetObj.ResourceGroupGuid,
						"ResourceGuid": targetObj.ResourceGuid,
						"TimeFrom": targetObj.StartTime,
						"TimeTo": targetObj.EndTime
					};

				oModel.callFunction("/CreateAssignment", {
					method: "POST",
					urlParameters: oParams,
					success: function(oData, oResponse) {
						//Handle Success
						this.showMessage(oResponse);
						eventBus.publish("BaseController", "refreshTable", {});
					}.bind(this),
					error: function(oError) {
						//Handle Error
						MessageToast.show(oResourceBundle.getText("errorMessage"), {duration: 5000});
					}.bind(this)
				});
			}
		}
	});

});