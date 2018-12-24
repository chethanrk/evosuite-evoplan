/*global history */
sap.ui.define([
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/routing/History",
		"sap/m/Dialog",
		"sap/m/Button",
		"sap/m/Text",
		"sap/m/MessageToast",
        "sap/m/MessageBox",
        "sap/m/FormattedText"
	], function (Controller, History, Dialog, Button, Text, MessageToast, MessageBox, FormattedText) {
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
				this.getRouter().navTo("demands", {}, true);
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
         * Helper method to show the error and success information on the scree
         * @param {oResponse} Response object of success or error callback of oData service
         * @returns
         */
        showMessage : function(oResponse,fnCallback){
            var oData,
                oResourceBundle = this.getResourceBundle();
            if(oResponse && oResponse.headers["sap-message"]){
                try{
                    oData = JSON.parse(oResponse.headers["sap-message"]);
                }catch(ex){
                    jQuery.sap.log.error("Failed to parse the message header");
                }
                if(oData && oData.details.length > 0){
                    var oMessage,bContainsError;
                    for(var i in oData.details){
                        if(oData.details[i].severity === "error"){
                            bContainsError = true;
                            oMessage = oData.details[i];
                            break;
                        }
                    }
                    if(bContainsError){
                        var sMessage = oMessage.message+"\n"+oResourceBundle.getText("errorMessage");
                        this._showErrorMessage(sMessage, fnCallback);
                    }else
                        this.showMessageToast(oData.message);
                }else{
                    this.showMessageToast(oData.message);
                }
            }else{
                if(oResponse){
                    try{
                        oData = JSON.parse(oResponse.responseText);
                    }catch(ex){
                        jQuery.sap.log.error("Failed to parse the message header");
                    }
                    if(oData && oData.error){
                        this._showErrorMessage(oData.error.message.value);
                    }
                }
            }
            return bContainsError;
        },

        _showErrorMessage: function(sMessage, fnCallback){
            var fnClose = function () {
                this._bMessageOpen = false;
            }.bind(this);

            if(fnCallback){
                fnClose = fnCallback
            }
            if(!fnCallback){
                if (this._bMessageOpen) {
                    return;
                }
                this._bMessageOpen = true;
            }

            MessageBox.error(sMessage,{
                    id : "errorMessageBox",
                    styleClass: this.getOwnerComponent().getContentDensityClass(),
                    actions: [MessageBox.Action.CLOSE],
                    onClose: fnClose
                }
            );
        },
        /**
         * save assignment after drop
         * @param aSourcePaths
         * @param sTargetPath
         */
        assignedDemands: function (aSourcePaths, sTargetPath) {
            var oModel = this.getModel();
            var targetObj = oModel.getProperty(sTargetPath);
            this.clearMessageModel();

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
                }else{
                    oParams.DateFrom = new Date(); // When Start Date Null/In the Simple view today date will sent
                    oParams.TimeFrom = targetObj.StartTime;
                }

                if(targetObj.EndDate){
                    oParams.DateTo = targetObj.EndDate;
                    oParams.TimeTo = targetObj.EndTime;
                }else{
                    oParams.DateTo = new Date(); // When Start Date Null/In the Simple view today date will sent
                    oParams.TimeTo = targetObj.EndTime;
                }
                this.callFunctionImport(oParams, "CreateAssignment", "POST");
            }
        },

        /**
         * update assignment
         * @param sPath
         */
        updateAssignment: function (isReassign) {
            var oData = this.getModel("assignment").oData,
                sAssignmentGUID = oData.AssignmentGuid;

            var oParams = {
                "DateFrom" : oData.DateFrom || 0,
                "TimeFrom" : { __edmtype: "Edm.Time", ms: oData.DateFrom.getTime()},
                "DateTo" :  oData.DateTo || 0,
                "TimeTo" : { __edmtype: "Edm.Time", ms: oData.DateTo.getTime()},
                "AssignmentGUID" : sAssignmentGUID,
                "EffortUnit" : oData.EffortUnit,
                "Effort" : oData.Effort,
                "ResourceGroupGuid" : "",
                "ResourceGuid" : ""
            };

            if(isReassign && oData.NewAssignPath){
                var oResource = this.getModel().getProperty(oData.NewAssignPath);
                oParams.ResourceGroupGuid = oResource.ResourceGroupGuid;
                oParams.ResourceGuid = oResource.ResourceGuid;
            }
            this.clearMessageModel();
            if(isReassign && !this.isAssignable({sPath:oData.NewAssignPath})){
                return;
            }
            if(isReassign && oData.NewAssignPath && !this.isAvailable(oData.NewAssignPath)){
                this.showMessageToProceed(null,null,null,null,true,oParams);
            }else{
                this.callFunctionImport(oParams, "UpdateAssignment", "POST");
            }
        },
        /**
         * Calls the update assignment function import for selected assignment in order to
         * bulk reassignment
         *
         * @Author Rahul
         * @version 2.0.6
         * @param sAssignPath {string} new assign path for reassign
         * @param aPaths {Array} selected assignment paths
         */
        bulkReAssignment:function (sAssignPath,aContexts) {
            var oModel = this.getModel(),
                oResource = oModel.getProperty(sAssignPath);
            // Clears the Message model
            this.clearMessageModel();

            for(var i in aContexts){
                var sPath =  aContexts[i].getPath();
                var oAssignment =  oModel.getProperty(sPath);
                    var oParams = {
                        "AssignmentGUID": oAssignment.Guid,
                        "EffortUnit": oAssignment.EffortUnit,
                        "Effort": oAssignment.Effort,
                        "ResourceGroupGuid": oResource.ResourceGroupGuid,
                        "ResourceGuid": oResource.ResourceGuid
                    };

                    if(oResource.StartDate){
                        oParams.DateFrom = oResource.StartDate;
                        oParams.TimeFrom = oResource.StartTime;
                    }else{
                        oParams.DateFrom = new Date();// When Start Date Null/In the Simple view today date will sent
                        oParams.TimeFrom = oResource.StartTime;
                    }

                    if(oResource.EndDate){
                        oParams.DateTo = oResource.EndDate;
                        oParams.TimeTo = oResource.EndTime;
                    }else{
                        oParams.DateTo = new Date(); // When Start Date Null/In the Simple view today date will sent
                        oParams.TimeTo = oResource.EndTime;
                    }
                    // call function import
                    this.callFunctionImport(oParams, "UpdateAssignment", "POST", true);
                }
        },
        /**
         * delete assignments in bulk
         * @Author Rahul
         * @version 2.0.6
         * @param aContexts {Array} Assignments contexts to be deleted.
         */
        bulkDeleteAssignment: function (aContexts) {
            var oModel = this.getModel();
            this.clearMessageModel();
            for(var i in aContexts){
                var sPath =  aContexts[i].getPath();
                var sAssignmentGuid =  oModel.getProperty(sPath+"/Guid");
                var oParams = {
                    "AssignmentGUID" : sAssignmentGuid
                };
                this.callFunctionImport(oParams, "DeleteAssignment", "POST", true);

            }
        },
        /**
         * delete assignment
         * @param sPath
         */
        deleteAssignment: function (sId) {
            var oParams = {
                "AssignmentGUID" : sId
            };
            this.clearMessageModel();
            this.callFunctionImport(oParams, "DeleteAssignment", "POST");
        },

        /**
         * update demand function status on selected paths
         * @param aSelectedPaths
         * @param sFunctionKey
         */
        updateFunctionDemand: function (aSelectedPaths, sFunctionKey) {
            var oParams = {
                "Function": sFunctionKey
            };

            for (var i = 0; i < aSelectedPaths.length; i++) {
                oParams.DemandGuid = aSelectedPaths[i].oData.Guid;
                this.callFunctionImport(oParams, "ExecuteDemandFunction", "POST");
            }
        },

        /**
         * send oData request of FunctionImport
         * @param oParams
         * @param sFuncName
         * @param sMethod
         */
        callFunctionImport: function (oParams, sFuncName, sMethod) {
            var eventBus = sap.ui.getCore().getEventBus(),
                oModel = this.getModel(),
                oViewModel = this.getModel("appView"),
                oResourceBundle = this.getResourceBundle();

            oViewModel.setProperty("/busy",true);
            oModel.callFunction("/"+sFuncName, {
                method: sMethod || "POST",
                urlParameters: oParams,
                success: function(oData, oResponse){
                    //Handle Success
                    oViewModel.setProperty("/busy",false);
                    this.showMessage(oResponse);
                    eventBus.publish("BaseController", "refreshTreeTable",{});
                    eventBus.publish("BaseController", "refreshDemandTable",{});
                    eventBus.publish("BaseController", "refreshDemandOverview",{}); // refresh the demand overview page binding
                    eventBus.publish("BaseController", "refreshAssetCal", {});
                }.bind(this),
                error: function(oError){
                    //Handle Error
                    MessageToast.show(oResourceBundle.getText("errorMessage"), {duration: 5000});
                }.bind(this)
            });
        },

        /**
         * device orientation with fallback of window resize
         * important for drag and drop functionality
         */
        getOrientationEvent: function () {
            return window.onorientationchange ? "orientationchange" : "resize";
        },

        /**
         * get all selected rows from table and return to draggable helper function
         * @param aSelectedRowsIdx
         * @private
         */
        _getSelectedRowPaths : function (oTable, aSelectedRowsIdx, checkAssignAllowed, aDemands) {
            var aPathsData = [],
                bNonAssignableDemandsExist = false,
                aNonAssignableDemands =[],
                 oData ;

            if(checkAssignAllowed){
                oTable.clearSelection();
            }
            if(!aDemands) {
                for (var i = 0; i < aSelectedRowsIdx.length; i++) {
                    var oContext = oTable.getContextByIndex(aSelectedRowsIdx[i]);
                    var sPath = oContext.getPath();
                     oData = this.getModel().getProperty(sPath);

                    //on check on oData property ALLOW_ASSIGN when flag was given
                    if (checkAssignAllowed) {
                        if (!!oData.ALLOW_ASSIGN) {
                            aPathsData.push({sPath: sPath, oData: oData, index: aSelectedRowsIdx[i]});
                            oTable.addSelectionInterval(aSelectedRowsIdx[i], aSelectedRowsIdx[i]);
                        } else {
                            aNonAssignableDemands.push(oData.DemandDesc);
                            bNonAssignableDemandsExist = true;
                        }
                    } else {
                        aPathsData.push({sPath: sPath, oData: oData, index: aSelectedRowsIdx[i]});
                    }
                }

            }else{
                for(var i in aDemands){
                    var oContext = aDemands[i].getBindingContext();
                    var sPath = oContext.getPath();
                    oData = this.getModel().getProperty(sPath);
                    if (!!oData.ALLOW_ASSIGN) {
                        aPathsData.push({sPath: sPath, oData: oData});
                    } else {
                        aDemands[i].setSelected(false);
                        aNonAssignableDemands.push(oData.Description);
                        delete aDemands[i];
                    }
                }
            }
            return {
                aPathsData: aPathsData,
                aNonAssignable: aNonAssignableDemands
            };
        },


        /**
         * show error dialog for demands which are not assignable or for which status transition
         * is not possible
         * @param aDemands {object} array of demand descriptions
         * @private
         */
        _showAssignErrorDialog: function (aDemands,isStatus) {
            var msg = "";
            if(isStatus)
                msg = this.getResourceBundle().getText("changeStatusNotPossible");
            else
                msg = this.getResourceBundle().getText("assignmentNotPossible");

            var dialog = new Dialog({
                title: 'Error',
                type: 'Message',
                state: 'Error',
                content: new FormattedText({
                    htmlText: "<strong>"+msg+"</strong><br/><br/>"+aDemands.join(",<br/>")
                }),
                beginButton: new Button({
                    text: 'OK',
                    press: function () {
                        dialog.close();
                    }
                }),
                afterClose: function() {
                    dialog.destroy();
                }
            });
            dialog.open();
        },

        /**
         * Clears the Message Model
         * @param
         * @public
         */
        clearMessageModel:function(){
            sap.ui.getCore().getMessageManager().removeAllMessages();
        },
        /**
         * Method checks the availability of resources
         * @param sTargetPath : Resource path on which assignment needs to be created
         * @return {boolean} return true is available
         */
        isAvailable:function (sTargetPath) {
            var oModel = this.getModel(),
                oTargetObj = oModel.getProperty(sTargetPath);

            // If the Resource is Not/Partially available
            if(oTargetObj.IS_AVAILABLE !== "A") {
                return false;
            }
            return true;
        },
        /**
         * Show the message to proceed with the assignment
         * @param aSources Demands to be assigned
         * @param sTargetPath Resource path
         * @param bBulkReassign flag which says is it bulk reassignment
         * @param aContexts - Assignment contexts to be reassigned
         * @param bUpdate - Single reassignment
         * @param oParams - Update parameter for single assignment
         *
         */
        showMessageToProceed:function (aSources, sTargetPath , bBulkReassign ,aContexts ,bUpdate, oParams) {
            var oResourceBundle= this.getResourceBundle(),
                oComponent = this.getOwnerComponent(),
                sAction = oResourceBundle.getText("xbut.proceed"),
                sMessage = oResourceBundle.getText("ymsg.availability");

            MessageBox.warning(
                sMessage,
                {
                    actions: [sAction, sap.m.MessageBox.Action.CANCEL],
                    styleClass: oComponent.getContentDensityClass(),
                    onClose: function(sValue) {
                        if(sValue === sAction && !bBulkReassign && !bUpdate){
                            this.assignedDemands(aSources, sTargetPath);
                        }else if(sValue === sAction && bBulkReassign){
                            this.bulkReAssignment(sTargetPath, aContexts);
                        }else if(sValue === sAction && bUpdate){
                            this.callFunctionImport(oParams, "UpdateAssignment", "POST");
                        }
                    }.bind(this)
                }
            );
        },
        /**
         * Validates pool function configuration to check possibility of assignment
         * on group node.
         * @param mParameters - object containing the data of target object
         * @return {boolean}
         */
        isAssignable : function (mParameters) {
            var oModel = this.getModel("user"),
                sPoolFunction = oModel.getProperty("/POOL_FUNCTION_ENABLED"),
                oResource = mParameters.data,
                oResourceBundle = this.getResourceBundle();
            if(oResource === undefined){
                oResource = this.getModel().getProperty(mParameters.sPath);
            }
            if(oResource.NodeType === "RES_GROUP" && !sPoolFunction){
                this.showMessageToast(oResourceBundle.getText("ymsg.notassignable"));
                return false;
            }
            return true;
        },
        /**
         * Shows the confirmation Box.
         *
         * @Athour Rahul
         * @version 2.1
         */
        showConfirmMessageBox: function(message, fnCallback) {
            var oController = this;
            MessageBox.confirm(
                message, {
                    styleClass:oController.getOwnerComponent().getContentDensityClass(),
                    icon: sap.m.MessageBox.Icon.CONFIRM,
                    title: this.getResourceBundle().getText("xtit.confirm"),
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: fnCallback
                }
            );
        }


	});

});