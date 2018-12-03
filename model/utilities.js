sap.ui.define([
	"sap/ui/Device"
], function(Device) {
	"use strict";

	// class providing static utility methods.

	// the density class that should be used according to the environment (may be "")
	var sContentDensityClass = (function() {
		var sCozyClass = "sapUiSizeCozy",
			sCompactClass = "sapUiSizeCompact",
			oBody = jQuery(document.body);
		if (oBody.hasClass(sCozyClass) || oBody.hasClass(sCompactClass)) { // density class is already set by the FLP
			return "";
		} else {
			return Device.support.touch ? sCozyClass : sCompactClass;
		}
	}());

    var oResourceFormats = {
        RES_GROUP: {
            title: "H4",
            icon: "sap-icon://collaborate"
        },
        RESOURCE: {
            title: "H5",
            icon: "sap-icon://employee"
        },
        TIMEDAY: {
            title: "H5",
            icon: "sap-icon://calendar",
            calendarView:"Day",
            getDateBegin: function () {
                return moment().startOf('isoWeek').toDate();
            },
            getDateEnd: function () {
                return moment().endOf('isoWeek').toDate();
            }
        },
        TIMEWEEK: {
            title: "H5",
            icon: "sap-icon://accelerated",
            calendarView:"Week",
            getDateBegin: function () {
                return moment().startOf('month').toDate();
            },
            getDateEnd: function () {
                return moment().endOf('month').toDate();
            }
        },
        TIMEMONTH: {
            title: "H5",
            icon: "sap-icon://appointment-2",
            calendarView:"Month",
            getDateBegin: function () {
                var d = moment().startOf('month');
                return d.subtract(1, 'months').toDate();
            },
			getDateEnd: function () {
                var d = moment().endOf('month');
                return d.add(2, 'months').toDate();
            }
        },
        ASSIGNMENT: {
            title: "H6",
            icon: "sap-icon://eam-work-order"
        },
        TIMENONE: {
            getDateBegin: function () {
                return new Date("01/01/1990");
            },
            getDateEnd: function () {
                var d = moment().endOf('year');
                return d.add(20, 'years').toDate();
            }
        }
    };

    var oAssetCalendarLegends = {
        "D":{
            type:sap.ui.unified.CalendarDayType.Type01,
            text:"Demands",
            tooltip:"Demands"
        },
        "A":{
            type:sap.ui.unified.CalendarDayType.Type06,
            text:"Unavailability",
            tooltip:"Unavailability"
        }

    };

    var oResourceAvailability = {
        "P":{
            tooltip:"xtit.partialAvailable",
            icon :"sap-icon://away",
            color:"#E78C07"
        },
        "A":{
            tooltip:"xtit.available",
            icon :null,
            color:""
        },
        "N":{
            tooltip:"xtit.notAvailable",
            icon :"sap-icon://busy",
            color:"#BB0000"
        }
    };

	return {
		// provide the density class that should be used according to the environment (may be "")
		getContentDensityClass: function() {
			return sContentDensityClass;
		},

		// defines a dependency from oControl to oView
		attachControlToView: function(oView, oControl) {
			jQuery.sap.syncStyleClass(sContentDensityClass, oView, oControl);
			oView.addDependent(oControl);
		},

		//returns the whole object with settings
        getResourceFormats: function () {
            return oResourceFormats;
        },

        //returns the resource availability settings
        getResourceAvailability: function () {
            return oResourceAvailability;
        },

        //returns the resource availability settings
        getAssetCalLegends: function () {
            return oAssetCalendarLegends;
        }
	};
});