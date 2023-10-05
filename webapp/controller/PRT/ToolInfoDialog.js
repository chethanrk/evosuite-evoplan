sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast"
], function (BaseController, formatter, Fragment, MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.PRT.ToolInfoDialog", {

		formatter: formatter,

		init: function () {
			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("AssignTreeDialog", "ToolReAssignment", this._reAssignTool, this);
		},
		/**
		 * Setting dialog properties to use in tool operations
		 */
		onToolOpen: function (oDialog, oView, sAssignementPath, oAssignmentData, mParameters) {
			var oPrtToolsAssignment = this._getDefaultPRTAssignmentObject(oAssignmentData);

			this._sAssignmentPath = sAssignementPath;
			this._mParameters = mParameters.refreshParameters;
			this.oAssignmentModel = oView.getModel("assignment");
			this._oDialog = oDialog;
			this._oView = oView;
			this._component = this._oView.getController().getOwnerComponent();
			this.AssignmentSourcePath = mParameters.parentContext.getPath();

			this._oView.getModel("viewModel").setProperty("/bEnableAsgnSave", true);
			
			oPrtToolsAssignment.isPRT = true;
			this.oAssignmentModel.setData(oPrtToolsAssignment);
			oDialog.addStyleClass(this._component.getContentDensityClass());
			oView.addDependent(oDialog);

		},
		/**
		 * Function to validate effort assignment save 
		 * 
		 */

		/** 
		 * On unassign assignment of tool the delete function import will be called
		 * @param oEvent
		 */
		onDeleteAssignment: function (oEvent) {
			//Storing Updated Resources Information for Refreshing only the selected resources in Gantt View
			this._updatedDmdResources(this._oView.getModel("viewModel"), this.oAssignmentModel.getProperty("/"));
			var sPrtAssignmentGuid = this.oAssignmentModel.getProperty("/PrtAssignmentGuid");
			this.clearMessageModel.call(this._oView.getController());
			var oData = {
				oSourceData: {
					sTargetPath: this.AssignmentSourcePath
				}
			}
			this.executeFunctionImport.call(this._oView.getController(), this._oView.getModel(), {
				PrtAssignmentGuid: sPrtAssignmentGuid
			}, "DeleteToolAssignment", "POST").then(function () {
				if (this._mParameters.bFromHome || this._mParameters.bFromDemandTools) {
					this._eventBus.publish("BaseController", "refreshTreeTable", {});
				}
				if (this._mParameters.bFromGanttTools || this._mParameters.bFromNewGantt || this._mParameters.bFromNewGanttSplit) {
					this._eventBus.publish("GanttChart", "refreshDroppedContext", oData);
				}
			}.bind(this));
			this._closeDialog();
		},

		/**
		 * trigger event for open select assign tree table dialog
		 * @param oEvent
		 */
		onPressReAssign: function (oEvent) {
			this._eventBus.publish("AssignInfoDialog", "selectAssign", {
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
			this._updatedDmdResources(this._oView.getModel("viewModel"), this.oAssignmentModel.getProperty("/"));
			var oDateFrom = this.oAssignmentModel.getProperty("/DateFrom"),
				oDateTo = this.oAssignmentModel.getProperty("/DateTo"),
				sMsg = this._oView.getController().getResourceBundle().getText("ymsg.datesInvalid"),
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
					}
					this.clearMessageModel.call(this._oView.getController());
					this.executeFunctionImport.call(this._oView.getController(), this._oView.getModel(), oParams, "ChangeToolAssignment", "POST",
						this._mParameters, true).then(function (results) {
							this.showMessage.call(this._oView.getController(),results[1]);
							if (this._mParameters.bFromHome || this._mParameters.bFromDemandTools) {
								this._eventBus.publish("BaseController", "refreshTreeTable", {});
							}
							if (this._mParameters.bFromGanttTools || this._mParameters.bFromNewGantt || this._mParameters.bFromNewGanttSplit) {
								this._eventBus.publish("GanttChart", "refreshDroppedContext", oData);
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
		exit: function () {
			this._eventBus.unsubscribe("AssignTreeDialog", "ToolReAssignment");
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
		 * set reassignment details to assignment data object
		 */
		_reAssignTool: function (sChanel, sEvent, oData) {
			// sAssignPath, aSourcePaths
			this._oView = this._oView ? this._oView : oData.view;
			this.oAssignmentModel = this.oAssignmentModel ? this.oAssignmentModel : oData.oAssignmentModel;
			var oNewAssign = this._oView.getModel().getProperty(oData.sAssignPath),
				newAssignDesc = this._getParentsDescription(oNewAssign);
			this._updatedDmdResources(this._oView.getModel("viewModel"), this.oAssignmentModel.getProperty("/"));

			this.oAssignmentModel.setProperty("/NewAssignPath", oData.sAssignPath);
			this.oAssignmentModel.setProperty("/NewAssignId", oNewAssign.Guid || oNewAssign.NodeId);
			this.oAssignmentModel.setProperty("/NewAssignDesc", newAssignDesc);
			this.oAssignmentModel.setProperty("/ResourceGroupGuid", oNewAssign.ResourceGroupGuid);
			this.oAssignmentModel.setProperty("/ResourceGuid", oNewAssign.ResourceGuid);

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

		/** 
		 * to getPRT assignment object for update operations
		 * @param oAssignmentData
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
		/** 
		 * get Parameteres to pass into Function Import
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