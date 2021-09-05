sap.ui.define([
	"com/evorait/evoplan/controller/DialogFormController",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/models",
	"sap/m/MessageStrip",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/evorait/evoplan/model/Constants"
], function (DialogFormController, formatter, models, MessageStrip, Filter, FilterOperator, Constants) {
	"use strict";

	return DialogFormController.extend("com.evorait.evoplan.controller.AssignInfo", {

		_type: {
			add: false,
			edit: false
		},

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/* =========================================================== */
		/* Events                                                      */
		/* =========================================================== */

		/**
		 * @param oEvent
		 */
		onChangeSmartField: function (oEvent) {
			var oSource = oEvent.getSource(),
				sFieldName = oSource.getName();
			var oContext = this.getView().getBindingContext();
			if (oEvent.getSource().getValueState() === "None" && this._type.add) {
				this._checkForDefaultProperties(oContext, this._selectedEntitySet, sFieldName);
			}
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binding has changed in TemplateRenderController
		 * Set new controller context and path
		 * and load plant and new operation number when required
		 * @param sChannel
		 * @param sEvent
		 * @param oData
		 */
		_changedBinding: function (sChannel, sEvent, oData) {
			if (sChannel === "TemplateRendererEvoplan" && sEvent === "changedBinding") {
				DialogFormController.prototype._changedBinding.apply(this, arguments);

				if (oData && oData.viewNameId === this._sViewNameId) {
					sap.ui.getCore().getEventBus().subscribe("AssignTreeDialog", "selectedAssignment", this.updateAssignedDetails, this);
					this._oView = this.getView();
					this._getDefaultGlobalParameters();
					if (!this._oContext) {
						return;
					}
					this._mParams.sAssignmentPath = this._sPath;                         
					this._oDialog.setContentWidth("100%");
					//Parent context
					if (!this._oParentContext) {
						this._oParentContext = this._mParams.parentContext;
					}
					this._setDefaultAssignmentProperties();
				}
			}
		},

		_setDefaultAssignmentProperties: function () {
			var oResource = this._oParentContext.getObject(),
				oModel = this.getModel();
			if (this._mParams.origin === Constants.ORIGIN.RESOURCE_TREE) {
				oModel.setProperty(this._sPath + "/Guid", oResource.AssignmentGuid);
				oModel.setProperty(this._sPath + "/Description", oResource.Description);
				oModel.setProperty(this._sPath + "/ResourceGroupGuid", oResource.ResourceGroupGuid);
				oModel.setProperty(this._sPath + "/ResourceGuid", oResource.ResourceGuid);
				oModel.setProperty(this._sPath + "/DemandGuid", oResource.DemandGuid);
				this._mParams.AssignmentGuid = oResource.AssignmentGuid;
			}
			this._getDemandData(oResource.AssignmentGuid, oModel, this._sPath, this._setAssignmentDemandDetails.bind(this));
		},

		_setAssignmentDemandDetails: function (oAssignmentData) {
			this.getModel().setProperty(this._sPath + "/Guid", oAssignmentData.AssignmentGuid);
			this.getModel().setProperty(this._sPath + "/Description", oAssignmentData.Demand.DemandDesc);
			this.getModel().setProperty(this._sPath + "/RESOURCE_DESCRIPTION", oAssignmentData.RESOURCE_DESCRIPTION);
			this.getModel().setProperty(this._sPath + "/GROUP_DESCRIPTION", oAssignmentData.GROUP_DESCRIPTION);
			this.getModel().setProperty(this._sPath + "/ORDERID", oAssignmentData.ORDERID);
			this.getModel().setProperty(this._sPath + "/DateFrom", oAssignmentData.DateFrom);
			this.getModel().setProperty(this._sPath + "/DateTo", oAssignmentData.DateTo);
			this.getModel().setProperty(this._sPath + "/Effort", oAssignmentData.Effort);
			this.getModel().setProperty(this._sPath + "/EffortUnit", oAssignmentData.EffortUnit);

			//Fetching Resource Start and End Date from AssignmentSet for validating on save
			this.getModel().setProperty(this._sPath + "/RES_ASGN_START_DATE", oAssignmentData.RES_ASGN_START_DATE);
			this.getModel().setProperty(this._sPath + "/RES_ASGN_END_DATE", oAssignmentData.RES_ASGN_END_DATE);

			this.getModel().setProperty(this._sPath + "/DEMAND_STATUS", oAssignmentData.Demand.Status);
			this.getModel().setProperty(this._sPath + "/NOTIFICATION", oAssignmentData.Demand.NOTIFICATION);

			///to-do add ALLOW_REASSIGN to Assignment entity
			this.getModel().setProperty(this._sPath + "/ALLOW_REASSIGN", oAssignmentData.Demand.ALLOW_REASSIGN);
			this.getModel().setProperty(this._sPath + "/ALLOW_CHANGE", oAssignmentData.Demand.ASGNMNT_CHANGE_ALLOWED);
			this.getModel().setProperty(this._sPath + "/ALLOW_UNASSIGN", oAssignmentData.Demand.ALLOW_UNASSIGN);
			this.getModel().setProperty(this._sPath + "/OperationNumber", oAssignmentData.Demand.OPERATIONID);
			this.getModel().setProperty(this._sPath + "/SubOperationNumber", oAssignmentData.Demand.SUBOPERATIONID);

			if (oAssignmentData.Demand.ALLOW_REASSIGN && oAssignmentData.Demand.ASGNMNT_CHANGE_ALLOWED) {
				this._setReassignControls(oAssignmentData.Demand);
			}
		},

		_setReassignControls: function (oDemandData) {
			var oReassignModel = models.createHelperModel({
				allowReassign: oDemandData.ALLOW_REASSIGN,
				allowChange: oDemandData.ASGNMNT_CHANGE_ALLOWED,
				isReassignEnabled: false,
				NewAssignPath: "",
				NewAssignId: "",
				NewAssignDesc: ""
			});
			this.getView().setModel(oReassignModel, "reassignModelHelper");
			var aFormGroups = this.getAllSmartFormGroups(this._aSmartForms);
			if (aFormGroups[1] && !this.isCustomControlsSet) {
				var aGroupElements = aFormGroups[1].getGroupElements();
				if (aGroupElements[4]) {
					//add checkbox
					var oCheckBox1 = new sap.m.CheckBox({
						selected: "{path: 'reassignModelHelper>/isReassignEnabled'}",
						select: this.enableReasignButton.bind(this)
					});
					this._addNewGroupElement(aFormGroups[1], oCheckBox1, "xfld.newAssign", 100);
					//add button
					var oButton2 = new sap.m.Button({
						text: this.getResourceBundle().getText("xbut.selectResource"),
						press: this.onPressReAssign.bind(this),
						enabled: "{path: 'reassignModelHelper>/isReassignEnabled'}",
						width: "50%"
					});
					this._addNewGroupElement(aFormGroups[1], oButton2, "", 100);
					//add selected resource details
					var oText3 = new sap.m.Text({
						id: "idNewAssignment",
						text: "{path: 'reassignModelHelper>/NewAssignDesc'}",
						visible: "{path: 'reassignModelHelper>/isReassignEnabled'}"
					});
					this._addNewGroupElement(aFormGroups[1], oText3, "xfld.newAssignment", 100);
					this.isCustomControlsSet = true;
				}
			} else {
				this.getView().getModel("reassignModelHelper").refresh();
			}
		},

		enableReasignButton: function (oEvent) {
			this.reAssign = oEvent.mParameters.selected;
			this.getModel("reassignModelHelper").setProperty("/isReassignEnabled", oEvent.mParameters.selected);
		},

		onPressReAssign: function () {
			sap.ui.getCore().getEventBus().publish("AssignInfoDialog", "selectAssign", {
				oView: this._oView,
				isReassign: this.reAssign,
				aSelectedPaths: ["/AssignmentSet('" + this._assignmentGuid + "')"]
			});
		},

		updateAssignedDetails: function (sChanel, sEvent, oData) {
			this.getModel("reassignModelHelper").setProperty("/NewAssignDesc", "newText");
			if (sEvent === "selectedAssignment") {
				var oNewAssign = this._oView.getModel().getProperty(oData.sPath),
					newAssignDesc = this._getParentsDescription(oNewAssign);

				this.getModel("reassignModelHelper").setProperty("/NewAssignPath", oData.sPath);
				this.getModel("reassignModelHelper").setProperty("/NewAssignId", oNewAssign.Guid || oNewAssign.NodeId);
				this.getModel("reassignModelHelper").setProperty("/NewAssignDesc", newAssignDesc);

				//when new assignment is time range
				if (oNewAssign.StartDate && oNewAssign.NodeType.indexOf("TIME") >= 0) {
					var start = formatter.mergeDateTime(oNewAssign.StartDate, oNewAssign.StartTime),
						end = formatter.mergeDateTime(oNewAssign.EndDate, oNewAssign.EndTime);

					this.getModel("reassignModelHelper").setProperty("/DateFrom", start);
					this.getModel("reassignModelHelper").setProperty("/DateTo", end);
				}
				this._mParams.reassignModelHelper = this.getModel("reassignModelHelper").getData();
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
		}
	});
});