sap.ui.define([
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/AssignmentsController",
	"com/evorait/evoplan/controller/ResourceTreeFilterBar",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (Device, JSONModel, Filter, FilterOperator,
	FilterType, formatter, BaseController, ResourceTreeFilterBar,
	MessageToast, MessageBox) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.MapResourceTree", {

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
			this._oDroppableTable = this.byId("droppableTable");
			//this._oDroppableTable.setSmartFilterId("map--resourceTreeFilterBar");
			this._oDataTable = this._oDroppableTable.getTable();
			this._configureDataTable(this._oDataTable);

			this.oFilterConfigsController = new ResourceTreeFilterBar();
			this.oFilterConfigsController.init(this.getView(), "resourceTreeFilterBarFragment");

			//eventbus of assignemnt handling
			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("BaseController", "refreshMapTreeTable", this._triggerRefreshTree, this);
			this._eventBus.subscribe("ManageAbsences", "ClearSelection", this.resetChanges, this);
			
			//route match function
			var oRouter =  this.getOwnerComponent().getRouter();
                oRouter.attachRouteMatched(this._routeMatched, this);

		},
		
		_routeMatched: function(oEvent){
            var oParameters = oEvent.getParameters(),
               sRouteName = oParameters.name; // route name
               if(sRouteName === "map")
               {
               	 this._mParameters = {bFromMap:true};
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
				bFromPlannCal: true
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
				this.assignmentPath = oRowContext.getPath();
				this.getOwnerComponent().assignInfoDialog.open(this.getView(), this.assignmentPath,null,this._mParameters);
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
				oUserModel = this.getModel("user");

			if (!this.isLoaded) {
				this.isLoaded = true;
			}
			// Bug fix for some time tree getting collapsed
			oBinding.parameters.numberOfExpandedLevels = oUserModel.getProperty("/RESOURCE_TREE_EXPAND") ? 1 : 0;

			var aFilter = this.oFilterConfigsController.getAllCustomFilters();
			// setting filters in local model to access in assignTree dialog.
			this.getModel("viewModel").setProperty("/resourceFilterView", aFilter);
			oBinding.filters = [new Filter(aFilter, true)];

		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 */
		onExit: function () {
			if (this.getOwnerComponent().planningCalendarDialog) {
				this.getOwnerComponent().planningCalendarDialog.getDialog().destroy();
			}
			this._eventBus.unsubscribe("BaseController", "refreshMapTreeTable", this._triggerRefreshTree, this);
			this._eventBus.unsubscribe("ManageAbsences", "ClearSelection", this.resetChanges, this);
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
		 * on drop on resource, triggers create assignment for dragged demands
		 */
		onDropOnResource: function (oEvent) {
			var oDraggedControl = oEvent.getParameter("droppedControl"),
				oContext = oDraggedControl.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oTargetData = oModel.getProperty(sPath),
				aSources = [];

			//don't drop on assignments
			if (oTargetData.NodeType === "ASSIGNMENT") {
				return;
			}

			if (!this.isAssignable({
					data: oTargetData
				})) {
				return;
			}

			aSources = this.getModel("viewModel").getProperty("/dragSession");

			// If the Resource is Not/Partially available
			if (this.isAvailable(sPath)) {
				this.assignedDemands(aSources, sPath);
			} else {
				this.showMessageToProceed(aSources, sPath);
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
			// this.pIsFilterBarInitalized.then(function () {
			var oTreeTable = this._oDataTable,
				oTreeBinding = oTreeTable.getBinding("rows");

			//reset the changes
			this.resetChanges();
			if (oTreeBinding && !this._bFirsrTime) {
				this.mTreeState = this._getTreeState();
				oTreeBinding.refresh();
			}
			this._bFirsrTime = false;
			// }.bind(this));
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
			oComponent.capacitiveAssignments.open(this.getView(), oEvent,this._mParameters);
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
        onToggleOpenState:function(){
            this.mTreeState = {};
        }
	});
});