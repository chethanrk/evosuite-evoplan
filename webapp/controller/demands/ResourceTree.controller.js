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
	FilterType, formatter, BaseController, ResourceTreeFilterBar,
	MessageToast, MessageBox, Fragment, Constants) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.demands.ResourceTree", {

		formatter: formatter,

		isLoaded: false,

		assignmentPath: null,

		selectedResources: [],

		oFilterConfigsController: null,

		mTreeState: {},

		_bFirsrTime: true,

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 **/
		onInit: function () {
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
			if (sRouteName === "demands") {
				this._mParameters = {
					bFromHome: true
				};
				var sViewSelectedKey = this.getView().byId("idTimeView").getSelectedKey();
				if (sViewSelectedKey === "TIMENONE") {
					this.getView().getModel("viewModel").setProperty("/selectedHierarchyView", sViewSelectedKey);
					this.getView().getModel("viewModel").setProperty("/capacityPlanning", false);
				} else {
					this.getView().getModel("viewModel").setProperty("/selectedHierarchyView", sViewSelectedKey);
					this.getView().getModel("viewModel").setProperty("/capacityPlanning", true);
				}

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
			} else {
				this.byId("showPlanCalendar").setEnabled(false);
				this.byId("idButtonreassign").setEnabled(false);
				this.byId("idButtonunassign").setEnabled(false);
			}
			// Disable the Manage absence button when more than one resources are selected
			// Disble the button for the selection on Group and Pool Node.
			if (this.selectedResources.length === 1) {
				oSelectedData = this.getModel().getProperty(this.selectedResources[0]);
				if (oParams.selected && oNewNode.NodeType === "RESOURCE" && oNewNode.ResourceGuid !== "" && oNewNode.ResourceGroupGuid !== "") {
					this.byId("idButtonCreUA").setEnabled(true);
				} else if (oSelectedData.NodeType === "RESOURCE" && oSelectedData.ResourceGuid !== "" && oSelectedData.ResourceGroupGuid !== "") {
					this.byId("idButtonCreUA").setEnabled(true);
				} else {
					this.byId("idButtonCreUA").setEnabled(false);
				}
			} else {
				this.byId("idButtonCreUA").setEnabled(false);
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
				this.openAssignInfoDialog(this.getView(), this.assignmentPath, this.assignmentRowContext);
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
				oFilterRightTechnician = this._oViewModel.getProperty("/resourceFilterforRightTechnician"),
				bCheckRightTechnician = this._oViewModel.getProperty("/CheckRightTechnician"),
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
			this._oViewModel.setProperty("/resourceFilterView", aFilter);

			oBinding.filters = [new Filter(aFilter, true)];

			if (bCheckRightTechnician && oFilterRightTechnician) {
				oBinding.filters.push(oFilterRightTechnician);
			} else {
				this._oViewModel.setProperty("/CheckRightTechnician", false);
				this._oViewModel.getProperty("/resourceFilterforRightTechnician", false);
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
		onDragStart: function (oEvent) {
			var oDragSession = oEvent.getParameter("dragSession"),
				oDraggedControl = oDragSession.getDragControl(),
				oContext = this._oDataTable.getContextByIndex(oDraggedControl.getIndex()),
				oObject = oContext.getObject(),
				vAssignGuid = oObject.AssignmentGuid,
				vDemandGuid = oObject.DemandGuid;

			this.assignmentPath = "/AssignmentSet('" + vAssignGuid + "')";
			this._oViewModel.setProperty("/isReassign", true);
			if (oObject.NodeType !== "ASSIGNMENT") {
				// this._showAssignErrorDialog();
				oEvent.preventDefault();
			}

		},
		_getAssignedDemand: function (data) {
			var oModel = this.oAssignmentModel;

			oModel.setProperty("/showError", false);
			if (oModel.getProperty("/DateFrom") === "" || oModel.getProperty("/DateTo") === "") {
				oModel.setProperty("/DateFrom", data.DateFrom);
				oModel.setProperty("/DateTo", data.DateTo);
			}

			oModel.setProperty("/Effort", data.Effort);
			oModel.setProperty("/EffortUnit", data.EffortUnit);

			//Fetching Resource Start and End Date from AssignmentSet for validating on save
			oModel.setProperty("/RES_ASGN_START_DATE", data.RES_ASGN_START_DATE);
			oModel.setProperty("/RES_ASGN_END_DATE", data.RES_ASGN_END_DATE);

			var oDemandData = data.Demand;
			oModel.setProperty("/Description", oDemandData.DemandDesc);
			oModel.setProperty("/AllowReassign", oDemandData.ALLOW_REASSIGN);
			oModel.setProperty("/AllowUnassign", oDemandData.ALLOW_UNASSIGN);
			oModel.setProperty("/AllowChange", oDemandData.ASGNMNT_CHANGE_ALLOWED);
			oModel.setProperty("/OrderId", oDemandData.ORDERID);
			oModel.setProperty("/OperationNumber", oDemandData.OPERATIONID);
			oModel.setProperty("/SubOperationNumber", oDemandData.SUBOPERATIONID);
			oModel.setProperty("/DemandStatus", oDemandData.Status);
			oModel.setProperty("/DemandGuid", oDemandData.Guid);
			oModel.setProperty("/Notification", oDemandData.NOTIFICATION);
			oModel.setProperty("/objSourceType", oDemandData.OBJECT_SOURCE_TYPE);
		},

		checkAssigmentIsReassignable: function (mParameters) {
			var oAssignmentData = mParameters.assignment,
				oResourceData = mParameters.resource,
				oDemandData = oAssignmentData.Demand,
				oResourceBundle = this.getResourceBundle();
			if (oAssignmentData.ResourceGuid === oResourceData.ResourceGuid && !oDemandData.ASGNMNT_CHANGE_ALLOWED) { // validation for change
				this.showMessageToast(oResourceBundle.getText("ymsg.assignmentnotangeable"));
				return false;
			} else if (!oDemandData.ASGNMNT_CHANGE_ALLOWED || !oDemandData.ALLOW_REASSIGN) { // validation for reassign
				this.showMessageToast(oResourceBundle.getText("ymsg.assignmentnotreassignable"));
				return false;
			}
			return true;
		},

		_getAssignmentDetail: function (oAssignData, oResourcePath) {
			this.oAssignmentModel = this.getView().getModel("assignment");
			var oAssignment = this.getOwnerComponent().assignInfoDialog.getDefaultAssignmentModelObject();
			oAssignment.AssignmentGuid = oAssignData.Guid;
			oAssignment.DemandDesc = oAssignData.DemandDesc;
			oAssignment.DemandGuid = oAssignData.DemandGuid;
			oAssignment.DemandStatus = oAssignData.Demand.Status;
			oAssignment.DateFrom = oAssignData.DateFrom;
			oAssignment.DateTo = oAssignData.DateTo;
			oAssignment.ResourceGroupGuid = oAssignData.ResourceGroupGuid;
			oAssignment.ResourceGroupDesc = oAssignData.GROUP_DESCRIPTION;
			oAssignment.ResourceGuid = oAssignData.ResourceGuid;
			oAssignment.ResourceDesc = oAssignData.RESOURCE_DESCRIPTION;
			if (this.getView().getModel("user").getProperty("/ENABLE_NETWORK_ASSIGNMENT")) {
				oAssignment.OldEffort = oAssignData.Effort;
				oAssignment.REMAINING_DURATION = oAssignData.REMAINING_DURATION;
				oAssignment.OBJECT_SOURCE_TYPE = oAssignData.OBJECT_SOURCE_TYPE;
			}
			this.oAssignmentModel.setData(oAssignment);

			var oNewAssign = this.getView().getModel().getProperty(oResourcePath);
			this.oAssignmentModel.setProperty("/NewAssignPath", oResourcePath);
			this.oAssignmentModel.setProperty("/NewAssignId", oNewAssign.Guid || oNewAssign.NodeId);
			if (oNewAssign.StartDate) {
				this.oAssignmentModel.setProperty("/DateFrom", oNewAssign.StartDate);
			}
			if (oNewAssign.EndDate) {
				this.oAssignmentModel.setProperty("/DateTo", oNewAssign.EndDate);
			}
			if (this.oAssignmentModel.getProperty("/NewAssignPath") !== null) {
				this.oAssignmentModel.getData().ResourceGuid = this.getView().getModel().getProperty(this.oAssignmentModel.getProperty(
					"/NewAssignPath") + "/ResourceGuid");
			}
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
				aSources = [],
				iOperationTimesLen,
				iVendorAssignmentLen,
				aPSDemandsNetworkAssignment;

			//don't drop on assignments
			if (oTargetData.NodeType === "ASSIGNMENT") {
				return;
			}

			if (!this.isAssignable({
					data: oTargetData
				})) {
				return;
			}

			if (this._oViewModel.getProperty("/isReassign")) {
				var mParams = {
					$expand: "Demand"
				};
				this.getOwnerComponent()._getData(this.assignmentPath, null, mParams)
					.then(function (oAssignData) {
						if (!this.checkAssigmentIsReassignable({
								assignment: oAssignData,
								resource: oTargetData
							})) {
							return false;
						}
						var mParameter = {
							bFromHome: true
						};
						this._getAssignmentDetail(oAssignData, sPath);
						this._getAssignedDemand(oAssignData);
						this.updateAssignment(true, mParameter);
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
					this._oDroppableTable.rebindTable(); //oTreeBinding.refresh();
				}
			}
			this._bFirsrTime = false;
		},

		/**
		 * Method will refresh the data of tree by refreshing Buffer button
		 */
		_triggerRefreshBufferTree: function () {
			this._oViewModel.setProperty("/CheckRightTechnician", false);
			this._oDroppableTable.rebindTable();
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
			this.byId("idButtonCreUA").setEnabled(false);
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
			oComponent.capacitiveAssignments.open(this.getView(), oEvent, this._mParameters);
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
			if (oResourceNode.NodeType === "RESOURCE") {
				this.getOwnerComponent().ResourceQualifications.open(this.getView(), sObjectId);
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
		}
	});
});