sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.LongTextPopover", {

		formatter: formatter,

		init: function () {},

		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 */
		open: function (oView, oEvent, mParameters) {
			var oSource = oEvent.getSource(),
				oContext = oSource.getBindingContext(),
				oModel = oContext.getModel();
			// create dialog lazily
			this._mParameters = mParameters;
			this._component = oView.getController().getOwnerComponent();
			this._oView = oView;
			if (!this._oLongTextPopover) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					id: "LongTextPopover",
					name: "com.evorait.evoplan.view.common.fragments.LongTextPopover",
					controller: this
				}).then(function (oPopover) {
					oView.getModel("appView").setProperty("/busy", false);
					this._oLongTextPopover = oPopover;
					oView.addDependent(oPopover);
					this._openPopOver(oSource, oPopover, oModel, oContext);
				}.bind(this));
			} else {
				this._openPopOver(oSource, this._oLongTextPopover, oModel, oContext);
			}
		},
		_openPopOver: function (oSource, oPopover, oModel, oContext) {
			oPopover.bindElement({
				path: oContext.getPath(),
				parameters: {
					"expand": "DemandToDemandLongText"
				},
				events: {
					dataRequested: function(oEvent){
						oPopover.setBusy(true);
					},
					dataReceived: function(oEvent){
						oPopover.setBusy(false);
					}
				}
			});
			oPopover.openBy(oSource);
			oPopover.getElementBinding().refresh();
		},
		
		/**
		 * on popover close
		 */
		onCloseLongTextPopover: function (oEvent) {
			var oModel = oEvent.getSource().getBindingContext().getModel();
			
			oModel.resetChanges();
			this._oLongTextPopover.close();
		},
		
		/**
		 * Handles the popover 'afterClose' event
		 */
		onAfterCloseLongText: function(oEvent) {
			this.onCloseLongTextPopover(oEvent);
		},
		
		/**
		 * On Save button 'press' handler
		 * Calls function import to post the long text data to a backend
		 */
		onSaveLongText: function(oEvent) {
			var oModel = oEvent.getSource().getBindingContext().getModel();
			return new Promise(function(resolve, reject) {
				oModel.submitChanges({
					success: function(oData) {
						resolve(oData);
					},
					error: function(oError) {
						reject(oError);
					}
				});
			}.bind(this)).then(function(oData) {
				var msg = this._component.getModel("i18n").getResourceBundle().getText("xmsg.saveSuccess");
				this.showMessageToast(msg);
			}.bind(this)).catch(function(oError) {
				var msg = this._component.getModel("i18n").getResourceBundle().getText("errorMessage");
				this.showMessageToast(msg);
			}.bind(this));
		}
	});
});