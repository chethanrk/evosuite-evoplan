/**
 * this controller is for the whole filtering on resource tree
 * if its variant saving restore or changes one of the filters
 */

sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Token",
	"sap/m/Tokenizer"
], function (BaseController, formatter, Filter, FilterOperator, Token, Tokenizer) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.ResourceTreeFilterBar", {

		_oView: null,

		_oFilterBar: null,

		init: function (oView, sControlId) {
			this._oView = oView;
			var oFragment = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.ResourceTreeFilterBar", this);
			var oLayout = oView.byId(sControlId);
			this._oFilterBar = sap.ui.getCore().byId("resourceTreeFilterBar");

			// connect filterbar to view (models, lifecycle)
			oLayout.addContent(oFragment);
		},

		/**
		 * set filter suggest
		 * if no value the full list of suggestion should be displayed
		 * @param oEvent
		 */
		onGroupFilterValueHelpRequest: function (oEvent) {
			if (!this.openGroupFilterSuggest) {
				this.openGroupFilterSuggest = true;

				if (oEvent.getSource().getValue() === "") {
					oEvent.getSource().setProperty("filterSuggests", false);
					return;
				}
			} else {
				this.openGroupFilterSuggest = false;
			}
			oEvent.getSource().setProperty("filterSuggests", true);
		},

		onBeforeVariantSave: function (oEvent) {},

		onBeforeVariantFetch: function (oEvent) {},

		onFilterChange: function (oEvent) {},

		onAfterVariantLoad: function (oEvent) {
			//Todo: set custom fields
			if (this._oFilterBar) {
				var oData = this._oFilterBar.getFilterData();
				var oCustomFieldData = oData["_CUSTOM"];
				if (oCustomFieldData) {
					var oCtrl = this._oFilterBar.determineControlByName("MyOwnFilterField");
					if (oCtrl) {
						oCtrl.setSelectedKey(oCustomFieldData.MyOwnFilterField);
					}
				}
			}
		},

		onExit: function () {

		}
	});

});