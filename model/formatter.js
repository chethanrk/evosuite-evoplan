sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function (DateFormat) {
    "use strict";

    var statuses = [
        {
            value: ["INIT", "EROF"],
            text: "statusOpen",
            icon: "sap-icon://bell"
        },{
            value: ["REL", "FREI"],
            text: "statusAssigned",
            icon: "sap-icon://activity-individual"
        },{
            value: ["INPR"],
            text: "statusInProgress",
            icon: "sap-icon://process"
        },{
            value: ["INTM"],
            text: "statusReturned",
            icon: "sap-icon://undo"
        },{
            value: ["CMPL", "TABG", "ABGS", "I0045", "I0046"],
            text: "statusCompleted",
            icon: "sap-icon://accept"
        },{
            value: ["REC"],
            text: "statusReceived",
            icon: "sap-icon://download"
        }
    ];

    var priorityObj = {
        "1": {
            state: "Error",
            color: "#ff3300"
        },
        "2": {
            state: "Warning",
            color: "#ffcc00"
        },
        "3": {
            state: "Success",
            color: "#33cc00"
        },
        "default": {
            state: "None",
            color: "#ffffff"
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
         * Get the status icon for the statuses defined in the statuses array.
         *
         * In case this function does not work with a customer's SAP system, bear in mind that it checks for a selection
         * of status strings. If the customer uses custom statuses or even another language than German, the function
         * might just not find a match where there should be one.
         *
		 * @param allStatusesString
		 * @returns {string}
		 */
		getStatusIcon: function (allStatusesString) {
		    if(!allStatusesString)
		        return "";

            // Loop over all possible status objects
            for (var statusObjectIndex = 0; statusObjectIndex < statuses.length; statusObjectIndex++) {
                var statusObject = statuses[statusObjectIndex];

                // Loop over each status within the status array inside the status object, e. g. ["INIT", "EROF"]
                for(var statusStringIndex = 0; statusStringIndex < statusObject.value.length; statusStringIndex++) {
					if(allStatusesString.indexOf(statusObject.value[statusStringIndex]) > -1){
						return statusObject.icon;
					}
                }
            }
            return "";
        },

        getStatusText: function (status) {
            for (var i = 0; i < statuses.length; i++) {
                var obj = statuses[i];
                if(obj.value.indexOf(status)){
                    return obj.text;
                }
            }
        },

        priorityToState: function (priority) {
            if(!priorityObj[priority]){
                return priorityObj.default.state
            }
            return priorityObj[priority].state;
        },

        priorityToColor: function (priority) {
            if(!priorityObj[priority]){
                return priorityObj.default.color;
            }
            return priorityObj[priority].color;
        },

        date: function(date) {
            var oDateFormat = DateFormat.getDateTimeInstance({pattern: "dd.MM.YYYY"});
            return oDateFormat.format(new Date(date));
        },

        /**
         * format to YYYY-MM-ddT00:00:00
         * @param date
         * @returns {*}
         */
        formatFilterDate: function (date) {
            var oDateFormat = DateFormat.getDateTimeInstance({pattern: "YYYY-MM-ddT00:00:00"});
            return oDateFormat.format(new Date(date));
        },

        assignText: function (sValue) {
            return sValue || "Assign now";
        }
    };
});