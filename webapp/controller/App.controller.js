sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter"
], function (AssignmentsController, JSONModel, formatter) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.App", {

		formatter: formatter,

        _firstTimeG: false,
        _firstTimeD: false,

		onInit: function () {
			var eventBus = sap.ui.getCore().getEventBus();
			
			//Event are subscription Demand assignment and change status of demand
			eventBus.subscribe("AssignTreeDialog", "assignSelectedDemand", this._triggerSaveAssignment, this);
			eventBus.subscribe("StatusSelectDialog", "changeStatusDemand", this._triggerSaveDemandStatus, this);
			eventBus.subscribe("AssignInfoDialog", "updateAssignment", this._triggerUpdateAssign, this);
			eventBus.subscribe("AssignTreeDialog", "bulkReAssignment", this._triggerUpdateAssign, this);
			eventBus.subscribe("AssignInfoDialog", "deleteAssignment", this._triggerDeleteAssign, this);
			eventBus.subscribe("AssignActionsDialog", "bulkDeleteAssignment", this._triggerDeleteAssign, this);
			eventBus.subscribe("PlanningCalendarDialog", "saveAllAssignments", this._triggerSaveAllAssignments, this);

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
			this.getRouter().getRoute("demands").attachPatternMatched(this._onObjectMatched, this);
            this.getRouter().getRoute("gantt").attachPatternMatched(this._onObjectMatched, this);
		},
		
		onAfterRendering : function () {
			this._oMessagePopover = sap.ui.getCore().byId("idMessagePopover");
			this.getView().addDependent(this._oMessagePopover);
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
				oAppViewModel = this.getOwnerComponent().getModel("appView"),
				sCurrentTitle = oAppViewModel.getProperty("/pageTitle");

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
				oRouter.navTo("assetManager", {
					assets: "NA"
				});
				break;
			case oResourceBundle.getText("xbut.pageWeeklyPlanner"):
				//oRouter.navTo("TestFull", {});
				break;
			case oResourceBundle.getText("xbut.pageMessageCockpit"):
				oRouter.navTo("messageCockpit", {});
				break;
			case oResourceBundle.getText("xbut.pageGanttChart"):
				oRouter.navTo("gantt", {});
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
		_onAllRouteMatched: function (oEvent) {
			var oAppViewModel = this.getOwnerComponent().getModel("appView"),
				oParams = oEvent.getParameters();

			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				pageTitle = oResourceBundle.getText("xbut.pageDemands");

			this.getModel("viewModel").setProperty("/ganttSettings/active", false);

			if (oParams.config.pattern.indexOf("AssetPlanning") >= 0) {
				pageTitle = oResourceBundle.getText("xbut.pageAssetManager");
			}else if(oParams.config.pattern.indexOf("MessageCockpit") >= 0){
				pageTitle = oResourceBundle.getText("xbut.pageMessageCockpit");
			}else if(oParams.config.pattern.indexOf("Gantt") >= 0){
				pageTitle = oResourceBundle.getText("xbut.pageGanttChart");
				this.getModel("viewModel").setProperty("/ganttSettings/active", true);
			}
			oAppViewModel.setProperty("/pageTitle", pageTitle);
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
		_onObjectMatched: function (oEvent) {
			var sRoute = oEvent.getParameter("name");
			var eventBus = sap.ui.getCore().getEventBus();
			// if(!this.getModel("viewModel").getProperty("/first_load")){
             //    this.getModel("viewModel").setProperty("/first_load",true);
             //    return;
			// }
			if(sRoute === "gantt"){
                    eventBus.publish("BaseController", "refreshGanttChart", {});
                    eventBus.publish("BaseController", "refreshDemandGanttTable", {});
			}else{
                    eventBus.publish("BaseController", "refreshTreeTable", {});
                    eventBus.publish("BaseController", "refreshDemandTable", {});
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

		_triggerSaveAllAssignments: function (sChanel, sEvent, oData) {
			this.saveAllAssignments(oData);
		},
		/**
		 * open's the message popover by it source
		 * @param oEvent
		 */
		onMessagePopoverPress: function (oEvent) {
			this._oMessagePopover.openBy(oEvent.getSource());
		}

	});

});