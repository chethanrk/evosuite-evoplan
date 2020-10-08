sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.qualifications.QualificationCheck", {

		formatter: formatter,

		init: function () {
			// this._eventBus = sap.ui.getCore().getEventBus();
		},

		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 */
		open: function (that, oView, mParameters) {
			// create dialog lazily
			if (!this._oDialog) {
				that.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.qualifications.fragments.QualificationCheck",
					controller: this
				}).then(function (oDialog) {
					that.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(that, oDialog, oView, mParameters);
				}.bind(this));
			} else {
				this.onOpen(that, this._oDialog, oView, mParameters);
			}
		},

		onOpen: function (that, oDialog, oView, mParameters) {
			this._mParameters = mParameters || {
				bFromHome: true
			};
			this._component = that.getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// oDialog.setModel(that.getModel("viewModel"), "viewModel");
			// connect dialog to view (models, lifecycle)
			oView.addDependent(oDialog);

			// this._getResourceInfo(sId);

			// open dialog
			oDialog.open();
		},

		/**
		 * save form data
		 * @param oEvent
		 */
		onSelectAll: function (oEvent) {

		},
		onCloseDialog: function (oEvent) {
			this._oDialog.close();
		},
		onProceed: function (oEvent) {

		},
		exit: function () {
			// unsubscribe
		}
	});
});