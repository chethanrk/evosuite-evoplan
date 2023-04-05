sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
], function (BaseController, formatter, Fragment, MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.AssignInfoDialog", {

		formatter: formatter,
		
        /**
		 * Called when the controller is instantiated.
		 * @public
		 */
		init: function () {
			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("AssignTreeDialog", "ToolReAssignment", this._reAssignTool, this);
		},
        
        /**
		 * Setting dialog properties to use in tool operations
		 */
		onOpen: function (oDialog, oView, sAssignementPath, oAssignmentData, mParameters) {
			var oPrtToolsAssignment = this._getDefaultPRTToolsAssignmentModelObject(oAssignmentData);

			this._sAssignmentPath = sAssignementPath;
			this._mParameters = mParameters;
			this.oAssignmentModel = oView.getModel("assignment");
			this._oDialog = oDialog;
			this._oView = oView;
			this._component = this._oView.getController().getOwnerComponent();

			this.oAssignmentModel.setData(oPrtToolsAssignment);
			oDialog.addStyleClass(this._component.getContentDensityClass());
			oView.addDependent(oDialog);
		},
		/**
		 * close dialog
		 * Cancel progress
		 */
		onCloseDialog: function () {
			this._closeDialog();

		},
		/**
		 * save form data
		 * @param oEvent
		 */
		onSaveDialog: function (oEvent) {
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
					this.callFunctionImport.call(this._oView.getController(), oParams, "ChangeToolAssignment", "POST", this._mParameters, true);
					this._closeDialog();
				} else {
					this.showMessageToast(sMsg);
				}
			} else {
				this.showMessageToast(sMsg);
			}
		},
		/** 
		 * On removing the tool assignment
		 * @param oEvent
		 */
		onDeleteAssignment: function (oEvent) {
			var sPrtAssignmentGuid = this.oAssignmentModel.getProperty("/PrtAssignmentGuid");
			this.callFunctionImport.call(this._oView.getController(), {
				PrtAssignmentGuid: sPrtAssignmentGuid
			}, "DeleteToolAssignment", "POST", this._mParameters, true);
			this._closeDialog();
		},

		exit: function () {
			this._eventBus.unsubscribe("AssignTreeDialog", "ToolReAssignment");
		},
		/**
		 * when dialog closed inside controller
		 */
		_closeDialog: function () {
			this._oDialog.close();
		},
        
        /** 
		 * to getPRT assignment object for update operations
		 * @param oAssignmentData
		 */
		_getDefaultPRTToolsAssignmentModelObject: function (oAssignmentData) {
			return {
				AllowChange: true,
				AllowReassign: false,
				AllowUnassign: true,
				PrtAssignmentGuid: oAssignmentData.PrtAssignmentGuid,
				DateFrom: formatter.mergeDateTime(oAssignmentData.DATE_FROM, oAssignmentData.TIME_FROM),
				DateTo: formatter.mergeDateTime(oAssignmentData.DATE_TO, oAssignmentData.TIME_TO),
				Tool_ID: oAssignmentData.ToolId,
				Tool_Type: oAssignmentData.ToolType,
				Tool_Description: oAssignmentData.TOOL_DESCRIPTION,
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
				ResourceGuid: oAssignmentData.ResourceGuid
			}
		},
        
        /** 
		 * set reassignment details to assignment data object
		 */
		_reAssignTool: function (sChanel, sEvent, oData) {
			// sAssignPath, aSourcePaths
			var oNewAssign = this._oView.getModel().getProperty(oData.sAssignPath),
				newAssignDesc = this._getParentsDescription(oNewAssign);

			this.oAssignmentModel.setProperty("/NewAssignPath", oData.sAssignPath);
			this.oAssignmentModel.setProperty("/NewAssignId", oNewAssign.Guid || oNewAssign.NodeId);
			this.oAssignmentModel.setProperty("/NewAssignDesc", newAssignDesc);
			this.oAssignmentModel.setProperty("/ResourceGroupGuid", oNewAssign.ResourceGroupGuid);
			this.oAssignmentModel.setProperty("/ResourceGuid", oNewAssign.ResourceGuid);

			//when new assignment is time range
			if (oNewAssign.StartDate && oNewAssign.NodeType.indexOf("TIME") >= 0) {
				var start = formatter.mergeDateTime(oNewAssign.StartDate, oNewAssign.StartTime),
					end = formatter.mergeDateTime(oNewAssign.EndDate, oNewAssign.EndTime);

				this.oAssignmentModel.setProperty("/DateFrom", start);
				this.oAssignmentModel.setProperty("/DateTo", end);
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

			if (resource && resource.ResourceDesc !== "") {
				newAssignDesc = resource.ResourceDesc + "\n" + newAssignDesc;
			}

			if (resourceGroup && resourceGroup.ResourceGroupDesc !== "") {
				newAssignDesc = resourceGroup.ResourceGroupDesc + "\n" + newAssignDesc;
			}
			return newAssignDesc;
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

	});
});