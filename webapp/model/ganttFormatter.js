sap.ui.define([
	"sap/ui/model/type/Currency"
], function (Currency) {
	"use strict";

	var shapeNodeType = "ASSIGNMENT";

	var mColorMapping = {
		CAP: {
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
		if (sNodeType !== shapeNodeType) {
			return mColorMapping.INVISIBLE;
		}
		var sKey = sType && sStatus ? sType.toUpperCase() : "DEFAULT";
		return mColorMapping[sKey];
	}

	return {

		/**
		 * Formatter for the color fill
		 * Based on the group type the fill the color will be rendered.
		 * A -> White
		 * N -> Pattern
		 * @param sType
		 * @return {string}
		 */
		getPattern: function (sType, sColour) {
			if (sType === "N") {
				return "url(#" + this._viewId + "--unavailability)";
			} else if (sType === "A") {
				return "#FFF";
			} else if (sType === "O") {
				return "transparent";
			} else if (sType === "T") {
				return "url(#" + this._viewId + "--oncallorovertime)";
			} else if (sType === "L") {
				return sColour;
			} else {
				return "transparent";
			}

		},
		/**
		 * Format legend colors to differentiate between pattern and colors
		 * @param sCode
		 * @param sType
		 * @return {*}
		 */
		formatLegend: function (sCode, sType) {
			if (sType === "COLOUR") {
				return sCode;
			} else {
				return "url(#" + this._viewId + "--" + sCode + ")";
			}
		},

		formatAvailType: function (sType) {
			if (sType === "N") {
				return "NA";
			} else if (sType === "A") {
				return "AV";
			} else {
				return "XX";
			}
		},

		strokeColor: function (sType, sStatus, sNodeType) {
			if (getMappingItem(sType, sStatus)) {
				return getMappingItem(sType, sStatus, sNodeType).stroke;
			}
			return getMappingItem().stroke;
		},
		strokeWidth: function (sType, sStatus, sNodeType) {
			if (getMappingItem(sType, sStatus)) {
				return getMappingItem(sType, sStatus, sNodeType).strokeWidth;
			}
			return getMappingItem().strokeWidth;
		},

		strokeDasharray: function (sType, sStatus, sNodeType) {
			if (getMappingItem(sType, sStatus)) {
				return getMappingItem(sType, sStatus, sNodeType).strokeWidth;
			}
			return getMappingItem().strokeWidth;
		},

		fillColor: function (sType, sStatus, sNodeType) {
			if (getMappingItem(sType, sStatus)) {
				return getMappingItem(sType, sStatus, sNodeType).fill;
			}
			return getMappingItem().fill;
		},

		statusIconColor: function (sStatus) {
			return sStatus === "planned" ? "Success" : "Normal";
		},

		/**
		 *
		 * @param sDate
		 */
		getDateObject: function (sDate) {
			if (!sDate) {
				return null;
			}
			var d = sDate.match(/\((.*)\)/).pop();
			return new Date(parseInt(d));
		},

		getMergedDateObject: function (oDate, oTime, sType) {
			if (sType !== shapeNodeType) {
				return null;
			}
			if (!oDate && (!oTime || !oTime.ms)) {
				return null;
			}
			var dateTimestamp = new Date(oDate).getTime();
			return new Date(dateTimestamp + oTime.ms);
		},

		//Block Percentage and Description display on Gantt (Formatter)
		getBlockerTextVisible: function (oAvailabilityTypeGroup, oBlockPercentage) {
			if (oAvailabilityTypeGroup === "L" && oBlockPercentage !== 0) {
				return true;
			} else {
				return false;
			}
		}
	};
});