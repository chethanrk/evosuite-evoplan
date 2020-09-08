sap.ui.define([
	"com/evorait/evoplan/controller/common/NavigationActionSheet",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/evorait/evoplan/controller/map/MapConfig",
	"sap/ui/core/Fragment",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/MessageToast"
], function (AssignmentActionsController, JSONModel, formatter, Filter, FilterOperator, MapConfig, Fragment, Dialog, Button, MessageToast) {
	"use strict";

	return AssignmentActionsController.extend("com.evorait.evoplan.controller.map.Map", {
		selectedDemands : [],
		
		onInit: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oMapModel = this.getModel("mapConfig");
			oGeoMap.setMapConfiguration(MapConfig.getMapConfiguration(oMapModel));
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("BaseController", "refreshMapView", this._refreshMapView, this);
			this._oEventBus.subscribe("BaseController", "resetMapSelection", this._resetMapSelection, this);
			this._oEventBus.subscribe("MapController", "setMapSelection", this._setMapSelection, this);
			
			var onClickNavigation = this._onActionPress.bind(this);
			var openActionSheet = this.openActionSheet.bind(this);
			this._oDraggableTable = this.byId("draggableList");
			this._oDataTable = this._oDraggableTable.getTable();
			this._setRowActionTemplate(this._oDataTable, onClickNavigation, openActionSheet);
			this._mParameters = {
				bFromMap: true
			};
		},
		/**
		 * Selected spots can be saved.
		 * @author Rahul
		 * @return Filter
		 */
		onSelect: function(oEvent){
			var aSelected = oEvent.getParameter("selected"),
				oViewModel = this.getModel("viewModel"),
				oModel = this.getModel(),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				oContext,sPath,oDemand;
			for(var i in aSelected){
				oContext = aSelected[i].getBindingContext();
				sPath = oContext.getPath();
				oDemand = oModel.getProperty(sPath);
				aSelectedDemands.push({context:oContext, guid: oDemand.Guid});
			}
			oViewModel.setProperty("/mapSettings/selectedDemands",aSelectedDemands);
			this._oDraggableTable.rebindTable();
		},
		/**
		 * DeSelected spots can be saved.
		 * @author Rahul
		 * @return Filter
		 */
		onDeselect: function(oEvent){
			var aDeSelected = oEvent.getParameter("deselected"),
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				oModel = this.getModel(),
				oContext,sPath,oDemand;
			for(var i in aDeSelected){
				oContext = aDeSelected[i].getBindingContext();
				sPath = oContext.getPath();
				oDemand = oModel.getProperty(sPath);
				aSelectedDemands.splice(aSelectedDemands.indexOf({context:oContext, guid: oDemand.Guid}), 1);
			}
			oViewModel.setProperty("/mapSettings/selectedDemands",aSelectedDemands);
			this._oDraggableTable.rebindTable();
		},
		/**
		 * If you remove this event selection part will work 
		 */
		 
		onSelectSpots: function(oEvent){
			// I dunno why its required
		},
		/**
		 * Create filters for the selected demands 
		 * 
		 * @author Rahul
		 * @return Filter
		 */
		getSelectedDemandFilters : function(){
			var aFilters = [],
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
			for(var i in aSelectedDemands){
				aFilters.push(new Filter("Guid", FilterOperator.EQ, aSelectedDemands[i].guid));
			}
			return new Filter({
				filters:aFilters,
				and:false
			});
		},
		/**
		 * Function will be called before the table refreshed. Before rebind pushing the selected filters
		 * into the the smart table
		 * 
		 * @author Rahul
		 * @return 
		 */
		onBeforeRebindTable: function(oEvent){
			var aFilters = oEvent.getParameter("bindingParams").filters,
				aDemandFilters = this.getSelectedDemandFilters();
			aFilters.push(aDemandFilters);
		},
		
		onAfterRendering: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[1].getBinding("items");
			// To show busy indicator when map loads.
			this.setMapBusy(true);
			
			oBinding.attachDataReceived(function () {
				this.setMapBusy(false);
				setTimeout(function(){
					this._setMapSelection();
				}.bind(this),10);
			}.bind(this));
		},
		/**
		 * Clearing the selected demands the Reseting the selection
		 * 
		 * @author Rahul
		 * @return 
		 */
		onReset: function(oEvent){
			var oViewModel = this.getModel("viewModel");
			this._resetMapSelection();
			oViewModel.setProperty("/mapSettings/selectedDemands",[]);
		},
		/**
		 * Clearing the selected demands the Reseting the selection
		 * 
		 * @author Rahul
		 * @return 
		 */
		onClear: function(){
			var oViewModel = this.getModel("viewModel");
			this._resetMapSelection();
			oViewModel.setProperty("/mapSettings/selectedDemands",[]);
			this._oDraggableTable.rebindTable();
		},
		/**
		 * Reset the map selection in the Model
		 * @Author: Rahul
		 */
		_resetMapSelection: function () {
			var aDemandGuidEntity = [],
			oViewModel = this.getModel("viewModel"),
			aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
			if (aSelectedDemands.length > 0) {
				(aSelectedDemands).forEach(function (entry) {
					aDemandGuidEntity.push("/DemandSet('" + entry.guid + "')");
				});
				this.getModel().resetChanges(aDemandGuidEntity);
			}
		    // oViewModel.setProperty("/mapSettings/selectedDemands",[]);
		},
		/**
		 * Set the map selection in the Model
		 * @Author: Rahul
		 */
		_setMapSelection: function () {
			var oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
				if (aSelectedDemands.length > 0) {
					(aSelectedDemands).forEach(function (entry) {
						this.getModel().setProperty("/DemandSet('" + entry.guid + "')/IS_SELECTED", true);
					}.bind(this));
				}
		},
		/**
		 * Enable/Disable busy indicator in map
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		setMapBusy: function (bValue) {
			this.getModel("viewModel").setProperty("/mapSettings/busy", bValue);
		},
		
		/**
		 * deselect all checkboxes in table
		 * @private
		 */
		_deselectAll: function () {
			this._oDataTable.clearSelection();
		},
		/**
		 * 
		 * On click on demand actions to navigate to demand detail page 
		 */
		_onActionPress: function (oEvent) {
			var oRouter = this.getRouter();
			var oRow = oEvent.getParameter("row");
			var oContext = oRow.getBindingContext();
			var sPath = oContext.getPath();
			var oModel = oContext.getModel();
			var oData = oModel.getProperty(sPath);
			oRouter.navTo("mapDemandDetails", {
				guid: oData.Guid
			});
		},
		/**
		 *  opens the action sheet
		 */
		openActionSheet: function (oEvent) {
			var oContext = oEvent.getSource().getParent().getParent().getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath();
			this.selectedDemandData = oModel.getProperty(sPath);
			this.getOwnerComponent().NavigationActionSheet.open(this.getView(), oEvent.getSource().getParent(), this.selectedDemandData);
		},
			/**
		 * On DragStart set the dragSession selected demands
		 */
		onDragStart: function (oEvent) {
			var oDragSession = oEvent.getParameter("dragSession"),
				oDraggedControl = oDragSession.getDragControl();

			var aIndices = this._oDataTable.getSelectedIndices(),
				oSelectedPaths, aPathsData;

			oDragSession.setTextData("Hi I am dragging");
			//get all selected rows when checkboxes in table selected
			if (aIndices.length > 0) {
				oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, aIndices, true);
				aPathsData = oSelectedPaths.aPathsData;
			} else {
				//table tr single dragged element
				oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, [oDraggedControl.getIndex()], true);
				aPathsData = oSelectedPaths.aPathsData;
			}
			// keeping the data in drag session
			this.getModel("viewModel").setProperty("/mapDragSession", aPathsData);
			if (oSelectedPaths && oSelectedPaths.aNonAssignable && oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
				oEvent.preventDefault();
			}
		},
		/**
		 * On Drag end check for dropped control, If dropped control not found
		 * then make reset the selection
		 * @param oEvent
		 */
		onDragEnd: function (oEvent) {
			var oDroppedControl = oEvent.getParameter("dragSession").getDropControl();
			if (!oDroppedControl) {
				this._deselectAll();
			}
		},
		/**
		 *  refresh the whole map view including map and demand table
		 */
		_refreshMapView: function (oEvent) {
			// Code to refresh Map Demand Table
			if (this._bLoaded) {
				this._oDraggableTable.rebindTable();
				this._refreshMapBinding();
			}
			this._bLoaded = true;
		},
		/**
		 * refresh the whole map container bindings
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		_refreshMapBinding: function () {
			// Code to refresh Map
			this.setMapBusy(true);
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[1].getBinding("items");
			oBinding.refresh();
		},
		/**
		 * open change status dialog
		 * @param oEvent
		 */
		onChangeStatusButtonPress: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);

			if (this._aSelectedRowsIdx.length > 0) {
				// TODO comment
				this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedPaths.aPathsData, this._mParameters);
			} else {
				var msg = this.getResourceBundle().getText("ymsg.selectMinItem");
				MessageToast.show(msg);
			}
		},
		/**
		 * enable/disable buttons on footer when there is some/no selected rows
		 * @since 3.0
		 */
		onRowSelectionChange: function (oEvent) {
			var selected = this._oDataTable.getSelectedIndices();
			if (selected.length > 0) {
				this.byId("assignButton").setEnabled(true);
				this.byId("changeStatusButton").setEnabled(true);
			} else {
				this.byId("assignButton").setEnabled(false);
				this.byId("changeStatusButton").setEnabled(false);
			}
			//To make selection on map by selecting Demand from demand table
			if (oEvent.getParameter("selectAll")) {
				this.markAllDemandSpots(true);
			} else if (oEvent.getParameter("rowIndex") === -1) {
				this.markAllDemandSpots(false);
			} else {
				this.updateMapDemandSelection(oEvent);
			}
		},

		/**
		 * on press assign button in footer
		 * show modal with user for select
		 * @param oEvent
		 */
		onAssignButtonPress: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			if (this._aSelectedRowsIdx.length > 100) {
				this._aSelectedRowsIdx.length = 100;
			}
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, true);

			if (oSelectedPaths.aPathsData.length > 0) {
				// TODO comment
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedPaths.aPathsData, false, this._mParameters);
			}
			if (oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
			}
		},
		/**
		 *	Navigates to evoOrder detail page with static url. 
		 */
		OnClickOrderId: function (oEvent) {
			var sOrderId = oEvent.getSource().getText();
			this.openEvoOrder(sOrderId);
		},
		/**
		 * Get Filters from smartfilter dialog to apply on Map. 
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		onDemandFilterChange: function (oEvent) {
			var aFilters = oEvent.getSource().getFilters();
			this.getModel("viewModel").setProperty("/mapSettings/filters", aFilters);
			this.applyFiltersToMap();
		},
		/**
		 * Apply Filters into Map bindings. 
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		applyFiltersToMap: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[1].getBinding("items"),
				oFilters = this.getModel("viewModel").getProperty("/mapSettings/filters");
			this.setMapBusy(true);
			oBinding.filter(oFilters);
		},
		/**
		 * Select/Deselect All spots in map. 
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		markAllDemandSpots: function (bValue) {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getVos()[1].getBinding("items"),
				oContexts = oBinding.getContexts(),
				oModel = oBinding.getModel(),
				sPath;
				// TODO Please keep the selected contexts in viewmodel under path mapSettings/selectedDemands
			for (var i = 0; i < oContexts.length; i++) {
				sPath = oContexts[i].getPath();
				oModel.setProperty(sPath + "/IS_SELECTED", bValue);
			}
		},
		/**
		 * Select/Deselect All spots in map.
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		updateMapDemandSelection: function (oEvent) {
			var selectedIndices = this._oDataTable.getSelectedIndices(),
				index = oEvent.getParameter("rowIndex"),
				sPath = oEvent.getParameter("rowContext").getPath(),
				oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getVos()[1].getBinding("items");

			if (selectedIndices.includes(index)) {
				oBinding.getModel().setProperty(sPath + "/IS_SELECTED", true);
			} else {
				oBinding.getModel().setProperty(sPath + "/IS_SELECTED", false);
			}
		},

		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshMapView", this._refreshMapView, this);
			this._oEventBus.unsubscribe("BaseController", "resetMapSelection", this._resetMapSelection, this);
			this._oEventBus.unsubscribe("MapController", "setMapSelection", this._setMapSelection, this);
		}

	});

});