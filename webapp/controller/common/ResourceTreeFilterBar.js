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
	"sap/m/Tokenizer",
	"sap/ui/core/Fragment",
	"sap/ui/core/Item"
], function (BaseController, formatter, Filter, FilterOperator, Token, Tokenizer, Fragment, Item) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.ResourceTreeFilterBar", {

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
				old: "viewFilterItem",
				default: "TIMENONE"
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

		/**
		 * initialize controller and add filterBar fragment in view
		 * @param oView
		 * @param sControlId
		 */
		init: function (oView, sControlId) {
			var oLayout = oView.byId(sControlId);
			this._sId = oView.getId();
			this._oView = oView;
			this._component = this._oView.getController().getOwnerComponent();
			this._viewModel = this._component.getModel("viewModel");
			this._userModel = this._component.getModel("user");
			this._eventBus =  sap.ui.getCore().getEventBus();
			//use global promise for getting when filterbar was fully initalized
			// create fragment lazily
			return Fragment.load({
				name: "com.evorait.evoplan.view.common.fragments.ResourceTreeFilterBar",
				id: this._sId,
				controller: this
			}).then(function (content) {
				this._oFilterBar = this._oView.byId("resourceTreeFilterBar");
				this._oVariantMangement = this._oFilterBar.getSmartVariant();

				//Filterbar is now official initialized
				this._oFilterBar.attachInitialized(function (oEvent) {
					this.onInitialized(oEvent);
				}.bind(this));
				// connect filterbar to view (models, lifecycle)
				oLayout.addContent(content);
			}.bind(this));
		},

		getInitalizedPromise: function () {
			return this._isInitalizedProm;
		},

		/**
		 * get FilterBar by ID
		 * @returns {null}
		 */
		getFilterBar: function () {
			if (!this._oFilterBar) {
				this._oFilterBar = this._oView.byId("resourceTreeFilterBar");
			}
			return this._oFilterBar;
		},

		/**
		 * event when SmartFilterBar was initialized
		 * set date range based on selected NodeType key
		 */
		onInitialized: function (oEvent) {
			var timeViewCtrl = this._oFilterBar.getControlByKey(this._aCustomFilters.viewType.origin),
				sVariantId = this._oVariantMangement.getCurrentVariantId();
			if (timeViewCtrl && sVariantId === "*standard*") {
				this._setDateFilterControls(timeViewCtrl.getSelectedKey());
			}
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
		 * event before variant is loaded
		 * @param oEvent
		 */
		onBeforeVariantFetch: function (oEvent) {
			if (this._oVariantMangement.getSelectionKey() === "*standard*") {
				this._setDateFilterControls(this._aCustomFilters.viewType.default);
				this._updateCustomFilterData();
				this._oFilterBar.setFilterData(this._oCustomFilterData);
				this._triggerSearch();
				return;
			}
			this._updateCustomFilterData();
			this._oFilterBar.setFilterData(this._oCustomFilterData);
		},

		/**
		 * event when something in SmartFileterBar was changed
		 * @param oEvent
		 */
		onFilterBarChanged: function (oEvent) {
			
		},

		/**
		 * event when a custom control value changed
		 * @param oEvent
		 */
		onCustomFilterChange: function (oEvent) {
			this._setValidDate(); //method will set the date based on view
			if (this.getFilterBar()) {
				this._updateCustomFilterData();
			}
		},

		/**
		 * event when searchField search was triggered
		 * @param oEvent
		 */
		onCustomSearchChange: function (oEvent) {
			if (this.getFilterBar()) {
				this._updateCustomFilterData();
				this._triggerSearch();
			}
		},

		/**
		 * when select control of property NodeTYpe was changed
		 * change also StartDate and EndDate controls
		 * @param oEvent
		 */
		onChangeTimeView: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oItem = oParams.selectedItem,
				oViewModel = this._component.getModel("viewModel");

			oViewModel.setProperty("/selectedHierarchyView", oItem.getKey());
			this._setDateFilterControls(oItem.getKey());
			this._updateCustomFilterData();
			oViewModel.setProperty("/mapSettings/GeoJsonLayersData", []); // reset current displayed routes on map
		},

		/**
		 * after variant load validate old variant properties
		 * and set custom controls values
		 * @param oEvent
		 */
		onAfterVariantLoad: function (oEvent) {
			this._isOldVariant = false;
			this._waitForTokenValidation = false;

			var oData = this._oFilterBar.getFilterData(),
				oCustomFieldData,
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

			var aDateRange = this._getDateRangeValues(oCustomFieldData);
			if (!oCustomFieldData) {
				oCustomFieldData = {};
				oCustomFieldData[this._aCustomFilters.viewType.origin] = this._aCustomFilters.viewType.default;
				aDateRange = this._getDateRangeValues(null, this._aCustomFilters.viewType.default);
			}

			oCustomFieldData[this._aCustomFilters.startDate.origin] = aDateRange[0];
			oCustomFieldData[this._aCustomFilters.endDate.origin] = aDateRange[1];
			if (oCustomFieldData && oCustomFieldData.NodeType) {
				this._viewModel.setProperty("/selectedHierarchyView", oCustomFieldData.NodeType);
			}
			this._setCustomFilterControls(oCustomFieldData);
			this._updateCustomFilterData();
			this._oFilterBar.setFilterData(this._oCustomFilterData);

			if (!this._waitForTokenValidation) {
				this._triggerSearch();
			}
		},

		/**
		 *
		 */
		onExit: function () {

		},

		/**
		 * get all filters from SmartFilterBar
		 * merges standard filters with custom controls filters
		 * @returns {Array}
		 */
		getAllCustomFilters: function () {
			var aStandardFilter = this._oFilterBar.getFilters(),
				aFilters = aStandardFilter[0] ? aStandardFilter[0].aFilters : [];

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
					aFilters.push(new Filter("EndDate", FilterOperator.GE, this._oCustomFilterData._CUSTOM[key]));
				} else if (key === this._aCustomFilters.endDate.origin) {
					//EndDate field
					aFilters.push(new Filter("StartDate", FilterOperator.LE, this._oCustomFilterData._CUSTOM[key]));
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

		/**
		 * returns property values of StartDate in index 0 and EndDate in index 1
		 * @returns {*|*[]}
		 */
		getDateRange: function () {
			return this._getDateRangeValues();
		},

		/**
		 * returns selected viewType of property NodeType
		 * @returns {*}
		 */
		getViewType: function () {
			if (this._oCustomFilterData._CUSTOM[this._aCustomFilters.viewType.origin]) {
				return this._oCustomFilterData._CUSTOM[this._aCustomFilters.viewType.origin];
			} else {
				var oCtrl = this._oFilterBar.getControlByKey(this._aCustomFilters.viewType.origin);
				return oCtrl.getSelectedKey();
			}
		},

		/**
		 * Bind the 'View' select control to provided entity set
		 * @param {string} sEntitySetPath - Path to entity set that should be bound to the 'View' select
		 * 
		 */
		bindViewFilterItemsToEntity: function (sEntitySetPath) {
			var oViewSelect = this._oView.byId("idTimeView");
			var oItemTemplate = new Item({
				key: "{MODE}",
				text: "{TEXT}"
			});

			oViewSelect.bindItems({
				path: sEntitySetPath,
				template: oItemTemplate
			});

		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * get all custom controls in SmartFilterBar and save field values
		 * in global _CUSTOM object
		 * @private
		 */
		_updateCustomFilterData: function () {
			this._oCustomFilterData._CUSTOM = {};

			for (var key in this._aCustomFilters) {
				var sFilterKey = this._aCustomFilters[key].origin,
					oCtrl = this._oFilterBar.getControlByKey(sFilterKey);
				if (oCtrl) {
					try {
						if (oCtrl.getDateValue) {
							this._oCustomFilterData._CUSTOM[sFilterKey] = new Date(oCtrl.getValue());
						} else {
							this._oCustomFilterData._CUSTOM[sFilterKey] = oCtrl.getValue();
						}
					} catch (e) { /*do nothing*/ }
					try {
						this._oCustomFilterData._CUSTOM[sFilterKey] = oCtrl.getSelectedKey();
					} catch (e) { /*do nothing*/ }
					try {
						this._oCustomFilterData._CUSTOM[sFilterKey] = oCtrl.getSelectedKeys();
					} catch (e) { /*do nothing*/ }
				}
			}
			//update counter for filters
			//is internal function so just proof if this function is still there
			if (this.getFilterBar()._updateToolbarText) {
				this.getFilterBar()._updateToolbarText();
			}
			this._eventBus.publish("ManageAbsences", "ClearSelection", {});
		},

		/**
		 * transforms json object fro old variant to new keys in SmartFilterBar
		 * @param oVariant
		 * @returns {*}
		 * @private
		 */
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

		/**
		 * is setting json object by control key to its custom control in SmartFilterBar
		 * integrates validation of ResourceGroup description for old saved variants
		 * @param oData
		 * @private
		 */
		_setCustomFilterControls: function (oData) {
			var sFilterKey,
				oCtrl,
				sValue = "";
			for (var key in this._aCustomFilters) {
				sFilterKey = this._aCustomFilters[key].origin;
				oCtrl = this._oFilterBar.getControlByKey(sFilterKey);
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
								this._validateResourceGroupToken(sValue[l], oCtrl, sFilterKey, l, l === sValue.length - 1);
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

		/**
		 * only for old saved variants
		 * searches by description and object type ResourceGroup in ResourceSet
		 * when result array is not empty this resource group exists and
		 * will be added with ID to ResourceGroupGuid custom control in SmartFilterbar
		 * because of asynchron search search of filterBar is triggered when resource groups was validated
		 * @param oToken
		 * @param oCtrl
		 * @param sKey
		 * @param idx
		 * @param isLast
		 * @private
		 */
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

		/**
		 * fire search for SmartFilterBar manually
		 * @private
		 */
		_triggerSearch: function () {
			this._oFilterBar.search();
		},

		/**
		 * set new token key in custom control for ResourceGroupGuid
		 * @param oToken
		 * @param oCtrl
		 * @param sKey
		 * @param idx
		 * @private
		 */
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

		/**
		 * save custom control value by key in global _CUSTOM object
		 * @param sKey
		 * @param sValue
		 * @private
		 */
		_setCustomFilterDataValue: function (sKey, sValue) {
			var currFilterData = this._oCustomFilterData._CUSTOM || {};
			currFilterData[sKey] = sValue || "";
			this._oCustomFilterData._CUSTOM = currFilterData;
		},

		/**
		 * set startDate and endDate controls in SmartFilterbar
		 * based on selected NodeType property
		 * @param sKey
		 * @private
		 */
		_setDateFilterControls: function (sKey) {
			var newDateRange = this._getDateRangeValues(null, sKey),
				oStartDate = this._oFilterBar.getControlByKey(this._aCustomFilters.startDate.origin),
				oEndDate = this._oFilterBar.getControlByKey(this._aCustomFilters.endDate.origin);
			oStartDate.setValue(newDateRange[0]);
			oEndDate.setValue(newDateRange[1]);
		},

		/**
		 * get startDate and endDate by loaded variant oData or
		 * by NodeType (viewType) or
		 * by global saved _CUSTOM data or
		 * by custom controls value in SmartFilterBar
		 * @param oData
		 * @param sDateRangeType
		 * @returns {*[]}
		 * @private
		 */
		_getDateRangeValues: function (oData, sDateRangeType) {
			var selectedTimeFormat, configStartDate, configStartEnd;
			if (oData) {
				if (oData.hasOwnProperty(this._aCustomFilters.startDate.origin) || oData.hasOwnProperty(this._aCustomFilters.endDate.origin)) {
					var sViewType = oData[this._aCustomFilters.viewType.origin];
					if (!sViewType) {
						sViewType = this._oFilterBar.getControlByKey(this._aCustomFilters.viewType.origin).getSelectedKey();
					}
					selectedTimeFormat = formatter.getResourceFormatByKey(sViewType);
					if (this._oCustomFilterData._CUSTOM[this._aCustomFilters.startDate.origin] && this._oCustomFilterData._CUSTOM[this._aCustomFilters
							.endDate.origin]) {
						return [this.formatter.date(this._oCustomFilterData._CUSTOM[this._aCustomFilters.startDate.origin]), this.formatter.date(this._oCustomFilterData
							._CUSTOM[this._aCustomFilters.endDate.origin])];
					} else {
						return [this.formatter.date(selectedTimeFormat.getDateBegin()), this.formatter.date(selectedTimeFormat.getDateEnd())];
					}
				}
			} else if (sDateRangeType) {
				selectedTimeFormat = formatter.getResourceFormatByKey(sDateRangeType);
				configStartDate = this._userModel.getProperty(selectedTimeFormat.configStartDate);
				configStartEnd = this._userModel.getProperty(selectedTimeFormat.configStartEnd);
				if (configStartDate && configStartEnd) {
					return [this.formatter.date(configStartDate), this.formatter.date(configStartEnd)];
				} else {
					return [this.formatter.date(selectedTimeFormat.getDateBegin()), this.formatter.date(selectedTimeFormat.getDateEnd())];
				}
			} else if (this._oCustomFilterData._CUSTOM[this._aCustomFilters.startDate.origin]) {
				return [
					this._oCustomFilterData._CUSTOM[this._aCustomFilters.startDate.origin],
					this._oCustomFilterData._CUSTOM[this._aCustomFilters.endDate.origin]
				];
			}
			var startDateCtrl = this._oFilterBar.getControByKey(this._aCustomFilters.startDate.origin),
				endDateCrtl = this._oFilterBar.getControByKey(this._aCustomFilters.endDate.origin);
			if (startDateCtrl && endDateCrtl) {
				return [startDateCtrl.getValue(), endDateCrtl.getValue()];
			}
			return this._getDateRangeValues(null, this._aCustomFilters.viewType.default);
		},

		/**
		 * Method will set the start and end date based on the view selected.
		 * SIMPLE and DAILY view - selected date will be set
		 * WEEKLY view - startDate -> start of the week of selected date | endDate -> end of the week of selected date
		 * MONTHLY view - startDate -> start of the month of selected date | endDate -> end of the month of selected date
		 * QUARTERLY view - startDate -> start of the quarter of selected date | endDate -> end of the quarter of selected date
		 * YEARLY view - startDate -> start of the year of selected date | endDate -> end of the year of selected date
		 */
		_setValidDate: function(){
			var selectedHierarchyView = this._component.getModel("viewModel").getProperty("/selectedHierarchyView"),
			oStartDateSource = this._oFilterBar.getControlByKey(this._aCustomFilters.startDate.origin),
			oEndDateSource = this._oFilterBar.getControlByKey(this._aCustomFilters.endDate.origin),
			oStartDate = oStartDateSource.getDateValue(),
			oEndDate = oEndDateSource.getDateValue(),
			start = oStartDate,
			end = oEndDate,
			aYearMatrix = this._component.getModel("viewModel").getProperty("/yearMatrix"),
			bEnableClusterTable = this._userModel.getProperty("/ENABLE_RESOURCE_TREE_CLUSTER");

			if (!bEnableClusterTable){
				return;
			}

			if (selectedHierarchyView === "TIMEWEEK"){
				start = moment(oStartDate).startOf("week").toDate();
				end = moment(oEndDate).endOf("week").toDate();
			} else if (selectedHierarchyView === "TIMEMONTH"){
				start = moment(oStartDate).startOf("month").toDate();
				end = moment(oEndDate).endOf("month").toDate();
			} else if (selectedHierarchyView === "TIMEQUART"){
				var startMonth = moment(oStartDate).month();
				var endMonth = moment(oEndDate).month();
				for(var i=0;i<4;i++){
					for(var j=0;j<3;j++){
						if (aYearMatrix[i][j] === startMonth){
							startMonth = aYearMatrix[i][0]
						}
						if (aYearMatrix[i][j] === endMonth){
							endMonth = aYearMatrix[i][2]
						}
					}
				}
				start = moment().month(startMonth).startOf('month').toDate();
				end = moment(oEndDate).month(endMonth).endOf('month').toDate();
			} else if (selectedHierarchyView === "TIMEYEAR"){
				start = moment(oStartDate).startOf("year").toDate();
				end = moment(oEndDate).endOf("year").toDate();
			}
			oStartDateSource.setDateValue(start);
			oEndDateSource.setDateValue(end);
		}

	});

});