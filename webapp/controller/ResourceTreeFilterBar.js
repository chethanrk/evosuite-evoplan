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

		_aCustomFilters: ["BasicSearch", "NodeType", "ResourceGroupToken"],

		_oOldCustomFilterNames: {
			BasicSearch: "searchField",
			NodeType: "viewFilterItem",
            ResourceGroupToken: "multiGroupInput",
            StartDate: "dateRange1",
            EndDate: "dateRange2"
		},

		init: function (oView, sControlId) {
			this._oView = oView;
			var oFragment = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.ResourceTreeFilterBar", this);
			var oLayout = oView.byId(sControlId);
			this._oFilterBar = sap.ui.getCore().byId("resourceTreeFilterBar");
			this._oVariantMangement = this._oFilterBar.getVariantManagement();

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

        /**
		 *
         * @param oEvent
         */
        onInitialized: function (oEvent) {
            console.log("onInitialized");
            var oSource = oEvent.getSource();

        },

        onFilterChange: function (oEvent) {
            console.log("onFilterChange");
        },

		onBeforeVariantSave: function (oEvent) {
            if (oEvent.getParameter("context") === "STANDARD") {
                this._updateCustomFilter();
            }
		},

		onBeforeVariantFetch: function (oEvent) {
            this._updateCustomFilter();
		},


        /**
		 * Todo: set custom fields
         * @param oEvent
         */
		onAfterVariantLoad: function (oEvent) {
            console.log("onAfterVariantLoad");
			var oData = this._oFilterBar.getFilterData(),
				oCustomFieldData = oData["_CUSTOM"];

			if (oCustomFieldData) {
				for (var i = 0; i < this._aCustomFilters.length; i++) {
					var sFilterKey = this._aCustomFilters[i],
						oCtrl = this._oFilterBar.determineControlByName(sFilterKey);

					if(oCtrl){
						try{
							oCtrl.setSelectedKey(oCustomFieldData[sFilterKey]);
						}catch (e){ /*do nothing*/ }
						try{
							oCtrl.setValue(oCustomFieldData[sFilterKey]);
						}catch (e){ /*do nothing*/ }
					}
				}
			}
		},

		onExit: function () {

		},

        /**
		 *
         * @private
         */
        _updateCustomFilter: function () {
            if (this._oFilterBar) {
            	var oCustom = { _CUSTOM : {}};

                for (var i = 0; i < this._aCustomFilters.length; i++) {
                    var sFilterKey = this._aCustomFilters[i],
                        oCtrl = this._oFilterBar.determineControlByName(sFilterKey);
                    if (oCtrl) {
                    	oCustom._CUSTOM[sFilterKey] = oCtrl.getSelectedKey();
                        this._oFilterBar.setFilterData(oCustom);
                    }
                }
            }
        },
		
		_getCustomFilterQuery: function () {
			
        }
	});

});