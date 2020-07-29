sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentActionsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/evorait/evoplan/controller/map/MapConfig",
	"sap/ui/core/Fragment"
], function (AssignmentActionsController, JSONModel, formatter, Filter, FilterOperator, MapConfig, Fragment) {
	"use strict";

	return AssignmentActionsController.extend("com.evorait.evoplan.controller.map.Map", {

		onInit: function () {
			var oGeoMap = this.getView().byId("idGeoMap");
			oGeoMap.setMapConfiguration(MapConfig.getMapConfiguration());
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("BaseController", "refreshMapView", this._refreshMapView, this);

		},
		onDrop: function (oEvent) {
			console.log(oEvent);
		},
		_refreshMapView: function (oEvent) {
			// alert("Map Refresh Clicked");
			var oGeoMap = this.getView().byId("idGeoMap");
			// var oTreeTable = this.getView().byId("ganttResourceTreeTable"),
			//     oViewModel = this.getModel("viewModel");
			// //reset the changes
			// this.resetChanges();
			// if (this._bLoaded && oTreeTable && oTreeTable.getBinding("rows")) {
			//     this._ganttChart.setSelectionPanelSize("25%");
			//     oTreeTable.getBinding("rows")._restoreTreeState().then(function () {
			//         oViewModel.setProperty("/ganttSettings/busy", false);
			//         oTreeTable.clearSelection();
			//         oTreeTable.rerender();
			//     }.bind(this));
			// }
			// this._bLoaded = true;
		},
		onSettingsPressed: function (oEvent) {
			if (!this._oDialog) {
				Fragment.load({
					name: "com.evorait.evoplan.view.fragments.DialogFilter",
					controller: this
				}).then(function (oDialog) {
					this.getView().addDependent(oDialog);
					this._oDialog = oDialog;
					this._oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					this._oDialog.open();
				}.bind(this));
			} else {
				this._oDialog.open();
			}
		},
		onPressClose: function () {
			this._oDialog.close();
		},
		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshMapView", this._refreshMapView, this);
		}

	});

});