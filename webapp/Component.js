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
	"com/evorait/evoplan/controller/FilterSettingsDialog",
	"com/evorait/evoplan/controller/PlanningCalendarDialog",
	"com/evorait/evoplan/controller/CapacitiveAssignments",
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",
	"sap/m/Link"
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
	FilterSettingsDialog,
	PlanningCalendarDialog,
	CapacitiveAssignments,
	MessagePopover,
	MessagePopoverItem,
	Link) {

	"use strict";

	return UIComponent.extend("com.evorait.evoplan.Component", {

		metadata: {
			manifest: "json",
			config: {
				fullWidth: true
			}
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this function, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function () {
			// // call the base component's init function
			// UIComponent.prototype.init.apply(this, arguments);

			//Required third-party libraries for drag and drop functionality
			//which loaded here in component to make available throughout the application
			$.sap.require("sap.ui.thirdparty.jqueryui.jquery-ui-core");
			$.sap.require("sap.ui.thirdparty.jqueryui.jquery-ui-widget");
			$.sap.require("sap.ui.thirdparty.jqueryui.jquery-ui-mouse");
			$.sap.require("sap.ui.thirdparty.jqueryui.jquery-ui-draggable");
			$.sap.require("sap.ui.thirdparty.jqueryui.jquery-ui-sortable");
			$.sap.require("sap.ui.thirdparty.jqueryui.jquery-ui-droppable");
			sap.ui.localResources("sapui5draganddrop");

			// handle the main oData model based on the environment
			// the path for mobile applications depends on the current information from
			// the logon plugin - if it's not running as hybrid application then the initialization
			// of the oData service happens by the entries in the manifest.json which is used
			// as metadata reference

			// initialize the error handler with the component
			this._oErrorHandler = new ErrorHandler(this);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

            var oViewModel = new JSONModel({
                treeSet: "ResourceHierarchySet",
                subFilterEntity: "Demand",
                subTableSet: "DemandSet",
                tableBusyDelay : 0,
                persistencyKeyTable: "evoPlan_ui",
                persistencyKeyTree: "evoPlan_resource",
                persistencyKeyDemandTable:"evoPlan_demands",
                counterResourceFilter: "",
                showStatusChangeButton: false,
                busy : true,
				delay : 0,
				assetStartDate:new Date(),
                dragSession:null, // Drag session added as we are keeping dragged data in the model.
                detailPageBreadCrum:"",
                capacityPlanning:false,
                splitterDivider:"35%",
                selectedHierarchyView:"TIMENONE",
                enableReprocess:false,
				ganttSettings: {
                	active: false,
					shapeOpearation:{
                		unassign:false,
						reassign:false,
						change:false
					}
				}
            });
            this.setModel(oViewModel, "viewModel");
            
            //creates the Information model and sets to the component
			this.setModel(models.createInformationModel(this),"InformationModel");


			this._initDialogs();

            //Creating the Global assignment model for assignInfo Dialog
			this.setModel(models.createAssignmentModel({}),"assignment");
			
			this.setModel(models.createMessageCounterModel({S:0,E:0,I:0}),"messageCounter");

			//proof if there are a status set and button in footer should be visible
			this._getFunctionSetCount();

            this.setModel(models.createUserModel({
				ASSET_PLANNING_ENABLED: false,
				GANT_START_DATE:moment().startOf("year").subtract(2, "years").toDate(),
				GANT_END_DATE:moment().endOf("year").add(5, "years").toDate()}), "user");

			//Creating the Global message model from MessageManager
			var oMessageModel = new JSONModel();
			oMessageModel.setData([]);
			this.setModel(oMessageModel, "MessageModel");

			//Creating the global for planning calendar
			var oCalendarModel = new JSONModel();
			oCalendarModel.setData({});
			this.setModel(oCalendarModel, "calendarModel");



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
			var oMessagePopover = new MessagePopover("idMessagePopover", {
				items: {
					path: "MessageModel>/",
					template: oMessageTemplate
				}
			});
			this._oMessagePopover = oMessagePopover;

            //sets user model
            this._getSystemInformation();

            UIComponent.prototype.init.apply(this, arguments);

            // create the views based on the url/hash
            this.getRouter().initialize();
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ErrorHandler is destroyed.
		 * @public
		 * @override
		 */
		destroy: function () {
			this._oErrorHandler.destroy();
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
			//resource tree filter settings dialog
			this.filterSettingsDialog = new FilterSettingsDialog();
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

		_getSystemInformation: function () {
			this.getModel().callFunction("/GetSystemInformation", {
				method: "GET",
				success: function (oData, oResponse) {
					//Handle Success
                    this.getModel("user").setData(oData);
                    var oViewModel = this.getModel("viewModel");

                    oViewModel.setProperty("/ganttSettings/visibleStartTime", moment().startOf("isoWeek").subtract(1,"weeks").toDate()); 	// start of month
                    oViewModel.setProperty("/ganttSettings/visibleEndTime", moment().endOf("isoWeek").add(4,"weeks").toDate());
				}.bind(this),
				error: function (oError) {
					//Handle Error
				}.bind(this)
			});
		},

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
		}
	});
});