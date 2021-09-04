sap.ui.define([
	"com/evorait/evoplan/controller/DialogFormController",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/models",
	"sap/m/MessageStrip",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (DialogFormController, formatter, models, MessageStrip, Filter, FilterOperator) {
	"use strict";

	return DialogFormController.extend("com.evorait.evoplan.controller.AssignInfo", {

		_type: {
			add: false,
			edit: false
		},

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/* =========================================================== */
		/* Events                                                      */
		/* =========================================================== */

		/**
		 * @param oEvent
		 */
		onChangeSmartField: function (oEvent) {
			var oSource = oEvent.getSource(),
				sFieldName = oSource.getName();
			var oContext = this.getView().getBindingContext();
			if (oEvent.getSource().getValueState() === "None" && this._type.add) {
				this._checkForDefaultProperties(oContext, this._selectedEntitySet, sFieldName);
			}
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binding has changed in TemplateRenderController
		 * Set new controller context and path
		 * and load plant and new operation number when required
		 * @param sChannel
		 * @param sEvent
		 * @param oData
		 */
		_changedBinding: function (sChannel, sEvent, oData) {
			if (sChannel === "TemplateRendererEvoplan" && sEvent === "changedBinding") {
				DialogFormController.prototype._changedBinding.apply(this, arguments);

				if (oData && oData.viewNameId === this._sViewNameId) {
					this._getDefaultGlobalParameters();
					this._oDialog.setContentWidth("100%");
					this._setDefaultProperties();
				}
			}
		},
		
		_setDefaultProperties: function(){
			
		}
	});
});