sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast"
], function (BaseController, formatter, Fragment, MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.AssignInfoDialog", {

		formatter: formatter,
		onOpen: function (oDialog) {
			console.log("onOpen")
			this._oDialog = oDialog;
		},
		/**
		 * when dialog closed inside controller
		 */
		_closeDialog: function () {
			this._oDialog.close();
		},

		/**
		 * close dialog
		 * Cancel progress
		 */
		onCloseDialog: function () {
			console.log("onclose dialog trigerred");
			this._closeDialog();
			//when from new gantt shape busy state needs removed

		},

	});
});