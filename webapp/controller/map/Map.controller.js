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

        },
        onDrop : function (oEvent) {
            console.log(oEvent);
        }

    });

});