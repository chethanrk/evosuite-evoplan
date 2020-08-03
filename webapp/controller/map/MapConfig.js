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
            var aSources = oMapData.MapSource ? oMapData.MapSource.results : [];
            var aMapSources = [];
            if(aSources.length <= 0){
            	aMapSources =undefined;
            }
            for(var i in aSources){
            	var oSource = {};
            	oSource.id = aSources[i].ID;
            	oSource.url = aSources[i].URL;
            	aMapSources.push(oSource);
            }
            return aMapSources || [{
                "id": "s1",
                "url": "https://a.tile.openstreetmap.org/{LOD}/{X}/{Y}.png"
            }];
        },

        getMapLayerStacks : function (oMapData) {
            return  [
                {
                    "name": "Default",
                    "MapLayer": [
                        {
                            "name": oMapData.name,
                            "refMapProvider": oMapData.name
                        }]
                }];

        },

        getMapProviders : function (oMapData) {
            return [
                {
                    "name": oMapData.name || "OSM",
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