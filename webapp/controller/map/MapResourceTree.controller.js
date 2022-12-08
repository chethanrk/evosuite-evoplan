/* globals axios */
/* globals _ */
sap.ui.define([
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/controller/common/ResourceTreeFilterBar",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"sap/base/Log", "com/evorait/evoplan/model/Constants",
	"com/evorait/evoplan/controller/map/MapUtilities",
	"sap/ui/core/mvc/OverrideExecution",
], function (Device, JSONModel, Filter, FilterOperator, FilterType, formatter, BaseController, ResourceTreeFilterBar,
	MessageToast, MessageBox, Fragment, Log, Constants, MapUtilities, OverrideExecution) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.map.MapResourceTree", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			// lyfecycle methods are not mentioned in methods list. They always have dafault properties
			methods: {
				onBusyStateChanged: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onChangeSelectResource: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onPressShowPlanningCal: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onPressAssignmentLink: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onPressReassign: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onPressUnassign: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onBeforeRebindTable: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onDragStart: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onDropOnResource: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				resetChanges: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onSelectCapacity: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				openCapacitivePopup: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onCreateAbsence: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onClickExpandCollapse: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onToggleOpenState: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				handleCalendarSelect: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onRoutePress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onCloseDialog: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				removeRouteDataFlag: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onResourceIconPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onShowAssignDemandPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onShowRoutePressPopover: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onShowRoutePress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onClearRoutes: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				}
			}
		},

		formatter: formatter,

		isLoaded: false,

		assignmentPath: null,

		selectedResources: [],

		oFilterConfigsController: null,

		mTreeState: {},

		_bFirsrTime: true,

		aMapDemandGuid: [],

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 **/
		onInit: function () {
			this.oFilterConfigsController = new ResourceTreeFilterBar();
			this.oFilterConfigsController.init(this.getView(), "resourceTreeFilterBarFragment")
				.then(function (result) {
					this.oFilterConfigsController.bindViewFilterItemsToEntity("/ShMapViewModeSet");
				}.bind(this));

			Fragment.load({
				name: "com.evorait.evoplan.view.common.fragments.ResourceTreeTable",
				id: this.getView().getId(),
				controller: this
			}).then(function (content) {
				this.getView().byId("idResourcePage").setContent(content);
				this._oDroppableTable = this.byId("droppableTable");
				this._oDataTable = this._oDroppableTable.getTable();
				this._configureDataTable(this._oDataTable);
			}.bind(this));

			//eventbus of assignemnt handling
			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("BaseController", "refreshMapTreeTable", this._triggerRefreshTree, this);
			this._eventBus.subscribe("ManageAbsences", "ClearSelection", this.resetChanges, this);

			this._eventBus.subscribe("Map", "onShowRoutePressPopover", this.onShowRoutePressPopover, this);
			this._eventBus.subscribe("Map", "clearRoutes", this.onClearRoutes, this);

			//route match function
			var oRouter = this.getOwnerComponent().getRouter();
			oRouter.attachRouteMatched(this._routeMatched, this);

			this.oMapUtilities = new MapUtilities();
		},

		/**
		 * initial draggable after every refresh of table
		 * for example after go to next page
		 * @param oEvent
		 */
		onBusyStateChanged: function (oEvent) {
			var parameters = oEvent.getParameters();
			if (parameters.busy === false) {
				if (Object.keys(this.mTreeState).length > 0) {
					this._restoreTreeState();
				}
			}
		},

		/**
		 * When user select a resource by selecting checkbox enable/disables the
		 * appropriate buttons in the footer.
		 * @param oEvent
		 */
		onChangeSelectResource: function (oEvent) {
			var oSource = oEvent.getSource(),
				parent = oSource.getParent(),
				sPath = parent.getBindingContext().getPath(),
				oParams = oEvent.getParameters(),
				oNewNode = this.getModel().getProperty(sPath),
				oSelectedData;
			//Sets the property IsSelected manually
			this.getModel().setProperty(sPath + "/IsSelected", oParams.selected);

			if (oParams.selected) {
				this.selectedResources.push(sPath);

			} else if (this.selectedResources.indexOf(sPath) >= 0) {
				//removing the path from this.selectedResources when user unselect the checkbox
				this.selectedResources.splice(this.selectedResources.indexOf(sPath), 1);
			}

			if (this.selectedResources.length > 0) {
				this.byId("showPlanCalendar").setEnabled(true);
				this.byId("idButtonreassign").setEnabled(true);
				this.byId("idButtonunassign").setEnabled(true);
				this.byId("idButtonTimeAllocNew").setEnabled(true);
			} else {
				this.byId("idButtonTimeAllocNew").setEnabled(false);
				this.byId("showPlanCalendar").setEnabled(false);
				this.byId("idButtonreassign").setEnabled(false);
				this.byId("idButtonunassign").setEnabled(false);
			}
			// Disable the Manage absence button when more than one resources are selected
			// Disble the button for the selection on Group and Pool Node.
			if (this.selectedResources.length === 1) {
				this._selectionResourceTree(oParams, oNewNode);
			} else {
				this.byId("showRoute").setEnabled(false);
			}
			if (this.selectedResources.length >= 1) {
				this.byId("assignedDemands").setEnabled(true);
			} else {
				this.byId("assignedDemands").setEnabled(false);
			}
		},

		/**
		 * Open the planning calendar for selected resources
		 * @param oEvent
		 */
		onPressShowPlanningCal: function (oEvent) {
			this.getOwnerComponent().getModel("appView").setProperty("/busy", true);
			this.getOwnerComponent().planningCalendarDialog.open(this.getView(), this.selectedResources, {
				bFromPlannCal: true,
				bFromMap: true
			}); // As we are opening the dialog when set model data
		},

		/**
		 * on press link of assignment in resource tree row
		 * get parent row path and bind this path to the dialog or showing assignment information
		 * @param oEvent
		 */
		onPressAssignmentLink: function (oEvent) {
			var oSource = oEvent.getSource(),
				oRowContext = oSource.getParent().getBindingContext();

			if (oRowContext) {
				this.assignmentPath = "/AssignmentSet('" + oRowContext.getObject().AssignmentGuid + "')";
				this.openAssignInfoDialog(this.getView(), this.assignmentPath, oRowContext, this._mParameters);
			} else {
				var msg = this.getResourceBundle().getText("notFoundContext");
				this.showMessageToast(msg);
			}
		},

		/**
		 * Open's Dialog containing assignments to reassign
		 * @param oEvent
		 */
		onPressReassign: function (oEvent) {
			this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, false, this._mParameters);
		},
		/**
		 * Open's Dialog containing assignments to unassign
		 * @param oEvent
		 */
		onPressUnassign: function (oEvent) {
			this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, true, this._mParameters);
		},
		/**
		 * bind resource tree table only when filterbar was initalized
		 * @param oEvent
		 */
		onBeforeRebindTable: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oBinding = oParams.bindingParams,
				oUserModel = this.getModel("user"),
				nTreeExpandLevel = oBinding.parameters.numberOfExpandedLevels;

			if (!this.isLoaded) {
				this.isLoaded = true;
			}
			// Bug fix for some time tree getting collapsed
			if (oUserModel.getProperty("/ENABLE_RESOURCE_TREE_EXPAND")) {
				oBinding.parameters.numberOfExpandedLevels = nTreeExpandLevel ? nTreeExpandLevel : 1;
			}

			var aFilter = this.oFilterConfigsController.getAllCustomFilters();
			// setting filters in local model to access in assignTree dialog.
			this.getModel("viewModel").setProperty("/resourceFilterView", aFilter);
			oBinding.filters = [new Filter(aFilter, true)];

		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 */
		onExit: function () {
			this._eventBus.unsubscribe("BaseController", "refreshMapTreeTable", this._triggerRefreshTree, this);
			this._eventBus.unsubscribe("ManageAbsences", "ClearSelection", this.resetChanges, this);
			this._eventBus.unsubscribe("Map", "clearRoutes", this.onClearRoutes, this);
			this._eventBus.unsubscribe("Map", "onShowRoutePressPopover", this.onShowRoutePressPopover, this);
		},

		/**
		 * On drag of assignment, get Assignment data to Assignment model
		 * @author Sagar since 2205		 * 
		 */
		onDragStart: function (oEvent) {
			var oDragSession = oEvent.getParameter("dragSession"),
				oDraggedControl = oDragSession.getDragControl(),
				oContext = this._oDataTable.getContextByIndex(oDraggedControl.getIndex()),
				oObject = oContext.getObject(),
				vAssignGuid = oObject.AssignmentGuid;

			if (oObject.NodeType !== "ASSIGNMENT") {
				oEvent.preventDefault();
			}
			this.sDemandPath = "/DemandSet('" + oObject.DemandGuid + "')";
			this.assignmentPath = "/AssignmentSet('" + vAssignGuid + "')";
			this.getModel("viewModel").setProperty("/dragDropSetting/isReassign", true);
		},

		/**
		 * on drop on resource, triggers create assignment for dragged demands
		 */
		onDropOnResource: function (oEvent) {
			var oDraggedControl = oEvent.getParameter("droppedControl"),
				oContext = oDraggedControl.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oTargetData = oModel.getProperty(sPath),
				oViewModel = this.getView().getModel("viewModel"),
				aSources = [],
				iOperationTimesLen,
				iVendorAssignmentLen,
				eventBus = sap.ui.getCore().getEventBus(),
				aPSDemandsNetworkAssignment, mParams, mParameter,
				oView = this.getView();

			//don't drop on assignments
			if (oTargetData.NodeType === "ASSIGNMENT") {
				return;
			}

			if (!this.isAssignable({
					data: oTargetData
				})) {
				return;
			}

			if (this.getModel("viewModel").getProperty("/dragDropSetting/isReassign")) {
				mParameter = {
					bFromMap: true
				};
				this.getOwnerComponent()._getData(this.sDemandPath)
					.then(function (oData) {
						oViewModel.setProperty("/dragSession", [{
							index: 0,
							oData: oData,
							sPath: this.sDemandPath
						}]);
						this._reassignmentOnDrop(this.assignmentPath, sPath, oView, mParameter);
					}.bind(this));
			} else {

				aSources = this.getModel("viewModel").getProperty("/mapDragSession");
				iOperationTimesLen = this.onShowOperationTimes(this.getModel("viewModel"));
				iVendorAssignmentLen = this.onAllowVendorAssignment(this.getModel("viewModel"), this.getModel("user"));
				aPSDemandsNetworkAssignment = this._showNetworkAssignments(this.getModel("viewModel"));

				//Checking PS Demands for Network Assignment 
				if (this.getModel("user").getProperty("/ENABLE_NETWORK_ASSIGNMENT") && aPSDemandsNetworkAssignment.length !== 0) {
					this.getOwnerComponent().NetworkAssignment.open(this.getView(), sPath, aPSDemandsNetworkAssignment, this._mParameters);
				}
				//Checking Vendor Assignment for External Resources
				else if (this.getModel("user").getProperty("/ENABLE_EXTERNAL_ASSIGN_DIALOG") && oTargetData.ISEXTERNAL && aSources.length !==
					iVendorAssignmentLen) {
					this.getOwnerComponent().VendorAssignment.open(this.getView(), sPath, this._mParameters);
				} else {
					if (this.getModel("user").getProperty("/ENABLE_ASGN_DATE_VALIDATION") && iOperationTimesLen !== aSources.length && oTargetData.NodeType ===
						"RESOURCE") {
						this.getOwnerComponent().OperationTimeCheck.open(this.getView(), this._mParameters, sPath);
					} else {
						eventBus.publish("BaseController", "resetMapSelection", {});
						// If the Resource is Not/Partially available
						if (this.isAvailable(sPath)) {
							this.assignedDemands(aSources, sPath, this._mParameters);
						} else {
							this.showMessageToProceed(aSources, sPath, null, null, null, null, this._mParameters);
						}
					}
				}
			}
		},

		/**
		 * Resets the selected resource if selected
		 */
		resetChanges: function () {
			var oModel = this.getModel();

			// reset the model changes
			if (oModel.hasPendingChanges()) {
				oModel.resetChanges();
			}
			// Resetting selected resource
			this.selectedResources = [];
			this.byId("showPlanCalendar").setEnabled(false);
			this.byId("idButtonreassign").setEnabled(false);
			this.byId("idButtonunassign").setEnabled(false);
			this.byId("idButtonTimeAllocNew").setEnabled(false);
			this.byId("showRoute").setEnabled(false);
			this.byId("assignedDemands").setEnabled(false);
		},

		/**
		 * On select of capacitive checkbox the adjusting splitter length
		 * @param oEvent checkbox event
		 */
		onSelectCapacity: function (oEvent) {
			var bSelect = oEvent.getParameter("selected"),
				oViewModel = this.getModel("viewModel");

			if (bSelect) {
				oViewModel.setProperty("/splitterDivider", "39%");
			} else {
				oViewModel.setProperty("/splitterDivider", "31%");
			}
		},

		/**
		 * Open's popover containing capacitive assignments
		 * @param oEvent
		 */
		openCapacitivePopup: function (oEvent) {
			var oComponent = this.getOwnerComponent();
			oComponent.capacitiveAssignments.open(this.getView(), oEvent, this._mParameters);
		},

		/**
		 * on press, open the dialog to create an unavailability for selected resources
		 * @param oEvent
		 */
		onCreateAbsence: function (oEvent) {
			var oSelectedResource = this.selectedResources[0];
			var oResData = this.getModel().getProperty(oSelectedResource);

			if (oResData.NodeType === "RESOURCE" && oResData.ResourceGuid !== "" && oResData.ResourceGroupGuid !== "") {
				this.getOwnerComponent().manageAvail.open(this.getView(), this.selectedResources, this._mParameters);
			} else {
				this.showMessageToast(this.getResourceBundle().getText("ymsg.selectResoure"));
			}
		},

		/**
		 * On click on expand the tree nodes gets expand to level 1
		 * On click on collapse all the tree nodes will be collapsed to root.
		 * @param oEvent
		 */
		onClickExpandCollapse: function (oEvent) {
			var oButton = oEvent.getSource(),
				oCustomData = oButton.getCustomData();
			this.mTreeState = {};
			if (oCustomData[0].getValue() === "EXPAND" && this._oDataTable) {
				this._oDataTable.expandToLevel(1);
			} else {
				this._oDataTable.collapseAll();
			}
		},

		onToggleOpenState: function () {
			this.mTreeState = {};
		},

		/**
		 * method called on selection of date
		 * @Author: Pranav
		 */
		handleCalendarSelect: function (oEvent) {
			var oSelectedDate = oEvent.getSource().getSelectedDates()[0].getStartDate();
			this.getModel("viewModel").setProperty("/mapSettings/bRouteDateSelected", true);
			this._getSelectedRoute(oSelectedDate);
		},

		/**
		 * method called to open the Route Date Selection Popover
		 * @Author: Pranav
		 */
		onRoutePress: function (oEvent) {
			var oButton = oEvent.getSource(),
				oView = this.getView();

			if (!this._oPopover) {
				Fragment.load({
					name: "com.evorait.evoplan.view.map.fragments.RouteDateFilter",
					id: oView.getId(),
					controller: this
				}).then(function (oPopover) {
					this._oPopover = oPopover;
					this.getView().addDependent(this._oPopover);
					oPopover.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					this._oPopover.openBy(oButton);
					this.byId("DRSMap").removeAllSelectedDates();
				}.bind(this));
			} else {
				this._oPopover.openBy(oButton);
				this.byId("DRSMap").removeAllSelectedDates();
			}
		},

		/**
		 * method called to close the date range fragment used for route creation
		 * @Author: Pranav
		 */
		onCloseDialog: function (oEvent) {
			this._oPopover.close();
		},

		/**
		 * method called after close the date range fragment used for route creation to remove flag
		 * @Author: Rakesh
		 */
		removeRouteDataFlag: function (oEvent) {
			// this.oView.getModel("viewModel").setProperty("/mapSettings/bRouteDateSelected", false);
		},

		/**
		 * Opens the resource qualification dialog 
		 * @Author Rahul
		 */
		onResourceIconPress: function (oEvent) {
			var oRow = oEvent.getSource().getParent(),
				oContext = oRow.getBindingContext();

			if (oContext) {
				var oNodeData = oContext.getObject();

				if (oNodeData.NodeType === "RESOURCE" || oNodeData.NodeType === "RES_GROUP") {
					this.getOwnerComponent().ResourceQualifications.open(this.getView(), oNodeData.NodeId);
				} else if (this.checkToShowAvailabilities(oNodeData)) {
					//Added new condition to Check & show resource availability for WEEK/MONTH view
					this.getResourceAvailabilityInfo(oNodeData).then(function (results) {
						this.getModel("viewModel").setProperty("/availabilities/data", results);
						this.getModel("viewModel").setProperty("/availabilities/isToAssign", false);
						this.getOwnerComponent().ResourceAvailabilities.open(this.getView(), this._mParameters);
					}.bind(this));
				}
			}
		},

		/**
		 * opens the single day planning calender for a resource for that date
		 * on click of planner icon in daily view
		 * @param {oEvent} planner icon press event
		 */
		onPlannerIconPress: function (oEvent) {
			var oRow = oEvent.getSource().getParent(),
				oContext = oRow.getBindingContext(),
				sPath = oContext.getPath(),
				oUserModel = this.getModel("user");

			if (oContext) {
				var oNodeData = oContext.getObject();
				if (oNodeData.NodeType === "TIMEDAY" && oUserModel.getProperty("/ENABLE_MAP_ROUTE_DAILY") ||
					oNodeData.NodeType === "TIMEWEEK" && oUserModel.getProperty("/ENABLE_MAP_ROUTE_WEEKLY")) {
					//get resource details
					var sParentPath = this.getModel("viewModel").getProperty("/treeSet") + "('" + oNodeData.ParentNodeId + "')";
					var oParentData = this.getModel().getProperty("/" + encodeURIComponent(sParentPath));
					//open Day single planning calendar
					this.getOwnerComponent().singleDayPlanner.open(this.getView(), sPath, oNodeData, oNodeData.NodeType, oParentData);
				}
			}
		},

		/**
		 * Method for show assigned demands in Map for selected Date in Resorce Tree Filter Bar
		 * @Author: Pranav
		 */
		onShowAssignDemandPress: function (oEvent) {
			var oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				aAssignedDemands = oViewModel.getProperty("/mapSettings/assignedDemands"),
				oFilter,
				eventBus = this._eventBus;
			if (aSelectedDemands.length > 0 || aAssignedDemands.length > 0) {
				this._eventBus.publish("BaseController", "refreshMapView", {});
				oViewModel.setProperty("/mapSettings/routeData", []);
				oViewModel.setProperty("/mapSettings/selectedDemands", []);
				oViewModel.setProperty("/mapSettings/assignedDemands", []);
				aAssignedDemands = [];
			}
			//Filter Logic for Map
			oFilter = new Filter(this._getResourceFilters(this.selectedResources), true);

			oViewModel.setProperty("/mapSettings/busy", true);
			this.getOwnerComponent()._getData("/AssignmentSet", [oFilter]).then(function (result) {

				var aDemands = result.results;
				aDemands.forEach(function (entry) {
					var sAssignedDemandPath = "/DemandSet('" + entry.DemandGuid + "')";
					aAssignedDemands.push(sAssignedDemandPath);
				});
				oViewModel.setProperty("/mapSettings/assignedDemands", aAssignedDemands);
				eventBus.publish("MapController", "showAssignedDemands", {});

			}.bind(this));
		},

		/**
		 * Event Bus method to call onShowRoutePress from other controllers
		 * 
		 * @param {string} sChannel event bus channel
		 * @param {string} sEventId event bus id
		 * @param {object} oEvent oEvent object
		 */
		onShowRoutePressPopover: function (sChannel, sEventId, oEvent) {
			this.onShowRoutePress(oEvent);
		},

		/**
		 * Handle `press` event on 'Show Route' button
		 * Perform request to a map provider, display received route coordinates on map
		 * @param oEvent {sap.ui.base.Event} - the `press` event
		 */

		onShowRoutePress: function (oEvent) {
			var oShowRouteButton = oEvent.getSource();
			var oResourceHierachyContext = oShowRouteButton.getBindingContext();
			var oResourceHierachyObject = oResourceHierachyContext.getObject();
			var oViewModel = this.getModel("viewModel");
			// oResource is declared here to closure the variable
			var oResource;

			// hide corresponding route in case the button was pressed before
			if (oShowRouteButton.getPressed && !oShowRouteButton.getPressed()) {
				var aCurrentDisplayedRoutes = oViewModel.getProperty("/GeoJsonLayersData");
				var aRoutesDisplay = aCurrentDisplayedRoutes.filter(function (oRoute) {
					return oRoute.path !== oResourceHierachyContext.getPath();
				});
				oViewModel.setProperty("/GeoJsonLayersData", aRoutesDisplay);
				return;
			}

			var sResourceHierachyPath = oResourceHierachyContext.getPath();
			var aGeoJsonLayersData = oViewModel.getProperty("/GeoJsonLayersData");

			var aResourceFilters = this._getResourceFilters([sResourceHierachyPath]);
			var aAssignmentFilters = this.oMapUtilities.getAssignmentsFiltersWithinDateFrame(oResourceHierachyObject);
			oViewModel.setProperty("/mapSettings/busy", true);

			var pAssignmentsLoaded = this.getOwnerComponent().readData("/AssignmentSet", aAssignmentFilters);
			var pResourceLoaded = this.getOwnerComponent().readData("/ResourceSet", [aResourceFilters]);
			var pMapProviderAndDataLoaded = Promise.all([this.getOwnerComponent()._pMapProviderLoaded, pAssignmentsLoaded, pResourceLoaded]);

			// aPromiseAllResults items are processed in the same sequence as proper promises are put to Promise.all method
			pMapProviderAndDataLoaded.then(function (aPromiseAllResults) {
					var aAssignments = aPromiseAllResults[1].results;
					if (aAssignments.length === 0) {
						// in case of no assignments, showing messageToast
						var msg = this.getResourceBundle().getText("ymsg.noAssignmentsOnDate");
						this.showMessageToast(msg);
					}

					oResource = aPromiseAllResults[2].results[0];

					return this.getOwnerComponent().MapProvider.getRoutePolyline(oResource, aAssignments);
				}.bind(this)).then(function (oResponse) {
					var oLayer = {};
					var oData = JSON.parse(oResponse.data.polyline.geoJSON);

					// the following property assigned with an array as it works ONLY with an array 
					// despite according to documentation it can be a GeoJSON object
					oLayer.data = [oData];

					oLayer.color = "#" + Math.floor(Math.random() * 16777215).toString(16); // generate random color

					// set id for a geojson object to be able to remove the object when the 'show route' toggle button is unpressed
					oLayer.path = oResourceHierachyContext.getPath();

					// we don't need to set property `/GeoJsonLayersData` explicitly 
					// as variable `aGeoJsonLayersData` stores reference to the same object
					// so it's enough to just push data to the `aGeoJsonLayersData` array
					aGeoJsonLayersData.push(oLayer);

					this._eventBus.publish("MapController", "displayRoute", oResource);
					oViewModel.setProperty("/mapSettings/busy", false);
				}.bind(this))
				.catch(function (oError) {
					oViewModel.setProperty("/mapSettings/busy", false);
					Log.error(oError);
					if (oShowRouteButton.setPressed && typeof oShowRouteButton.setPressed === "function") {
						oShowRouteButton.setPressed(false);
					}
				}.bind(this));
		},

		/**
		 * Handle `clearRoutes` event in the `Map` channel
		 * Cleares data related to displayed routes
		 */
		onClearRoutes: function () {
			var oViewModel = this.getModel("viewModel");
			var aCurrentDisplayedRoutes = oViewModel.getProperty("/GeoJsonLayersData");
			aCurrentDisplayedRoutes.forEach(function (oRoute) {
				if (this.getModel().getProperty(oRoute.path)) {
					this.getModel().setProperty(oRoute.path + "/IsRouteDisplayed", false);
				}
			}.bind(this));
			this.getModel("viewModel").setProperty("/GeoJsonLayersData", []);
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		_routeMatched: function (oEvent) {
			var oParameters = oEvent.getParameters(),
				sRouteName = oParameters.name; // route name
			if (sRouteName === "map") {
				this._mParameters = {
					bFromMap: true
				};
				var sViewSelectedKey = this.getView().byId("idTimeView").getSelectedKey();
				this.getView().getModel("viewModel").setProperty("/remainingWork", false);
				if (sViewSelectedKey === "TIMENONE") {
					this.getView().getModel("viewModel").setProperty("/selectedHierarchyView", sViewSelectedKey);
					this.getView().getModel("viewModel").setProperty("/capacityPlanning", false);
				} else {
					this.getView().getModel("viewModel").setProperty("/selectedHierarchyView", sViewSelectedKey);
				}
				this.getModel("viewModel").setProperty("/resourceTreeShowRouteColumn", true);
			}

		},

		_selectionResourceTree: function (oParams, oNewNode) {
			// Disable the Manage absence button when more than one resources are selected
			// Disble the button for the selection on Group and Pool Node.
			var oSelectedData = this.getModel().getProperty(this.selectedResources[0]);
			if (oParams.selected && oNewNode.NodeType === "RESOURCE" && oNewNode.ResourceGuid !== "" && oNewNode.ResourceGroupGuid !== "") {
				this.byId("showRoute").setEnabled(true);
			} else if (oSelectedData.NodeType === "RESOURCE" && oSelectedData.ResourceGuid !== "" && oSelectedData.ResourceGroupGuid !== "") {
				this.byId("showRoute").setEnabled(true);
			} else {
				this.byId("showRoute").setEnabled(false);
			}
		},

		/**
		 * configure tree table
		 * @param oDataTable
		 * @private
		 */
		_configureDataTable: function (oDataTable) {
			oDataTable.setEnableBusyIndicator(true);
			oDataTable.setSelectionMode("None");
			oDataTable.setColumnHeaderVisible(false);
			oDataTable.setEnableCellFilter(false);
			oDataTable.setEnableColumnReordering(false);
			oDataTable.setEditable(false);
			oDataTable.setVisibleRowCountMode(sap.ui.table.VisibleRowCountMode.Auto);
			oDataTable.attachBusyStateChanged(this.onBusyStateChanged, this);

		},

		/**
		 * triggers request with all setted filters
		 * @private
		 */
		_triggerFilterSearch: function () {
			this._oDroppableTable.rebindTable();
		},

		/**
		 * Method will refresh the data of tree by restoring its state
		 *
		 * @Author Rahul
		 * @version 2.0.4
		 * @return
		 * @private
		 */
		_triggerRefreshTree: function () {
			var oTreeTable = this._oDataTable,
				oTreeBinding = oTreeTable.getBinding("rows");

			//reset the changes
			this.resetChanges();
			if (oTreeBinding && !this._bFirsrTime) {
				this.mTreeState = this._getTreeState();
				this._oDroppableTable.rebindTable(); 
			}
			this._bFirsrTime = false;
			this.getModel("viewModel").setProperty("/dragDropSetting/isReassign", false);
		},

		/**
		 * map the current tree state with expand and collapse on each level
		 * before tree is doing a new GET request
		 * @private
		 */
		_getTreeState: function () {
			var oBindings = this._oDataTable.getBinding(),
				aNodes = oBindings.getNodes(),
				oCollection = {};

			for (var i = 0; i < aNodes.length; i++) {
				oCollection[aNodes[i].key] = {
					path: aNodes[i].key,
					level: aNodes[i].level,
					nodeState: aNodes[i].nodeState
				};
			}
			return oCollection;
		},

		/**
		 * After Resource tree GET request restore the expand/collapse state
		 * from before refresh
		 * @private
		 */
		_restoreTreeState: function () {
			var oBindings = this._oDataTable.getBinding(),
				aNodes = oBindings.getNodes(),
				expandIdx = [],
				collapseIdx = [];

			for (var j = 0; j < aNodes.length; j++) {
				if (this.mTreeState[aNodes[j].key] && !aNodes[j].nodeState.isLeaf) {
					if (!aNodes[j].nodeState.expanded && this.mTreeState[aNodes[j].key].nodeState.expanded) {
						expandIdx.push(j);
						delete this.mTreeState[aNodes[j].key];
					} else if (!aNodes[j].nodeState.collapsed && this.mTreeState[aNodes[j].key].nodeState.collapsed) {
						collapseIdx.push(j);
					}
				}
			}
			if (expandIdx.length > 0) {
				this._oDataTable.expand(expandIdx);
			} else if (collapseIdx.length > 0) {
				this._oDataTable.collapse(collapseIdx);
			} else {
				this.mTreeState = {};
			}
		},

		/**
		 * method for getting selected route for selected date
		 * @Author: Pranav
		 */
		_getSelectedRoute: function (oSelectedDate) {
			//Refresh the Map
			var oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
			if (aSelectedDemands.length > 0) {
				this._eventBus.publish("BaseController", "refreshMapView", {});
				oViewModel.setProperty("/mapSettings/routeData", []);
				oViewModel.setProperty("/mapSettings/selectedDemands", []);
			}
			//Filter Logic for Map
			var oFilter = new Filter(this._getResourceFilters(this.selectedResources, oSelectedDate), true);
			oViewModel.setProperty("/mapSettings/busy", true);
			this.getOwnerComponent()._getData("/AssignmentSet", [oFilter]).then(function (result) {

				var aData = result.results;
				//Route Creation in Map
				this._routeCreationMap(aData);

			}.bind(this));
		},
		/**
		 * Return resource filters on selected resources
		 * @param aSelectedResources {Array} Selected Resources
		 * @return aResourceFilters Filters
		 * @Author: Pranav
		 */
		_getResourceFilters: function (aSelectedResources, oSelectedDate) {
			var aResources = [],
				oModel = this.getView().getModel();
			var aFilters = [];

			for (var i = 0; i < aSelectedResources.length; i++) {
				var obj = oModel.getProperty(aSelectedResources[i]);
				var sCurrentHierarchyViewType = this.getView().getModel("viewModel").getProperty("/selectedHierarchyView");
				if (obj.NodeType === "RESOURCE") {
					if (obj.ResourceGuid && obj.ResourceGuid !== "") { // This check is required for POOL Node.
						aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGuid + "//" + obj.ResourceGroupGuid));
					} else {
						aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid + "//X"));
					}
				} else if (obj.NodeType === "RES_GROUP") {
					aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid));
				} else if (obj.NodeType === sCurrentHierarchyViewType) {
					aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGuid + "//" + obj.ResourceGroupGuid));
				}
			}

			if (aResources.length > 0) {
				aFilters.push(new Filter({
					filters: aResources,
					and: false
				}));
				if (oSelectedDate) {
					aFilters.push(new Filter("DateTo", FilterOperator.GE, oSelectedDate));
					aFilters.push(new Filter("DateFrom", FilterOperator.LE, oSelectedDate.setHours(23, 59, 59, 999)));
				} else {
					aFilters.push(new Filter("DateTo", FilterOperator.GE, this.byId("resourceTreeFilterBar").getControlByKey("StartDate").getDateValue()));
					aFilters.push(new Filter("DateFrom", FilterOperator.LE, this.byId("resourceTreeFilterBar").getControlByKey("EndDate").getDateValue()));
				}

			}
			return aFilters;
		},
		/**
		 * Method for route creation in Map for selected Date
		 * @Author: Pranav
		 */
		_routeCreationMap: function (aData) {
			var aMapLocations = [];
			var oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
			aData.forEach(function (entry) {
				var sSelectedDemandPath = "/DemandSet('" + entry.DemandGuid + "')";
				aSelectedDemands.push(sSelectedDemandPath);
			});
			oViewModel.setProperty("/mapSettings/selectedDemands", aSelectedDemands);

			for (var index = 0; index < aData.length - 1 && aData.length > 1; index++) {
				var data = {
					sLong: aData[index].LONGITUDE,
					sLat: aData[index].LATITUDE,
					dLong: aData[index + 1].LONGITUDE,
					dLat: aData[index + 1].LATITUDE
				};
				aMapLocations.push(data);
				this.getModel().setProperty("/DemandSet('" + aData[index].DemandGuid + "')/IS_SELECTED", true);
			}
			if (aData.length === 1) {
				this.getModel().setProperty("/DemandSet('" + aData[0].DemandGuid + "')/IS_SELECTED", true);
			} else if (aData.length > 1) {
				this.getModel().setProperty("/DemandSet('" + aData[aData.length - 1].DemandGuid + "')/IS_SELECTED", true);
			}
			oViewModel.setProperty("/mapSettings/routeData", aMapLocations);
			oViewModel.setProperty("/mapSettings/busy", false);
		}
	});
});