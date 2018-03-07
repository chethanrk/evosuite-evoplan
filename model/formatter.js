sap.ui.define([
	"sap/ui/core/format/DateFormat"
], function(DateFormat) {
	"use strict";

    var resourceFormats = {
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
            calendarView:"Day"
        },
        TIMEWEEK: {
            title: "H5",
            icon: "sap-icon://accelerated",
            calendarView:"Week"
        },
        TIMEMONTH: {
            title: "H5",
            icon: "sap-icon://appointment-2",
            calendarView:"Month"
        },
        ASSIGNMENT: {
            title: "H6",
            icon: "sap-icon://eam-work-order"
        }
    };

    return {
        /**
         * Rounds the currency value to 2 digits
         *
         * @public
         * @param {string} sValue value to be formatted
         * @returns {string} formatted currency value with 2 digits
         */
        currencyValue : function (sValue) {
            if (!sValue) {
                return "";
            }

            return parseFloat(sValue).toFixed(2);
        },

        /**
         * return right path of logo for every system
         */
        getLogoImageLink: function () {
            var path = $.sap.getModulePath("com.evorait.evoplan", "/assets/img/evoplan_h50px.png");
            return path;
        },

        /**
         * format date in format yyyy-MM-dd
         * @param date
         */
        date: function(date) {
            var d = new Date(date);
            var oDateFormat = DateFormat.getDateInstance({pattern: "yyyy-MM-dd"});
            var dateString =  oDateFormat.format(d);
            return dateString
        },

        /**
         * format to YYYY-MM-ddT00:00:00
         * @param date
         * @returns {*}
         */
        formatFilterDate: function (date) {
            var oDateFormat = DateFormat.getDateTimeInstance({pattern: "yyyy-MM-ddT00:00:00"});
            return oDateFormat.format(new Date(date));
        },

        isMainResource: function (sValue) {
            if(sValue === "RESOURCE" || sValue == "RES_GROUP"){
                return true;
            }
            return false;
        },

        formatResourceTitle: function (sValue) {
            var titleFormat = resourceFormats[sValue];
            if(titleFormat){
                return titleFormat.title || "Auto";
            }
            return "Auto";
        },

        getResourceIcon: function (sValue) {
            var iconFormat = resourceFormats[sValue];
            if(iconFormat){
                return iconFormat.icon || "";
            }
            return "";
        },

        isAssignment: function (sValue) {
            if(sValue === "ASSIGNMENT"){
                return true;
            }
            return false;
        },

		/**
		 * @Author Rahul
		 * format the calendar view
		 * @param sValue
		 * @returns calendarView respective calendar view
		 */
		getCalendarView: function(sValue){
			var sView = resourceFormats[sValue];
			if (sView) {
				return sView.calendarView || "Hour";
			}
		}
	};
});