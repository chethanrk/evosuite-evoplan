sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/m/MessageToast"
], function (JSONModel, Device, MessageToast) {
    "use strict";

    return {
        getMapConfiguration: function (oModel) {
            var oMapData = oModel ?  oModel.getData() : {};

            return {
                "MapProvider":this.getMapProviders(oMapData),
                "MapLayerStacks":this.getMapLayerStacks(oMapData)
            };
        },

        getMapSources : function (oMapData) {
            //TODO The query parameters are different for respective map provides
            //TODO with each provides query parameters will separately
            //TODO oMapData.queryParams
            //TODO Query parameters can token//api_key//username,password//session_key//App_Code
            return oMapData.sources || [{
                "id": "s1",
                "url": "https://a.tile.openstreetmap.org/{LOD}/{X}/{Y}.png"

            }];
        },

        getMapLayerStacks : function (oMapData) {
            return oMapData.mapLayerStacks ||  [
                {
                    "name": "Default",
                    "MapLayer": [
                        {
                            "name": "OSM",
                            "refMapProvider": "OSM"
                        }]
                }];

        },

        getMapProviders : function (oMapData) {
            return [
                {
                    "name": oMapData.MapProvider || "OSM",
                    "tileX": "256",
                    "tileY": "256",
                    "minLOD": oMapData.minZoom || "1",
                    "maxLOD": oMapData.maxZoom || "20",
                    "copyright": oMapData.copyrightInfo || "Tiles Courtesy of OpenMapTiles",
                    "Source": this.getMapSources(oMapData)
                }];
        }
    };

});