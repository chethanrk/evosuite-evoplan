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
		open: function (oView, oSource, mParameters) {
			var oContext = oSource.getBindingContext(),
				oModel = oContext.getModel();

			// create dialog lazily
			this._mParameters = mParameters;
			this._component = oView.getController().getOwnerComponent();
			this._oView = oView;
			this._oContext = oContext;
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
			var bIsOperationLongText = this._oView.getModel("viewModel").getProperty("/isOpetationLongTextPressed"),
				sExpandParameter = {};
			sExpandParameter.expand = bIsOperationLongText ? "DemandToDemandOperLongText" : "DemandToDemandLongText";
			oPopover.bindElement({
				path: oContext.getPath(),
				parameters: sExpandParameter,
				events: {
					dataRequested: function (oEvent) {
						oPopover.setBusy(true);
					},
					dataReceived: function (oEvent) {
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
			this._oLongTextPopover.close();
		},

		/**
		 * Handles the popover 'afterClose' event
		 */
		onAfterCloseLongText: function (oEvent) {
			var oModel = oEvent.getSource().getBindingContext().getModel(),
				aChanges = Object.entries(oModel.getPendingChanges()),
				sPath = "";
			for (var i in aChanges) {
				if (aChanges[i][0].indexOf("LongTextSet") !== -1) {
					sPath = "/" + aChanges[i][0];
				}
			}
			if (sPath) {
				oModel.resetChanges([sPath]);
			}
			this._refreshRowContext(oModel);
		},

		/**
		 * On Save button 'press' handler
		 * Calls function import to post the long text data to a backend
		 */
		onSaveLongText: function (oEvent) {
			var oModel = oEvent.getSource().getBindingContext().getModel(),
				aChanges = Object.entries(oModel.getPendingChanges()),
				sPath = "",
				oParam = "",
				msg;
			for (var i in aChanges) {
				if (aChanges[i][0].indexOf("LongTextSet") !== -1) {
					sPath = "/" + aChanges[i][0];
					oParam = aChanges[i][1];
				}
			}
			if (!sPath) {
				msg = this._component.getModel("i18n").getResourceBundle().getText("ymsg.noChange");
				this.showMessageToast(msg);
				return;
			}
			return new Promise(function (resolve, reject) {
				oModel.update(sPath, oParam, {
					success: function (oData) {
						resolve(oData);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			}).then(function (oData) {
				msg = this._component.getModel("i18n").getResourceBundle().getText("xmsg.saveSuccess");
				this.showMessageToast(msg);
				this._oLongTextPopover.close();
			}.bind(this)).catch(function (oError) {
				msg = this._component.getModel("i18n").getResourceBundle().getText("errorMessage");
				this.showMessageToast(msg);
			}.bind(this));
		},
		/**
		 * Updating Demand row after saving Long Text
		 * @params oModel
		 */
		_refreshRowContext: function (oModel) {
			var oRowContext = oModel.getProperty(this._oContext.getPath());
			this._component._getData(this._oContext.getPath()).then(function (oResult) {
				oRowContext = oResult;
			});
		}
	});
});