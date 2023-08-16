sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/assets/js/moment-with-locales.min",
	"com/evorait/evoplan/controller/ErrorHandler",
	"com/evorait/evoplan/controller/PRT/ToolInfoDialog",
	"com/evorait/evoplan/controller/common/AssignInfoDialog",
	"com/evorait/evoplan/controller/common/AssignTreeDialog",
	"com/evorait/evoplan/controller/common/StatusSelectDialog",
	"com/evorait/evoplan/controller/common/AssignActionsDialog",
	"com/evorait/evoplan/controller/common/PlanningCalendarDialog",
	"com/evorait/evoplan/controller/common/CapacitiveAssignments",
	"com/evorait/evoplan/controller/common/CreateResourceUnAvailability",
	"com/evorait/evoplan/controller/common/NavigationActionSheet",
	"com/evorait/evoplan/controller/qualifications/ResourceQualifications",
	"com/evorait/evoplan/controller/qualifications/QualificationCheck",
	"com/evorait/evoplan/controller/qualifications/DemandQualifications",
	"com/evorait/evoplan/controller/common/AssignmentList",
	"com/evorait/evoplan/controller/common/MaterialInfoDialog",
	"com/evorait/evoplan/controller/common/FixedAppointmentsList",
	"com/evorait/evoplan/controller/scheduling/SchedulingDialog",
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
	"com/evorait/evoplan/controller/common/VendorAssignment",
	"com/evorait/evoplan/controller/common/LongTextPopover",
	"com/evorait/evoplan/controller/common/NetworkAssignment",
	"com/evorait/evoplan/controller/common/AssignmentStatus",
	"com/evorait/evoplan/controller/gantt/GanttAssignmentPopOver",
	"com/evorait/evoplan/controller/map/SingleDayPlanner",
	"com/evorait/evoplan/controller/common/ResourceAvailabilities",
	"com/evorait/evoplan/controller/common/TimeAllocations"
], function (
	UIComponent,
	Device,
	JSONModel,
	models,
	momentjs,
	ErrorHandler,
	ToolInfoDialog,
	AssignInfoDialog,
	AssignTreeDialog,
	StatusSelectDialog,
	AssignActionsDialog,
	PlanningCalendarDialog,
	CapacitiveAssignments,
	CreateResourceUnAvailability,
	NavigationActionSheet,
	ResourceQualifications,
	QualificationCheck,
	DemandQualifications,
	AssignmentList,
	MaterialInfoDialog,
	FixedAppointmentsList,
	SchedulingDialog,
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
	VendorAssignment,
	LongTextPopover,
	NetworkAssignment,
	AssignmentStatus,
	GanttAssignmentPopOver,
	SingleDayPlanner,
	ResourceAvailabilities,
	TimeAllocations) {

	"use strict";

	return UIComponent.extend("com.evorait.evoplan.Component", {

		metadata: {
			manifest: "json",
			config: {
				fullWidth: true
			}
		},
		_appId: "evoplan",
		MapProvider: null,
		SchedulingMapProvider: null,
		_pMapProviderLoaded: null,
		_pMapProviderLoadedForScheduling: null,
		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this function, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function () {
			// initialize the error handler with the component
			this._oErrorHandler = new ErrorHandler(this);

			//Initializing all the global models
			this._createDataModels();

			//Initialzing Dialogs
			this._initDialogs();

			//proof if there are a status set and button in footer should be visible
			this._getFunctionSetCount();

			this.DialogTemplateRenderer = new DialogTemplateRenderController(this);

			//Message Popover Initialzation
			this._createMessagePopover();

			//Fetching Resource Groups
			this._getResourceGroups();

			UIComponent.prototype.init.apply(this, arguments);
			if (sap.ushell && sap.ushell.Container) {
				this.getModel("viewModel").setProperty("/launchMode", Constants.LAUNCH_MODE.FIORI);
			}

			//Initial Batch Calls
			this._prepareInitialData();

			// Not able load more than 100 associations
			this.getModel().setSizeLimit(600);

			this._setApp2AppLinks();
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
		 *  Read call given entityset and filters
		 */
		readData: function (sUri, aFilters, mUrlParams, sGroupId) {
			return new Promise(function (resolve, reject) {
				this.getModel().read(sUri, {
					filters: aFilters,
					groupId: sGroupId || "",
					urlParameters: mUrlParams || {},
					groupId: sGroupId || "",
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
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				var element = document.getElementsByTagName("body")[0];
				if (element.classList.contains("sapUiSizeCozy") || element.classList.contains("sapUiSizeCompact")) {
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
		},

		/**
		 * Instatiate and initialize map provider object. 
		 * Type of the instance depends on configuration provided by backend: oMapConfigModel.getProperty("/name")
		 */
		initializeMapProvider: function () {
			// dependency injection for MapProvider
			var oMapConfigModel = this.getModel("mapConfig");
			var sProviderJSModuleName = Constants.MAP.JS_PROVIDERS_PATH + oMapConfigModel.getProperty("/name");
			this._pMapProviderLoaded = new Promise(function (resolve, reject) {
				sap.ui.require([sProviderJSModuleName], function (cMapProvider) {
					this.MapProvider = new cMapProvider(this, oMapConfigModel);
					resolve();
				}.bind(this));
			}.bind(this));
		},

		/**
		 * Instatiate and initialize map provider object for Scheduling. 
		 * Type of the instance depends on configuration provided by backend: oMapConfigModel.getProperty("/name")
		 */
		initializeSchedulingMapProvider: function () {
			// dependency injection for MapProvider
			var oMapConfigModel = this.getModel("mapConfig");
			var sProviderJSModuleName = Constants.MAP.SCHEDULING_JS_PROVIDERS_PATH + oMapConfigModel.getProperty("/name");
			this._pMapProviderLoadedForScheduling = new Promise(function (resolve, reject) {
				sap.ui.require([sProviderJSModuleName], function (cMapProvider) {
					this.SchedulingMapProvider = new cMapProvider(this, oMapConfigModel);
					resolve();
				}.bind(this));
			}.bind(this));
		},

		/* =========================================================== */
		/* Private methods                                              */
		/* =========================================================== */
		/**
		 * init different global dialogs with controls
		 * @private
		 */
		_initDialogs: function () {
			//display and change assignment dialog
			this.assignInfoDialog = new AssignInfoDialog();
			this.assignInfoDialog.init();

			//display and change tools dialog
			this.toolInfoDialog = new ToolInfoDialog();
			this.toolInfoDialog.init();

			//display and change auto scheduling and re-scheduling dialog
			this.SchedulingDialog = new SchedulingDialog(this);
			this.SchedulingDialog.init();

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

			this.OperationTimeCheck = new OperationTimeCheck();
			this.OperationTimeCheck.init();

			this.VendorAssignment = new VendorAssignment();
			this.VendorAssignment.init();

			this.longTextPopover = new LongTextPopover();
			this.longTextPopover.init();

			this.NetworkAssignment = new NetworkAssignment();
			this.NetworkAssignment.init();

			this.AssignmentStatus = new AssignmentStatus();
			this.AssignmentStatus.init();

			this.GanttAssignmentPopOver = new GanttAssignmentPopOver();
			this.GanttAssignmentPopOver.init();

			this.singleDayPlanner = new SingleDayPlanner();
			this.singleDayPlanner.init();

			this.ResourceAvailabilities = new ResourceAvailabilities();
			this.ResourceAvailabilities.init();

			this.TimeAllocations = new TimeAllocations();
			this.TimeAllocations.init();

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
		 * Handle SAP authorization
		 */
		_handleAuthorization: function () {
			var bPMAuth = this.getModel("user").getProperty("/ENABLE_PM_AUTH_CHECK"),
				bIW31Auth = this.getModel("user").getProperty("/ENABLE_IW31_AUTH_CHECK"),
				bIW32Auth = this.getModel("user").getProperty("/ENABLE_IW32_AUTH_CHECK");
			if (bPMAuth) {
				this.getModel("viewModel").setProperty("/validateIW31Auth", Boolean(bIW31Auth));
				this.getModel("viewModel").setProperty("/validateIW32Auth", Boolean(bIW32Auth));
			}
		},

		/**
		 * Initail Batch Get Call with Promises for fetching
		 * GetSystemInformation, NavigationLinks and other services
		 */
		_prepareInitialData: function () {
			var aPromises = [];
			aPromises.push(this._getSystemInformation());
			aPromises.push(this._getData("/NavigationLinksSet", [new Filter("LaunchMode", FilterOperator.EQ, this.getModel("viewModel").getProperty(
				"/launchMode")),
			new Filter("LaunchMode", FilterOperator.EQ, "ITS")
			]));

			aPromises.push(this._getData("/MapProviderSet", [], {
				$expand: ["MapSource", "MapServiceLinks"]
			}));

			//Fetching Cost Element F4 for Vendor Assignment
			aPromises.push(this._getData("/ShCostelementSet", [], {}));

			//Fetching Currency F4 for Vendor Assignment
			aPromises.push(this._getData("/ShCurrencySet", [], {}));

			//lodaing Avalability type for Time Allocation in Gantt
			aPromises.push(this._getData("/SHAvailabilityTypeSet", [
				new Filter("AVAILABILITY_TYPE_GROUP", FilterOperator.EQ, "L")
			]));

			//loading Availability type for Manage Absence in Gantt
			aPromises.push(this._getData("/SHAvailabilityTypeSet", [
				new Filter("AVAILABILITY_TYPE_GROUP", FilterOperator.EQ, "N")
			]));

			//sets user model - model has to be intantiated before any view is loaded
			Promise.all(aPromises).then(function (data) {
				this.getModel("user").setData(data[0]);
				if (data[1].results.length > 0) {
					this.getModel("navLinks").setData(data[1].results);
				}
				if (data[2].results.length > 0) {
					this.getModel("mapConfig").setData(data[2].results[0]);
					this.initializeMapProvider();
					this.initializeSchedulingMapProvider();
				}
				if (data[3].results.length > 0) {
					this.getModel("oCostElementModel").setData(data[3].results);
				}
				if (data[4].results.length > 0) {
					this.getModel("oCurrencyModel").setData(data[4].results);
				}

				//lodaing Avalability type data for Time Allocation in Gantt
				this.getModel("availabilityGroup").setProperty("/timeAllocation", data[5].results);

				//loading Availability type data for Manage Absence in Gantt
				this.getModel("availabilityGroup").setProperty("/manageAbsence", data[6].results);

				// Initialize websocket
				if (data[0].ENABLE_PUSH_DEMAND) {
					WebSocket.init(this);
				}

				//Intialize variables for SAP authorization
				this._handleAuthorization();
				// below we are calling function import RefreshSharedMemoryAreas
				this.getModel().callFunction("/RefreshSharedMemoryAreas", {
					method: "POST",
					success: function () {
						// create the views based on the url/hash
						this.getRouter().initialize();
					}.bind(this)
				})



			}.bind(this));
		},

		/**
		 * Function to declare all the global models and it's properties
		 */
		_createDataModels: function () {
			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			var oViewModel = new JSONModel({
				subFilterEntity: "Demand",
				tableBusyDelay: 0,
				counterResourceFilter: "",
				showStatusChangeButton: false,
				busy: true,
				delay: 0,
				assetStartDate: new Date(),
				dragSession: null, // Drag session added as we are keeping dragged data in the model.
				gantDragSession: null, // Drag session from Gantt View added as we are keeping dragged data in the model.
				detailPageBreadCrum: "",
				capacityPlanning: false,
				remainingWork: false,
				dragDropSetting: {
					isReassign: false
				},
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
					},
					aGanttSplitDemandData: false,
					GanttPopOverData: {}
				},
				showDemands: true,
				mapSettings: {
					busy: false,
					filters: [],
					selectedDemands: [],
					routeData: [],
					checkedDemands: [],
					assignedDemands: [],
					bRouteDateSelected: false,
					aAssignedAsignmentsForPlanning: [],
					droppedResources: [],
					bIsSignlePlnAsgnSaved: false,
					DemandSet: []
				},
				resourceTreeShowRouteColumn: false,
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
				aFixedAppointmentsList: {},
				bDemandEditMode: false,
				ganttResourceFiltersFromPin: [],
				ganttDateRangeFromMap: [],
				iFirstVisibleRowIndex: -1,
				availabilities: {
					data: [],
					isToAssign: false
				},
				timeAllocations: {
					countAll: 0,
					countBlockers: 0,
					countAbsences: 0,
					enableTabs: true,
					createData: [],
					createDataCopy: [],
					StartDate: "",
					EndDate: ""
				},
				validateIW31Auth: true,
				validateIW32Auth: true,
				aFilterBtntextGanttDemandTbl: this.getModel("i18n").getResourceBundle().getText("xbut.filters"),
				bFilterGantBtnDemandtsGantt: false,
				PRT: {
					btnSelectedKey: "demands",
					bIsGantt: false,
					defaultStartDate: "",
					defaultEndDate: ""
				},
				// whatever properties are added here please update the same in the 
				// method resetSchedulingJson in the file schedulingaction.js
				Scheduling: {
					sType: "",
					sScheduleDialogTitle: "",
					sScheduleTableTitle: "",
					bEnableReschedule: false,
					bEnableAutoschedule: false,
					SchedulingDialogFlags: {

					},
					aSelectedDemandPath: [],
					selectedResources: null,
					selectedDemandPath: null,
					resourceList: [],
					resourceData: {},
					demandData: {},
					DateFrom: moment().startOf("day").toDate(),
					DateTo: moment().add(14, "days").endOf("day").toDate(),
					sUtilizationSlider: null,
					aResourceTblFilters: [],
					iSelectedResponse: 0
				},
				sViewRoute: null,
				aUpdatedResources: []
			});

			oViewModel.setSizeLimit(999999999);
			this.setModel(oViewModel, "viewModel");

			//creates the Information model and sets to the component
			this.setModel(models.createInformationModel(this), "InformationModel");

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

			this.setModel(models.createUserModel({
				ENABLE_ASSET_PLANNING: false,
				ENABLE_EVOORDERRELATE_BUTTON: false,
				ENABLE_EVORESOURCE_BUTTON: false,
				ENABLE_IW32_AUTH_CHECK: false,
				ENABLE_IW31_AUTH_CHECK: false,
				ENABLE_PM_AUTH_CHECK: false
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

			var oSinglePlanningModel = models.createHelperModel({
				hasChanges: false,
				appointments: [],
				legendShown: false,
				legendItems: [],
				legendAppointmentItems: []
			});
			oSinglePlanningModel.setDefaultBindingMode("TwoWay");
			this.setModel(oSinglePlanningModel, "mapSinglePlanning");
		},

		/**
		 * Function to initialize Message Popover
		 */
		_createMessagePopover: function () {
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
		},

		/* read app2app navigation links from backend
		 *	Used in Create Order
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
	});
});