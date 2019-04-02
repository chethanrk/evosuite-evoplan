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

		_oCustomFilterData: {
			_CUSTOM: {}
		},

		_isOldVariant: false,

		_aCustomFilters: {
			search: {
				origin: "Description",
				old: "searchField"
			},
			resourceGroup: {
				origin: "ResourceGroupGuid",
				old: "multiGroupInput"
			},
			viewType: {
				origin: "NodeType",
				old: "viewFilterItem"
			},
			startDate: {
				origin: "StartDate",
				old: "dateRange1"
			},
			endDate: {
				origin: "EndDate",
				old: "dateRange2"
			}
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

		getFilterBar: function () {
			if (!this._oFilterBar) {
				this._oFilterBar = sap.ui.getCore().byId("resourceTreeFilterBar");
			}
			return this._oFilterBar;
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

		onBeforeVariantFetch: function (oEvent) {
			this._updateCustomFilterData();
		},

		onFilterBarChanged: function (oEvent) {
			/*var oParams = oEvent.getParameters();
			if (oParams.getId() === "change") {
			}*/
		},

		onCustomFilterChange: function (oEvent) {
			if (this.getFilterBar()) {
				this._updateCustomFilterData();
			}
		},

		onCustomSearchChange: function (oEvent) {
			if (this.getFilterBar()) {
				this._updateCustomFilterData();
				this._triggerSearch();
			}
		},

		onChangeTimeView: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oItem = oParams.selectedItem,
				newDateRange = this._getDateRangeValues(null, oItem.getKey());

			var oStartDate = this._oFilterBar.getControlByKey(this._aCustomFilters.startDate.origin),
				oEndDate = this._oFilterBar.getControlByKey(this._aCustomFilters.endDate.origin);
			oStartDate.setValue(newDateRange[0]);
			oEndDate.setValue(newDateRange[1]);
		},

		/**
		 * Todo: set custom fields
		 * @param oEvent
		 */
		onAfterVariantLoad: function (oEvent) {
			this._isOldVariant = false;
			this._waitForTokenValidation = false;

			var oData = this._oFilterBar.getFilterData(),
				oCustomFieldData = {},
				selectedVariantKey = this._oVariantMangement.getSelectionKey(),
				oVariantContent = this._oVariantMangement.getVariantContent(null, selectedVariantKey);

			if (oData._CUSTOM) {
				this._oCustomFilterData._CUSTOM = oData._CUSTOM;
				oCustomFieldData = oData._CUSTOM;
			} else {
				//maybe there are old variants saved from deprecated custom variant managment control
				var aIsOldVariant = this._mapOldVariant(oVariantContent);
				if (aIsOldVariant) {
					this._isOldVariant = true;
					oCustomFieldData = aIsOldVariant;
				}
			}

			//set date range filter values
			var aDateRange = this._getDateRangeValues(oCustomFieldData);
			oCustomFieldData[this._aCustomFilters.startDate.origin] = aDateRange[0];
			oCustomFieldData[this._aCustomFilters.endDate.origin] = aDateRange[1];
			this._setCustomFilterControls(oCustomFieldData);

			if (!this._waitForTokenValidation) {
				this._triggerSearch();
			}
		},

		onExit: function () {

		},

		getAllCustomFilters: function () {
			var aStandardFilter = this._oFilterBar.getFilters();
			var aFilters = aStandardFilter[0] ? aStandardFilter[0].aFilters : [];

			for (var key in this._oCustomFilterData._CUSTOM) {
				if (key === this._aCustomFilters.search.origin) {
					//Decription field
					if (this._oCustomFilterData._CUSTOM[key]) {
						aFilters.push(new Filter(key, FilterOperator.Contains, this._oCustomFilterData._CUSTOM[key]));
					}
				} else if (key === this._aCustomFilters.viewType.origin) {
					//NodeType field
					aFilters.push(new Filter(key, FilterOperator.EQ, this._oCustomFilterData._CUSTOM[key]));
				} else if (key === this._aCustomFilters.startDate.origin) {
					//StartDate field
					aFilters.push(new Filter(key, FilterOperator.LE, this._oCustomFilterData._CUSTOM[key]));
				} else if (key === this._aCustomFilters.endDate.origin) {
					//EndDate field
					aFilters.push(new Filter(key, FilterOperator.GE, this._oCustomFilterData._CUSTOM[key]));
				} else if (typeof this._oCustomFilterData._CUSTOM[key] === "object") {
					//ResourceGroupId tokens
					var aResourceGroupFilter = [];
					for (var i = 0; i < this._oCustomFilterData._CUSTOM[key].length; i++) {
						aResourceGroupFilter.push(new Filter(key, FilterOperator.EQ, this._oCustomFilterData._CUSTOM[key][i]));
					}
					if (aResourceGroupFilter.length > 0) {
						aFilters.push(new Filter(aResourceGroupFilter, false));
					}
				}
			}
			return aFilters;
		},

		getDateRange: function () {
			return this._getDateRangeValues();
		},

		getViewType: function () {
			if (this._oCustomFilterData._CUSTOM[this._aCustomFilters.viewType.origin]) {
				return this._oCustomFilterData._CUSTOM[this._aCustomFilters.viewType.origin];
			} else {
				var oCtrl = this._oFilterBar.getControlByKey(this._aCustomFilters.viewType.origin);
				return oCtrl.getSelectedKey();
			}
		},

		/**
		 *
		 * @private
		 */
		_updateCustomFilterData: function () {
			this._oCustomFilterData._CUSTOM = {};

			for (var key in this._aCustomFilters) {
				var sFilterKey = this._aCustomFilters[key].origin,
					oCtrl = this._oFilterBar.getControlByKey(sFilterKey);
				if (oCtrl) {
					try {
						this._oCustomFilterData._CUSTOM[sFilterKey] = oCtrl.getValue();
					} catch (e) { /*do nothing*/ }
					try {
						this._oCustomFilterData._CUSTOM[sFilterKey] = oCtrl.getSelectedKey();
					} catch (e) { /*do nothing*/ }
					try {
						this._oCustomFilterData._CUSTOM[sFilterKey] = oCtrl.getSelectedKeys();
					} catch (e) { /*do nothing*/ }
				}
			}
		},

		_mapOldVariant: function (oVariant) {
			var oFilterData = JSON.parse(oVariant.filterBarVariant),
				newMapping = {};
			if (oFilterData) {
				for (var key in this._aCustomFilters) {
					if (oFilterData.hasOwnProperty(this._aCustomFilters[key].old)) {
						newMapping[this._aCustomFilters[key].origin] = oFilterData[this._aCustomFilters[key].old].value;
					}
				}
			}
			return Object.getOwnPropertyNames(newMapping).length > 0 ? newMapping : false;
		},

		_setCustomFilterControls: function (oData) {
			for (var key in this._aCustomFilters) {
				var sFilterKey = this._aCustomFilters[key].origin,
					oCtrl = this._oFilterBar.getControlByKey(sFilterKey),
					sValue = "";

				if (oData && oData.hasOwnProperty(sFilterKey)) {
					sValue = oData[sFilterKey];
					sValue = sValue.value ? sValue.value : sValue;
				}

				if (oCtrl instanceof sap.m.MultiComboBox) {
					oCtrl.setSelectedKeys([]);
					if (this._isOldVariant) {
						//reset ResourceGroupGuid
						this._setResourceGroupToken(null, oCtrl, sFilterKey, null);
					}
					//set multi input
					if (sValue instanceof Array) {
						if (this._isOldVariant) {
							for (var l = 0; l < sValue.length; l++) {
								//validate at first against backend service
								this._waitForTokenValidation = true;
								this._validateResourceGroupToken(sValue[l], oCtrl, sFilterKey, l, (l === (sValue.length - 1)));
							}
						} else {
							oCtrl.setSelectedKeys(sValue);
						}
					}
				} else if (oCtrl instanceof sap.m.Select) {
					//set select box
					oCtrl.setSelectedKey(sValue);
					if (this._isOldVariant) {
						this._setCustomFilterDataValue(sFilterKey, sValue);
					}
				} else if (oCtrl.setValue) {
					//set input field
					oCtrl.setValue(sValue);
					if (this._isOldVariant) {
						this._setCustomFilterDataValue(sFilterKey, sValue);
					}
				}
			}
		},

		_validateResourceGroupToken: function (oToken, oCtrl, sKey, idx, isLast) {
			var oFilt1 = new Filter("ObjectType", FilterOperator.EQ, "RES_GROUP"),
				oFilt2 = new Filter("Description", FilterOperator.EQ, oToken.text),
				oFilter = new Filter([oFilt1, oFilt2], true);

			this._oView.getModel().read("/ResourceSet", {
				filters: [oFilter],
				success: function (result) {
					if (result.results && result.results.length > 0) {
						oToken.key = result.results[0].ResourceGroupGuid;
						oToken.text = result.results[0].GroupDescription;
						this._setResourceGroupToken(oToken, oCtrl, sKey, idx);
					}
					if (isLast) {
						this._triggerSearch();
					}
				}.bind(this),
				error: function () {
					if (isLast) {
						this._triggerSearch();
					}
				}.bind(this)
			});
		},

		_triggerSearch: function () {
			this._oFilterBar.fireSearch();
		},

		_setResourceGroupToken: function (oToken, oCtrl, sKey, idx) {
			var currFilterData = this._oCustomFilterData._CUSTOM || {};

			if (!idx || idx === 0 || !currFilterData[sKey]) {
				oCtrl.setSelectedKeys([]);
				currFilterData[sKey] = [];
			}

			if (oToken) {
				//set visible token for custom field with key ResourceGroupGuid
				oCtrl.addSelectedKeys([oToken.key]);
				currFilterData[sKey].push(oToken.key);
			}
			this._oCustomFilterData._CUSTOM = currFilterData;
		},

		_setCustomFilterDataValue: function (sKey, sValue) {
			var currFilterData = this._oCustomFilterData._CUSTOM || {};
			currFilterData[sKey] = sValue || "";
			this._oCustomFilterData._CUSTOM = currFilterData;
		},

		_getDateRangeValues: function (oData, sDateRangeType) {
			var selectedTimeFormat = undefined;
			if (oData) {
				if (!oData.hasOwnProperty(this._aCustomFilters.startDate.origin) || oData.hasOwnProperty(this._aCustomFilters.endDate.origin)) {
					var sViewType = oData[this._aCustomFilters.viewType.origin];
					if (!sViewType) {
						sViewType = this._oFilterBar.getControlByKey(this._aCustomFilters.viewType.origin).getSelectedKey();
					}
					selectedTimeFormat = formatter.getResourceFormatByKey(sViewType);
					return [this.formatter.date(selectedTimeFormat.getDateBegin()), this.formatter.date(selectedTimeFormat.getDateEnd())];
				}
			} else if (sDateRangeType) {
				selectedTimeFormat = formatter.getResourceFormatByKey(sDateRangeType);
				return [this.formatter.date(selectedTimeFormat.getDateBegin()), this.formatter.date(selectedTimeFormat.getDateEnd())];
			} else if (this._oCustomFilterData._CUSTOM[this._aCustomFilters.startDate.origin]) {
				return [
					this._oCustomFilterData._CUSTOM[this._aCustomFilters.startDate.origin],
					this._oCustomFilterData._CUSTOM[this._aCustomFilters.endDate.origin]
				];
			}
			var startDateCtrl = this._oFilterBar.getControByKey(this._aCustomFilters.startDate.origin),
				endDateCrtl = this._oFilterBar.getControByKey(this._aCustomFilters.endDate.origin);
			return [startDateCtrl.getValue(), endDateCrtl.getValue()];
		}
	});

});