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

			showMessageToast: function (sMsg) {
                MessageToast.show(sMsg, {duration: 5000});
            },

			/**
			 * on Success of oData call capture messages
			 * 
			 */
            onSuccessAssignment: function(oData, errMsg, oMsgModel) {
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
		 		this.showMessageToast(sMsg)
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
			 * save assignment after drop
             * @param aSourcePaths
             * @param sTargetPath
             */
            assignedDemands: function (aSourcePaths, sTargetPath) {
				var oModel = this.getModel(),
					targetObj = oModel.getProperty(sTargetPath);

                for(var i = 0; i < aSourcePaths.length; i++) {
                    var obj = aSourcePaths[i],
                    	demandObj = oModel.getProperty(obj.sPath),
                    	oParams = {
							"DateFrom" : targetObj.StartDate || 0,
							"DateTo" :  targetObj.EndDate || 0,
							"DemandGuid" : demandObj.Guid,
							"ResourceGroupGuid" : targetObj.ResourceGroupGuid,
							"ResourceGuid" : targetObj.ResourceGuid,
							"TimeFrom" : targetObj.StartTime,
							"TimeTo" : targetObj.EndTime
						};
                    this.callFunctionImport(oParams, "CreateAssignment", "POST");
                }
			},

            /**
			 * update assignment
             * @param sPath
             */
			updateAssignment: function (sPath) {
                var oModel = this.getModel(),
					oAssignment = oModel.getProperty(sPath);

                console.log(oAssignment);
                var oParams = {
                    "DateFrom" : oAssignment.StartDate || 0,
                    "DateTo" :  oAssignment.EndDate || 0,
                    "AssignmentGUID" : oAssignment.Guid,
                    "EffortUnit" : "",
                    "Effort" : "",
                    "TimeFrom" : oAssignment.TimeFrom,
                    "TimeTo" : oAssignment.TimeTo
                };

                this.callFunctionImport(oParams, "UpdateAssignment", "POST");
            },

            /**
			 * delete assignment
             * @param sPath
             */
			deleteAssignment: function (sPath) {
                var oModel = this.getModel(),
                    oAssignment = oModel.getProperty(sPath),
					oParams = {
						"AssignmentGUID" : oAssignment.Guid
					};
                this.callFunctionImport(oParams, "DeleteAssignment", "POST");
            },

            /**
			 * send oData request of FunctionImport
             * @param oParams
             * @param sFuncName
             * @param sMethod
             */
			callFunctionImport: function (oParams, sFuncName, sMethod) {
                var eventBus = sap.ui.getCore().getEventBus(),
                    oMsgModel = sap.ui.getCore().getModel("MessageSetModel");

                oMsgModel.setData({modelData:{}});
                oMsgModel.updateBindings(true);

                this.getModel().callFunction("/"+sFuncName, {
                    method: sMethod || "POST",
                    urlParameters: oParams,
                    success: function(oData, oResponse){
                        //Handle Success
                        var errMsg = sap.ui.getCore().getMessageManager().getMessageModel().getData();
                        this.onSuccessAssignment(oData, errMsg, oMsgModel);
                        eventBus.publish("BaseController", "refreshTable", {});
                    }.bind(this),
                    error: function(oError){
                        //Handle Error
                        this.onError(oError, oMsgModel);
                    }.bind(this)
                });
            }
		});

	}
);