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
			icon: "sap-icon://calendar"
		},
		TIMEWEEK: {
			title: "H5",
			icon: "sap-icon://accelerated"
		},
		TIMEMONTH: {
			title: "H5",
			icon: "sap-icon://appointment-2"
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
		currencyValue: function(sValue) {
			if (!sValue) {
				return "";
			}

			return parseFloat(sValue).toFixed(2);
		},

		date: function(date) {
			var d = new Date(date);
			var oDateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var dateString = oDateFormat.format(d);
			return dateString
		},

		/**
		 * format to YYYY-MM-ddT00:00:00
		 * @param date
		 * @returns {*}
		 */
		formatFilterDate: function(date) {
			var oDateFormat = DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-ddT00:00:00"
			});
			return oDateFormat.format(new Date(date));
		},

		isMainResource: function(sValue) {
			if (sValue === "RESOURCE" || sValue == "RES_GROUP") {
				return true;
			}
			return false;
		},

		formatResourceTitle: function(sValue) {
			var titleFormat = resourceFormats[sValue];
			if (titleFormat) {
				return titleFormat.title || "Auto";
			}
			return "Auto";
		},

		getResourceIcon: function(sValue) {
			var iconFormat = resourceFormats[sValue];
			if (iconFormat) {
				return iconFormat.icon || "";
			}
			return "";
		},
		/**
		 * Foarmatter formats the Date by combining the Date and Time object
		 * 
		 * @param sDate DateFrom or DateTo from the assignment
		 * @param oTime TimeFrom or TimeTo from the assignment
		 * @returns Date object by combining Date and Time
		*/
		 getCalendarDate: function(sDate, oTime) {
			console.log(sDate);
			console.log(oTime);
			var sTime;
			var oTimeFormat;
			var sTimeString;
			var sActualDate;
			var oDateFormat;
			var sDateString;
			if (oTime && oTime.ms) {
				sTime = new Date(oTime.ms);
				oTimeFormat = DateFormat.getTimeInstance({
					pattern: "HH:mm:ss"
				});
				sTimeString = oTimeFormat.format(sTime);
			}
			
			if (sDate) {
				sActualDate = new Date(sDate);
				oDateFormat = DateFormat.getDateInstance({
					pattern: "yyyy-MM-dd"
				});
				sDateString = oDateFormat.format(sActualDate);
			}
			if(sDateString && sTimeString)
				return new Date(sDateString + "T" + sTimeString);
			else{
				jQuery.sap.log.error("Something is wrong in date/time formatting");
				return new Date(0);
			}
		}

	};
});