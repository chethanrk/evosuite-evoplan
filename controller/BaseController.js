/*global history */
sap.ui.define([
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/routing/History",
		"sap/m/Dialog",
		"sap/m/Button",
		"sap/m/Text",
		"sap/m/MessageToast",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator"
	], function (Controller, History, Dialog, Button, Text, MessageToast, Filter, FilterOperator) {
		"use strict";

		return Controller.extend("com.evorait.evoplan.controller.BaseController", {
			/**
			 * Convenience method for accessing the router in every controller of the application.
			 * @public
			 * @returns {sap.ui.core.routing.Router} the router for this component
			 */
			getRouter : function () {
				return this.getOwnerComponent().getRouter();
			},

			/**
			 * Convenience method for getting the view model by name in every controller of the application.
			 * @public
			 * @param {string} sName the model name
			 * @returns {sap.ui.model.Model} the model instance
			 */
			getModel : function (sName) {
				return this.getView().getModel(sName);
			},

			/**
			 * Convenience method for setting the view model in every controller of the application.
			 * @public
			 * @param {sap.ui.model.Model} oModel the model instance
			 * @param {string} sName the model name
			 * @returns {sap.ui.mvc.View} the view instance
			 */
			setModel : function (oModel, sName) {
				return this.getView().setModel(oModel, sName);
			},

			/**
			 * Convenience method for getting the resource bundle.
			 * @public
			 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
			 */
			getResourceBundle : function () {
				return this.getOwnerComponent().getModel("i18n").getResourceBundle();
			},

			/**
			 * Event handler for navigating back.
			 * It there is a history entry we go one step back in the browser history
			 * If not, it will replace the current entry of the browser history with the master route.
			 * @public
			 */
			onNavBack : function() {
				var sPreviousHash = History.getInstance().getPreviousHash();
					if (sPreviousHash !== undefined) {
					history.go(-1);
				} else {
					this.getRouter().navTo("master", {}, true);
				}
			},

			onPressHome : function () {
				this.getRouter().navTo("master", {}, true);
			},

            /**
             * Convenience method
             * @returns {object} the application controller
             */
            getApplication: function() {
                return this.getGlobalModel().getProperty("/application");
            },

			/**
			 * trigger logout
			 */
			onLogout: function () {
				var externalURL = "";

                if (com.evorait.evoplan.dev.devapp.externalURL) {
                    externalURL = com.evorait.evoplan.dev.devapp.externalURL;
                }

				$.ajax(externalURL+"/sap/public/bc/icf/logoff", {
					success: function() {
						console.log("Successfully logged off");
						window.location.reload();
					},
					error: function(jqXHR, textStatus, errorThrown) {
						console.error("Error when logging off:", errorThrown);
					}
				});
			},

            /**
			 * Todo: set right parameters in callFaunction
			 * save assignment after drop
             * @param aSourcePaths
             * @param sTargetPath
             */
            assignedDemands: function (aSourcePaths, sTargetPath) {
				var oModel = this.getModel();
				var targetObj = oModel.getProperty(sTargetPath);
				var resourceGroupId = targetObj.ParentNodeId;
				var resourceId = targetObj.NodeId;

                if(!targetObj.ParentNodeId || targetObj.ParentNodeId === ""){
                    resourceGroupId = targetObj.NodeId;
                    resourceId = null;
				}
				
                for(var i = 0; i < aSourcePaths.length; i++) {
                    var obj = aSourcePaths[i];
                    var demandObj = oModel.getProperty(obj.sPath);
					var oDate = new Date();
                    oModel.callFunction("/CreateAssignment", {
                        method: "POST",
                        urlParameters: {
                        	"DateFrom" : oDate,
                        	"DateTo" :  oDate,
                            "DemandGuid" : demandObj.Guid,
                            "ResourceGroupGuid" : resourceGroupId,
                            "ResourceGuid" : resourceId,
                            "TimeFrom" :{ __edmtype: "Edm.Time", ms: oDate.getTime()},
                            "TimeTo" :{ __edmtype: "Edm.Time", ms: oDate.getTime()}
                        },
                        success: function(oData, oResponse){
                            //Handle Success
                             var sMsg = ""; 
							 var errMsg = sap.ui.getCore().getMessageManager().getMessageModel().getData();
					 		 for( var i=0; i < errMsg.length; i++){
					 		 	sMsg = sMsg + errMsg[i].message;
					 		 }
					 	
							MessageToast.show(sMsg, {
							duration: 5000
							});
                        },
                        error: function(oError){
                            //Handle Error
                              var sMsg = ""; 
							 var errMsg = sap.ui.getCore().getMessageManager().getMessageModel().getData();
					 		 for( var i=0; i < errMsg.length; i++){
					 		 	sMsg = sMsg + errMsg[i].message;
					 		 }
					 	
							MessageToast.show(sMsg, {
							duration: 5000 });
                        }
                    });
                }
			}
		});

	}
);