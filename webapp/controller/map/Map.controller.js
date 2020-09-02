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

		onInit: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oMapModel = this.getModel("mapConfig");
			oGeoMap.setMapConfiguration(MapConfig.getMapConfiguration(oMapModel));
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("BaseController", "refreshMapView", this._refreshMapView, this);
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
		 * Event trigger whenever selection changed in map
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		onSelectSpots: function (oEvent) {
			// alert("selected");
			// var oSelectedSpots = oEvent.getParameter("selected"),
			// 	sPath;
			// if (oSelectedSpots && oSelectedSpots.length > 0) {
			// 	for(var i=0;i<oSelectedSpots.length;i++){
			// 		sPath = oSelectedSpots[i].getBindingContext().getPath();
			// 		this.getModel().setProperty(sPath + "/IS_SELECTED",true);
			// 	}
			// }
		},
		onAfterRendering: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[1].getBinding("items");
			// To show busy indicator when map loads.
			this.setMapBusy(true);
			oBinding.attachDataReceived(function () {
				this.setMapBusy(false);
			}.bind(this));
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
		onDrop: function (oEvent) {
			console.log(oEvent);
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
			oBinding.refresh(true);
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
		}

	});

});