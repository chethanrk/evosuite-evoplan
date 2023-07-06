sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants"

], function (AssignmentsController, JSONModel, Fragment, formatter, Constants) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.App", {

		formatter: formatter,

		_firstTimeG: false,
		_firstTimeD: false,

		onInit: function () {
			this._eventBus = sap.ui.getCore().getEventBus();

			//Event are subscription Demand assignment and change status of demand
			this._eventBus.subscribe("AssignTreeDialog", "assignSelectedDemand", this._triggerSaveAssignment, this);
			this._eventBus.subscribe("StatusSelectDialog", "changeStatusDemand", this._triggerSaveDemandStatus, this);
			this._eventBus.subscribe("AssignInfoDialog", "updateAssignment", this._triggerUpdateAssign, this);
			this._eventBus.subscribe("AssignTreeDialog", "bulkReAssignment", this._triggerUpdateAssign, this);
			this._eventBus.subscribe("AssignInfoDialog", "deleteAssignment", this._triggerDeleteAssign, this);
			this._eventBus.subscribe("AssignActionsDialog", "bulkDeleteAssignment", this._triggerDeleteAssign, this);
			this._eventBus.subscribe("PlanningCalendarDialog", "saveAllAssignments", this._triggerSaveAllAssignments, this);

			this._eventBus.subscribe("AssignInfoDialog", "deleteSplitAssignments", this._triggerDeleteSplitAssignments, this);

			var oViewModel,
				fnSetAppNotBusy,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay(),
				oRouter = this.getOwnerComponent().getRouter();

			oViewModel = new JSONModel({
				busy: true,
				delay: 0

			});
			this.getOwnerComponent().setModel(oViewModel, "appView");

			fnSetAppNotBusy = function () {
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};

			this.getOwnerComponent().getModel().metadataLoaded()
				.then(fnSetAppNotBusy);

			// apply content density mode to root view
			this._oAppControl = this.byId("approvalApp");
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

			//set init page title
			oRouter.attachRouteMatched(this._onAllRouteMatched, this);
		},

		onAfterRendering: function () {
			this._oMessagePopover = this.getOwnerComponent()._oMessagePopover;
			this.getView().addDependent(this._oMessagePopover);
		},

		/**
		 * on select menu item navigate to the page and change header title
		 * @param oEvent Button press event
		 */
		onSelectMenuButton: function (oEvent) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				oViewModel = this.getModel("viewModel"),
				oModel = this.getModel(),
				bDemandEditMode = oViewModel.getProperty("/bDemandEditMode");

			this.oItem = oEvent.getParameter("item");

			if (bDemandEditMode && oModel.hasPendingChanges()) {
				this.showDemandEditModeWarningMessage().then(function (bResponse) {
					var sDiscard = oResourceBundle.getText("xbut.discard&Nav"),
						sSave = oResourceBundle.getText("xbut.buttonSave");

					if (bResponse === sDiscard) {
						oModel.resetChanges();
						oViewModel.setProperty("/bDemandEditMode", false);
						this.handleMenuButtonPress(null, this.oItem);
					} else
					if (bResponse === sSave) {
						oViewModel.setProperty("/bDemandEditMode", false);
						this.submitDemandTableChanges();
					}
				}.bind(this));

			} else {
				if (bDemandEditMode) {
					oViewModel.setProperty("/bDemandEditMode", false);
				}
				this.handleMenuButtonPress(oEvent);
			}

		},

		handleMenuButtonPress: function (oEvent, oItem) {
			oItem = oItem ? oItem : oEvent.getParameter("item");
			var sItemText = oItem.getText(),
				oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				oRouter = this.getOwnerComponent().getRouter(),
				oAppViewModel = this.getOwnerComponent().getModel("appView"),
				sCurrentTitle = oAppViewModel.getProperty("/pageTitle"),
				oViewModel = this.getModel("viewModel"),
				sLaunchMode = oViewModel.getProperty("/launchMode"),
				sSemanticObject = null,
				sRoute;

			if (sap.ushell && sap.ushell.Container) {
				var oUrlParser = sap.ushell.Container.getService("URLParsing");
			}
			if (sLaunchMode === Constants.LAUNCH_MODE.FIORI) {
				sSemanticObject = oUrlParser.getShellHash(window.location);
				sRoute = "#" + sSemanticObject + "&/SplitPage/SplitDemands";
			} else {
				sRoute = "#SplitPage/SplitDemands";
			}

			if (sCurrentTitle === sItemText) {
				return;
			}
			oAppViewModel.setProperty("/pageTitle", sItemText);
			oAppViewModel.setProperty("/busy", true);

			switch (sItemText) {
			case oResourceBundle.getText("xbut.pageDemands"):
				oRouter.navTo("demands", {});
				break;
			case oResourceBundle.getText("xbut.pageAssetManager"):
				if (this._routeValidation("ENABLE_ASSET_PLANNING")) {
					oRouter.navTo("assetManager", {
						assets: "NA"
					});
					break;
				}
				oRouter.navTo("empty", {});
				break;

			case oResourceBundle.getText("xbut.pageWeeklyPlanner"):
				break;
			case oResourceBundle.getText("xbut.pageMessageCockpit"):
				if (this._routeValidation("ENABLE_EMP")) {
					oRouter.navTo("messageCockpit", {});
					break;
				}
				oRouter.navTo("empty", {});
				break;
			case oResourceBundle.getText("xbut.pageNewGanttChartSplit"):
				if (this._routeValidation("ENABLE_GANTT_SPLIT_JSON")) {
					oRouter.navTo("newGanttSplit", {});
					window.open(sRoute, "_blank");
					break;
				}
				oRouter.navTo("empty", {});
				break;
			case oResourceBundle.getText("xbut.pageMap"):
				if (this._routeValidation("ENABLE_MAPS")) {
					oRouter.navTo("map", {});
					break;
				}
				oRouter.navTo("empty", {});
				break;
			case oResourceBundle.getText("xbut.manageResources"):
				if (this._routeValidation("ENABLE_MANAGERESOURCE")) {
					oRouter.navTo("manageResources", {});
					break;
				}
				oRouter.navTo("empty", {});
				break;
			case oResourceBundle.getText("xbut.pageNewGantt"):
				if (this._routeValidation("ENABLE_GANTT_JSON")) {
					oRouter.navTo("newgantt", {});
					break;
				}
				oRouter.navTo("empty", {});
				break;
			default:
				oRouter.navTo("demands", {});
				oAppViewModel.setProperty("/pageTitle", oResourceBundle.getText("xbut.pageDemands"));
				oAppViewModel.setProperty("/busy", false);
				break;
			}

		},

		/**
		 * Initialize and open the Information dialog with necessary details
		 * @Author Rahul
		 * @param oEvent Button press event
		 */
		onIconPress: function (oEvent) {
			// create popover
			if (!this._infoDialog) {
				this.getOwnerComponent().getModel("appView").setProperty("/busy", true);
				Fragment.load({
					id: "InfoDialog",
					name: "com.evorait.evoplan.view.common.fragments.InformationPopover",
					controller: this
				}).then(function (oDialog) {
					this.getOwnerComponent().getModel("appView").setProperty("/busy", false);
					this._infoDialog = oDialog;
					this.open(oDialog);
				}.bind(this));
			} else {
				this.open(this._infoDialog);
			}
		},

		open: function (oDialog) {
			var oView = this.getView();
			oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			oView.addDependent(oDialog);
			oDialog.open();
		},

		/**
		 * Closes the information dialog
		 * @Author Rahul
		 */
		onCloseDialog: function () {
			this._infoDialog.close();
		},

		/**
		 * on route change hide busy loader
		 * set on first load the age title
		 * @param sEvent
		 */
		_onAllRouteMatched: function (oEvent) {
			var oAppViewModel = this.getOwnerComponent().getModel("appView"),
				oParams = oEvent.getParameters(),
				oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				pageTitle = oResourceBundle.getText("xbut.pageDemands");

			this.getModel("viewModel").setProperty("/ganttSettings/active", false);
			//buffer refresh visible for other views
			oAppViewModel.setProperty("/bBufferRefreshVisible", true);

			if (oParams.config.pattern.startsWith("AssetPlanning")) {
				pageTitle = oResourceBundle.getText("xbut.pageAssetManager");
			} else if (oParams.config.pattern.startsWith("MessageCockpit")) {
				//buffer refresh hidden for message cockpit
				oAppViewModel.setProperty("/bBufferRefreshVisible", false);
				pageTitle = oResourceBundle.getText("xbut.pageMessageCockpit");
			} else if (oParams.config.pattern.startsWith("SplitPage")) {
				pageTitle = oResourceBundle.getText("xbut.pageNewGanttChartSplit");
				this.getModel("viewModel").setProperty("/ganttSettings/active", true);
				if (oParams.name === "newGanttSplit") {
					pageTitle = oResourceBundle.getText("xbut.pageNewGanttChartSplit");
				}
			} else if (oParams.config.pattern.startsWith("Map")) {
				pageTitle = oResourceBundle.getText("xbut.pageMap");
			} else if (oParams.config.pattern.startsWith("ManageResources")) {
				pageTitle = oResourceBundle.getText("xbut.manageResources");
			} else if (oParams.config.pattern.startsWith("NewGantt") || oParams.config.pattern.startsWith("Gantt/Demand") || oParams.config.pattern
				.startsWith("GanttTools")) {
				pageTitle = oResourceBundle.getText("xbut.pageNewGantt");
			}
			oAppViewModel.setProperty("/pageTitle", pageTitle);
			oAppViewModel.setProperty("/currentRoute", oParams.name);
			oAppViewModel.setProperty("/busy", false);

			this._onObjectMatched(oParams.name);
		},

		/**
		 * catch event from dialog for save demand assignment
		 * @param sChanel
		 * @param sEvent
		 * @param oData
		 * @private
		 */
		_triggerSaveAssignment: function (sChanel, sEvent, oData) {
			if (sEvent === "assignSelectedDemand") {
				if (!this.isAssignable({
						sPath: oData.assignPath
					})) {
					return;
				}
				if (this.isAvailable(oData.assignPath)) {
					this.assignedDemands(oData.selectedPaths, oData.assignPath, oData.parameters);
				} else {
					this.showMessageToProceed(oData.selectedPaths, oData.assignPath, false, false, false, false, oData.parameters);
				}
			}
		},
		/** 
		 * Refresh's the resource tree and demand table
		 * When any changes done in gantt or demand view should reflect in other
		 * view when user navigates it.
		 * @constructor 
		 */
		_onObjectMatched: function (sRoute) {
			if (this.getOwnerComponent().bIsFromPRTSwitch) {
				this.getOwnerComponent().bIsFromPRTSwitch = false;
				return;
			}
			if (sRoute === "gantt") {
				this._eventBus.publish("BaseController", "refreshGanttChart", {});
				this._eventBus.publish("BaseController", "refreshDemandGanttTable", {});
			} else if (sRoute === "newgantt") {
				this._eventBus.publish("BaseController", "refreshDemandGanttTable", {});
			} else if (sRoute === "ganttSplit") {
				this._eventBus.publish("BaseController", "refreshGanttChart", {});
			} else if (sRoute === "splitDemands") {
				this._eventBus.publish("BaseController", "refreshDemandGanttTable", {});
			} else if (sRoute === "DemandDetail") {
				/* No action require */
			} else if (sRoute === "map") {
				this._eventBus.publish("BaseController", "refreshMapTreeTable", {});
				this._eventBus.publish("BaseController", "refreshMapView", {});
				this._eventBus.publish("BaseController", "resetSchedulingJson", {});
			} else if (this.getOwnerComponent().bIsFromPRTSwitch && (sRoute === "demands" || sRoute === "demandTools")) {
				this.getOwnerComponent().bIsFromPRTSwitch = false;
			} else {
				this._eventBus.publish("BaseController", "refreshTreeTable", {});
				this._eventBus.publish("BaseController", "refreshDemandTable", {});
				this._eventBus.publish("BaseController", "resetSchedulingJson", {});
			}

		},
		/**
		 * catch event from dialog for saving demand status change
		 *
		 * @param sChanel
		 * @param sEvent
		 * @param oData
		 * @private
		 */
		_triggerSaveDemandStatus: function (sChanel, sEvent, oData) {
			if (sEvent === "changeStatusDemand") {
				this.updateFunctionDemand(oData.selectedPaths, oData.functionKey, oData.parameters);
			}
		},
		/**
		 * Event to trigger Update Assignment
		 *
		 * @param sChanel
		 * @param sEvent
		 * @param oData
		 * @private
		 */
		_triggerUpdateAssign: function (sChanel, sEvent, oData) {
			if (sEvent === "updateAssignment") {
				this.updateAssignment(oData.isReassign, oData.parameters);
			} else if (sEvent === "bulkReAssignment") {
				if (!this.isAssignable({
						sPath: oData.sPath
					})) {
					return;
				}
				if (this.isAvailable(oData.sPath)) {
					this.bulkReAssignment(oData.sPath, oData.aContexts, oData.parameters);
				} else {
					this.showMessageToProceed(null, oData.sPath, true, oData.aContexts, false, false, oData.parameters);
				}
			}
		},
		/**
		 * Event which triggers delete assignment
		 *
		 * @param sChanel
		 * @param sEvent
		 * @param oData
		 * @private
		 */
		_triggerDeleteAssign: function (sChanel, sEvent, oData) {
			if (sEvent === "deleteAssignment") {
				this.deleteAssignment(oData.sId, oData.parameters);
			} else if (sEvent === "bulkDeleteAssignment") {
				this.bulkDeleteAssignment(oData.aContexts, oData.parameters);
			}
		},

		/**
		 * Triggers the unassign for split assignments 
		 * 
		 * @param {string} sChanel 
		 * @param {string} sEvent 
		 * @param {object} oData 
		 */
		_triggerDeleteSplitAssignments: function (sChanel, sEvent, oData) {
			if (sEvent === "deleteSplitAssignments") {
				// ask for user confirmation that related splits of the selected assignment will also be unassigned
				this.deleteSplitsUserConfirm(oData).catch(this._catchError.bind(this))
					.then(this.deleteSplitAssignments.bind(this)).catch(this._catchError.bind(this));
			}
		},

		_triggerSaveAllAssignments: function (sChanel, sEvent, oData) {
			this.saveAllAssignments(oData);
		},
		/**
		 * open's the message popover by it source
		 * @param oEvent
		 */
		onMessagePopoverPress: function (oEvent) {
			this._oMessagePopover.openBy(oEvent.getSource());
		},
		/**
		 * calls function import which refreshes the shared memory in the backend 
		 */
		onRefreshBuffer: function (oEvent) {
			var oComponent = this.getOwnerComponent(),
				oSelectedRoute = this.getView().byId("idHeaderMenu").getText(),
				oResourceBundleText = this.getOwnerComponent().getModel("i18n").getResourceBundle();

			this.executeFunctionImport(this.getModel(), {}, "RefreshSharedMemoryAreas", "POST").then(function () {
				if (oSelectedRoute === oResourceBundleText.getText("xbut.pageDemands")) {
					oComponent._getResourceGroups.call(oComponent);
					if (this.getModel('viewModel').getProperty("/PRT/btnSelectedKey") === "demands") {
						this._eventBus.publish("BaseController", "refreshDemandTable", {});
					} else {
						this._eventBus.publish("BaseController", "refreshToolsTable", {});
					}

					this._eventBus.publish("BaseController", "refreshBufferTreeTable", {});
				} else if (oSelectedRoute === oResourceBundleText.getText("xbut.pageGanttChart")) {
					this._eventBus.publish("BaseController", "refreshDemandGanttTable", {});
					this._eventBus.publish("BaseController", "refreshGanttChart", {});
				} else if (oSelectedRoute === oResourceBundleText.getText("xbut.pageAssetManager")) {
					this._eventBus.publish("BaseController", "refreshAssetCal", {});
					this._eventBus.publish("BaseController", "refreshAssets", {});
				} else if (oSelectedRoute === oResourceBundleText.getText("xbut.pageMessageCockpit")) {} else if (oSelectedRoute ===
					oResourceBundleText.getText("xbut.pageGanttChartSplit")) {
					this._eventBus.publish("BaseController", "refreshDemandTable", {});
					this._eventBus.publish("BaseController", "refreshTreeTable", {});
				} else if (oSelectedRoute === oResourceBundleText.getText("xbut.pageMap")) {
					oComponent._getResourceGroups.call(oComponent);
					this._eventBus.publish("BaseController", "refreshMapView", {});
					this._eventBus.publish("BaseController", "refreshMapTreeTable", {});
					this._eventBus.publish("BaseController", "refreshMapDemandTable", {});
				} else if (oSelectedRoute === oResourceBundleText.getText("xbut.manageResources")) {
					this._eventBus.publish("ManageResourcesController", "refreshManageResourcesView", {});
				} else if (oSelectedRoute === oResourceBundleText.getText("xbut.pageNewGantt")) {
					this._eventBus.publish("BaseController", "refreshDemandGanttTable", {});
					this._eventBus.publish("BaseController", "refreshFullGantt", {});
				}
			}.bind(this), function (data) {}.bind(this)).catch(function (data) {}.bind(this));
		},
		_routeValidation: function (parameter) {
			var oUserModel = this.getModel("user");
			return oUserModel.getProperty("/" + parameter);
		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf com.evorait.evoplan.view.Assets
		 */
		onExit: function () {
			this._eventBus.unsubscribe("AssignTreeDialog", "assignSelectedDemand", this._triggerSaveAssignment, this);
			this._eventBus.unsubscribe("StatusSelectDialog", "changeStatusDemand", this._triggerSaveDemandStatus, this);
			this._eventBus.unsubscribe("AssignInfoDialog", "updateAssignment", this._triggerUpdateAssign, this);
			this._eventBus.unsubscribe("AssignTreeDialog", "bulkReAssignment", this._triggerUpdateAssign, this);
			this._eventBus.unsubscribe("AssignInfoDialog", "deleteAssignment", this._triggerDeleteAssign, this);
			this._eventBus.unsubscribe("AssignActionsDialog", "bulkDeleteAssignment", this._triggerDeleteAssign, this);
			this._eventBus.unsubscribe("PlanningCalendarDialog", "saveAllAssignments", this._triggerSaveAllAssignments, this);
			this._eventBus.subscribe("AssignInfoDialog", "deleteSplitAssignments", this._triggerDeleteSplitAssignments, this);
		},

		/**
		 * Since 2205
		 * Links to navigate to EvoOrderRelate and EvoResource app
		 * @param oEvent
		 */
		linkToOtherApp: function (oEvent) {
			var sUri,
				sText = oEvent.getSource().getText(),
				oResourceBundleText = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				sLaunchMode = this.getModel("viewModel").getProperty("/launchMode"),
				sServicePath = "https://" + this.getModel("user").getProperty("/ServerPath"),
				aNavLinks = this.getModel("navLinks").getData(),
				aSelectedLinkData,
				sSemanticObj,
				sAction;

			aSelectedLinkData = aNavLinks.filter(function (item) {
				return item.ApplicationName === sText;
			});
			//Logic for Navigation in BSP application
			if (sLaunchMode === Constants.LAUNCH_MODE.BSP) {
				sUri = sServicePath + aSelectedLinkData[0].Value1;
				window.open(sUri, "_blank");
			} else if (sLaunchMode === Constants.LAUNCH_MODE.FIORI) {
				sSemanticObj = aSelectedLinkData[0].Value1.split("\\\\_\\\\")[0];
				sAction = aSelectedLinkData[0].Value1.split("\\\\_\\\\")[1];
				this.navToApp(sSemanticObj, sAction, "", "");
			}
		}
	});

});