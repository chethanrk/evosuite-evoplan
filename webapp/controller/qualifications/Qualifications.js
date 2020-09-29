sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.qualifications.Qualifications", {

		formatter: formatter,

		init: function () {
			this._eventBus = sap.ui.getCore().getEventBus();
		},

		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 */
		open: function (oView, sId, mParameters) {
			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					id: oView.getId(),
					name: "com.evorait.evoplan.view.qualifications.fragments.ResourceQualifications",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(oDialog, oView, sId, mParameters);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, sId, mParameters);
			}
		},

		onOpen: function (oDialog, oView, sId, mParameters) {
			this._oView = oView;
			this._mParameters = mParameters || {
				bFromHome: true
			};
			this._component = this._oView.getController().getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// connect dialog to view (models, lifecycle)
			oView.addDependent(oDialog);

			this._getResourceInfo(sId);

			// open dialog
			oDialog.open();
		},

		/**
		 * Method to get list of assigned Demands
		 * @param sId
		 * @private
		 */
		_getResourceInfo: function (sId) {
			var oDialog = this._oDialog,
				oModel = this._component.getModel(),
				sKey = oModel.createKey("ResourceSet",{
					ObjectId: sId
				});

			oDialog.bindElement({
				path: "/" + sKey,
				parameters: {
					expand: "ResourceToQualifications"
				},
				events: {
					change: function () {
						var oElementBinding = oDialog.getElementBinding(),
							oContext = oElementBinding.getBoundContext();

					},
					dataRequested: function () {
						oDialog.setBusy(true);
					},
					dataReceived: function () {
						oDialog.setBusy(false);
					}
				}
			});

		},
		/**
		 * save form data
		 * @param oEvent
		 */
		onSaveDialog: function (oEvent) {

		},
		onCloseDialog : function(oEvent){
			this._oDialog.close();
		},
		
		exit: function () {
			// unsubscribe
		}
	});
});