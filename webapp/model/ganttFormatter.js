sap.ui.define([
    "sap/ui/model/type/Currency"
], function (Currency) {
    "use strict";

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
        }
    };

    function getMappingItem(sType, sPlanStatus) {
        var sKey = (sType && sPlanStatus) ? sType.toUpperCase() + "_" + sPlanStatus.toUpperCase() : "DEFAULT";

        return mColorMapping[sKey];
    }

    return {

        orderTitle: function(sRequirementId, sSource, sDestination) {
            return [sRequirementId, ':', sSource, "->", sDestination].join(" ");
        },

        strokeColor: function(sType, sPlanStatus) {
            if(getMappingItem(sType, sPlanStatus)){
                return getMappingItem(sType, sPlanStatus)["stroke"];
            }
            return getMappingItem()["stroke"];
        },
        strokeWidth: function(sType, sPlanStatus) {
            if(getMappingItem(sType, sPlanStatus)){
                return getMappingItem(sType, sPlanStatus)["strokeWidth"];
            }
            return getMappingItem()["strokeWidth"];
        },

        strokeDasharray: function(sType, sPlanStatus) {
            if(getMappingItem(sType, sPlanStatus)){
                return getMappingItem(sType, sPlanStatus)["strokeWidth"];
            }
            return getMappingItem()["strokeWidth"];
        },

        fillColor: function(sType, sPlanStatus) {
            if(getMappingItem(sType, sPlanStatus)){
                return getMappingItem(sType, sPlanStatus)["fill"];
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
            if(sNodeType !== "ASSIGNMENT"){
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
