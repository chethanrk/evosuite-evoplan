sap.ui.define([
	"com/evorait/evoplan/controller/NavigationActionSheet",
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
				// oGeoMap2 = this.getView().byId("idGeoMap2"),
				oMapModel = this.getModel("mapConfig");
			oGeoMap.setMapConfiguration(MapConfig.getMapConfiguration(oMapModel));
			// oGeoMap2.setMapConfiguration(MapConfig.getMapConfiguration(oMapModel));
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
		onSelectSpots: function (oEvent) {
			alert("abc");
		},
		onAfterRendering: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[0].getBinding("items");
			// To show busy indicator when map loads.
			this.setMapBusy(true);
			oBinding.attachDataReceived(function () {
				this.setMapBusy(false);
			}.bind(this));
		},
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
		 *  refresh the whole map container bindings
		 */
		_refreshMapBinding: function () {
			// Code to refresh Map
			this.setMapBusy(true);
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[0].getBinding("items");
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
		onRowSelectionChange: function () {
			var selected = this._oDataTable.getSelectedIndices();
			if (selected.length > 0) {
				this.byId("assignButton").setEnabled(true);
				this.byId("changeStatusButton").setEnabled(true);
			} else {
				this.byId("assignButton").setEnabled(false);
				this.byId("changeStatusButton").setEnabled(false);
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
		 *	Get Filters from smartfilter dialog to apply on Map. 
		 */
		onDemandFilterChange: function (oEvent) {
			var aFilters = oEvent.getSource().getFilters();
			this.getModel("viewModel").setProperty("/mapSettings/filters", aFilters);
			this.applyFiltersToMap();
		},
		/**
		 *	Apply Filters into Map bindings. 
		 */
		applyFiltersToMap: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[0].getBinding("items"),
				oFilters = this.getModel("viewModel").getProperty("/mapSettings/filters");
			this.setMapBusy(true);
			oBinding.filter(oFilters);
		},
		onSelectionChange: function (oEvent) {
			alert("ContentChange");
		},
		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshMapView", this._refreshMapView, this);
		}

	});

});