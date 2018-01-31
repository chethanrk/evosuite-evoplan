sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function (DateFormat) {
    "use strict";



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

    };
});