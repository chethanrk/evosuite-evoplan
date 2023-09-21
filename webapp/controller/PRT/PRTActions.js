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

		/* =========================================================== */
		/* Public methods                                              */
		/* =========================================================== */

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
			this._oViewModel = this._oViewModel ? this._oViewModel : this.getModel('viewModel');
			this.oAppViewModel = this.getModel("appView");

			oDateParams = {
				DateFrom: oTargetObj.StartDate || oTargetObj.DateFrom,
				TimeFrom: oTargetObj.StartTime || oTargetObj.TimeFrom,
				DateTo: oTargetObj.EndDate || oTargetObj.DateTo,
				TimeTo: oTargetObj.EndTime || oTargetObj.TimeTo,
				ResourceGroupGuid: oTargetObj.ResourceGroupGuid,
				ResourceGuid: oTargetObj.ResourceGuid,
				DemandGuid: ""
			}

			if (oTargetObj.OBJECT_SOURCE_TYPE === "DEM_PMNO") { //PRT assignment to notification demand not allowed
				this.showMessageToast(oResourceBundle.getText("ymsg.prtToNotifNA"));
				return;
			} else if (bIsDateNode) {
				/*Code to check Resource availability*/
				if (oTargetObj.IS_AVAILABLE !== "A") {
					this.showMessageToProceedPRT(oTargetObj.Description).then(function (resolve, reject) {
						if (resolve) {
							this._proceedToAssignTools(aSources, oDateParams, mParameters);
						} else {
							return;
						}
					}.bind(this));
				} else {
					this._proceedToAssignTools(aSources, oDateParams, mParameters);
				}

			} else if (sNodeType === "RESOURCE") {
				var bToolAssignDialog = oUserModel.getProperty("/ENABLE_TOOL_ASGN_DIALOG");
				if (oTargetObj.IS_AVAILABLE !== "A") {
					this.showMessageToProceedPRT(oTargetObj.Description).then(function (resolve, reject) {
						if (resolve) {
							this.onPRTAssignmentProceed(this.getView(), oDateParams, aSources, mParameters, bToolAssignDialog, oTargetObj.ResourceGuid);
						} else {
							return;
						}
					}.bind(this));
				} else {
					this.onPRTAssignmentProceed(this.getView(), oDateParams, aSources, mParameters, bToolAssignDialog, oTargetObj.ResourceGuid);
				}

			} else if (sNodeType === "ASSIGNMENT" && !oTargetObj.IS_PRT) {
				oDateParams.DemandGuid = oTargetObj.DemandGuid;
				this._proceedToAssignTools(aSources, oDateParams, mParameters);
			}
		},

		/**
		 * method to open dates fragment for tool assignment
		 * @param oView source view
		 * @param oDateParams required common parameters for all the assignments 
		 * @param aSources Selected tools data and path
		 * @param mParameters flag of source view 
		 */
		openDateSelectionDialog: function (oView, oDateParams, aSources, mParameters, bIsGanttPRTReassign, oAssignmentPaths) {
			// create dialog lazily
			if (!this._oDialog) {
				this.oAppViewModel.setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.PRT.ToolAssignDates",
					controller: this
				}).then(function (oDialog) {
					this.oAppViewModel.setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(oDialog, oView, oDateParams, aSources, mParameters, bIsGanttPRTReassign, oAssignmentPaths);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, oDateParams, aSources, mParameters, bIsGanttPRTReassign, oAssignmentPaths);
			}
		},

		/**
		 * method to store parameters to be passed for function import call
		 * @param oView source view
		 * @param oDateParams required common parameters for all the assignments 
		 * @param aSources Selected tools data and path
		 * @param mParameters flag of source view 
		 */
		onOpen: function (oDialog, oView, oDateParams, aSources, mParameters, bIsGanttPRTReassign, oAssignmentPaths) {
			this._oDateParams = oDateParams;
			this._aSources = aSources;
			this._mParameters = mParameters;
			this._bIsGanttPRTReassign = bIsGanttPRTReassign;
			this._oAssignmentPaths = oAssignmentPaths;
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
		 * method to trigger create/update function import for tool assignment
		 */
		onSaveDialog: function () {
			this._oViewModel = this._oViewModel ? this._oViewModel : this.getModel('viewModel');
			var oStartDate = this._oViewModel.getProperty("/PRT/defaultStartDate"),
				oEndDate = this._oViewModel.getProperty("/PRT/defaultEndDate"),
				sMsg = this.getResourceBundle().getText("ymsg.wrongDates"),
				oPRTAssignmentData,
				oParams;

			if (oStartDate <= oEndDate) {
				if (this._bIsGanttPRTReassign) {
					oPRTAssignmentData = this._oViewModel.getProperty("/PRT/AssignmentData");
					oPRTAssignmentData.DateFrom = oStartDate,
						oPRTAssignmentData.DateTo = oEndDate,
						oPRTAssignmentData.TimeFrom = {
							ms: oStartDate.getTime()
						}
					oPRTAssignmentData.TimeTo = {
						ms: oEndDate.getTime()
					}
					oParams = this._getParams();
					this.executeFunctionImport(this.getModel(), oParams, "ChangeToolAssignment", "POST").then(function () {
						this._oEventBus.publish("GanttChart", "refreshDroppedContext", {
							oSourceData: {
								sTargetPath: this._oAssignmentPaths.sTargetResourcePath,
								sSourcePath: this._oAssignmentPaths.sCurrentResourcePath
							}
						})
					}.bind(this));
				} else if (this._mParameters.hasOwnProperty("bFromGanttToolReassign")) {
					/*	This nested if else condition is used when the Tool is dropped inside the 
						gantt chart to a particular resource.*/
					if (this._mParameters.bFromGanttToolReassign) {
						this._oEventBus.publish("GanttCharController", "onToolReassignGantt", this._mParameters);
					}
				} else {
					this._oDateParams.DateFrom = oStartDate;
					this._oDateParams.TimeFrom.ms = oStartDate.getTime();
					this._oDateParams.DateTo = oEndDate;
					this._oDateParams.TimeTo.ms = oEndDate.getTime();
					this._proceedToAssignTools(this._aSources, this._oDateParams, this._mParameters);
				}
				this.closeDateSelectionDialog();
			} else {
				this.showMessageToast(sMsg);
			}
		},

		/**
		 * Open tools information dialog
		 * @param Current view object
		 * @param Model path of tool assignment
		 * @param Context of tool assignment
		 * @param Local parameters for view refresh
		 * @param Context of demand assignment if tool is under demand assignment
		 */
		openToolsInfoDialog: function (oView, sPath, oContext, mParameters, oDemandContext) {
			if (this.getOwnerComponent()) {
				this.oComponent = this.getOwnerComponent();
			} else {
				this.oComponent = oView.getController().getOwnerComponent();
			}
			this.openToolsDialog(oView, sPath, oContext, mParameters);

		},

		/**
		 * Set annotation parameters for tools information
		 * @param Current view object
		 * @param Model path of tool assignment
		 * @param Context of tool assignment
		 * @param Local parameters for view refresh
		 * @param Context of demand assignment if tool is under demand assignment
		 */
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
				oDialogController: this.oComponent.toolInfoDialog,
				refreshParameters: mParameters
			};
			this.oComponent.DialogTemplateRenderer.open(oView, mParams, this._afterToolsAssignDialogLoad.bind(this), true);
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
			this.clearMessageModel();
			return new Promise(function (resolve, reject) {
				this.executeFunctionImport(this.getModel(), oParams, "ChangeToolAssignment", "POST").then(function (success) {
					resolve(success);
				}.bind(this), function (error) {
					reject(error);
				}.bind(this));
			}.bind(this));
		},
		/** 
		 * get Date n Time Parameteres to pass into Function Import/Date Selection dialog
		 */
		getPRTDateParams: function (oPRTShapeData) {
			var oParams = {},
				iDefNum = this.getModel("viewModel").getProperty("/iDefToolAsgnDays"),
				oStartDate = oPRTShapeData.DateFrom,
				oEndDate = oPRTShapeData.DateTo;

			oParams.DateFrom = oStartDate
			oParams.TimeFrom = {
				ms: oStartDate.getTime()
			};
			oParams.DateTo = oEndDate;
			oParams.TimeTo = {
				ms: oEndDate.getTime()
			};

			this.oViewModel.setProperty("/PRT/defaultStartDate", oStartDate);
			this.oViewModel.setProperty("/PRT/defaultEndDate", oEndDate);
			return oParams;
		},

		/* =========================================================== */
		/* Private methods                                              */
		/* =========================================================== */

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
				mParams = {
					sTargetPath: this.sDropTargetPath
				};
				//Storing Updated Resources Information for Refreshing only the selected resources in Gantt View
				if(!this._mParameters.bFromGanttTools){
					this._updatedDmdResources(this._oViewModel, oDateParams);
				}
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
				this.clearMessageModel();
				aPromise.push(this.executeFunctionImport(this.getModel(), oParams, "CreateToolAssignment", "POST"));
			}
			this.oAppViewModel.setProperty("/busy", true);
			Promise.all(aPromise).then(function (oSuccess) {
				this.oAppViewModel.setProperty("/busy", false);
				this.afterUpdateOperations(mParameters, mParams);
			}.bind(this), function (oError) {
				this.oAppViewModel.setProperty("/busy", false);
				this._resetChanges(this.sDropTargetPath);
			}.bind(this));

		},

		/** 
		 * get Parameteres to pass into Function Import
		 */
		_getParams: function () {
			var oPRTAssignment = this.getModel("viewModel").getProperty("/PRT/AssignmentData");
			return {
				ToolId: oPRTAssignment.TOOL_ID,
				ToolType: oPRTAssignment.TOOL_TYPE,
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
				ResourceGuid: oPRTAssignment.ResourceGuid,
				DemandGuid: oPRTAssignment.DemandGuid ? oPRTAssignment.DemandGuid : ""
			}
		},

		/** 
		 * After tool info dialog open set parametes in dialog for further operations
		 * @param Current dialog object
		 * @param Current view object
		 * @param Model path of tool assignment
		 * @param Event name
		 * @param Response data
		 * @param Refresh parameters
		 */
		_afterToolsAssignDialogLoad: function (oDialog, oView, sPath, sEvent, data, mParams) {
			if (sEvent === "dataReceived") {
				//Fetching Context Data for PlanningCalendar 
				oDialog.setBusy(false);
				this.oComponent.toolInfoDialog.onToolOpen(oDialog, oView, sPath, data, mParams);
			}
		},

		/**
		 * method to open and set dates for tool assignment
		 * @param oView source view
		 * @param oDateParams required common parameters for all the assignments 
		 * @param aSources Selected tools data and path
		 * @param mParameters flag of source view 
		 * @param bToolAssignDialog flag of Assign Dialog 
		 * @param sResourceGuid for Resource GUID
		 */
		onPRTAssignmentProceed: function (oView, oDateParams, aSources, mParameters, bToolAssignDialog, sResourceGuid) {
			if (sResourceGuid) {
				if (bToolAssignDialog) { // If Dialog show config is on 
					this.openDateSelectionDialog(this.getView(), oDateParams, aSources, mParameters);
				} else { // If dialog show config is off
					oDateParams.DateFrom = this._oViewModel.getProperty("/PRT/defaultStartDate");
					oDateParams.TimeFrom.ms = oDateParams.DateFrom.getTime();
					oDateParams.DateTo = this._oViewModel.getProperty("/PRT/defaultEndDate");
					oDateParams.TimeTo.ms = oDateParams.DateTo.getTime();
					this._proceedToAssignTools(aSources, oDateParams, mParameters);
				}
			} else {
				this.showMessageToast(this.getResourceBundle().getText("ymsg.poolPrtNotAllowed"));
				return;
			}
		},
		/**
		 * show simple confirm dialog
		 * when action was pressed (custom or proceed action) then promise resolve is returned
		 * @param {String} sResource
		 * return {Promise}
		 */
		showMessageToProceedPRT: function (sResource) {
			return new Promise(function (resolve, reject) {
				var oResourceBundle = this.getResourceBundle(),
					oComponent = this.getOwnerComponent(),
					oView = this.getView();
				var sAction = oResourceBundle.getText("xbut.proceed"),
					sMsg = oResourceBundle.getText("ymsg.PRTAvailability");
				sap.m.MessageBox.warning(
					sMsg, {
						actions: [sAction, sap.m.MessageBox.Action.CANCEL],
						styleClass: oComponent.getContentDensityClass(),
						onClose: function (sValue) {
							return sValue === sAction ? resolve(true) : resolve(false);
						}
					}
				);
			}.bind(this));
		},
	});
});