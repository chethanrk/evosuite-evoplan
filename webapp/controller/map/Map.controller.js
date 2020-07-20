sap.ui.define([
    "com/evorait/evoplan/controller/AssignmentActionsController",
    "sap/ui/model/json/JSONModel",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/evorait/evoplan/controller/map/MapConfig"
], function (AssignmentActionsController, JSONModel, formatter,  Filter, FilterOperator, MapConfig) {
    "use strict";


    return AssignmentActionsController.extend("com.evorait.evoplan.controller.map.Map", {

        onInit:function () {
            var oGeoMap = this.getView().byId("idGeoMap");
            oGeoMap.setMapConfiguration(MapConfig.getMapConfiguration());
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._oEventBus.subscribe("BaseController", "refreshMapView", this._refreshMapView, this);

        },
        onDrop : function (oEvent) {
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
        onExit: function(){
        	this._oEventBus.unsubscribe("BaseController", "refreshMapView", this._refreshMapView, this);
        }

    });

});