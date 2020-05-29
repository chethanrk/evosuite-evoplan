sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/assets/js/moment-with-locales.min",
	"com/evorait/evoplan/controller/ErrorHandler",
	"com/evorait/evoplan/controller/AssignInfoDialog",
	"com/evorait/evoplan/controller/AssignTreeDialog",
	"com/evorait/evoplan/controller/StatusSelectDialog",
	"com/evorait/evoplan/controller/AssignActionsDialog",
	"com/evorait/evoplan/controller/PlanningCalendarDialog",
	"com/evorait/evoplan/controller/CapacitiveAssignments",
	"com/evorait/evoplan/controller/CreateResourceUnAvailability",
	"com/evorait/evoplan/controller/ManageResourceAvailability",
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",
	"sap/m/Link",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/evorait/evoplan/model/Constants"
], function (
	UIComponent,
	Device,
	JSONModel,
	models,
	momentjs,
	ErrorHandler,
	AssignInfoDialog,
	AssignTreeDialog,
	StatusSelectDialog,
	AssignActionsDialog,
	PlanningCalendarDialog,
	CapacitiveAssignments,
	CreateResourceUnAvailability,
	ManageResourceAvailability,
	MessagePopover,
	MessagePopoverItem,
	Link,
	Filter,
	FilterOperator,
	Constants) {

	"use strict";

	return UIComponent.extend("com.evorait.evoplan.Component", {

		metadata: {
			manifest: "json",
			config: {
				fullWidth: true
			}
		},
		
		_appId: "evoplan",

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this function, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function () {

			// initialize the error handler with the component
			this._oErrorHandler = new ErrorHandler(this);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			var oViewModel = new JSONModel({
				treeSet: "ResourceHierarchySet",
				subFilterEntity: "Demand",
				subTableSet: "DemandSet",
				tableBusyDelay: 0,
				persistencyKeyTable: "evoPlan_ui",
				persistencyKeyTree: "evoPlan_resource",
				persistencyKeyDemandTable: "evoPlan_demands",
				counterResourceFilter: "",
				showStatusChangeButton: false,
				busy: true,
				delay: 0,
				assetStartDate: new Date(),
				dragSession: null, // Drag session added as we are keeping dragged data in the model.
				detailPageBreadCrum: "",
				capacityPlanning: false,
				splitterDivider: "35%",
				selectedHierarchyView: "TIMENONE",
				enableReprocess: false,
				first_load: false,
				launchMode:Constants.LAUNCH_MODE.BSP,
				ganttSettings: {
					active: false,
					busy: false,
					shapeOpearation: {
						unassign: false,
						reassign: false,
						change: false
					}
				}
			});
			this.setModel(oViewModel, "viewModel");

			//creates the Information model and sets to the component
			this.setModel(models.createInformationModel(this), "InformationModel");

			this._initDialogs();

			//Creating the Global assignment model for assignInfo Dialog
			this.setModel(models.createAssignmentModel({}), "assignment");
			
			//Creating the Global assignment model for assignInfo Dialog
			this.setModel(models.createNavLinksModel([]), "navLinks");

			this.setModel(models.createMessageCounterModel({
				S: 0,
				E: 0,
				I: 0
			}), "messageCounter");

			//proof if there are a status set and button in footer should be visible
			this._getFunctionSetCount();

			this.setModel(models.createUserModel({
				ASSET_PLANNING_ENABLED: false
			}), "user");

			//Creating the Global message model from MessageManager
			var oMessageModel = new JSONModel();
			oMessageModel.setData([]);
			this.setModel(oMessageModel, "MessageModel");

			//Creating the global for planning calendar
			var oCalendarModel = new JSONModel();
			oCalendarModel.setData({});
			this.setModel(oCalendarModel, "calendarModel");
			// Resource groups model
			this.setModel(new JSONModel([]), "resGroups");

			// Message popover link
			var oLink = new Link({
				text: "{i18n>xtit.showMoreInfo}",
				href: "",
				target: "_blank"
			});

			// Message popover template
			var oMessageTemplate = new MessagePopoverItem({
				type: "{MessageModel>type}",
				title: "{MessageModel>title}",
				description: "{MessageModel>description}",
				subtitle: "{MessageModel>subtitle}",
				counter: "{MessageModel>counter}",
				link: oLink
			});

			//Message Popover
			var oMessagePopover = new MessagePopover({
				items: {
					path: "MessageModel>/",
					template: oMessageTemplate
				}
			});
			this._oMessagePopover = oMessagePopover;


			this._getResourceGroups();

			UIComponent.prototype.init.apply(this, arguments);
			if(sap.ushell && sap.ushell.Container){
				this.getModel("viewModel").setProperty("/launchMode",Constants.LAUNCH_MODE.FIORI);
			}
			var aPromises = [];
			aPromises.push(this._getSystemInformation());
			aPromises.push(this._getData("/NavigationLinksSet",[new Filter("LaunchMode",FilterOperator.EQ, this.getModel("viewModel").getProperty("/launchMode"))]));
            //sets user model - model has to be intantiated before any view is loaded
            Promise.all(aPromises).then(function (data) {
                this.getModel("user").setData(data[0]);
                if(data[1].results.length > 0){
                	this.getModel("navLinks").setData(data[1].results);
                }
                // create the views based on the url/hash
                this.getRouter().initialize();
            }.bind(this));

			// Not able load more than 100 associations
			this.getModel().setSizeLimit(300);

		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ErrorHandler is destroyed.
		 * @public
		 * @override
		 */
		destroy: function () {
			this._oErrorHandler.destroy();
			this.assignInfoDialog.exit();
			this.assignTreeDialog.exit();
			this.assignActionsDialog.exit();
			this.planningCalendarDialog.exit();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
			
			
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (Device.support.touch) { // apply "compact" mode if touch is not supported
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				} else {
					//sapUiSizeCompact
					this._sContentDensityClass = "sapUiSizeCompact";
				}
			}
			return this._sContentDensityClass;
		},

		/**
		 * init different global dialogs with controls
		 * @private
		 */
		_initDialogs: function () {
			//display and change assignment dialog
			this.assignInfoDialog = new AssignInfoDialog();
			this.assignInfoDialog.init();
			//select resource from tree for assigning dialog
			this.assignTreeDialog = new AssignTreeDialog();
			this.assignTreeDialog.init();
			//change status of demand
			this.statusSelectDialog = new StatusSelectDialog();
			this.statusSelectDialog.init();
			// bulk operations for unassign/reassign demands
			this.assignActionsDialog = new AssignActionsDialog();
			this.assignActionsDialog.init();

			this.planningCalendarDialog = new PlanningCalendarDialog();
			this.planningCalendarDialog.init();

			this.capacitiveAssignments = new CapacitiveAssignments();
			this.capacitiveAssignments.init();

			this.createUnAvail = new CreateResourceUnAvailability();
			this.createUnAvail.init();

			this.manageAvail = new ManageResourceAvailability();
			this.manageAvail.init();
		},

		/**
		 * Extract messages from a the MessageModel.
		 *
		 * @Author Rahul
		 * @param {object} oData data of MessageModel
		 * @return
		 * @function
		 * @public
		 */
		createMessages: function () {
			var aMessages = [];
			var iCountError = 0,
				iCountWarning = 0,
				iCountSuccess = 0,
				iCounter = 0,
				iCountInfo = 0;
			var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
			var oData = oMessageModel.getData();
			var oResourceBundle = this.getModel("i18n").getResourceBundle();

			if (oData.length === 0) {
				oMessageModel.setData([]);
				return;
			}

			for (var i = 0; i < oData.length; i++) {
				var item = {};
				if (oData[i].type === "Error") {
					item.title = oResourceBundle.getText("xtit.errorMsg");
					iCountError = iCountError + 1;
					iCounter = iCountError;
				}
				if (oData[i].type === "Warning") {
					item.title = oResourceBundle.getText("xtit.warningMsg");
					iCountWarning = iCountWarning + 1;
					iCounter = iCountWarning;
				}
				if (oData[i].type === "Success") {
					item.title = oResourceBundle.getText("xtit.successMsg");
					iCountSuccess = iCountSuccess + 1;
					iCounter = iCountSuccess;
				}
				if (oData[i].type === "Information") {
					item.title = oResourceBundle.getText("xtit.informationMsg");
					iCountInfo = iCountInfo + 1;
					iCounter = iCountInfo;
				}
				item.type = oData[i].type;
				item.description = oData[i].message;
				item.subtitle = oData[i].message;
				item.counter = iCounter;

				aMessages.push(item);
			}
			this.getModel("MessageModel").setData(aMessages);
			oMessageModel.setData([]);
		},
		/**
		 * Calls the GetSystemInformation 
		 */
		_getSystemInformation: function () {
			return new Promise(function (resolve, reject) {
				this.getModel().callFunction("/GetSystemInformation", {
					method: "GET",
					success: function (oData, oResponse) {
						resolve(oData);
						//Handle Success
						// this.getModel("user").setData(oData);
						// console.log(oData);
					}.bind(this),
					error: function (oError) {
						//Handle Error
						reject(oError);
					}.bind(this)
				});
			}.bind(this));
		},
		/**
		 * Calls the GetSystemInformation 
		 */
		_getData: function (sUri, aFilters) {
			return new Promise(function (resolve, reject) {
				this.getModel().read(sUri, {
				filters:aFilters,
				success: function (oData, oResponse) {
					resolve(oData);
				}.bind(this),
				error: function (oError) {
					//Handle Error
					reject(oError);
				}.bind(this)
			});
			}.bind(this));
		},
		/**
		 * gets the Count of Demand functions configured
		 */
		_getFunctionSetCount: function () {
			this.getModel().read("/DemandFunctionsSet/$count", {
				success: function (oData, oResponse) {
					if (oData && oData > 0) {
						this.getModel("viewModel").setProperty("/showStatusChangeButton", true);
					}
				}.bind(this),
				error: function (oError) {
					//Handle Error
				}.bind(this)
			});
		},

		_getResourceGroups: function () {
			this.getModel().read("/ResourceSet", {
				filters: [
					new Filter("ObjectType", FilterOperator.EQ, "RES_GROUP")
				],
				success: function (oData, oResponse) {
					if (oData && oData.results.length > 0) {
						this.getModel("resGroups").setData(oData.results);
					}
				}.bind(this),
				error: function (oError) {
					//Handle Error
				}.bind(this)
			});
		}
	});
});