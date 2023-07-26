sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/models",
	"sap/m/MessageStrip",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/evorait/evoplan/model/Constants",
	"sap/m/MessageToast"
], function (BaseController, formatter, models, MessageStrip, Filter, FilterOperator, Constants,MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.AssignInfo", {

		/**
		 * get detail information and display from new assigned path
		 * @param sChanel
		 * @param sEvent
		 * @param oData
		 * @private
		 */
		_showNewAssignment: function (sChanel, sEvent, oData) {
			var oAssignmentModel = this.getView().getController().getOwnerComponent().getModel("assignment"),
				oModel = this.getView().getModel();
			if (sEvent === "selectedAssignment") {
				var oNewAssign = oModel.getProperty(oData.sPath),
					newAssignDesc = this._getParentsDescription(oNewAssign);

				oAssignmentModel.setProperty("/NewAssignPath", oData.sPath);
				oAssignmentModel.setProperty("/NewAssignId", oNewAssign.Guid || oNewAssign.NodeId);
				oAssignmentModel.setProperty("/NewAssignDesc", newAssignDesc);

				//when new assignment is time range
				if (oNewAssign.StartDate && oNewAssign.NodeType.indexOf("TIME") >= 0) {
					var start = formatter.mergeDateTime(oNewAssign.StartDate, oNewAssign.StartTime),
						end = formatter.mergeDateTime(oNewAssign.EndDate, oNewAssign.EndTime);

					oAssignmentModel.setProperty("/DateFrom", start);
					oAssignmentModel.setProperty("/DateTo", end);
				}
			}
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
		 * On Change of Assignment Dates
		 * Validating Start and End Date falls within Resource Start and End Date
		 * 
		 */
		onAssignmentDateChange: function () {
			var bValidDateFrom, bValidDateTo,
				oAssignmentModel = this.getView().getController().getOwnerComponent().getModel("assignment"),
				sResStartDate = oAssignmentModel.getProperty("/RES_ASGN_START_DATE"),
				sResEndDate = oAssignmentModel.getProperty("/RES_ASGN_END_DATE"),
				sDateFrom = oAssignmentModel.getProperty("/DateFrom"),
				sDateTo = oAssignmentModel.getProperty("/DateTo"),
				bIsResource = oAssignmentModel.getProperty("/ResourceGuid");

			//Checking DateFrom falls within Resource Start and End Date
			bValidDateFrom = sDateFrom <= sResEndDate && sDateFrom >= sResStartDate;
			//Checking DateTo falls within Resource Start and End Date
			bValidDateTo = sDateTo <= sResEndDate && sDateTo >= sResStartDate;

			if (this.getModel("user").getProperty("/ENABLE_RES_ASGN_VALID_CHECK")){
			//If DateFrom and DateTo doesn't fall within Resource Start and End Date
			if (bIsResource && (!bValidDateFrom || !bValidDateTo)) {
				this._showEffortConfirmMessageBox(this.getView().getController().getResourceBundle().getText("ymsg.targetValidity")).then(function (
					oAction) {
					if (oAction === "YES") {
						oAssignmentModel.setProperty("/DateFrom", oAssignmentModel.getProperty("/RES_ASGN_START_DATE"));
						oAssignmentModel.setProperty("/DateTo", oAssignmentModel.getProperty("/RES_ASGN_END_DATE"));
					}
				}.bind(this));
			}
		}
		},

		/**
		 * method to change Assignment
		 * @param oEvent
		 */
		onChangeAssignType: function (oEvent) {
			var oParams = oEvent.getParameters(),
				reassignBtn = this.byId("reassignDialogButton"),
				oAssignmentModel = this.getView().getController().getOwnerComponent().getModel("assignment");

			this.reAssign = oParams.selected;
			reassignBtn.setEnabled(this.reAssign);

			if (!this.reAssign) {
				oAssignmentModel.setProperty("/NewAssignPath", null);
				oAssignmentModel.setProperty("/NewAssignId", null);
				oAssignmentModel.setProperty("/NewAssignDesc", null);
			}
		},

		/**
		 * trigger event for open select assign tree table dialog
		 * @param oEvent
		 */
		onPressReAssign: function (oEvent) {
			var sAssignmentGuid = oEvent.getSource().getBindingContext().getObject().Guid,
				oEventBus = sap.ui.getCore().getEventBus();
			this.reAssign = true; // EVOSUITE2-2224:Sagar
			oEventBus.publish("AssignInfoDialog", "selectAssign", {
				oView: this.getView().getParent().getParent(),
				isReassign: this.reAssign,
				aSelectedPaths: ["/AssignmentSet('" + sAssignmentGuid + "')"]
			});
		},

		/**
		 * Method get triggers when user selects any perticular unit from value help
		 * and outputs the same in input
		 * @param oEvent Select oEvent
		 */
		onChangeUnit: function (oEvent) {
			var sNewValue = oEvent.getParameter("newValue"),
				oModel = this.getView().getModel("assignment");
			if (sNewValue && sNewValue !== "") {
				oModel.setProperty("/EffortUnit", sNewValue);
			}
		},
		/**
		 * Method to get list of assigned Demands
		 * @param sId
		 * @private
		 */
		_getDemandData: function (sGuId, oModel, sPath, callbackFn) {
			var oFilter1 = new Filter("Guid", FilterOperator.EQ, sGuId);
			this.getOwnerComponent().readData("/AssignmentSet", [oFilter1], "Demand")
				.then(function (data) {
					callbackFn(data.results[0]);
				}.bind(this));
		},
		/**
		 * Method to validate Duration logic for PS Demands Network Assignment
		 * @param oEvent
		 */
		onPSDemandEffortValidation: function (oEvent) {
			var oSource = oEvent.getSource(),
				sValue = oSource.getValue(),
				oContext = oSource.getBindingContext(),
				oObject = oContext.getObject();
			if (this.getModel("user").getProperty("/ENABLE_NETWORK_ASSIGNMENT") && oObject.OBJECT_SOURCE_TYPE === "DEM_PSNW") {
				var sNewValue = oEvent.getParameter("newValue").replace(/[^0-9a-zA-Z. ]/g, ''),
					sEffort = oObject.Effort,
					sRemainingDuration = oObject.REMAINING_DURATION,
					sEffortUnit = oObject.EffortUnit,
					sTotalEffort = Number(sEffort) + Number(sRemainingDuration);
				if (sValue.includes("-") || Number(sValue) <= 0) {
					this.showMessageToast(this.getView().getController().getResourceBundle().getText("ymsg.validEffort"));
				} else if (Number(sEffort) + Number(sRemainingDuration) < Number(sNewValue)) {
					this.showMessageToast(this.getView().getController().getResourceBundle().getText("ymsg.invalidAssgnDuration",[sTotalEffort,sEffortUnit]));
				}
			}
		},
		/**
		 * Opening Assignment Status Change PopOver
		 * @param oEvent
		 * Since 2205
		 * @Author Chethan RK
		 */
		openAssignmentStatus: function (oEvent) {
			var oSource = oEvent.getSource(),
				oContext = oSource.getBindingContext(),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				aSelectedAssignments = [{
					sPath: sPath,
					oData: oModel.getProperty(sPath)
				}];
			this.getOwnerComponent().AssignmentStatus.open(this.getView(), oSource, aSelectedAssignments);
		}
	});
});