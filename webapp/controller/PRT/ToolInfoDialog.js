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
			var oPrtToolsAssignment = this._getDefaultPRTToolsAssignmentModelObject(oAssignmentData);

			this._sAssignmentPath = sAssignementPath;
			this._mParameters = mParameters.refreshParameters;
			this.oAssignmentModel = oView.getModel("assignment");
			this._oDialog = oDialog;
			this._oView = oView;
			this._component = this._oView.getController().getOwnerComponent();
			this.AssignmentSourcePath = mParameters.parentContext.getPath();

			oPrtToolsAssignment.isPRT = true;
			this.oAssignmentModel.setData(oPrtToolsAssignment);
			oDialog.addStyleClass(this._component.getContentDensityClass());
			oView.addDependent(oDialog);
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
		 * Function to validate effort assignment save 
		 * 
		 */

		/** 
		 * On unassign assignment of assignment the unassign function import will be called
		 * @param oEvent
		 */
		onDeleteAssignment: function (oEvent) {
			var sId = this.oAssignmentModel.getProperty("/AssignmentGuid"),

				sDemandGuid = this.oAssignmentModel.getProperty("/DemandGuid"),
				sSplitIndex = this.oAssignmentModel.getProperty("/SplitIndex"),
				sSplitCounter = this.oAssignmentModel.getProperty("/SplitCounter"),
				bSplitGlobalConfigEnabled = this._oView.getModel("user").getProperty("/ENABLE_SPLIT_STRETCH_ASSIGN");

			if (this.oAssignmentModel.getData().isPRT) {
				this.onDeleteToolAssignment();
			} else {
				if (this._mParameters && this._mParameters.bFromPlannCal) {
					this._eventBus.publish("AssignInfoDialog", "refreshAssignment", {
						unassign: true
					});
				} else if (bSplitGlobalConfigEnabled && sSplitIndex > 0 && sSplitCounter > 0) {
					this._eventBus.publish("AssignInfoDialog", "deleteSplitAssignments", {
						assignmentGuid: sId,
						DemandGuid: sDemandGuid,
						splitIndex: sSplitIndex,
						splitCounter: sSplitCounter,
						parameters: this._mParameters
					});
				} else {
					this._eventBus.publish("AssignInfoDialog", "deleteAssignment", {
						sId: sId,
						parameters: this._mParameters
					});
				}
				this._closeDialog();
			}

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
		 * On Change of Assignment Dates
		 * Validating Start and End Date falls within Resource Start and End Date
		 * 
		 */
		onAssignmentDateChange: function () {
			var bValidDateFrom, bValidDateTo,
				sResStartDate = this.oAssignmentModel.getProperty("/RES_ASGN_START_DATE"),
				sResEndDate = this.oAssignmentModel.getProperty("/RES_ASGN_END_DATE"),
				sDateFrom = this.oAssignmentModel.getProperty("/DateFrom"),
				sDateTo = this.oAssignmentModel.getProperty("/DateTo");

			//Checking DateFrom falls within Resource Start and End Date
			bValidDateFrom = sDateFrom <= sResEndDate && sDateFrom >= sResStartDate;
			//Checking DateTo falls within Resource Start and End Date
			bValidDateTo = sDateTo <= sResEndDate && sDateTo >= sResStartDate;

			//If DateFrom and DateTo doesn't fall within Resource Start and End Date
			if (!bValidDateFrom || !bValidDateTo) {
				this._showEffortConfirmMessageBox(this._oView.getController().getResourceBundle().getText("ymsg.targetValidity")).then(function (
					oAction) {
					if (oAction === "YES") {
						this.oAssignmentModel.setProperty("/DateFrom", this.oAssignmentModel.getProperty("/RES_ASGN_START_DATE"));
						this.oAssignmentModel.setProperty("/DateTo", this.oAssignmentModel.getProperty("/RES_ASGN_END_DATE"));
					} else {}
				}.bind(this));
			}
		},

		/**
		 * Validating Effort for PS Demands onSave 
		 */
		onValidateEffort: function () {
			var sOldEffort = this.oAssignmentModel.getProperty("/OldEffort"),
				sEffort = this.oAssignmentModel.getProperty("/Effort"),
				sObjectSourceType = this.oAssignmentModel.getProperty("/OBJECT_SOURCE_TYPE"),
				sRemainingDuration = this.oAssignmentModel.getProperty("/REMAINING_DURATION"),
				sEffortUnit = this.oAssignmentModel.getProperty("/EffortUnit"),
				sTotalEffort = Number(sOldEffort) + Number(sRemainingDuration),
				bValidEffort = true;
			if (this._oView.getModel("user").getProperty("/ENABLE_NETWORK_ASSIGNMENT") && sObjectSourceType === "DEM_PSNW") {
				if (sEffort.toString().includes("-") || Number(sEffort) <= 0) {
					this.showMessageToast(this._oView.getController().getResourceBundle().getText("ymsg.validEffort"));
					bValidEffort = false;
				} else if (Number(sOldEffort) + Number(sRemainingDuration) < Number(sEffort)) {
					this.showMessageToast(this._oView.getController().getResourceBundle().getText("ymsg.invalidAssgnDuration", [sTotalEffort,
						sEffortUnit
					]));
					bValidEffort = false;
				}
			}
			return bValidEffort;
		},
		onSaveDialog: function () {
			var sDateFrom = this.oAssignmentModel.getProperty("/DateFrom"),
				sDateTo = this.oAssignmentModel.getProperty("/DateTo"),
				sEffort = this.oAssignmentModel.getProperty("/Effort"),
				iNewEffort = this.getEffortTimeDifference(sDateFrom, sDateTo),
				oResourceBundle = this._oView.getController().getResourceBundle(),
				bValidEffort = this.onValidateEffort();

			if (this.oAssignmentModel.getData().isPRT) {
				this.onSaveToolDialog();
			}
		},

		/**
		 * save form data
		 * @param oEvent
		 */
		onSaveToolDialog: function (oEvent) {
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
							sTargetPath: this.AssignmentSourcePath
						}
					}
					this.clearMessageModel.call(this._oView.getController());
					this.executeFunctionImport.call(this._oView.getController(), this._oView.getModel(), oParams, "ChangeToolAssignment", "POST",
						this._mParameters, true).then(function () {
						this._eventBus.publish("GanttChart", "refreshDroppedContext", oData);
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
		 * On removing the tool assignment
		 * @param oEvent
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
		},
		onDeleteToolAssignment: function (oEvent) {
			var sPrtAssignmentGuid = this.oAssignmentModel.getProperty("/PrtAssignmentGuid");
			this.clearMessageModel.call(this._oView.getController());
			var oData = {
				oSourceData: {
					sTargetPath: this.AssignmentSourcePath
				}
			}
			this.executeFunctionImport.call(this._oView.getController(), this._oView.getModel(), {
				PrtAssignmentGuid: sPrtAssignmentGuid
			}, "DeleteToolAssignment", "POST", this._mParameters, true).then(function () {
				if (this._mParameters.bFromHome || this._mParameters.bFromDemandTools) {
					this._eventBus.publish("BaseController", "refreshTreeTable", {});
				}
				if (this._mParameters.bFromGanttTools || this._mParameters.bFromNewGantt || this._mParameters.bFromNewGanttSplit) {
					this._eventBus.publish("GanttChart", "refreshDroppedContext", oData);
				}
			}.bind(this));
			this._closeDialog();
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
		 * to getPRT assignment object for update operations
		 * @param oAssignmentData
		 */
		_getDefaultPRTToolsAssignmentModelObject: function (oAssignmentData) {
			return {
				AllowChange: oAssignmentData.PRT_ASSIGNMENT_TYPE === "PRTASGN" ? true : false,
				AllowReassign: oAssignmentData.PRT_ASSIGNMENT_TYPE === "PRTASGN" ? true : false,
				AllowUnassign: true,
				PrtAssignmentGuid: oAssignmentData.Guid,
				DateFrom: formatter.mergeDateTimeWithoutOffSet(oAssignmentData.DateFrom, oAssignmentData.TimeFrom),
				DateTo: formatter.mergeDateTimeWithoutOffSet(oAssignmentData.DateTo, oAssignmentData.TimeTo),
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
		}

	});
});