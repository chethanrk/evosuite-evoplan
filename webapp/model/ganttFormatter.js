sap.ui.define([
    "sap/ui/model/type/Currency"
], function (Currency) {
    "use strict";

    var shapeNodeType = "ASSIGNMENT";

    var mColorMapping = {
        "FU_PLANNED" : {
            strokeWidth: 2,
            fill: "#99D101",
            strokeDasharray: ""
        },
        "FU_UNPLANNED": {
            stroke: "#99D101",
            strokeWidth: 2,
            fill: "#fff",
            strokeDasharray: "3,3"
        },

        "FO_PLANNED" : {
            strokeWidth: 0,
            fill: "#99D101",
            stroke: "#99D101",
            strokeDasharray: ""
        },
        "FO_UNPLANNED": {
            stroke: "#99D101",
            strokeWidth: 3,
            fill: "#fff",
            strokeDasharray: "3,3"
        },
        "DEFAULT": {
            stroke: "#ff00ff",
            strokeWidth: 2,
            fill: "#ffa0aa",
            strokeDasharray: "5,1"
        },
        "INVISIBLE": {
            stroke: "#ffffff",
            strokeWidth: 0,
            fill: "#ffffff",
            strokeDasharray: ""
        }
    };

    function getMappingItem(sNodeType, sIcon) {
        if(sNodeType !== shapeNodeType){
            return mColorMapping["INVISIBLE"];
        }
        var sKey = (sNodeType && sIcon) ? sNodeType.toUpperCase() + "_" + sIcon.toUpperCase() : "DEFAULT";
        return mColorMapping[sKey];
    }

    return {

        strokeColor: function(sNodeType, sPlanStatus) {
            if(getMappingItem(sNodeType, sPlanStatus)){
                return getMappingItem(sNodeType, sPlanStatus)["stroke"];
            }
            return getMappingItem()["stroke"];
        },
        strokeWidth: function(sNodeType, sPlanStatus) {
            if(getMappingItem(sNodeType, sPlanStatus)){
                return getMappingItem(sNodeType, sPlanStatus)["strokeWidth"];
            }
            return getMappingItem()["strokeWidth"];
        },

        strokeDasharray: function(sNodeType, sPlanStatus) {
            if(getMappingItem(sNodeType, sPlanStatus)){
                return getMappingItem(sNodeType, sPlanStatus)["strokeWidth"];
            }
            return getMappingItem()["strokeWidth"];
        },

        fillColor: function(sNodeType, sPlanStatus) {
            if(getMappingItem(sNodeType, sPlanStatus)){
                return getMappingItem(sNodeType, sPlanStatus)["fill"];
            }
            return getMappingItem()["fill"];
        },

        statusIconColor: function(sPlanStatus) {
            return sPlanStatus === "planned" ? "Success" : "Normal";
        },

        /**
         *
         * @param sDate
         */
        getDateObject: function(sDate){
            if(!sDate){
                return null;
            }
            var d = (sDate).match(/\((.*)\)/).pop();
            return new Date(parseInt(d));
        },

        getMergedDateObject: function (oDate, oTime, sNodeType) {
            if(sNodeType !== shapeNodeType){
                return null;
            }
            if(!oDate && (!oTime || !oTime.ms)){
                return null;
            }
            var dateTimestamp = new Date(oDate).getTime();
            return new Date(dateTimestamp + oTime.ms);
        }
    };
});
