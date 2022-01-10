sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/assets/js/moment-with-locales.min",
	"com/evorait/evoplan/controller/ErrorHandler",
	"com/evorait/evoplan/controller/common/AssignInfoDialog",
	"com/evorait/evoplan/controller/common/AssignTreeDialog",
	"com/evorait/evoplan/controller/common/StatusSelectDialog",
	"com/evorait/evoplan/controller/common/AssignActionsDialog",
	"com/evorait/evoplan/controller/common/PlanningCalendarDialog",
	"com/evorait/evoplan/controller/common/CapacitiveAssignments",
	"com/evorait/evoplan/controller/common/CreateResourceUnAvailability",
	"com/evorait/evoplan/controller/common/ManageResourceAvailability",
	"com/evorait/evoplan/controller/common/NavigationActionSheet",
	"com/evorait/evoplan/controller/qualifications/ResourceQualifications",
	"com/evorait/evoplan/controller/qualifications/QualificationCheck",
	"com/evorait/evoplan/controller/qualifications/DemandQualifications",
	"com/evorait/evoplan/controller/common/AssignmentList",
	"com/evorait/evoplan/controller/common/MaterialInfoDialog",
	"com/evorait/evoplan/controller/common/FixedAppointmentsList",
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",
	"sap/m/Link",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/evorait/evoplan/model/Constants",
	"com/evorait/evoplan/controller/WebSocket",
	"com/evorait/evoplan/controller/gantt/GanttResourceFilter",
	"com/evorait/evoplan/controller/gantt/GanttActions",
	"com/evorait/evoplan/controller/DialogTemplateRenderController",
	"com/evorait/evoplan/controller/common/OperationTimeCheck",
	"com/evorait/evoplan/controller/gantt/GanttResourceTreeFilter",
	"com/evorait/evoplan/controller/common/VendorAssignment",
	"com/evorait/evoplan/controller/common/LongTextPopover",
	"com/evorait/evoplan/controller/common/NetworkAssignment"
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
	NavigationActionSheet,
	ResourceQualifications,
	QualificationCheck,
	DemandQualifications,
	AssignmentList,
	MaterialInfoDialog,
	FixedAppointmentsList,
	MessagePopover,
	MessagePopoverItem,
	Link,
	Filter,
	FilterOperator,
	Constants,
	WebSocket,
	GanttResourceFilter,
	GanttActions, DialogTemplateRenderController,
	OperationTimeCheck,
	GanttResourceTreeFilter,
	VendorAssignment,
	LongTextPopover,
	NetworkAssignment) {

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
				ganttTreeSet: "GanttResourceHierarchySet",
				subFilterEntity: "Demand",
				subTableSet: "DemandSet",
				tableBusyDelay: 0,
				persistencyKeyTable: "evoPlan_ui",
				persistencyKeyTree: "evoPlan_resource",
				persistencyKeyDemandTable: "evoPlan_demands",
				persistencyKeyGanttDemandFilter: "evoPlan_GanttResourceFilter",
				counterResourceFilter: "",
				showStatusChangeButton: false,
				busy: true,
				delay: 0,
				assetStartDate: new Date(),
				dragSession: null, // Drag session added as we are keeping dragged data in the model.
				gantDragSession: null, // Drag session from Gantt View added as we are keeping dragged data in the model.
				detailPageBreadCrum: "",
				capacityPlanning: false,
				splitterDivider: "30%",
				ganttSelectionPane: "28%",
				showUtilization: false,
				selectedHierarchyView: "TIMENONE",
				enableReprocess: false,
				launchMode: Constants.LAUNCH_MODE.BSP,
				DefaultDemandStatus: "",
				ganttSettings: {
					active: false,
					shapeOperation: {
						unassign: false,
						reassign: false,
						change: false
					}
				},
				showDemands: true,
				mapSettings: {
					busy: false,
					filters: [],
					selectedDemands: [],
					routeData: [],
					checkedDemands: [],
					assignedDemands: [],
					bRouteDateSelected: false
				},
				resourceFilterforRightTechnician: false,
				CheckRightTechnician: false,
				WarningMsgResourceTree: false,
				resourceQualification: {
					AssignBtnVisible: false,
					AssignBtnEnable: false,
					FindResourceBtnVisible: false,
					FindResourceBtnEnable: false
				},
				manageResourcesSettings: {
					selectedRow: false,
					operationType: "",
					Assignments: {},
					removedIndices: [],
					draggedItemContext: []
				},
				densityClass: this.getContentDensityClass(),
				isOpetationLongTextPressed: false,
				oResponseMessages: [],
				aFixedAppointmentsList: {}

			});
			this.setModel(oViewModel, "viewModel");

			//creates the Information model and sets to the component
			this.setModel(models.createInformationModel(this), "InformationModel");

			this._initDialogs();

			//Creating the Global assignment model for assignInfo Dialog
			this.setModel(models.createAssignmentModel({}), "assignment");

			//Creating the Global assignment model for assignInfo Dialog
			this.setModel(models.createNavLinksModel([]), "navLinks");

			//Creating the Global assignment model for assignInfo Dialog
			this.setModel(models.createMapConfigModel([]), "mapConfig");

			this.setModel(models.createMessageCounterModel({
				S: 0,
				E: 0,
				I: 0
			}), "messageCounter");

			//proof if there are a status set and button in footer should be visible
			this._getFunctionSetCount();

			this.setModel(models.createUserModel({
				ENABLE_ASSET_PLANNING: false
			}), "user");

			//Creating the Global message model from MessageManager
			var oMessageModel = new JSONModel();
			oMessageModel.setData([]);
			this.setModel(oMessageModel, "MessageModel");

			//Creating the global for planning calendar
			var oCalendarModel = new JSONModel();
			oCalendarModel.setSizeLimit(9999999999);
			oCalendarModel.setData({});
			this.setModel(oCalendarModel, "calendarModel");
			// Resource groups model
			this.setModel(new JSONModel([]), "resGroups");

			//Cost Element Model for Vendor Assignment
			var oCostElementModel = new JSONModel();
			oCostElementModel.setSizeLimit(9999999999);
			oCostElementModel.setData({});
			this.setModel(oCostElementModel, "oCostElementModel");

			//Currency Model for Vendor Assignment
			var oCurrencyModel = new JSONModel();
			oCurrencyModel.setSizeLimit(9999999999);
			oCurrencyModel.setData({});
			this.setModel(oCurrencyModel, "oCurrencyModel");

			//Creating Model for Availability Group in Gantt
			this.setModel(new JSONModel({
				timeAllocation: [],
				manageAbsence: []
			}), "availabilityGroup");

			this.setModel(models.createHelperModel({
				navLinks: {}
			}), "templateProperties");

			this.setModel(models.createHelperModel({
				data: {
					children: []
				},
				pendingChanges: {}
			}, true), "ganttModel");
			this.setModel(models.createHelperModel({
				data: {
					children: []
				}
			}, false), "ganttOriginalData");

			this.DialogTemplateRenderer = new DialogTemplateRenderController(this);

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
			if (sap.ushell && sap.ushell.Container) {
				this.getModel("viewModel").setProperty("/launchMode", Constants.LAUNCH_MODE.FIORI);
			}
			var aPromises = [];
			aPromises.push(this._getSystemInformation());
			aPromises.push(this._getData("/NavigationLinksSet", [new Filter("LaunchMode", FilterOperator.EQ, this.getModel("viewModel").getProperty(
					"/launchMode")),
				new Filter("LaunchMode", FilterOperator.EQ, "ITS")
			]));

			aPromises.push(this._getData("/MapProviderSet", [], {
				$expand: "MapSource"
			}));

			//Fetching Cost Element F4 for Vendor Assignment
			aPromises.push(this._getData("/ShCostelementSet", [], {}));

			//Fetching Currency F4 for Vendor Assignment
			aPromises.push(this._getData("/ShCurrencySet", [], {}));

			//sets user model - model has to be intantiated before any view is loaded
			Promise.all(aPromises).then(function (data) {
				this.getModel("user").setData(data[0]);
				if (data[1].results.length > 0) {
					this.getModel("navLinks").setData(data[1].results);
				}
				if (data[2].results.length > 0) {
					this.getModel("mapConfig").setData(data[2].results[0]);
				}
				if (data[3].results.length > 0) {
					this.getModel("oCostElementModel").setData(data[3].results);
				}
				if (data[4].results.length > 0) {
					this.getModel("oCurrencyModel").setData(data[4].results);
				}
				// Initialize websocket
				if (data[0].ENABLE_PUSH_DEMAND) {
					WebSocket.init(this);
				}

				// create the views based on the url/hash
				this.getRouter().initialize();
			}.bind(this));

			//lodating Avalability type for Time Allocation in Gantt
			this._getAvailabilityGroup("L");

			//loading Availability type for Manage Absence in Gantt
			this._getAvailabilityGroup("N");

			// Not able load more than 100 associations
			this.getModel().setSizeLimit(600);

			this._setApp2AppLinks();

		},

		/**
		 * read app2app navigation links from backend
		 */
		_setApp2AppLinks: function () {
			if (sap.ushell && sap.ushell.Container) {
				this.getModel("viewModel").setProperty("/launchMode", Constants.LAUNCH_MODE.FIORI);
			}
			var oFilter = new Filter("LaunchMode", FilterOperator.EQ, this.getModel("viewModel").getProperty("/launchMode")),
				mProps = {};

			this.oTemplatePropsProm = new Promise(function (resolve) {
				this._getData("/NavigationLinksSet", [oFilter])
					.then(function (data) {
						data.results.forEach(function (oItem) {
							if (oItem.Value1 && Constants.APPLICATION[oItem.ApplicationId]) {
								if (Constants.PROPERTY || oItem.Value2 !== "") {
									oItem.Property = oItem.Value2 || Constants.PROPERTY[oItem.ApplicationId];
									mProps[oItem.Property] = oItem;
								}
							}
						}.bind(this));
						this.getModel("templateProperties").setProperty("/navLinks/", mProps);
						resolve(mProps);
					}.bind(this));
			}.bind(this));
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
			this.ResourceQualifications.exit();
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
				} else if (Device.system.desktop && Device.support.touch) { // apply "compact" mode if touch is not supported
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCompact";
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

			this.NavigationActionSheet = new NavigationActionSheet();
			this.NavigationActionSheet.init();

			this.ResourceQualifications = new ResourceQualifications();
			this.ResourceQualifications.init();

			this.QualificationCheck = new QualificationCheck();
			this.QualificationCheck.init();

			this.DemandQualifications = new DemandQualifications();
			this.DemandQualifications.init();

			this.assignmentList = new AssignmentList();
			this.assignmentList.init();

			this.materialInfoDialog = new MaterialInfoDialog();
			this.materialInfoDialog.init();

			this.FixedAppointmentsList = new FixedAppointmentsList();

			this.GanttResourceFilter = new GanttResourceFilter();

			this.GanttResourceTreeFilter = new GanttResourceTreeFilter();

			this.OperationTimeCheck = new OperationTimeCheck();
			this.OperationTimeCheck.init();

			this.VendorAssignment = new VendorAssignment();
			this.VendorAssignment.init();

			this.longTextPopover = new LongTextPopover();
			this.longTextPopover.init();
			
			this.NetworkAssignment = new NetworkAssignment();
			this.NetworkAssignment.init();

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
			var aMessages = JSON.parse(JSON.stringify(this.getModel("MessageModel").getData()));
			var iCountError = 0,
				iCountWarning = 0,
				iCountSuccess = 0,
				iCounter = 0,
				iCountInfo = 0;
			var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
			var oData = oMessageModel.getData();
			var oResourceBundle = this.getModel("i18n").getResourceBundle();

			if (oData.length === 0) {
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

				if (!JSON.stringify(aMessages).includes(JSON.stringify(item))) {
					aMessages.push(item);
				}

			}
			this.getModel("MessageModel").setData(aMessages);
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
					},
					error: function (oError) {
						//Handle Error
						reject(oError);
					}
				});
			}.bind(this));
		},
		/**
		 * Calls the GetSystemInformation 
		 */
		_getData: function (sUri, aFilters, mParameters) {
			return new Promise(function (resolve, reject) {
				this.getModel().read(sUri, {
					filters: aFilters,
					urlParameters: mParameters,
					success: function (oData, oResponse) {
						resolve(oData);
					},
					error: function (oError) {
						//Handle Error
						reject(oError);
					}
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
				}
			});
		},
		/**
		 * Get All resource groups
		 * @private
		 */
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
				}
			});
		},
		/**
		 * Get AvailabilityType for Time Allocation
		 * @private
		 */
		_getAvailabilityGroup: function (sAvailabilityTypeGroup) {
			this.getModel().read("/AvailabilityTypeSet", {
				filters: [
					new Filter("AvailabilityTypeGroup", FilterOperator.EQ, sAvailabilityTypeGroup)
				],
				success: function (oData, oResponse) {
					if (oData && oData.results.length > 0) {
						if (sAvailabilityTypeGroup === "L") {
							this.getModel("availabilityGroup").setProperty("/timeAllocation", oData.results);
						} else {
							this.getModel("availabilityGroup").setProperty("/manageAbsence", oData.results);
						}
					}
				}.bind(this),
				error: function (oError) {
					//Handle Error
				}
			});
		},

		/**
		 *  Read call given entityset and filters
		 */
		readData: function (sUri, aFilters, mUrlParams) {
			return new Promise(function (resolve, reject) {
				this.getModel().read(sUri, {
					filters: aFilters,
					urlParameters: mUrlParams || {},
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
		 * get url GET parameter by key name
		 */
		getLinkParameterByName: function (sKey) {
			var oComponentData = this.getComponentData();
			//Fiori Launchpad startup parameters
			if (oComponentData) {
				var oStartupParams = oComponentData.startupParameters;
				if (oStartupParams[sKey] && (oStartupParams[sKey].length > 0)) {
					return oStartupParams[sKey][0];
				}
			} else {
				var queryString = window.location.search,
					urlParams = new URLSearchParams(queryString);
				if (urlParams.has(sKey)) {
					return urlParams.get(sKey);
				}
			}
			return false;
		}
	});
});