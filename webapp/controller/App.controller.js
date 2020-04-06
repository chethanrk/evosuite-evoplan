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
			this._eventBus = sap.ui.getCore().getEventBus();
			
			//Event are subscription Demand assignment and change status of demand
			this._eventBus.subscribe("AssignTreeDialog", "assignSelectedDemand", this._triggerSaveAssignment, this);
			this._eventBus.subscribe("StatusSelectDialog", "changeStatusDemand", this._triggerSaveDemandStatus, this);
			this._eventBus.subscribe("AssignInfoDialog", "updateAssignment", this._triggerUpdateAssign, this);
			this._eventBus.subscribe("AssignTreeDialog", "bulkReAssignment", this._triggerUpdateAssign, this);
			this._eventBus.subscribe("AssignInfoDialog", "deleteAssignment", this._triggerDeleteAssign, this);
			this._eventBus.subscribe("AssignActionsDialog", "bulkDeleteAssignment", this._triggerDeleteAssign, this);
			this._eventBus.subscribe("PlanningCalendarDialog", "saveAllAssignments", this._triggerSaveAllAssignments, this);

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
		
		onAfterRendering : function () {
			this._oMessagePopover = this.getOwnerComponent()._oMessagePopover;
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
			case oResourceBundle.getText("xbut.pageGanttChartSplit"):
				oRouter.navTo("ganttSplit", {});
				window.open("#SplitPage/SplitDemands", "_blank");
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

			if (oParams.config.pattern.startsWith("AssetPlanning")) {
				pageTitle = oResourceBundle.getText("xbut.pageAssetManager");
			}else if(oParams.config.pattern.startsWith("MessageCockpit")){
				pageTitle = oResourceBundle.getText("xbut.pageMessageCockpit");
			}else if(oParams.config.pattern.startsWith("Gantt")){
				pageTitle = oResourceBundle.getText("xbut.pageGanttChart");
				this.getModel("viewModel").setProperty("/ganttSettings/active", true);
			}else if(oParams.config.pattern.startsWith("SplitPage")){
				pageTitle = oResourceBundle.getText("xbut.pageGanttChartSplit");
				this.getModel("viewModel").setProperty("/ganttSettings/active", true);
			}
			oAppViewModel.setProperty("/pageTitle", pageTitle);
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
			if(sRoute === "gantt"){
                    this._eventBus.publish("BaseController", "refreshGanttChart", {});
                    this._eventBus.publish("BaseController", "refreshDemandGanttTable", {});
			}else if(sRoute === "ganttSplit"){
					this._eventBus.publish("BaseController", "refreshGanttChart", {});
			}else if(sRoute === "splitDemands"){
					this._eventBus.publish("BaseController", "refreshDemandGanttTable", {});
			}else{
                    this._eventBus.publish("BaseController", "refreshTreeTable", {});
                    this._eventBus.publish("BaseController", "refreshDemandTable", {});
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
			this._eventBus.publish("App", "RegisterDrop", {});
			this._eventBus.publish("App", "RegisterDrag", {});
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
		},
		/**
		 * calls function import which refreshes the shared memory in the backend 
		 */
		onRefreshBuffer: function(oEvent){
			var oComponent = this.getOwnerComponent();
			
			this.executeFunctionImport(this.getModel(),{},"RefreshSharedMemoryAreas","POST").then(function(){
				oComponent._getResourceGroups.call(oComponent);
				this._eventBus.publish("BaseController", "refreshDemandTable",{});
				this._eventBus.publish("BaseController", "refreshTreeTable",{});
				this._eventBus.publish("BaseController", "refreshAssetCal",{});
				this._eventBus.publish("BaseController", "refreshAssets",{});
				this._eventBus.publish("BaseController", "refreshGanttChart", {});
				this._eventBus.publish("BaseController", "refreshDemandGanttTable", {});
			}.bind(this),function(data){
				//
			}.bind(this)).catch(function(data){
				//
			}.bind(this));
		},
		
		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf com.evorait.evoplan.view.Assets
		 */
		onExit: function() {
			this._eventBus.unsubscribe("AssignTreeDialog", "assignSelectedDemand", this._triggerSaveAssignment, this);
			this._eventBus.unsubscribe("StatusSelectDialog", "changeStatusDemand", this._triggerSaveDemandStatus, this);
			this._eventBus.unsubscribe("AssignInfoDialog", "updateAssignment", this._triggerUpdateAssign, this);
			this._eventBus.unsubscribe("AssignTreeDialog", "bulkReAssignment", this._triggerUpdateAssign, this);
			this._eventBus.unsubscribe("AssignInfoDialog", "deleteAssignment", this._triggerDeleteAssign, this);
			this._eventBus.unsubscribe("AssignActionsDialog", "bulkDeleteAssignment", this._triggerDeleteAssign, this);
			this._eventBus.unsubscribe("PlanningCalendarDialog", "saveAllAssignments", this._triggerSaveAllAssignments, this);
		}
	});

});