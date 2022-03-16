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
		 * Darken or lighten a Hex  code color by percent
		 * example lighten: shadeColor("#63C6FF",40)
		 * example darken: shadeColor("#63C6FF",-40)
		 * @param color
		 * @param percent
		 */
		shadeColor: function (color, percent) {
			var R = parseInt(color.substring(1, 3), 16),
				G = parseInt(color.substring(3, 5), 16),
				B = parseInt(color.substring(5, 7), 16);

			R = parseInt(R * (100 + parseInt(percent)) / 100);
			G = parseInt(G * (100 + parseInt(percent)) / 100);
			B = parseInt(B * (100 + parseInt(percent)) / 100);

			R = R < 255 ? R : 255;
			G = G < 255 ? G : 255;
			B = B < 255 ? B : 255;

			var RR = R.toString(16).length === 1 ? "0" + R.toString(16) : R.toString(16);
			var GG = G.toString(16).length === 1 ? "0" + G.toString(16) : G.toString(16);
			var BB = B.toString(16).length === 1 ? "0" + B.toString(16) : B.toString(16);
			return "#" + RR + GG + BB;
		},

		/**
		 * Formatter for the color fill
		 * Based on the group type the fill the color will be rendered.
		 * A -> Available = White
		 * N & T -> Availability = Pattern
		 * L -> Blocker
		 * 
		 * @param sType
		 * @return {string}
		 */
		getPattern: function (sTypeGroup, sType, sColour, sPattern) {
			if (sPattern) {
				return "url(#" + this._viewId + "--availability-" + sTypeGroup + "-" + sType + ")";
			} else if (sTypeGroup === "A") {
				return "#FFF";
			} else if (sTypeGroup === "O") {
				return "transparent";
			} else if (sTypeGroup === "L") {
				return sColour;
			} else {
				return "transparent";
			}
		},

		/**
		 * set Legend shape ID
		 * @param sTypeGroup
		 * @param sType
		 * @param sColor
		 * @param sPattern
		 */
		getLegendShapeId: function (sCharCode, sCharValue) {
			return sCharCode + "_" + sCharValue;
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