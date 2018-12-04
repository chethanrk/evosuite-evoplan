sap.ui.define([
	"sap/ui/core/format/DateFormat",
	"com/evorait/evoplan/model/utilities"
], function(DateFormat, utilities) {
	"use strict";

	var resourceFormats = utilities.getResourceFormats(),
		resourceAvailability = utilities.getResourceAvailability(),
		assetCalLegends = utilities.getAssetCalLegends();

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

		/**
		 * return right path of logo for every system
		 */
		getLogoImageLink: function() {
			var path = $.sap.getModulePath("com.evorait.evoplan", "/assets/img/evoplan_h50px.png");
			return path;
		},

		/**
		 * format date in format yyyy-MM-dd
		 * @param date
		 */
		date: function(date) {
			var d = new Date(date);
			var oDateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var dateString = oDateFormat.format(d);
			return dateString;
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

		/**
		 * merge given date and time to datetime and format
		 * @param date
		 * @param time
		 */
		mergeDateTime: function(date, time) {
			var offsetMs = new Date(0).getTimezoneOffset() * 60 * 1000,
				dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
					pattern: "yyyy-MM-dd"
				}),
				timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
					pattern: "HH:mm:ss"
				});

			var dateStr = dateFormat.format(new Date(date.getTime() + offsetMs));
			var timeStr = timeFormat.format(new Date(time.ms + offsetMs));

			return new Date(dateStr + "T" + timeStr);
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

		getResourceIcon: function(sValue, sIcon) {
			var iconFormat = resourceFormats[sValue];
			if (sIcon) {
				return sIcon;
			} else {
				if (iconFormat) {
					return iconFormat.icon || "";
				}
			}
			return "";
		},

		getResourceFormatByKey: function(sValue) {
			return resourceFormats[sValue];
		},

		isAssignment: function(sValue) {
			if (sValue === "ASSIGNMENT") {
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
		getCalendarView: function(sValue) {
			var sView = resourceFormats[sValue];
			if (sView) {
				return sView.calendarView || "One Month";
			}
		},
		/**
		 * @Author Rahul
		 * format the icon acording availability
		 * @param sValue
		 */
		getAvailabilityIcon: function(sValue) {
			if (sValue && sValue !== "")
				return resourceAvailability[sValue].icon;
		},
		/**
		 * @Author Rahul
		 * format the icon acording availability
		 * @param sValue
		 */
		formatIconColor: function(sValue) {
			if (sValue && sValue !== "")
				return resourceAvailability[sValue].color;
		},
		/**
		 * @Author Rahul
		 * format the color acording availability
		 * @param sValue
		 */
		formatIconTooltip: function(sValue) {
			var oComponent = this._component,
				oBundle;
			if (oComponent) {
				oBundle = oComponent.getModel("i18n").getResourceBundle();
			} else {
				oBundle = this.getResourceBundle();
			}
			if (sValue && sValue !== "")
				return oBundle.getText(resourceAvailability[sValue].tooltip);
			else
				return oBundle.getText("xtit.available");
		},
		formatCriticality: function(sValue) {
			if (sValue === 1) {
				return sap.ui.core.MessageType.Error;
			} else if (sValue === 2) {
				return sap.ui.core.MessageType.Warning;
			} else if (sValue === 3) {
				return sap.ui.core.MessageType.Success;
			} else {
				return sap.ui.core.MessageType.Information;
			}
		},
		formatStatusIconColor: function(sValue) {
			if (sValue === 1) {
				return "#BB0000";
			} else if (sValue === 2) {
				return "#E78C07";
			} else if (sValue === 3) {
				return "#2B7D2B";
			} else {
				return "#5E696E";
			}
		},
		/**
		 * Configure the tree table with basic configuration		  
		 * @Author Rahul
		 * @since 2.1
		 * @param {oAssetTree : TreeTable} 
		 */
		getAssetIcon: function(sValue) {
			var sIcon;
			switch (sValue) {
				case "FLOC":
					sIcon = "sap-icon://functional-location";
					break;
				case "EQUI":
					 sIcon = "sap-icon://technical-object";
					break;
				default:
					sIcon =  "sap-icon://functional-location";
			}
			return sIcon;
		},
        /**
		 * Differentiate the planning data as demands and unavailability
         * @param sValue
         */
        formatAppointMent: function (sValue) {
				if(sValue === "D"){
					return sap.ui.unified.CalendarDayType.Type01;
				}else if(sValue === "A"){
					return sap.ui.unified.CalendarDayType.Type06;
				}else{
					return sap.ui.unified.CalendarDayType.Type01;
				}
        },
        /**
		 * Save button must not visible for if planning dat guid is present that indicate the update
         * @param sValue
         * @return {boolean}
         */
        formatSaveButton: function (sValue) {
        	if(sValue){
        		return false;
			}

        },
        /**
		 * Update button must not visible for if planning dat guid is present that indicate the create
         * @param sValue
         * @return {boolean}
         */
        formatUpdateButton: function (sValue) {
            if(!sValue){
                return false;
            }

        },
        
        formatDemandTooltip: function(sDesc , sStatusDesc){
        	if(sStatusDesc && sStatusDesc!== ""){
        		return sDesc+" : "+sStatusDesc;
        	}else{
        		return sDesc;
        	}
        }
	};
});