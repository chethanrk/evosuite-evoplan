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
	"com/evorait/evoplan/model/Constants"
], function (Device, JSONModel, Filter, FilterOperator,
	FilterType, formatter, AssignmentsController, ResourceTreeFilterBar,
	MessageToast, MessageBox, Fragment, Constants) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.demands.ResourceTree", {

		formatter: formatter,

		isLoaded: false,

		assignmentPath: null,

		selectedResources: [],

		oFilterConfigsController: null,

		mTreeState: {},

		_bFirsrTime: true,

		_bDragResourceTree: false,

		_oDraggedResObj: {},

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 **/
		onInit: function () {
			// call super class onInit
			AssignmentsController.prototype.onInit.apply(this, arguments);

			this.oFilterConfigsController = new ResourceTreeFilterBar();
			this.oFilterConfigsController.init(this.getView(), "resourceTreeFilterBarFragment");
			this._oViewModel = this.getModel("viewModel");

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
			this._eventBus.subscribe("BaseController", "refreshTreeTable", this._triggerRefreshTree,
				this);
			this._eventBus.subscribe("BaseController", "refreshBufferTreeTable", this._triggerRefreshBufferTree, this);
			this._eventBus
				.subscribe("ManageAbsences", "ClearSelection", this.resetChanges, this);
			this._eventBus.subscribe("FindTechnician",
				"filterToFindRightResource", this.applyfilterToFindRightResource, this);
			this._eventBus.subscribe("FindTechnician",
				"setBusyResourceTree", this.onClickEnableFindTechnician, this);

			//route match function
			var oRouter = this.getOwnerComponent().getRouter();
			oRouter.attachRouteMatched(this._routeMatched, this);

		},

		_routeMatched: function (oEvent) {
			var oParameters = oEvent.getParameters(),
				sRouteName = oParameters.name; // route name
			if (sRouteName === "demands" || sRouteName === "demandTools") {
				this._mParameters = sRouteName === "demands" ? {
					bFromHome: true
				} : {
					bFromDemandTools: true
				};
				var sViewSelectedKey = this.getView().byId("idTimeView").getSelectedKey();
				if (sViewSelectedKey === "TIMENONE") {
					this.getView().getModel("viewModel").setProperty("/selectedHierarchyView", sViewSelectedKey);
					this.getView().getModel("viewModel").setProperty("/capacityPlanning", false);
				} else {
					this.getView().getModel("viewModel").setProperty("/selectedHierarchyView", sViewSelectedKey);
				}
				this.getModel("viewModel").setProperty("/resourceTreeShowRouteColumn", false);
			}
		},

		/**
		 * initial draggable after every refresh of table
		 * for example after go to next page
		 * @param oEvent
		 */
		onBusyStateChanged: function (oEvent) {
			var parameters = oEvent.getParameters();
			if (parameters.busy === false) {
				if (Object.keys(this.mTreeState).length > 0 && this._oDataTable.getBinding().getNodes().length > 0) {
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

			//validate resource tree is selected or not for Auto/Re-Schedule
			this.getModel("viewModel").setProperty("/Scheduling/selectedResources", this.selectedResources);
			this.oSchedulingActions.validateScheduleButtons();
			this.oSchedulingActions.validateReScheduleButton();
		},

		/**
		 * Open the planning calendar for selected resources
		 * @param oEvent
		 */
		onPressShowPlanningCal: function (oEvent) {
			this.getOwnerComponent().getModel("appView").setProperty("/busy", true);
			this.getOwnerComponent().planningCalendarDialog.open(this.getView(), this.selectedResources, {
				bFromPlannCal: true,
				bFromHome: true
			}); // As we are opening the dialog when set model data
		},

		/**
		 * on press link of assignment in resource tree row
		 * get parent row path and bind this path to the dialog or showing assignment information
		 * @param oEvent
		 */
		onPressAssignmentLink: function (oEvent) {
			var oSource = oEvent.getSource();
			this.assignmentRowContext = oSource.getParent().getBindingContext();
			if (this.assignmentRowContext) {
				this.assignmentPath = "/AssignmentSet('" + this.assignmentRowContext.getObject().AssignmentGuid + "')";
				if (this.assignmentRowContext.getObject().IS_PRT) {
					this.oPRTActions.openToolsInfoDialog(this.getView(), this.assignmentPath, this.assignmentRowContext, this._mParameters);
				} else {
					this.openAssignInfoDialog(this.getView(), this.assignmentPath, this.assignmentRowContext, this._mParameters);
				}
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
				nTreeExpandLevel = oBinding.parameters.numberOfExpandedLevels,
				oFilterRightTechnician = this._oViewModel.getProperty("/resourceFilterforRightTechnician"),
				bCheckRightTechnician = this._oViewModel.getProperty("/CheckRightTechnician");
			if (!this.isLoaded) {
				this.isLoaded = true;
			}
			// Bug fix for some time tree getting collapsed
			if (oUserModel.getProperty("/ENABLE_RESOURCE_TREE_EXPAND")) {
				oBinding.parameters.numberOfExpandedLevels = nTreeExpandLevel ? nTreeExpandLevel : 1;
			}

			var aFilter = this.oFilterConfigsController.getAllCustomFilters();

			// setting filters in local model to access in assignTree dialog.
			this._oViewModel.setProperty("/resourceFilterView", aFilter);
			this.oSchedulingActions.setResourceTreeFilter(aFilter);

			oBinding.filters = [new Filter(aFilter, true)];

			if (bCheckRightTechnician && oFilterRightTechnician) {
				oBinding.filters.push(oFilterRightTechnician);
			} else {
				this._oViewModel.setProperty("/CheckRightTechnician", false);
				this._oViewModel.setProperty("/resourceFilterforRightTechnician", false);
			}

		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 */
		onExit: function () {
			this._eventBus.unsubscribe("BaseController", "refreshTreeTable", this._triggerRefreshTree, this);
			this._eventBus.unsubscribe("ManageAbsences", "ClearSelection", this.resetChanges, this);
			this._eventBus.unsubscribe("FindTechnician", "filterToFindRightResource", this.applyfilterToFindRightResource, this);
			this._eventBus.unsubscribe("FindTechnician", "resetResourceTree", this.onClickEnableFindTechnician, this);
			this._eventBus.unsubscribe("BaseController", "refreshBufferTreeTable", this._triggerRefreshBufferTree, this);
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

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
		 * On drag of assignment, get Assignment data to Assignment model
		 * @author Sagar since 2205 
		 */
		onDragStart: function (oEvent) {
			var oDragSession = oEvent.getParameter("dragSession"),
				oDraggedControl = oDragSession.getDragControl(),
				oContext = this._oDataTable.getContextByIndex(oDraggedControl.getIndex()),
				oObject = oContext.getObject(),
				vAssignGuid = oObject.AssignmentGuid;

			if (oObject.NodeType !== "ASSIGNMENT" || oObject.NodeType === "ASSIGNMENT" && oObject.IS_PRT) {
				// if not "ASSIGNMENT" type or if "ASSIGNMENT" is "PRT" type
				oEvent.preventDefault();
			}
			this.sDemandPath = "/DemandSet('" + oObject.DemandGuid + "')";
			this.assignmentPath = "/AssignmentSet('" + vAssignGuid + "')";
			this._oViewModel.setProperty("/dragDropSetting/isReassign", true);
			this._bDragResourceTree = true; //Flag to Check the Resource Tree Drag Instance
			this._oDraggedResObj = oObject; //Resource Tree Dragged Context Data
		},

		/**
		 * on drop on resource, triggers create assignment for dragged demands
		 */
		onDropOnResource: function (oEvent) {
			var oDroppedControl = oEvent.getParameter("droppedControl"),
				oDraggedControl = oEvent.getParameter("draggedControl"),
				oContext = oDroppedControl.getBindingContext(),
				oDraggedContext = oDraggedControl.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oTargetData = oModel.getProperty(sPath),
				oViewModel = this.getView().getModel("viewModel"),
				aSources = [],
				iOperationTimesLen,
				iVendorAssignmentLen,
				aPSDemandsNetworkAssignment,
				mParams, mParameter,
				oView = this.getView(),
				sResourceGuid = oModel.getProperty(oDraggedContext.getPath()).ResourceGuid;
			oViewModel.setProperty("/iFirstTreeTableVisibleindex", this._oDroppableTable.getTable().getFirstVisibleRow());

			//don't drop on assignments
			if (oTargetData.NodeType === "ASSIGNMENT") {
				return;
			}

			if (!this.isAssignable({
					data: oTargetData
				})) {
				return;
			}

			mParameter = {
				bFromHome: true
			};

			if (this._bDragResourceTree) {
				sResourceGuid = this._oDraggedResObj.ResourceGuid;
			}
			this._bDragResourceTree = false; //Resetting Resource Tree Drag State

			//if its the same resource then update has to be called
			if (oTargetData.ResourceGuid === sResourceGuid) {
				//call update
				this.handleDropOnSameResource(this.assignmentPath, sPath, mParameter);
			} else if (this._oViewModel.getProperty("/dragDropSetting/isReassign")) {
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
				aSources = this._oViewModel.getProperty("/dragSession");
				iOperationTimesLen = this.onShowOperationTimes(this._oViewModel);
				iVendorAssignmentLen = this.onAllowVendorAssignment(this._oViewModel, this.getModel("user"));
				aPSDemandsNetworkAssignment = this._showNetworkAssignments(this._oViewModel);

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
						// If the Resource is Not/Partially available
						if (this.isAvailable(sPath)) {
							this.assignedDemands(aSources, sPath, this._mParameters);
						} else {
							this.showMessageToProceed(aSources, sPath);
						}
					}
				}
			}
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
			if (!this._bFirsrTime) {
				var oTreeTable = this._oDataTable,
					oTreeBinding = oTreeTable.getBinding("rows");

				//reset the changes
				this.resetChanges();
				if (oTreeBinding && !this._bFirsrTime) {
					this.mTreeState = this._getTreeState();
					this._oDroppableTable.rebindTable();
				}
			}
			this._bFirsrTime = false;
			this._oViewModel.setProperty("/dragDropSetting/isReassign", false);

		},

		/**
		 * Method will refresh the data of tree by refreshing Buffer button
		 */
		_triggerRefreshBufferTree: function () {
			this._oViewModel.setProperty("/CheckRightTechnician", false);
			this._triggerRefreshTree();
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

			//validate resource tree is selected or not for Auto/Re-Schedule
			this.oSchedulingActions.resetResourceForScheduling();
		},
		/**
		 * On select of capacitive checkbox the adjusting splitter length
		 * @param oEvent checkbox event
		 */
		onSelectCapacity: function (oEvent) {
			var bSelect = oEvent.getParameter("selected"),
				bState = oEvent.getParameter("state"),
				oViewModel = this.getModel("viewModel");
			if (bSelect) {
				oViewModel.setProperty("/splitterDivider", "39%");
			} else {
				oViewModel.setProperty("/splitterDivider", "31%");
			}
			if (!bState) {
				oViewModel.setProperty("/remainingWork", bState);
			}
		},
		onSelectRemainingWork: function (oEvent) {
			var bState = oEvent.getParameter("state"),
				oViewModel = this.getModel("viewModel");
			if (bState) {
				oViewModel.setProperty("/splitterDivider", "50%");
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
			oComponent.capacitiveAssignments.open(this.getView(), oEvent.getSource(), this._mParameters);
		},
		/**
		 * on press, open the dialog to create an unavailability for selected resources
		 * @param oEvent
		 */
		onCreateAbsence: function (oEvent) {
			var oSelectedResource = this.selectedResources[0],
				oResData = this.getModel().getProperty(oSelectedResource);

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
				collapseIdx = [],
				oViewModel = this.getView().getModel("viewModel");

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
			this._oDroppableTable.getTable().setFirstVisibleRow(oViewModel.getProperty("/iFirstTreeTableVisibleindex"));
		},
		onToggleOpenState: function () {
			this.mTreeState = {};
		},
		/**
		 * handle resource Icon press to dispaly qualification of the resource 
		 */
		onResourceIconPress: function (oEvent) {
			var oRow = oEvent.getSource().getParent(),
				oContext = oRow.getBindingContext(),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				oResourceNode = oModel.getProperty(sPath);

			var sObjectId = oResourceNode.NodeId;
			//Opening Resource Qualification only on Resource Node Icon
			if (oResourceNode.NodeType === "RESOURCE" && this.getModel("user").getProperty("/ENABLE_QUALIFICATION")) {
				this.getOwnerComponent().ResourceQualifications.open(this.getView(), sObjectId);
			} else if (this.checkToShowAvailabilities(oResourceNode)) {
				//Added new condition to Check & show resource availability for WEEK/MONTH view
				this.getResourceAvailabilityInfo(oContext.getObject()).then(function (results) {
					this.getModel("viewModel").setProperty("/availabilities/data", results);
					this.getModel("viewModel").setProperty("/availabilities/isToAssign", false);
					this.getOwnerComponent().ResourceAvailabilities.open(this.getView(), this._mParameters);
				}.bind(this));
			}
		},
		/**
		 * handle 'Find Resource' button press to dispaly the qualified resources highlighted in resource tree 
		 */
		applyfilterToFindRightResource: function (sChannel, oEvent, oData) {
			var oFilters = new Filter({
				filters: oData.sRequirementProfileIds,
				and: false
			});
			this._oViewModel.setProperty("/resourceFilterforRightTechnician", oFilters);
			this._oViewModel.setProperty("/CheckRightTechnician", true);
			this.showWarningMsgResourceTree(false);
			this._oDroppableTable.rebindTable();
		},
		/**
		 * handle Switch On/Off Qualification Mode and resetting resource Tree
		 */
		onClickEnableFindTechnician: function () {
			var bEnabled = this._oViewModel.getProperty("/CheckRightTechnician"),
				sResourceFilterParams = this._oDroppableTable.getTable().getBinding().getFilterParams();
			if (!bEnabled) {
				this._oViewModel.setProperty("/WarningMsgResourceTree", false);
				if (sResourceFilterParams.includes("REQUIREMENT_PROFILE_ID")) {
					this._oDroppableTable.rebindTable();
				}
			}
		},

		/**
		 * Tools droppped on resource tree, triggers create assignment for dragged tools
		 */
		onToolDropOnResource: function (oEvent) {
			var oTargetControl = oEvent.getParameter("droppedControl"),
				oTargetContext = oTargetControl.getBindingContext(),
				sTargetPath = oTargetContext.getPath(),
				oTargetObj = this.getModel().getProperty(sTargetPath),
				aSources = this._oViewModel.getProperty("/dragSession");

			//set default start and end dates everytime on drop on resosurce
			var endDate = new Date(),
				iDefNum = this._oViewModel.getProperty("/iDefToolAsgnDays");
			endDate.setDate(endDate.getDate() + parseInt(iDefNum));
			this._oViewModel.setProperty("/PRT/defaultStartDate", new Date());
			this._oViewModel.setProperty("/PRT/defaultEndDate", new Date(endDate));

			this.oPRTActions.checksBeforeAssignTools(aSources, oTargetObj, this._mParameters, null, this.getView());
		}
	});
});