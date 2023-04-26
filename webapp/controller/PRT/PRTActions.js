sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/m/MessageToast"
], function (BaseController, MessageBox, formatter, Constants, Fragment, OverrideExecution, MessageToast) {

	return BaseController.extend("com.evorait.evoplan.controller.PRT.PRTOperations", {

		/**
		 * validations before tools assignment service call
		 * @param aSources Selected tools data and path
		 * @param sTargetPath Target Resource/Demand 
		 * @param mParameters flag of source view 
		 */
		checksBeforeAssignTools: function (aSources, oTargetObj, mParameters, sTargetPath) {
			var oDateParams,
				sNodeType = oTargetObj.NodeType,
				bIsDateNode = sNodeType === "TIMEWEEK" || sNodeType === "TIMEDAY" || sNodeType === "TIMEMONTH" || sNodeType === "TIMEQUART" ||
				sNodeType ===
				"TIMEYEAR",
				oUserModel = this.getModel("user"),
				oResourceBundle = this.getResourceBundle();
			this.sDropTargetPath = sTargetPath;
			if (!this._oViewModel) {
				this._oViewModel = this.getModel("viewModel");
			}

			oDateParams = {
				DateFrom: "",
				TimeFrom: {},
				DateTo: "",
				TimeTo: {},
				ResourceGroupGuid: oTargetObj.ResourceGroupGuid,
				ResourceGuid: oTargetObj.ResourceGuid,
				DemandGuid: ""
			}

			if (bIsDateNode) {
				oDateParams.DateFrom = oTargetObj.StartDate;
				oDateParams.TimeFrom = oTargetObj.StartTime;
				oDateParams.DateTo = oTargetObj.EndDate;
				oDateParams.TimeTo = oTargetObj.EndTime;
				this._proceedToAssignTools(aSources, oDateParams, mParameters);

			} else if (sNodeType === "RESOURCE") {
				if (oTargetObj.ResourceGuid) {
					if (oUserModel.getProperty("/ENABLE_TOOL_ASGN_DIALOG")) { // If Dialog show config is on 
						this.openDateSelectionDialog(this.getView(), oDateParams, aSources, mParameters);
					} else { // If dialog show config is off
						oDateParams.DateFrom = this._oViewModel.getProperty("/PRT/defaultStartDate");
						oDateParams.TimeFrom.ms = oDateParams.DateFrom.getTime();
						oDateParams.DateTo = this._oViewModel.getProperty("/PRT/defaultEndDate");
						oDateParams.TimeTo.ms = oDateParams.DateTo.getTime();
						this._proceedToAssignTools(aSources, oDateParams, mParameters);
					}
				} else {
					this.showMessageToast(oResourceBundle.getText("ymsg.poolPrtNotAllowed"));
					return;
				}

			} else if (sNodeType === "ASSIGNMENT" && !oTargetObj.IS_PRT) {
				oDateParams.DateFrom = oTargetObj.StartDate;
				oDateParams.TimeFrom = oTargetObj.StartTime;
				oDateParams.DateTo = oTargetObj.EndDate;
				oDateParams.TimeTo = oTargetObj.EndTime;
				oDateParams.DemandGuid = oTargetObj.DemandGuid;
				this._proceedToAssignTools(aSources, oDateParams, mParameters);
			}
		},

		/**
		 * method to call assignment service
		 * @param aSources Selected tools data and path
		 * @param oDateParams required common parameters for all the assignments 
		 * @param mParameters flag of source view 
		 */
		_proceedToAssignTools: function (aSources, oDateParams, mParameters) {
			var oParams,
				bIsLast,
				aPromise = [],
				oAppViewModel = this.getModel("appView"),
				mParams = {
					sTargetPath: this.sDropTargetPath
				};
			for (var i = 0; i < aSources.length; i++) {
				oParams = {
					DateFrom: oDateParams.DateFrom,
					TimeFrom: oDateParams.TimeFrom,
					DateTo: oDateParams.DateTo,
					TimeTo: oDateParams.TimeTo,
					ResourceGroupGuid: oDateParams.ResourceGroupGuid,
					ResourceGuid: oDateParams.ResourceGuid,
					DemandGuid: oDateParams.DemandGuid
				};
				oParams.ToolId = aSources[i].oData.TOOL_ID;
				oParams.ToolType = aSources[i].oData.TOOL_TYPE;
				if (parseInt(i, 10) === aSources.length - 1) {
					bIsLast = true;
				}
				aPromise.push(this.executeFunctionImport(this.getModel(), oParams, "CreateToolAssignment", "POST"));
			}
			oAppViewModel.setProperty("/busy", true);
			Promise.all(aPromise).then(function (oSuccess) {
				oAppViewModel.setProperty("/busy", false);
				this.afterUpdateOperations(mParameters, mParams);
			}.bind(this), function (oError) {
				oAppViewModel.setProperty("/busy", false);
				this._resetChanges(this.sDropTargetPath);
			}.bind(this));

		},

		/**
		 * method to open dates fragment for tool assignment
		 * @param oView source view
		 * @param oDateParams required common parameters for all the assignments 
		 * @param aSources Selected tools data and path
		 * @param mParameters flag of source view 
		 */
		openDateSelectionDialog: function (oView, oDateParams, aSources, mParameters) {
			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.PRT.ToolAssignDates",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(oDialog, oView, oDateParams, aSources, mParameters);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, oDateParams, aSources, mParameters);
			}
		},

		/**
		 * method to store parameters to be passed for function import call
		 * @param oView source view
		 * @param oDateParams required common parameters for all the assignments 
		 * @param aSources Selected tools data and path
		 * @param mParameters flag of source view 
		 */
		onOpen: function (oDialog, oView, oDateParams, aSources, mParameters) {
			this._oDateParams = oDateParams;
			this._aSources = aSources;
			this._mParameters = mParameters;
			oView.addDependent(oDialog);
			oDialog.open();
		},

		/**
		 * close dialog from XML view
		 */
		closeDateSelectionDialog: function () {
			this._oDialog.close();
		},

		/**
		 * method to trigger function import for tool assignment
		 */
		onSaveDialog: function () {
			var oStartDate = this._oViewModel.getProperty("/PRT/defaultStartDate"),
				oEndDate = this._oViewModel.getProperty("/PRT/defaultEndDate"),
				sMsg = this.getResourceBundle().getText("ymsg.datesInvalid");

			if (oStartDate <= oEndDate) {
				this._oDateParams.DateFrom = oStartDate;
				this._oDateParams.TimeFrom.ms = oStartDate.getTime();
				this._oDateParams.DateTo = oEndDate;
				this._oDateParams.TimeTo.ms = oEndDate.getTime();
				this._proceedToAssignTools(this._aSources, this._oDateParams, this._mParameters);
				this.closeDateSelectionDialog();
			} else {
				this.showMessageToast(sMsg);
			}
		},
		openToolsInfoDialog: function (oView, sPath, oContext, mParameters, oDemandContext) {
			if (this.getOwnerComponent()) {
				this.oComponent = this.getOwnerComponent();
			} else {
				this.oComponent = oView.getController().getOwnerComponent();
			}
			this.openToolsDialog(oView, sPath, oContext, mParameters);

		},
		openToolsDialog: function (oView, sPath, oContext, mParameters, sObjectSourceType) {
			var sQualifier = Constants.ANNOTATION_CONSTANTS.PRT_TOOLS_ASSIGN_DIALOG;
			var mParams = {
				viewName: "com.evorait.evoplan.view.templates.ToolInfoDialog#" + sQualifier,
				annotationPath: "com.sap.vocabularies.UI.v1.Facets#" + sQualifier,
				entitySet: "AssignmentSet",
				controllerName: "PRT.ToolsAssignInfo",
				title: "xtit.toolsAssignInfoModalTitle",
				type: "add",
				smartTable: null,
				sPath: sPath,
				sDeepPath: null,
				parentContext: oContext,
				oDialogController: this.oComponent.assignInfoDialog,
				refreshParameters: mParameters
			};
			this.oComponent.DialogTemplateRenderer.open(oView, mParams, this._afterToolsAssignDialogLoad.bind(this));
		},
		_afterToolsAssignDialogLoad: function (oDialog, oView, sPath, sEvent, data, mParams) {
			if (sEvent === "dataReceived") {
				//Fetching Context Data for PlanningCalendar 
				oDialog.setBusy(false);
				this.oComponent.assignInfoDialog.onToolOpen(oDialog, oView, sPath, data, mParams.refreshParameters);
			}
		},

		/**
		 * Check whether tool exists under demand assignment and ask for user confirmation befire deleting assignment
		 */
		checkToolExists: function (aContexts) {
			var bToolExists = false,
				oAsgnData;
			for (var i in aContexts) {
				if (aContexts[i].AssignmentGUID) {
					oAsgnData = this.getModel().getProperty("/AssignmentSet('" + aContexts[i].AssignmentGUID + "')");
				} else {
					oAsgnData = this.getModel().getProperty(aContexts[i].getPath());
				}
				if (oAsgnData.PRT_ASSIGNMENT_EXISTS) {
					bToolExists = true;
					break;
				}
			}
			return new Promise(function (resolve, reject) {
				if (bToolExists) {
					this._showConfirmMessageBox(this.getResourceBundle().getText("ymsg.confirmAssignmentDelete")).then(function (response) {
						if (sap.m.MessageBox.Action.YES === response) {
							resolve(bToolExists);
						}
					}.bind(this));
				} else {
					resolve(bToolExists);
				}
			}.bind(this));

		},
		/**
		 * method to call assignment service
		 * @param aSources Selected tools data and path
		 * @param oDateParams required common parameters for all the assignments 
		 * @param mParameters flag of source view 
		 */
		onChangeTools: function (aSources, oDateParams, mParameters) {
			var oParams;
			oParams = this._getParams();
			this._mParameters.bIsFromPRTAssignmentInfo = true;
			return new Promise(function (resolve, reject) {
				this.executeFunctionImport(this.getModel(), oParams, "ChangeToolAssignment", "POST").then(function (success) {
					resolve(success);
				}.bind(this), function (error) {
					reject(error);
				}.bind(this));
			}.bind(this));
		},
		/** 
		 * get Parameteres to pass into Function Import
		 */
		_getParams: function () {
			var oPRTAssignment = this.getModel("viewModel").getProperty("/PRT/AssignmentData");
			return {
				ToolId: oPRTAssignment.TOOL_ID,
				PrtAssignmentGuid: oPRTAssignment.Guid,
				DateFrom: oPRTAssignment.DateFrom,
				DateTo: oPRTAssignment.DateTo,
				TimeFrom: {
					ms: oPRTAssignment.DateFrom.getTime()
				},
				TimeTo: {
					ms: oPRTAssignment.DateTo.getTime()
				},
				ResourceGroupGuid: oPRTAssignment.ResourceGroupGuid,
				ResourceGuid: oPRTAssignment.ResourceGuid
			}
		},
	});
});