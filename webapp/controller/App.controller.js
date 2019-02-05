sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter"
], function (BaseController, JSONModel, formatter) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.App", {

		formatter: formatter,

		onInit: function () {
			var eventBus = sap.ui.getCore().getEventBus();
			//Event are subscription Demand assignment and change status of demand
			eventBus.subscribe("AssignTreeDialog", "assignSelectedDemand", this._triggerSaveAssignment, this);
			eventBus.subscribe("StatusSelectDialog", "changeStatusDemand", this._triggerSaveDemandStatus, this);
			eventBus.subscribe("AssignInfoDialog", "updateAssignment", this._triggerUpdateAssign, this);
			eventBus.subscribe("AssignTreeDialog", "bulkReAssignment", this._triggerUpdateAssign, this);
			eventBus.subscribe("AssignInfoDialog", "deleteAssignment", this._triggerDeleteAssign, this);
			eventBus.subscribe("AssignActionsDialog", "bulkDeleteAssignment", this._triggerDeleteAssign, this);

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
			oRouter.attachRouteMatched(this._onRouteMatched, this);
		},

		/**
		 * on select menu item navigate to the page and change header title
		 * @param oEvent Button press event
		 */
		onSelectMenuButton: function (oEvent) {
			var oItem = oEvent.getParameter("item"),
				sItemText = oItem.getText(),
				oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				oRouter = this.getOwnerComponent().getRouter(),
				oAppViewModel = this.getOwnerComponent().getModel("appView");

			oAppViewModel.setProperty("/pageTitle", sItemText);
			oAppViewModel.setProperty("/busy", true);

			switch (sItemText) {
			case oResourceBundle.getText("xbut.pageDemands"):
				oRouter.navTo("demands", {});
				break;
			case oResourceBundle.getText("xbut.pageAssetManager"):
				oRouter.navTo("assetManager", {
					assets: "NA"
				});
				break;
			case oResourceBundle.getText("xbut.pageWeeklyPlanner"):
				//oRouter.navTo("TestFull", {});
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
				this._infoDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.InformationPopover", this);
				this.getView().addDependent(this._infoDialog);
			}
			this._infoDialog.open();
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
		_onRouteMatched: function (oEvent) {
			var oAppViewModel = this.getOwnerComponent().getModel("appView"),
				oParams = oEvent.getParameters();

			if (!this.hasLoaded) {
				this.hasLoaded = true;
				var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
					pageTitle = oResourceBundle.getText("xbut.pageDemands");
				if (oParams.config.pattern.indexOf("AssetPlanning") >= 0) {
					pageTitle = oResourceBundle.getText("xbut.pageAssetManager");
				}
				oAppViewModel.setProperty("/pageTitle", pageTitle);
			}
			oAppViewModel.setProperty("/busy", false);
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
					this.assignedDemands(oData.selectedPaths, oData.assignPath);
				} else {
					this.showMessageToProceed(oData.selectedPaths, oData.assignPath);
				}
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
				this.updateFunctionDemand(oData.selectedPaths, oData.functionKey);
			}
		},
		/**
		 * Registering the event when resized the splitter
		 */
		onResize: function () {
			var eventBus = sap.ui.getCore().getEventBus();
			eventBus.publish("App", "RegisterDrop", {});
			eventBus.publish("App", "RegisterDrag", {});
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
				this.updateAssignment(oData.isReassign);
			} else if (sEvent === "bulkReAssignment") {
				if (!this.isAssignable({
						sPath: oData.sPath
					})) {
					return;
				}
				if (this.isAvailable(oData.sPath)) {
					this.bulkReAssignment(oData.sPath, oData.aContexts);
				} else {
					this.showMessageToProceed(null, oData.sPath, true, oData.aContexts);
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
				this.deleteAssignment(oData.sId);
			} else if (sEvent === "bulkDeleteAssignment") {
				this.bulkDeleteAssignment(oData.aContexts);
			}
		}

	});

});