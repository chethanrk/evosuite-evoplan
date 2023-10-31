sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
], function (BaseController, formatter, Fragment, MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.prt.ToolInfoDialog", {

		formatter: formatter,

		oPRTActions: null,
		_oController:undefined,
		_oViewModel:undefined,
		_oDataModel:undefined,
		_oGanttModel:undefined,
		_oUserModel:undefined,
		_oResourceBundle:undefined,
		_oEventBus:undefined,
		_oOwnerComponent:undefined,
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		/**
		 * Called when the controller is instantiated.
		 * @public
		 */

		constructor: function (controller) {
			this._oViewModel = controller.getModel("viewModel");
			this._oAppViewModel = controller.getModel("appView");
			this._oDataModel = controller.getModel();
			this._oGanttModel = controller.getModel("ganttModel");
			this._oUserModel = controller.getModel("user");
			this._oResourceBundle = controller.getModel("i18n").getResourceBundle();
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oOwnerComponent = controller;
		},
		init: function () {
			this._oEventBus.subscribe("AssignTreeDialog", "ToolReAssignment", this._reAssignTool, this);
		},
		/**
		 * This method is used for setting dialog properties to use in too operations
		 * @param {object} oDialog tool dialog object
		 * @param {object} oView view object
		 * @param {string} sAssignementPath path of the tool assignment
		 * @param {object} oAssignmentData response data
		 * @param {object} mParameters parameters
		 * @param {object} oPRTActions prt actions controller referrence
		 * @return The value of the property. If the property is not found, null or undefined is returned.
		 */
		onToolOpen: function (oDialog, oView, sAssignementPath, oAssignmentData, mParameters, oPRTActions) {
			var oPrtToolsAssignment = this._getDefaultPRTAssignmentObject(oAssignmentData);

			this._sAssignmentPath = sAssignementPath;
			this._mParameters = mParameters.refreshParameters;
			this.oAssignmentModel = oView.getModel("assignment");

			this.oPRTActions = oPRTActions;
			this._oDialog = oDialog;
			this._oView = oView;
			this._component = this._oView.getController().getOwnerComponent();
			this.AssignmentSourcePath = mParameters.parentContext.getPath();

			this._oViewModel.setProperty("/bEnableAsgnSave", true);
			
			oPrtToolsAssignment.isPRT = true;
			this.oAssignmentModel.setData(oPrtToolsAssignment);
			oDialog.addStyleClass(this._component.getContentDensityClass());
			oView.addDependent(oDialog);

		},
		/** 
		 * On unassign assignment of tool the delete function import will be called
		 * @param {object} oEvent This event is triggerd from the button in the Tool Form Dialog
		 */
		onDeleteAssignment: function (oEvent) {
			//Storing Updated Resources Information for Refreshing only the selected resources in Gantt View
			this.updatedResources(this._oView.getModel("viewModel"), this._oView.getModel("user"), this.oAssignmentModel.getProperty("/"));
			var sPrtAssignmentGuid = this.oAssignmentModel.getProperty("/PrtAssignmentGuid");
			this.clearMessageModel.call(this._oView.getController());
			var oData = {
				oSourceData: {
					sTargetPath: this.AssignmentSourcePath
				}
			};
			this.executeFunctionImport.call(this._oView.getController(), this._oDataModel, {
				PrtAssignmentGuid: sPrtAssignmentGuid
			}, "DeleteToolAssignment", "POST").then(function () {
				if (this._mParameters.bFromHome || this._mParameters.bFromDemandTools) {
					this._oEventBus.publish("BaseController", "refreshTreeTable", {});
				}
				if (this._mParameters.bFromGanttTools || this._mParameters.bFromNewGantt || this._mParameters.bFromNewGanttSplit) {
					this._oEventBus.publish("GanttChart", "refreshDroppedContext", oData);
				}
			}.bind(this));
			this._closeDialog();
		},

		/**
		 * trigger event for open select assign tree table dialog
		 */
		onPressReAssign: function () {
			this._oEventBus.publish("AssignInfoDialog", "selectAssign", {
				oView: this._oView,
				isReassign: this.reAssign,
				aSelectedPaths: ["/AssignmentSet('" + this._assignmentGuid + "')"]
			});
		},

		/**
		 * when dialog closed inside controller
		 */
		_closeDialog: function () {
			this._oDialog.close();
			this._oDialog.unbindElement();
			this.oAssignmentModel.setProperty("/AllowUnassign", false);
			this.reAssign = false; // setting to default on close of Dialog
		},

		/**
		 * close dialog
		 * Cancel progress
		 */
		onCloseDialog: function () {
			this._closeDialog();
			//when from new gantt shape busy state needs removed
			if (this._mParameters.bCustomBusy && (this._mParameters.bFromNewGantt || this._mParameters.bFromNewGanttSplit)) {
				this._oView.getModel("ganttModel").setProperty(this._mParameters.sSourcePath + "/busy", false);
			}
		},

		/**
		 * Function to Tool save and validate date
		 * 
		 */
		onSaveDialog: function () {
			//Storing Updated Resources Information for Refreshing only the selected resources in Gantt View
			this.updatedResources(this._oView.getModel("viewModel"), this._oView.getModel("user"), this.oAssignmentModel.getProperty("/"));
			var oDateFrom = this.oAssignmentModel.getProperty("/DateFrom"),
				oDateTo = this.oAssignmentModel.getProperty("/DateTo"),
				sMsg = this._oResourceBundle.getText("ymsg.datesInvalid"),
				oParams;

			if (oDateTo !== undefined && oDateFrom !== undefined) {
				oDateFrom = oDateFrom.getTime();
				oDateTo = oDateTo.getTime();
				// To Validate DateTo and DateFrom
				if (oDateTo >= oDateFrom) {
					oParams = this._getParams();
					this._mParameters.bIsFromPRTAssignmentInfo = true;
					var oData = {
						oSourceData: {
							sSourcePath: this.AssignmentSourcePath,
							sTargetPath: this.AssignmentTargetPath
						}
					};
					this.clearMessageModel.call(this._oView.getController());
					this.executeFunctionImport.call(this._oView.getController(), this._oDataModel, oParams, "ChangeToolAssignment", "POST",
						this._mParameters, true).then(function (results) {
							this.showMessage.call(this._oView.getController(),results[1]);
							if (this._mParameters.bFromHome || this._mParameters.bFromDemandTools) {
								this._oEventBus.publish("BaseController", "refreshTreeTable", {});
							}
							if (this._mParameters.bFromGanttTools || this._mParameters.bFromNewGantt || this._mParameters.bFromNewGanttSplit) {
								this._oEventBus.publish("GanttChart", "refreshDroppedContext", oData);
							}
						}.bind(this));
					this._closeDialog();
				} else {
					this.showMessageToast(sMsg);
				}
			} else {
				this.showMessageToast(sMsg);
			}
		},
		/**
		 * This method is a Ui5 hook method trigged at the exit of the view.
		 * Here we can call any methods that are required to be called at exit of the view.
		 */
		exit: function () {
			this._oEventBus.unsubscribe("AssignTreeDialog", "ToolReAssignment");
		},
		/* =========================================================== */
		/* Private methods                                             */
		/* =========================================================== */

		/**
		 * This method is used to get assignment resource details
		 * @param {string} resId
		 * @return {object} used to return the JSON object.
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
		 * This method is used to get assignment resource group details.
		 * @param {string} groupId
		 * @return {object} returns the JSON object
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
		 * This method is used to get resouce info based on id.
		 * @param {string} sId
		 * @return The value of the property. If the property is not found, null or undefined is returned.
		 */
		_getResourceInfo: function (sId) {
			var sPath = "/ResourceHierarchySet('" + sId + "')";
			return this._oDataModel.getProperty(sPath);
		},
		/** This method is used to get all parents description for display in dialog new assigned field.
		 *  @param {object} oNewAssign
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

		/** This method is used to set the reassignment details to the assignment data object
		 *  @param {string} sChanel channel for the event bus
		 *  @param {string} sEvent event for the event bus
		 *  @param {object} oData data that was passed in the event bus
		 */
		_reAssignTool: function (sChanel, sEvent, oData) {
			// sAssignPath, aSourcePaths
			this._oView = this._oView ? this._oView : oData.view;
			this.oAssignmentModel = this.oAssignmentModel ? this.oAssignmentModel : oData.oAssignmentModel;
			var oNewAssign = this._oDataModel.getProperty(oData.sAssignPath),
				newAssignDesc = this._getParentsDescription(oNewAssign);
			//Storing updated Resource info for refreshing only the updated Resources in Gantt
			this.updatedResources(this._oView.getModel("viewModel"), this._oView.getModel("user"), this.oAssignmentModel.getProperty("/"));

			this.oAssignmentModel.setProperty("/NewAssignPath", oData.sAssignPath);
			this.oAssignmentModel.setProperty("/NewAssignId", oNewAssign.Guid || oNewAssign.NodeId);
			this.oAssignmentModel.setProperty("/NewAssignDesc", newAssignDesc);
			this.oAssignmentModel.setProperty("/ResourceGroupGuid", oNewAssign.ResourceGroupGuid);
			this.oAssignmentModel.setProperty("/ResourceGuid", oNewAssign.ResourceGuid);
			this.oAssignmentModel.setProperty("/ParentNodeId", oNewAssign.ParentNodeId);
			this.oAssignmentModel.setProperty("/NodeType", oNewAssign.NodeType);

			if (oNewAssign.NodeType === "ASSIGNMENT") {
				this.oAssignmentModel.setProperty("/DemandGuid", oNewAssign.DemandGuid);
			} else {
				this.oAssignmentModel.setProperty("/DemandGuid", "");
			}

			//when new assignment is time range
			if (oNewAssign.StartDate && oNewAssign.NodeType.indexOf("TIME") >= 0) {
				var start = formatter.mergeDateTime(oNewAssign.StartDate, oNewAssign.StartTime),
					end = formatter.mergeDateTime(oNewAssign.EndDate, oNewAssign.EndTime);

				this.oAssignmentModel.setProperty("/DateFrom", start);
				this.oAssignmentModel.setProperty("/DateTo", end);
			}
		},
		/** This method is used to return a JSON object that is used in this function
		 *  onToolOpen.
		 *  @param {object} oAssignmentData
		 *  @return {object} - always a JSON object is returned
		 */
		_getDefaultPRTAssignmentObject: function (oAssignmentData) {
			return {
				AllowChange: oAssignmentData.PRT_ASSIGNMENT_TYPE === "PRTASGN" ? true : false,
				AllowReassign: oAssignmentData.PRT_ASSIGNMENT_TYPE === "PRTASGN" ? true : false,
				AllowUnassign: true,
				PrtAssignmentGuid: oAssignmentData.Guid,
				DateFrom: oAssignmentData.DateFrom,
				DateTo: oAssignmentData.DateTo,
				Tool_ID: oAssignmentData.TOOL_ID,
				Tool_Type: oAssignmentData.TOOL_TYPE,
				Tool_Description: oAssignmentData.DemandDesc,
				NewAssignPath: null,
				NewAssignId: null,
				NewAssignDesc: null,
				ResourceGroupGuid: oAssignmentData.ResourceGroupGuid,
				ResourceGuid: oAssignmentData.ResourceGuid,
				showError: false,
				ShowGoToDetailBtn: false
			};
		},
		/** This method is used to return a JSON object that is used in this function
		 *  onSaveDialog.
		 *  @return {object} - always a JSON object is returned
		 */
		_getParams: function () {
			var oAssignmentData = this.oAssignmentModel.getData();
			return {
				ToolId: oAssignmentData.Tool_ID,
				ToolType: oAssignmentData.Tool_Type,
				PrtAssignmentGuid: oAssignmentData.PrtAssignmentGuid,
				DateFrom: oAssignmentData.DateFrom,
				DateTo: oAssignmentData.DateTo,
				TimeFrom: {
					ms: oAssignmentData.DateFrom.getTime()
				},
				TimeTo: {
					ms: oAssignmentData.DateTo.getTime()
				},
				ResourceGroupGuid: oAssignmentData.ResourceGroupGuid,
				ResourceGuid: oAssignmentData.ResourceGuid,
				DemandGuid: oAssignmentData.DemandGuid ? oAssignmentData.DemandGuid : ""
			};
		}

	});
});