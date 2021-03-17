sap.ui.define([
    "sap/ui/model/type/Currency"
], function (Currency) {
    "use strict";

    var shapeNodeType = "ASSIGNMENT";

    var mColorMapping = {
        CAP : {
            stroke: "#ad783c",
            strokeWidth: 1,
            fill: "#f7bf42"
        },
        CON: {
            stroke: "#7088ac",
            strokeWidth: 1,
            fill: "#b6daff"
        },
        DEFAULT: {
            stroke: "#65814e",
            strokeWidth: 1,
            fill: "#c5e7a0"
        },
        INVISIBLE: {
            stroke: "#ffffff",
            strokeWidth: 0,
            fill: "#ffffff"
        }
    };

    function getMappingItem(sType, sStatus, sNodeType) {
        if(sNodeType !== shapeNodeType){
            return mColorMapping.INVISIBLE;
        }
        var sKey = sType && sStatus ? sType.toUpperCase() : "DEFAULT";
        return mColorMapping[sKey];
    }

    return {

        strokeColor: function(sType, sStatus, sNodeType) {
            if(getMappingItem(sType, sStatus)){
                return getMappingItem(sType, sStatus, sNodeType).stroke;
            }
            return getMappingItem().stroke;
        },
        strokeWidth: function(sType, sStatus, sNodeType) {
            if(getMappingItem(sType, sStatus)){
                return getMappingItem(sType, sStatus, sNodeType).strokeWidth;
            }
            return getMappingItem().strokeWidth;
        },

        strokeDasharray: function(sType, sStatus, sNodeType) {
            if(getMappingItem(sType, sStatus)){
                return getMappingItem(sType, sStatus, sNodeType).strokeWidth;
            }
            return getMappingItem().strokeWidth;
        },

        fillColor: function(sType, sStatus, sNodeType) {
            if(getMappingItem(sType, sStatus)){
                return getMappingItem(sType, sStatus, sNodeType).fill;
            }
            return getMappingItem().fill;
        },

        statusIconColor: function(sStatus) {
            return sStatus === "planned" ? "Success" : "Normal";
        },

        /**
         *
         * @param sDate
         */
        getDateObject: function(sDate){
            if(!sDate){
                return null;
            }
            var d = sDate.match(/\((.*)\)/).pop();
            return new Date(parseInt(d));
        },

        getMergedDateObject: function (oDate, oTime, sType) {
            if(sType !== shapeNodeType){
                return null;
            }
            if(!oDate && (!oTime || !oTime.ms)){
                return null;
            }
            var dateTimestamp = new Date(oDate).getTime();
            return new Date(dateTimestamp + oTime.ms);
        },
        
		//Block Percentage and Description display on Gantt (Formatter)
		getBlockerTextVisible: function (oAvailabilityTypeGroup, oBlockPercentage) {
			if (oAvailabilityTypeGroup === "L" && oBlockPercentage !== 0) {
				return true;
			}else{
				return false;
			}
		}
    };
});
