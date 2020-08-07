sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	 "sap/ui/core/Fragment"
], function (BaseController, formatter,Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.AssignInfoDialog", {
		
		formatter:formatter,
		
		init: function () {
			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("AssignTreeDialog", "selectedAssignment", this._showNewAssignment, this);
		},

		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 */
		  open: function (oView, sBindPath, oAssignmentData, mParameters, oAssignementPath) {
            // create dialog lazily
            if (!this._oDialog) {
            	oView.getModel("appView").setProperty("/busy", true);
                Fragment.load({
                    id: "AssignInfoDialog",
                    name: "com.evorait.evoplan.view.fragments.AssignInfoDialog",
                    controller: this
                }).then(function (oDialog) {
                	oView.getModel("appView").setProperty("/busy", false);
                    this._oDialog = oDialog;
                    this.onOpen(oDialog,oView, sBindPath, oAssignmentData, mParameters, oAssignementPath);
                }.bind(this));
            }else {
                this.onOpen(this._oDialog,oView, sBindPath, oAssignmentData, mParameters, oAssignementPath);
            }
        },
        
		onOpen: function (oDialog,oView, sBindPath, oAssignmentData, mParameters, oAssignementPath) {
	
			var	oAssignment = this.getDefaultAssignmentModelObject(),
				oResource,
                oAssignData,
				sResourceGroupGuid,
				sResourceGuid;

			if (sBindPath && sBindPath !== "") {
				oResource = oView.getModel().getProperty(sBindPath);

				oAssignment.AssignmentGuid = oResource.AssignmentGuid;
				oAssignment.Description = oResource.Description;
				sResourceGroupGuid = oResource.ResourceGroupGuid;
				sResourceGuid = oResource.ResourceGuid;
				oAssignment.DemandGuid = oResource.DemandGuid;

			} else if(oAssignementPath){
				// From gantt
				// When we have Assignment path <AssignmentSet(<key>)>
                oAssignData = oView.getModel().getProperty(oAssignementPath);

                oAssignment.AssignmentGuid = oAssignData.Guid;
                oAssignment.Description = oAssignData.Description;
                oAssignment.DemandGuid = oAssignData.DemandGuid;
                oAssignment.DemandStatus = oAssignData.Demand.Status;
                oAssignment.DateFrom = oAssignData.DateFrom;
                oAssignment.DateTo = oAssignData.DateTo;
                oAssignment.ResourceGroupGuid = oAssignData.ResourceGroupGuid;
				oAssignment.ResourceGroupDesc = oAssignData.GROUP_DESCRIPTION;
				oAssignment.ResourceGuid = oAssignData.ResourceGuid;
				oAssignment.ResourceDesc = oAssignData.RESOURCE_DESCRIPTION;
			}else {
				oAssignment.AssignmentGuid = oAssignmentData.Guid;
				oAssignment.Description = oAssignmentData.Demand.DemandDesc;
				oAssignment.DemandGuid = oAssignmentData.DemandGuid;
				oAssignment.DemandStatus = oAssignmentData.Demand.Status;
				oAssignment.DateFrom = oAssignmentData.DateFrom;
				oAssignment.DateTo = oAssignmentData.DateTo;
				oAssignment.ResourceGroupGuid = oAssignmentData.ResourceGroupGuid;
				oAssignment.ResourceGroupDesc = oAssignmentData.GROUP_DESCRIPTION;
				oAssignment.ResourceGuid = oAssignmentData.ResourceGuid;
				oAssignment.ResourceDesc = oAssignmentData.RESOURCE_DESCRIPTION;
			}

			this._oView = oView;
			this._mParameters = mParameters  || {bFromHome:true};
			this.oAssignmentModel = oView.getModel("assignment");
			this.oAssignmentModel.setData(oAssignment);

			//Set the ResourceGroupGuid 
			if (sResourceGroupGuid && sResourceGroupGuid !== "" && sBindPath && sBindPath !== "") {
				var resourceGroup = this._getAssignResourceGroup(sResourceGroupGuid);
				this.oAssignmentModel.setProperty("/ResourceGroupGuid", resourceGroup.ResourceGroupGuid);
				this.oAssignmentModel.setProperty("/ResourceGroupDesc", resourceGroup.ResourceGroupDesc);
			}
			//Set the ResourceGuid 
			if (sResourceGuid && sResourceGuid !== "" && sBindPath && sBindPath !== "") {
				var resource = this._getAssignResource(sResourceGuid + "%2F%2F" + sResourceGroupGuid);
				this.oAssignmentModel.setProperty("/ResourceGuid", resource.ResourceGuid);
				this.oAssignmentModel.setProperty("/ResourceDesc", resource.ResourceDesc);
			}

			this._component = this._oView.getController().getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// connect dialog to view (models, lifecycle)
			oView.addDependent(oDialog);

			this._getAssignedDemand(oAssignment.AssignmentGuid);
			//oDialog.bindElement(sBindPath);

			// open dialog
			oDialog.open();
		},
		/**
		 * Method get triggers when user selects any perticular unit from value help
		 * and outputs the same in input
		 * @param oEvent Select oEvent
		 */
		onChangeUnit: function (oEvent) {
			var sNewValue = oEvent.getParameter("newValue"),
				oModel = this._oView.getModel("assignment");
			if (sNewValue && sNewValue !== "") {
				oModel.setProperty("/EffortUnit", sNewValue);
			}
		},
		/**
		 * save form data
		 * @param oEvent
		 */
		onSaveDialog: function (oEvent) {
			var oDateFrom = this.oAssignmentModel.getProperty("/DateFrom"),
				oDateTo = this.oAssignmentModel.getProperty("/DateTo"),
				sMsg = this._oView.getController().getResourceBundle().getText("ymsg.datesInvalid");
			if (oDateTo !== undefined && oDateFrom !== undefined) {
				oDateFrom = oDateFrom.getTime();
				oDateTo = oDateTo.getTime();
				// To Validate DateTo and DateFrom
				if (oDateTo >= oDateFrom) {
					if(this._mParameters && this._mParameters.bFromPlannCal){
						this._eventBus.publish("AssignInfoDialog", "refreshAssignment", {
							reassign:this.reAssign
						});						
					}else{
						this._eventBus.publish("AssignInfoDialog", "updateAssignment", {
							isReassign: this.reAssign,
							parameters: this._mParameters
						});
					}
					this.onCloseDialog();
				} else {
					this.showMessageToast(sMsg);
				}
			} else {
				this.showMessageToast(sMsg);
			}
		},

		/** 
		 * On unassign assignment of assignment the unassign function import will be called
		 * @param oEvent
		 */
		onDeleteAssignment: function (oEvent) {
			var sId = this.oAssignmentModel.getProperty("/AssignmentGuid");
			if(this._mParameters && this._mParameters.bFromPlannCal){
						this._eventBus.publish("AssignInfoDialog", "refreshAssignment", {
							unassign:true
						});						
					}else{
						this._eventBus.publish("AssignInfoDialog", "deleteAssignment", {
							sId: sId,
							parameters: this._mParameters
						});
					}
			this.onCloseDialog();
		},

		/**
		 * method to change Assignment
		 * @param oEvent
		 */
		onChangeAssignType: function (oEvent) {
			var oParams = oEvent.getParameters(),
				reassignBtn = sap.ui.getCore().byId("AssignInfoDialog--reassignDialogButton");

			this.reAssign = oParams.selected;
			reassignBtn.setEnabled(this.reAssign);

			if (!this.reAssign) {
				this.oAssignmentModel.setProperty("/NewAssignPath", null);
				this.oAssignmentModel.setProperty("/NewAssignId", null);
				this.oAssignmentModel.setProperty("/NewAssignDesc", null);
			}
		},

		/**
		 * trigger event for open select assign tree table dialog
		 * @param oEvent
		 */
		onPressReAssign: function (oEvent) {
			this._eventBus.publish("AssignInfoDialog", "selectAssign", {
				oView: this._oView,
				isReassign: this.reAssign
			});
		},

		/**
		 * close dialog
		 */
		onCloseDialog: function () {
			this._oDialog.close();
			this.reAssign = false; // setting to default on close of Dialog
			this.oAssignmentModel.setData({});
		},

		/**
		 * default structure of assignment JSOn model
		 */
		getDefaultAssignmentModelObject: function(){
			return {
				AllowChange:false,
				AllowReassign: false,
				AllowUnassign: false,
				AssignmentGuid: "",
				DateFrom:"",
				DateTo:"",
				DemandGuid: "",
				DemandStatus: "",
				Description: "",
				Effort: null,
				EffortUnit: null,
				NewAssignPath: null,
				NewAssignId: null,
				NewAssignDesc: null,
				OperationNumber: "",
				OrderId: "",
				ResourceGroupGuid: "",
				ResourceGuid: "",
				SubOperationNumber: "",
				Obj_Source_Type: "",
				Notification: "",
				isNewAssignment: false,
				showError: false
			};
		},

		/**
		 * Method to get list of assigned Demands
		 * @param sId
		 * @private
		 */
		_getAssignedDemand: function (sId) {
			var sPath = "/AssignmentSet('" + sId + "')",
				oDialog = this._oDialog,
				oModel = this.oAssignmentModel;

			oDialog.bindElement({
				path: sPath,
				parameters: {
					expand: "Demand"
				},
				events: {
					change: function () {
						var oElementBinding = oDialog.getElementBinding(),
							oContext = oElementBinding.getBoundContext();

						// oDateToField = sap.ui.getCore().byId("idDateToAssignInf");

						if (!oContext) {
							oModel.setProperty("/showError", true);
							return;
						}
						//Setting min date to DateTo to restrict selection of invalid dates
						// oDateToField.setMinDate(oContext.getProperty("DateFrom"));

						oModel.setProperty("/showError", false);
						if(oModel.getProperty("/DateFrom") === "" || oModel.getProperty("/DateTo") === ""){
							oModel.setProperty("/DateFrom", oContext.getProperty("DateFrom"));
							oModel.setProperty("/DateTo", oContext.getProperty("DateTo"));	
						}
						
						oModel.setProperty("/Effort", oContext.getProperty("Effort"));
						oModel.setProperty("/EffortUnit", oContext.getProperty("EffortUnit"));
						var oDemandData = oContext.getProperty("Demand");
						oModel.setProperty("/Description", oDemandData.DemandDesc);
						oModel.setProperty("/AllowReassign", oDemandData.ALLOW_REASSIGN);
						oModel.setProperty("/AllowUnassign", oDemandData.ALLOW_UNASSIGN);
                        oModel.setProperty("/AllowChange", oDemandData.ASGNMNT_CHANGE_ALLOWED);
						oModel.setProperty("/OrderId", oDemandData.ORDERID);
						oModel.setProperty("/OperationNumber", oDemandData.OPERATIONID);
						oModel.setProperty("/SubOperationNumber", oDemandData.SUBOPERATIONID);
						oModel.setProperty("/DemandStatus", oDemandData.Status);
						oModel.setProperty("/DemandGuid", oDemandData.Guid);
						oModel.setProperty("/Notification", oDemandData.NOTIFICATION);
						oModel.setProperty("/Obj_Source_Type", oDemandData.OBJECT_SOURCE_TYPE);
					},
					dataRequested: function () {
						oDialog.setBusy(true);
					},
					dataReceived: function () {
						oDialog.setBusy(false);
					}
				}
			});

		},

		/**
		 * get assignment resource details
		 * @param resId
		 * @private
		 */
		_getAssignResource: function (resId) {
			var oData = this._getResourceInfo(resId);
			return {
				ResourceGuid: oData ? oData.ResourceGuid : "",
				ResourceDesc: oData ? oData.Description : ""
			};
		},

		/**
		 * get assignment resource group details
		 * @param groupId
		 * @private
		 */
		_getAssignResourceGroup: function (groupId) {
			var oData = this._getResourceInfo(groupId);
			return {
				ResourceGroupGuid: oData ? groupId : "",
				ResourceGroupDesc: oData ? oData.Description : ""
			};
		},

		/**
		 * get resouce info based on id
		 * @param sId
		 * @private
		 */
		_getResourceInfo: function (sId) {
			var sPath = "/ResourceHierarchySet('" + sId + "')";
			return this._oView.getModel().getProperty(sPath);
		},

		/**
		 * get detail information and display from new assigned path
		 * @param sChanel
		 * @param sEvent
		 * @param oData
		 * @private
		 */
		_showNewAssignment: function (sChanel, sEvent, oData) {
			if (sEvent === "selectedAssignment") {
				var oNewAssign = this._oView.getModel().getProperty(oData.sPath),
					newAssignDesc = this._getParentsDescription(oNewAssign);

				this.oAssignmentModel.setProperty("/NewAssignPath", oData.sPath);
				this.oAssignmentModel.setProperty("/NewAssignId", oNewAssign.Guid || oNewAssign.NodeId);
				this.oAssignmentModel.setProperty("/NewAssignDesc", newAssignDesc);

				//when new assignment is time range
				if (oNewAssign.StartDate && oNewAssign.NodeType.indexOf("TIME") >= 0) {
					var start = formatter.mergeDateTime(oNewAssign.StartDate, oNewAssign.StartTime),
						end = formatter.mergeDateTime(oNewAssign.EndDate, oNewAssign.EndTime);

					this.oAssignmentModel.setProperty("/DateFrom", start);
					this.oAssignmentModel.setProperty("/DateTo", end);
				}
			}
		},

		/**
		 * get all parents description for display in dialog new assigned field
		 * @param oNewAssign
		 * @returns {string}
		 * @private
		 */
		_getParentsDescription: function (oNewAssign) {
			var resourceGroup = "",
				resource = "",
				nodeId = oNewAssign.Guid || oNewAssign.NodeId,
				newAssignDesc = oNewAssign.Description,
				aNodeId = nodeId.split("//");

			if (oNewAssign.ResourceGroupGuid && oNewAssign.ResourceGroupGuid !== "" && oNewAssign.ResourceGroupGuid !== nodeId) {
				resourceGroup = this._getAssignResourceGroup(oNewAssign.ResourceGroupGuid);
			}

			if (oNewAssign.ResourceGuid && oNewAssign.ResourceGuid !== "" && aNodeId[0] !== oNewAssign.ResourceGuid) {
				resource = this._getAssignResource(oNewAssign.ResourceGuid + "%2F%2F" + oNewAssign.ResourceGroupGuid);
			}

			if (resource && resource.ResourceDesc !== "") {
				newAssignDesc = resource.ResourceDesc + "\n" + newAssignDesc;
			}

			if (resourceGroup && resourceGroup.ResourceGroupDesc !== "") {
				newAssignDesc = resourceGroup.ResourceGroupDesc + "\n" + newAssignDesc;
			}
			return newAssignDesc;
		},
		/**
		 * On press navigates to demand detail page of linked demand. 
		 * 
		 */
		onGotoDemand: function (oEvent) {
			var oRouter = this._component.getRouter(),
				oAssignment = this.oAssignmentModel,
				sDemandGuid = oAssignment.getProperty("/DemandGuid");

			this.onCloseDialog();
			if(this._mParameters.bFromGantt){
                oRouter.navTo("ganttDemandDetails", {
                    guid: sDemandGuid
                });
			}else if(this._mParameters.bFromGanttSplit){
                oRouter.navTo("splitGanttDetails", {
                    guid: sDemandGuid
                });
			}else{
				oRouter.navTo("detail", {
                    guid: sDemandGuid
                });
			}

		},
		exit : function(){
			this._eventBus.unsubscribe("AssignTreeDialog", "selectedAssignment", this._showNewAssignment, this);
		}
	});
});