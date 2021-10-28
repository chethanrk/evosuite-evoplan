sap.ui.define([
	"com/evorait/evoplan/controller/TemplateRenderController",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/model/Constants"
], function (TemplateRenderController, Fragment, Constants) {
	"use strict";

	return TemplateRenderController.extend("com.evorait.evoplan.controller.DialogTemplateRenderController", {

		_oHelperModel: null,

		_oDialog: null,

		_oResourceBundle: null,

		_oView: null,

		_oModel: null,

		_mParams: {},

		/**
		 * overwrite constructor
		 * set manuel owner component for nested xml views
		 */
		constructor: function (oComponent) {
			this.setOwnerComponent(oComponent);
			TemplateRenderController.apply(this, arguments);
		},

		/**
		 * open dialog 
		 * and render annotation based SmartForm inside dialog content
		 */
		open: function (oView, mParams, onDataReceived) {
			this._eventBus = sap.ui.getCore().getEventBus();
			this._oView = oView;
			this._oModel = oView.getModel();
			this._oResourceBundle = oView.getController().getOwnerComponent().getModel("i18n").getResourceBundle();
			this._mParams = mParams;
			this._oSmartTable = mParams.smartTable;
			this._component = this._oView.getController().getOwnerComponent();

			//set annotation path and other parameters
			this.setTemplateProperties(mParams);

			this._loadDialog(this._mParams.oDialogController, onDataReceived);
		},

		onExit: function () {
			TemplateRenderController.prototype.onExit.apply(this, arguments);
			this._oDialog.destroy(true);
			this._oDialog = undefined;
		},

		/* =========================================================== */
		/* internal methods                                              */
		/* =========================================================== */

		/*
		 * init dialog with right fragment name
		 * and set context to the view
		 * @returns {sap.ui.core.Control|sap.ui.core.Control[]}
		 * @private
		 */
		_loadDialog: function (sDialogController, onDataReceived) {
			if (!this._oDialog) {
				Fragment.load({
					name: "com.evorait.evoplan.view.fragments.FormDialog",
					controller: sDialogController || this,
					type: "XML"
				}).then(function (oFragment) {
					this._oDialog = oFragment;
					this._oDialog.addStyleClass(this._oView.getModel("viewModel").getProperty("/densityClass"));
					this._setFragmentViewBinding(onDataReceived);
				}.bind(this));
			} else {
				this._setFragmentViewBinding(onDataReceived);
			}
		},

		/**
		 * load new template and set inside dialog
		 * Bind dialog view to generated path
		 */
		_setFragmentViewBinding: function (onDataReceived) {
			var sPath = this.getEntityPath(this._mParams.entitySet, this._mParams.pathParams, this._oView, this._mParams.sPath);
			this._oDialog.setBusyIndicatorDelay(0);
			this._oDialog.setBusy(true);
			// this._oDialog.unbindElement();
			// this._oDialog.bindElement(sPath);
			this._oDialog.setTitle(this._oResourceBundle.getText(this._mParams.title));
			this._oView.addDependent(this._oDialog);

			this._oModel.metadataLoaded().then(function () {
				//get template and create views
				this._mParams.oView = this._oView;
				this.insertTemplateFragment(sPath, this._mParams.viewName, "FormDialogWrapper", this._afterBindSuccess.bind(this, sPath), this._mParams,
					onDataReceived.bind(this, this._oDialog, this._oView, sPath));
			}.bind(this));

			this._oDialog.open();
		},

		/**
		 * What should happen after binding changed
		 */
		_afterBindSuccess: function (sPath, data, mParams) {
			this._oDialog.setBusy(false);
		},

		/**
		 * Saving was successful
		 * do further things after save
		 * @param oResponse
		 */
		_saveSuccessFn: function (oResponse) {
			this._oDialog.close();
			var responseCode = oResponse.__batchResponses[0].__changeResponses;
			if (responseCode) {
				if (responseCode[0].statusCode === "200" || responseCode[0].statusCode === "201" || responseCode[0].statusCode === "204") {
					var msg = this._oResourceBundle.getText("msg.saveSuccess");
					this.showMessageToast(msg);
					setTimeout(function () {
						if (this._oSmartTable) {
							this._oSmartTable.rebindTable();
						}
					}.bind(this), 1500);
				} else {
					//Todo show error message
				}
			}
		},

		/**
		 * Saving failed
		 * do further things after save
		 * @param oError
		 */
		_saveErrorFn: function (oError) {

		}

	});
});