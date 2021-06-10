sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (BaseController, MessageBox, MessageToast) {
	return BaseController.extend("com.evorait.evoplan.controller.manageResources.ManageResourceActionsController", {
		/**
		 * Delete Resource
		 * @param {Object} aModel 
		 * @param {Object} sPath 
		 * 
		 */
		doDeleteResource: function (oModel, sPath, bIsMoved) {
			// MessageToast.show("Delete Operation");

			// var oResourceBundle = this.getResourceBundle();
			return new Promise(function (resolved, rejected) {
				oModel.remove(sPath, {
					method: "DELETE",
					success: function (oData, oResponse) {
						var sSeverity = JSON.parse(oResponse.headers["sap-message"]).severity;
						if (bIsMoved && sSeverity !== "error") {
							resolved(oResponse);
						} else {
							this.showMessage(oResponse);
						}
					}.bind(this),
					error: function (oError) {
						rejected(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Create Resource
		 * @param {Object} aModel 
		 * @param {Object} sPath 
		 * @param {Object} aPayload 
		 * 
		 */
		doCreateResource: function (oModel, sPath, aPayload) {
			return new Promise(function (resolved, rejected) {
				oModel.create(sPath, aPayload, {
					method: "POST",
					success: function (oData, oResponse) {
						this.showMessage(oResponse);
						resolved(oResponse);
					}.bind(this),
					error: function (oError) {
						rejected(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Update Group/Resource
		 * @param {Object} aModel 
		 * @param {Object} sPath 
		 * @param {Object} aPayload 
		 * 
		 */
		doUpdateResource: function (oModel, sPath, aPayload) {
			return new Promise(function (resolved, rejected) {
				oModel.update(sPath, aPayload, {
					method: "PUT",
					success: function (oData, oResponse) {
						this.showMessage(oResponse);
						resolved(oResponse);
					}.bind(this),
					error: function (oError) {
						rejected(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * save assignment after drop
		 * 
		 * @param {Object} aSourcePaths
		 * @param {String} sTargetPath
		 */

	});
});