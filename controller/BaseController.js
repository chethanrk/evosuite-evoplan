/*global history */
sap.ui.define([
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/routing/History",
		"sap/m/Dialog",
		"sap/m/Button",
		"sap/m/Text",
		"sap/m/MessageToast"
	], function (Controller, History, Dialog, Button, Text, MessageToast) {
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
			getModel : function (sName, oView) {
				if(oView){
                    return oView.getModel(sName);
				}
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
            assignedDemands: function (aSourcePaths, sTargetPath, oModel) {
            	var oModel = oModel || this.getModel();
				var targetObj = oModel.getProperty(sTargetPath);

                for(var i = 0; i < aSourcePaths.length; i++) {
                    var obj = aSourcePaths[i],
                    	demandObj = oModel.getProperty(obj.sPath),
                    	oParams = {
							"DemandGuid" : demandObj.Guid,
							"ResourceGroupGuid" : targetObj.ResourceGroupGuid,
							"ResourceGuid" : targetObj.ResourceGuid
						};

                    if(targetObj.StartDate){
                    	oParams.DateFrom = targetObj.StartDate;
                    	oParams.TimeFrom = targetObj.StartTime;
					}
					if(targetObj.EndDate){
                    	oParams.DateTo = targetObj.EndDate;
                    	oParams.TimeTo = targetObj.EndTime;
					}
                    this.callFunctionImport(oParams, "CreateAssignment", "POST", oModel);
                }
			},

            /**
			 * update assignment
             * @param sPath
             */
			updateAssignment: function (oAssignModel, isReassign, oModel) {
				var oData = oAssignModel.oData,
                    sAssignmentGUID = oData.AssignmentGuid;

                var oParams = {
                    "DateFrom" : oData.DateFrom || 0,
					"TimeFrom" : { __edmtype: "Edm.Time", ms: oData.DateFrom.getTime()},
                    "DateTo" :  oData.DateTo || 0,
					"TimeTo" : { __edmtype: "Edm.Time", ms: oData.DateTo.getTime()},
                    "AssignmentGUID" : sAssignmentGUID,
                    "EffortUnit" : oData.EffortUnit,
                    "Effort" : oData.Effort
                };

                if(isReassign){
                	var oResource = oModel.getProperty(oData.NewAssignPath);
                    oParams.ResourceGroupGuid = oResource.ResourceGroupGuid;
                    oParams.ResourceGuid = oResource.ResourceGuid;
				}
                this.callFunctionImport(oParams, "UpdateAssignment", "POST", oModel);
            },

            /**
			 * delete assignment
             * @param sPath
             */
			deleteAssignment: function (sId, oModel) {
				var oParams = {
					"AssignmentGUID" : sId
				};
                this.callFunctionImport(oParams, "DeleteAssignment", "POST", oModel);
            },

            /**
			 * send oData request of FunctionImport
             * @param oParams
             * @param sFuncName
             * @param sMethod
             */
			callFunctionImport: function (oParams, sFuncName, sMethod, oModel) {
                var eventBus = sap.ui.getCore().getEventBus(),
                    oMsgModel = sap.ui.getCore().getModel("MessageSetModel"),
                	oModel = oModel || this.getModel();

                oMsgModel.setData({modelData:{}});
                oMsgModel.updateBindings(true);

                oModel.callFunction("/"+sFuncName, {
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
            },

            /**
             * get all selected rows from table and return to draggable helper function
             * @param aSelectedRowsIdx
             * @private
             */
            _getSelectedRowPaths : function (oModel, oTable, aSelectedRowsIdx) {
                var aPathsData = [];
                this.multiSelect = false;

                for (var i=0; i<aSelectedRowsIdx.length; i++) {
                    var oContext = oTable.getContextByIndex(aSelectedRowsIdx[i]);
                    var sPath = oContext.getPath();
                    aPathsData.push({
                        sPath: sPath,
                        oData: oModel.getProperty(sPath)
                    });
                }
                if(aPathsData.length > 0){
                    this.multiSelect = true;
                }
                return aPathsData;
            },
		});

	}
);