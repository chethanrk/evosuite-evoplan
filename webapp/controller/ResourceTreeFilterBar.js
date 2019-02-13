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
			this._oFilterBar = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.ResourceTreeFilterBar", this);
			var oLayout = oView.byId(sControlId);
			//this._oFilterBar = sap.ui.getCore().byId("resourceTreeFilterBar");

			// connect filterbar to view (models, lifecycle)
			oLayout.addContent(this._oFilterBar);
			//this._oView.addDependent(this._oFilterBar);
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

		onExit: function () {

		}
	});

});