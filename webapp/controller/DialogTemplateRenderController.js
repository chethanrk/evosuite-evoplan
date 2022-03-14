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

			if (mParams.isResponsivePopOver) {
				this._loadPopOver(this._mParams.oDialogController, onDataReceived);
			} else {
				this._loadDialog(this._mParams.oDialogController, onDataReceived);
			}
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
					this._setFragmentViewBinding(this._oDialog, onDataReceived);
				}.bind(this));
			} else {
				this._setFragmentViewBinding(this._oDialog, onDataReceived);
			}
		},

		/*
		 * init popover with right fragment name
		 * and set context to the view
		 * @returns {sap.ui.core.Control|sap.ui.core.Control[]}
		 * @private
		 */
		_loadPopOver: function (sDialogController, onDataReceived) {
			if (!this._ResponsivePopOver) {
				Fragment.load({
					name: "com.evorait.evoplan.view.fragments.ResponsivePopOver",
					controller: sDialogController || this,
					type: "XML"
				}).then(function (oFragment) {
					this._ResponsivePopOver = oFragment;
					this._ResponsivePopOver.addStyleClass(this._oView.getModel("viewModel").getProperty("/densityClass"));
					this._setFragmentViewBinding(this._ResponsivePopOver, onDataReceived);
				}.bind(this));
			} else {
				this._setFragmentViewBinding(this._ResponsivePopOver, onDataReceived);
			}
		},

		/**
		 * load new template and set inside dialog/Popover
		 * Bind dialog view to generated path
		 */
		_setFragmentViewBinding: function (oFragment, onDataReceived) {
			var sPath = this.getEntityPath(this._mParams.entitySet, this._mParams.pathParams, this._oView, this._mParams.sPath),
				sContainerId;
			oFragment.setBusyIndicatorDelay(0);
			oFragment.setBusy(true);

			if (this._mParams.isResponsivePopOver) {
				sContainerId = "ResponsivePopOverWrapper";
			} else {
				sContainerId = "FormDialogWrapper";
				oFragment.setTitle(this._oResourceBundle.getText(this._mParams.title));
			}
			this._oView.addDependent(oFragment);

			this._oModel.metadataLoaded().then(function () {
				//get template and create views
				this._mParams.oView = this._oView;
				this.insertTemplateFragment(sPath, this._mParams.viewName, sContainerId, this._afterBindSuccess.bind(this, sPath), this._mParams,
					onDataReceived.bind(this, oFragment, this._oView, sPath));
			}.bind(this));

			this._mParams.isResponsivePopOver ? oFragment.openBy(this._mParams.ResponsivePopOverSource) : oFragment.open();
		},

		/**
		 * What should happen after binding changed
		 */
		_afterBindSuccess: function (sPath, data, mParams) {
			if (this._oDialog) {
				this._oDialog.setBusy(false);
			}
			if (this._ResponsivePopOver) {
				this._ResponsivePopOver.setBusy(false);
			}
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

		},
		closeResponsivePopOver: function () {
			this._ResponsivePopOver ? this._ResponsivePopOver.close() : "";
		}

	});
});