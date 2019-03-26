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

		formatter: formatter,

		_oView: null,

		_oFilterBar: null,

		_isOldVariant: false,

		_aCustomFilters: ["SearchGroup", "NodeType", "ResourceGroupToken"],

		_oOldCustomFilterMapping: {
			SearchGroup: "searchField",
			NodeType: "viewFilterItem",
			ResourceGroupToken: "multiGroupInput",
			StartDate: "dateRange1",
			EndDate: "dateRange2"
		},

		defaultDateRange: [],

		init: function (oView, sControlId) {
			this._oView = oView;
			var oFragment = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.ResourceTreeFilterBar", this);
			var oLayout = oView.byId(sControlId);
			this._oFilterBar = sap.ui.getCore().byId("resourceTreeFilterBar");
			this._oVariantMangement = this._oFilterBar.getSmartVariant();

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

		onInitialized: function (oEvent) {

		},

		onFilterChange: function (oEvent) {
			console.log("onFilterChange");
		},

		onBeforeVariantFetch: function (oEvent) {
			console.log("onBeforeVariantFetch");
			if (oEvent.getParameter("context") === "STANDARD") {
				this._updateCustomFilter();
			}
		},

		/**
		 * Todo: set custom fields
		 * @param oEvent
		 */
		onAfterVariantLoad: function (oEvent) {
			console.log("onAfterVariantLoad");
			this._isOldVariant = false;
			var oData = this._oFilterBar.getFilterData(),
				oCustomFieldData = oData["_CUSTOM"],
				selectedVariantKey = this._oVariantMangement.getSelectionKey(),
				oVariantContent = this._oVariantMangement.getVariantContent(null, selectedVariantKey);

			//maybe there are old variants saved from deprecated custom variant managment control
			var aIsOldVariant = this._mapOldVariant(oVariantContent);
			if (aIsOldVariant && aIsOldVariant.length > 0) {
				this._isOldVariant = true;
				oCustomFieldData = aIsOldVariant;
			}

			this._setCustomFilterData(oCustomFieldData);

			var timeFormatKey = this._oFilterBar.determineControlByName("NodeType").getSelectedKey(),
				selectedTimeFormat = formatter.getResourceFormatByKey(timeFormatKey);
			if (selectedTimeFormat) {
				this._setDateFilters(selectedTimeFormat.getDateBegin(), selectedTimeFormat.getDateEnd());
			} else {
				this._setDateFilters();
			}

			//Todo: start search
			this._getAllFilters();
		},

		onExit: function () {

		},

		/**
		 * collection of all filter from view settings dialog and also from search field
		 * @returns {Array}
		 * @private
		 */
		_getAllFilters: function () {
			var aFilters = [],
				oSearchFieldFilter = null;

			//create Searchfield filter
			var oSearchFieldCtrl = this._oFilterBar.determineControlByName("SearchGroup");
			if (oSearchFieldCtrl) {
				oSearchFieldFilter = new Filter("Description", FilterOperator.Contains, oSearchFieldCtrl.getValue());
			}

			//create ResourceGroup filter
			var oResourceGroupTokenCtrl = this._oFilterBar.determineControlByName("ResourceGroupToken");
			if (oResourceGroupTokenCtrl) {
				var aResoureGroupTokens = oResourceGroupTokenCtrl.getTokens();
				this._setResourceGroupIdFilters(aResoureGroupTokens);
			}

			//Filterbar Filter array fron standard fields
			var aStandardFilters = this._oFilterBar.getFilters();
			aStandardFilters = aStandardFilters[0].aFilters;
		},

		/**
		 *
		 * @private
		 */
		_updateCustomFilter: function () {
			if (this._oFilterBar) {
				var oCustom = {
					_CUSTOM: {}
				};

				for (var i = 0; i < this._aCustomFilters.length; i++) {
					var sFilterKey = this._aCustomFilters[i],
						oCtrl = this._oFilterBar.determineControlByName(sFilterKey);

					if (oCtrl) {
						try {
							oCustom._CUSTOM[sFilterKey] = oCtrl.getSelectedKey();
						} catch (e) { /*do nothing*/ }
						try {
							oCustom._CUSTOM[sFilterKey] = oCtrl.getValue();
						} catch (e) { /*do nothing*/ }
						this._oFilterBar.setFilterData(oCustom);
					}
				}
			}
		},

		_mapOldVariant: function (oVariant) {
			var oFilterData = JSON.parse(oVariant.filterBarVariant),
				newMapping = [];
			if (oFilterData) {
				for (var key in this._oOldCustomFilterMapping) {
					if (oFilterData.hasOwnProperty(this._oOldCustomFilterMapping[key])) {
						var obj = {};
						obj[key] = oFilterData[this._oOldCustomFilterMapping[key]];
						newMapping.push(obj);
					}
				}
			}
			return newMapping.length > 0 ? newMapping : false;
		},

		_setCustomFilterData: function (oData) {
			if (oData) {
				for (var i = 0; i < oData.length; i++) {
					var sFilterKey = undefined;
					for (var prop in oData[i]) {
						if (this._aCustomFilters.indexOf(prop) >= 0) {
							sFilterKey = prop;
						}
					}
					if (sFilterKey) {
						var oCtrl = this._oFilterBar.determineControlByName(sFilterKey),
							sValue = oData[i][sFilterKey];
						sValue = sValue.value ? sValue.value : sValue;
					}

					if (oCtrl) {
						if (sValue instanceof Array) {
							//set multi input
							for (var l = 0; l < sValue.length; l++) {
								if (this._isOldVariant) {
									this._validateResourceGroupToken(sValue[l], oCtrl);
								} else {
									this._setResourceGroupToken(sValue[l], oCtrl);
								}
							}
							if (!this._isOldVariant) {
								oCtrl.setValue(oData[sFilterKey]);
								this._setResourceGroupIdFilters();
							}
						} else {
							try {
								//set select box
								oCtrl.setSelectedKey(sValue);
							} catch (e) { /*do nothing*/ }
							try {
								//set input field
								oCtrl.setValue(sValue);
							} catch (e) { /*do nothing*/ }
						}
					}
				}
			}
		},

		_validateResourceGroupToken: function (oToken, oCtrl) {
			var oFilt1 = new Filter("ObjectType", FilterOperator.EQ, "RES_GROUP"),
				oFilt2 = new Filter("Description", FilterOperator.EQ, oToken.text),
				oFilter = new Filter([oFilt1, oFilt2], true);

			/*this._oView.getModel().read("/ResourceSet", {
				filters: [oFilter],
				success: function (result) {
					console.log(result);
					if (result && result.length > 0) {
						this._setResourceGroupToken(oToken, oCtrl);
					}
				}.bind(this),
				error: function () {
					//do nothing
				}.bind(this)
			});*/
		},

		_setResourceGroupToken: function (oToken, oCtrl) {
			oCtrl.addToken(new Token({
				key: oToken.key,
				text: oToken.text
			}));
			oCtrl.fireTokenUpdate({
				type: Tokenizer.TokenUpdateType.Added
			});
		},

		_setResourceGroupIdFilters: function (aTokens) {
			var keyFieldName = "ResourceGroupGuid";
			var currFilterData = this._oFilterBar.getFilterData(),
				hasGroupFilter = currFilterData && currFilterData.ResourceGroupGuid,
				isInside = false;

			if (!hasGroupFilter) {
				currFilterData[keyFieldName] = {
					ranges: []
				};
			}
			for (var i = 0; i < aTokens.length; i++) {
				var objKey = aTokens[i].getKey();
				var newFilterItem = {
					exclude: false,
					keyField: keyFieldName,
					operation: sap.ui.model.FilterOperator.EQ,
					tokenText: "=" + objKey,
					value1: objKey
				};

				if (currFilterData[keyFieldName].ranges.length > 0) {
					for (var j = 0; j < currFilterData[keyFieldName].ranges.length; j++) {
						if (currFilterData[keyFieldName].ranges[j].value1 === objKey) {
							isInside = true;
						}
					}

				}
				if (!isInside) {
					currFilterData[keyFieldName].ranges.push(newFilterItem);
				}
			}
			this._oFilterBar.setFilterData(currFilterData);
		},

		/**
		 * set filter date range before first request in filter settings dialog
		 * @private
		 */
		_getDefaultFilterDateRange: function () {
			var oDateFrom = new Date("01/01/1990");
			var oDateTo = moment().endOf("year");
			oDateTo = oDateTo.add(20, "years").toDate();
			return [oDateFrom, oDateTo];
		},

		_setDateFilters: function (startDate, endDate) {
			var currFilterData = this._oFilterBar.getFilterData();

			if (!startDate || !endDate) {
				var d = this._getDefaultFilterDateRange();
				startDate = d[0];
				endDate = d[1];
			}

			var newStartDate = {
				exclude: false,
				keyField: "StartDate",
				operation: sap.ui.model.FilterOperator.EQ,
				tokenText: "=" + this.formatter.date(startDate),
				value1: this.formatter.date(startDate)
			};

			var newEndDate = {
				exclude: false,
				keyField: "EndDate",
				operation: sap.ui.model.FilterOperator.EQ,
				tokenText: "=" + this.formatter.date(endDate),
				value1: this.formatter.date(endDate)
			};

			currFilterData = {
				StartDate: {
					ranges: [newStartDate]
				},
				EndDate: {
					ranges: [newEndDate]
				}
			};
			this._oFilterBar.setFilterData(currFilterData);
		}
	});

});