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

    return BaseController.extend("com.evorait.evoplan.controller.FilterSettingsDialog", {

        formatter: formatter,

        _oView: null,

        defaultDateRange: [],

        counterResourceFilter: 0,

        defaultViewSelected: "TIMENONE",

        /**
         * init maybe some events
         */
        init: function (oView) {
            this._oView = oView;
            this.initDialog();
        },

        /**
         * init dialog fragment with dependencies
         * like searchfield and other filter in dialog
         */
        initDialog: function () {
            // create dialog lazily
            if (!this._oDialog && this._oView) {
                // create dialog via fragment factory
                this._oDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.FilterSettingsDialog", this);

                //counter for default date range and default selected view
                this._searchField = this._oView.byId("searchField");
                this._filterSelectView = sap.ui.getCore().byId("viewFilterItem");
                this._filterDateRange1 = sap.ui.getCore().byId("dateRange1");
                this._filterDateRange2 = sap.ui.getCore().byId("dateRange2");

                //set default view setting
                this._setDefaultFilterView();
                this.counterResourceFilter +=1;
                //set default date range
                this._setDefaultFilterDateRange();
                this.counterResourceFilter +=1;

                //*** add checkbox validator
                this._filterGroupInput = sap.ui.getCore().byId("multiGroupInput");
                this._filterGroupInput.addValidator(function(args) {
                    if(args.suggestedToken){
                        return new Token({
                            key: args.suggestedToken.getProperty("key"),
                            text: args.text
                        });
                    }
                });
            }
        },

        /**
         * open dialog
         * get detail data from resource and resource group
         * @param oView
         * @param sBindPath
         */
        open : function (oView) {
            this._oView = oView;
            var oDialog = this.getDialog();
            this._component = this._oView.getController().getOwnerComponent();
            // setting the content density class on dialog
            oDialog.addStyleClass(this._component.getContentDensityClass());

            // connect dialog to view (models, lifecycle)
            oView.addDependent(oDialog);
            // Removing the reset button on the ViewSettingDialog
            if(oDialog._getResetButton())
                oDialog._getResetButton().setVisible(false);

            // open dialog
            oDialog.open();
        },

        /**
         * init and get dialog view
         * set default filter for resource tree
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        getDialog : function () {
            if(!this._oDialog){
                this.initDialog();
            }
            return this._oDialog;
        },


        /**
         * collection of all filter from view settings dialog and also from search field
         * @returns {Array}
         * @param {bFromDialog : boolean} Which indicate the
         * @private
         */
        getAllFilters: function (bFromDialog) {
            var aFilters = [],
                oViewModel = this._oView.getModel("viewModel");
            oViewModel.setProperty("/counterResourceFilter", this.counterResourceFilter);

            // filter dialog values
            //view setting
            var selectedViewKey = this._getFilterViewSelectedKey();
            if(selectedViewKey && selectedViewKey !== ""){
                aFilters.push(new Filter("NodeType", FilterOperator.EQ, selectedViewKey));
            }

            //set date range
            var dateRangeFilters = this.getFilterDateRange(),
                sDateControl1 = dateRangeFilters[0].getValue(),
                sDateControl2 = dateRangeFilters[1].getValue();

            sDateControl1 = this.formatter.date(sDateControl1);
            sDateControl2 = this.formatter.date(sDateControl2);
            var oDateRangeFilter1 = new Filter("StartDate", FilterOperator.LE,sDateControl2),
                oDateRangeFilter2 = new Filter("EndDate", FilterOperator.GE,sDateControl1);
            aFilters.push(oDateRangeFilter1);
            aFilters.push(oDateRangeFilter2);

            //get all token from group filter
            var tokenFilter = this.getFilterDialogGroupToken();
            if(tokenFilter){
                aFilters.push(tokenFilter);
            }

            oViewModel.setProperty("/resourceFilterView", aFilters);

            var sSearchField = this.getSearchField().getValue();
            var aAllFilters = jQuery.extend(true,[],aFilters);
            
            // if (sSearchField && sSearchField.length > 0) {
            // 	if(tokenFilter){
            // 		aAllFilters.splice(3,1);
            // 		aAllFilters.push(new Filter("Description", FilterOperator.Contains,sSearchField));
            // 	}else{
            // 		aAllFilters.push(new Filter("Description", FilterOperator.Contains,sSearchField));
            // 	}
            // }
            if (sSearchField && sSearchField.length > 0) {
                aAllFilters.push(new Filter("Description", FilterOperator.Contains,sSearchField));
            }

            var resourceFilter = new Filter({
                filters: aAllFilters,
                and: true
            });
            oViewModel.setProperty("/resourceFilterAll", resourceFilter);

            return resourceFilter;
        },

        /**
         * reset custom controls
         * @param oEvent
         */
        onFilterSettingsReset: function(oEvent) {
            //reset multiInput custom filter
            var oCustomGroupFilter = sap.ui.getCore().byId("idGroupFilterItem"),
                aTokens = this._filterGroupInput.getTokens();

            this.openGroupFilterSuggest = false;
            this._filterGroupInput.setTokens([]);
            oCustomGroupFilter.setFilterCount(0);

            this.counterResourceFilter -= aTokens.length;
            this._oView.getModel("viewModel").setProperty("/counterResourceFilter", this.counterResourceFilter);

            //set default view setting
            this._setDefaultFilterView();

            //set default date range
            this._setDefaultFilterDateRange();
        },

        /**
         * ViewSettingsDialog confirm filter
         * @param oEvent
         */
        onFilterSettingsConfirm: function(oEvent) {
            this.openGroupFilterSuggest = false;
            this.triggerSearch();
        },

        /**
         * on multiinput changed in filter settings dialog
         * @param oEvent
         */
        onUpdateGroupFilter: function (oEvent) {
            var oCustomFilter = sap.ui.getCore().byId("idGroupFilterItem"),
                aTokens = this._filterGroupInput.getTokens(),
                tokenLen = aTokens.length;

            if (oEvent.getParameter('type') === Tokenizer.TokenUpdateType.Added) {
                this.counterResourceFilter += 1;

            }else if (oEvent.getParameter('type') === Tokenizer.TokenUpdateType.Removed) {
            	if(tokenLen > 0){
            		tokenLen -= 1;
            	}
                this.counterResourceFilter -= 1;
            }

            this.openGroupFilterSuggest = false;
            oCustomFilter.setFilterCount(tokenLen);
            this._oView.getModel("viewModel").setProperty("/counterResourceFilter", this.counterResourceFilter);
        },

        /**
         * trigger show suggestions of filter dialog group filter
         * @param oEvent
         */
        onGroupFilterValueChange: function (oEvent) {
            if (oEvent.getSource().getValue() !== "") {
                oEvent.getSource().setProperty("filterSuggests", true);

            }else if(this.openGroupFilterSuggest && oEvent.getSource().getValue() === ""){
                oEvent.getSource().setProperty("filterSuggests", false);
            }
        },

        /**
         * set filter suggest
         * if no value the full list of suggestion should be displayed
         * @param oEvent
         */
        onGroupFilterValueHelpRequest: function (oEvent) {
            if(!this.openGroupFilterSuggest){
                this.openGroupFilterSuggest = true;

                if (oEvent.getSource().getValue() === "") {
                    oEvent.getSource().setProperty("filterSuggests", false);
                    return;
                }
            }else{
                this.openGroupFilterSuggest = false;
            }
            oEvent.getSource().setProperty("filterSuggests", true);
        },

        /**
         * on date input changed in filter settings dialog
         * @param oEvent
         */
        onChangeDateRangeFilter: function (oEvent) {
            var oCustomFilter = sap.ui.getCore().byId("idTimeframeFilterItem");
            oCustomFilter.setFilterCount(1);
            oCustomFilter.setSelected(true);

            if(oEvent){
                var oSource = oEvent.getSource();
                var oNewValue = oEvent.getParameter("value");

                // Date range should be never empty
                if (!oNewValue && oNewValue === "") {
                    var lastValue = this.defaultDateRange[oSource.getId()] || this.formatter.date(new Date());
                    oSource.setValue(lastValue);
                }
            }
        },

        /**
         *
         * @param oEvent
         */
        onItemPropertyChanged: function (oEvent) {
            var oParameters = oEvent.getParameters();

            if(oParameters.propertyKey === "selected" && oParameters.propertyValue === true){
                var oSource = oParameters.changedItem,
                    selectedTimeFormat = formatter.getResourceFormatByKey(oSource.getProperty("key"));

                if(selectedTimeFormat){
                    this._filterDateRange1.setValue(this.formatter.date(selectedTimeFormat.getDateBegin()));
                    this._filterDateRange2.setValue(this.formatter.date(selectedTimeFormat.getDateEnd()));
                }else{
                    this._setDefaultFilterDateRange();
                }

                if(this._oDialog && this._oVariant){
                    this._updateFiltersDependencies(false);
                }
            }
        },

        /**
         * close dialog
         */
        onCloseDialog : function () {
            this.getDialog().close();
        },

        /**
         * get all token from filter dialog group filter
         * @private
         */
        getFilterDialogGroupToken: function () {
            //filter for Resource group
            var aTokens = this._filterGroupInput.getTokens(),
                aTokenFilter = [];

            if(aTokens && aTokens.length > 0){
                //get all tokens
                for (var j = 0; j < aTokens.length; j++) {
                    var token = aTokens[j],
                        aTokenKeys = token.getKey().split("//");

                    if(aTokenKeys[1] && aTokenKeys[1].trim() !== ""){
                        aTokenFilter.push(
                            new Filter("Description", FilterOperator.Contains, aTokenKeys[1].trim())
                        );
                    }else if(aTokenKeys[0] && aTokenKeys[0].trim() !== ""){
                        aTokenFilter.push(
                            new Filter("Description", FilterOperator.Contains, aTokenKeys[0].trim())
                        );
                    }
                }
                return new Filter({filters: aTokenFilter, and: false});
            }
            return false;
        },

        /**
         * get searchField control
         * @returns {*}
         */
        getSearchField: function () {
            return this._searchField;
        },

        /**
         * get view select control
         * @returns {*}
         */
        getFilterSelectView: function () {
            return this._filterSelectView;
        },

        /**
         * get date input fields controls
         * @returns {*[]}
         */
        getFilterDateRange: function () {
            return[
                this._filterDateRange1,
                this._filterDateRange2
            ];
        },

        /**
         * get goup multiInput control
         * @returns {*}
         */
        getFilterGroupInput: function () {
            return this._filterGroupInput;
        },

        /**
         * set depend variant
         * @param oVariant
         */
        setVariant: function (oVariant) {
            this._oVariant = oVariant;
            this._updateFiltersDependencies(true);
        },

        triggerSearch: function () {
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.publish("FilterSettingsDialog", "triggerSearch", {});
        },

        /**
         * set filter to variant which should be tracked
         * @private
         */
        _updateFiltersDependencies: function (force) {
            var selectedViewKey = this._getFilterViewSelectedKey();

            if(selectedViewKey === this.defaultViewSelected){
                this._oVariant.addFilter(this._filterDateRange1);
                this._oVariant.addFilter(this._filterDateRange2);
            }else{
                this._oVariant.removeFilter(this._filterDateRange1);
                this._oVariant.removeFilter(this._filterDateRange2);
            }

            if(force){
                this._oVariant.addFilter(this._searchField);
                this._oVariant.addFilter(this._filterSelectView);
                this._oVariant.addFilter(this._filterGroupInput);
            }
        },

        /**
         * set filter date range before first request in filter settings dialog
         * @private
         */
        _setDefaultFilterDateRange: function () {
            //set default date range
            var oDateFrom = new Date("01/01/1990");

            var oDateTo = moment().endOf('year');
            oDateTo =  oDateTo.add(20, 'years').toDate();
            var dateRange1Id = this._filterDateRange1.getId();
            var dateRange2Id = this._filterDateRange2.getId();

            // save default date range global
            this.defaultDateRange[dateRange1Id] = this.formatter.date(oDateFrom);
            this.defaultDateRange[dateRange2Id] = this.formatter.date(oDateTo);

            this._filterDateRange1.setValue(this.defaultDateRange[dateRange1Id]);
            this._filterDateRange2.setValue(this.defaultDateRange[dateRange2Id]);
            this.onChangeDateRangeFilter();
        },

        /**
         * set filter for view before first request in filter settings dialog
         * @private
         */
        _setDefaultFilterView: function () {
            var oViewFilterItems = this._filterSelectView.getItems();
            for (var i = 0; i < oViewFilterItems.length; i++) {
                var obj = oViewFilterItems[i];
                if(obj.getKey() === this.defaultViewSelected){
                    obj.setSelected(true);
                }
            }
        },

        /**
         * get selected view
         * @private
         */
        _getFilterViewSelectedKey: function () {
            var oViewFilterItems = this.getFilterSelectView().getItems();
            for (var i = 0; i < oViewFilterItems.length; i++) {
                var obj = oViewFilterItems[i];
                if(obj.getSelected()){
                    return obj.getKey();
                }
            }
        },
        /**
         * Setting the reset button false when any view is opened
         * @param oEvent
         */
        onFilterDetailPageOpened:function(oEvent){
            this._oDialog._getPage2().getAggregation("customHeader").getAggregation("contentRight")[0].setVisible(false);
            if(this._oDialog._getPage1().getAggregation("customHeader").getAggregation("contentRight")){
                this._oDialog._getPage1().getAggregation("customHeader").getAggregation("contentRight")[0].setVisible(false);
            }
        }
    });
});