sap.ui.define(["sap/uxap/BlockBase"], function (BlockBase) {
	"use strict";
	var myBlock = BlockBase.extend("com.evorait.evoplan.block.sections.DemandComponentBlock", {
		metadata: {
			events: {
				onRowClick: {}
			}
		},
		/**
		 * Specifies the text fot Material Status
		 * @param sValue
		 * @returns Material Status on given Value
		 */
		formatMaterialStatus: function (sStatus, sStatusDesc) {
			if (sStatus === "1") {
				return sStatusDesc;
			} else if (sStatus === "2") {
				return sStatusDesc;
			} else if (sStatus === "3") {
				return sStatusDesc;
			} else {
				return sStatusDesc;
			}
		},
		formatMaterialStatusIcon: function (sValue) {
			if (sValue === "1") {
				return "sap-icon://message-success";
			} else if (sValue === "2") {
				return "sap-icon://message-warning";
			} else if (sValue === "3") {
				return "sap-icon://message-error";
			} else {
				return "sap-icon://pending";
			}
		},
		formatMaterialState: function (sValue) {
			if (sValue === "1") {
				return "Success";
			} else if (sValue === "2") {
				return "Warning";
			} else if (sValue === "3") {
				return "Error";
			} else {
				return "Information";
			}
		},
		formatMatStatusTooltip: function (sStatus, sStatusDesc) {
			var oBundle = this.getResourceBundle();
			if (sStatus === "1") {
				return oBundle.getText("xtit.available");
			} else if (sStatus === "2") {
				return oBundle.getText("xtit.partialAvailable");
			} else if (sStatus === "3") {
				return oBundle.getText("xtit.notAvailable");
			} else {
				return oBundle.getText("xtit.refreshTooltip");
			}
		},
	});
	return myBlock;
}, true);