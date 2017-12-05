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
			
			onSearchTreeTable: function (oTable, sQuery) {
                var aFilters = [];

                if (sQuery && sQuery.length > 0) {
                    //only search on 0 and 1 Level
                    var filter = new Filter("Description", FilterOperator.Contains, sQuery);
                    //var filterLevel = new Filter("HierarchyLevel", FilterOperator.LE, 1);
                    aFilters.push(filter);
                }
                // update table binding
                var binding = oTable.getBinding("rows");
                binding.filter(aFilters, "Application");
            },

            assignedDemands: function (aSourcePaths, sTargetPath) {
				var oModel = this.getModel();
				var targetObj = oModel.getProperty(sTargetPath);
				var resourceGroupId = targetObj.ParentNodeId;
				var resourceId = targetObj.NodeId;
                //var readPath = "/ResourceSet('"+resourceId+"')";
                var readPath = "/ResourceGroupSet('"+resourceId+"')";

                if(targetObj.ParentNodeId === ""){
                    resourceGroupId = targetObj.NodeId;
                    resourceId = "";
                    readPath = "/ResourceGroupSet('"+resourceGroupId+"')";
				}
				
				var oAssignData = {
					metaPath: readPath,
                    aSourcePaths: aSourcePaths,
                    resourceGroupId: resourceGroupId,
                    resourceId: resourceId
				};
                this._readAndSaveResourceData(oAssignData);
			},

            _readAndSaveResourceData: function (oAssignData) {
				var oModel = this.getModel();
                oModel.read(oAssignData.metaPath, {
					success: function(data){
						console.log(data);

						for(var i = 0; i < oAssignData.aSourcePaths.length; i++) {
							var obj = oAssignData.aSourcePaths[i];
							var demandObj = oModel.getProperty(obj.sPath);
							var callObj = {	// function import parameters
								"DemandGuid" : demandObj.Guid,
								"ResourceGroupGuid" : oAssignData.resourceGroupId,
								"ResourceGuid" : oAssignData.resourceId,
								"DateFrom" : data.DateFrom,
								"DateTo" : data.DateTo,
								"TimeFrom" : data.TimeFrom,
								"TimeTo" : data.TimeTo
							};
							console.log(callObj);

							oModel.callFunction("/CreateAssignment", // function import name
								"POST", // http method
								callObj,
								null,
								function(oData, response) {
									console.log(oData, response);
									// callback function for success
								},
								function(oError){
									// callback function for error
								}
							);
						}
					},
					error: function(error){
						console.log(error);
					}
				});
            }


		});

	}
);