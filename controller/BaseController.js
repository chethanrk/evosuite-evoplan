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
		'sap/ui/model/json/JSONModel'
	], function (Controller, History, Dialog, Button, Text, MessageToast, Filter, FilterOperator, JSONModel) {
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

            /**
             * Convenience method
             * @returns {object} the application controller
             */
            getApplication: function() {
                return this.getGlobalModel().getProperty("/application");
            },

			
			/**
			 * on Success of oData call capture messages
			 * 
			 */
			onSuccess: function(oData, errMsg, oMsgModel) {
				 var sMsg = "";
				 var sMessages = [];
				 var count_err = 0, count_war = 0, count_suc = 0, counter = 0;
				 var item = {};
				 
		 		 for( var i=0; i < errMsg.length; i++){
		 		 	if (errMsg[i].type === "Error"){
		 		 		count_err = count_err + 1;
		 		 		counter = count_err;
		 		 	}
		 		 	if (errMsg[i].type === "Warning"){
		 		 		count_err = count_war + 1;
		 		 		counter = count_war;
		 		 	}
		 		 	if (errMsg[i].type === "Success"){
		 		 		count_err = count_suc + 1;
		 		 		counter = count_suc;
		 		 	}
		 		 	if(errMsg[i].type === "Error"){
		 		 		sMsg = "Errors Occurred, Please check below Messages for Details";
		 		 	}
		 		 	item["Type"] = errMsg[i].type;
		 		 	item["Title"] = oData.DemandGuid;
		 		 	item["Description"] = errMsg[i].message;
		 		 	item["Subtitle"] = errMsg[i].type;
		 		 	item["Counter"] = counter;
		 		 	
		 		 	sMessages.push(item);
		 		 }
		 		 
				oMsgModel.setData(sMessages);
				if(sMsg === ""){
					sMsg = "Assignment Successfull";
				}
		 		MessageToast.show(sMsg, {duration: 5000});
			},
			
			/**
			* on Error of oData call capture messages
			*/
			onError: function (oError, oMsgModel){
				var sMsg = ""; 
			    var sMessages = [];
			    var item = {};
	 		 	sMsg = "Errors Occurred, Please check below Messages for Details";
	 		 	item["Type"] = "Error";
	 		 	item["Title"] = JSON.parse(oError.responseText).error.code;
	 		 	item["Description"] = JSON.parse(oError.responseText).error.message.value;
	 		 	item["Subtitle"] = "Error";
	 		 	item["Counter"] = 1;
	 		 	
	 		 	sMessages.push(item);
	 		 
	 			//	var oMsgModel = sap.ui.getCore().getModel("MessageSetModel");
				oMsgModel.setData(sMessages);
		 		MessageToast.show(sMsg, {duration: 5000});
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
                var oMsgModel = sap.ui.getCore().getModel("MessageSetModel");
				oMsgModel.setData({modelData:{}});
				oMsgModel.updateBindings(true);
				 
                if(!targetObj.ParentNodeId || targetObj.ParentNodeId === ""){
                    resourceGroupId = targetObj.NodeId;
                    resourceId = " ";
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
							 var errMsg = sap.ui.getCore().getMessageManager().getMessageModel().getData();
							 this.onSuccess(oData, errMsg, oMsgModel);
                        }.bind(this),
                        error: function(oError){
                        	//Handle Error
                            this.onError(oError, oMsgModel);
                        }.bind(this)
                    });
                }
			}
		});

	}
);