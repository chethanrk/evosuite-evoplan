sap.ui.define([
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
    "sap/m/Token",
    "com/evorait/evoplan/model/formatter",
    "com/evorait/evoplan/controller/BaseController",
], function(Device, JSONModel, Filter, FilterOperator, FilterType, Token, formatter, BaseController) {
    "use strict";

    return BaseController.extend('com.evorait.evoplan.controller.MasterPage', {

        formatter: formatter,

        defaultDateRange: [],

        firstLoad: false,

        counterResourceFilter: 2,

        defaultViewSelected: "TIMENONE",

        /**
        * Called when a controller is instantiated and its View controls (if available) are already created.
        * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
        * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage **/
        onInit: function() {
            this._oDroppableTable = this.byId("droppableTable");
            this._oDataTable = this._oDroppableTable;
            this._configureDataTable(this._oDataTable);

            //add fragment FilterSettingsDialog to the view
            this._initFilterDialog();

            //eventbus of assignemnt handling
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("BaseController", "refreshTable", this._triggerFilterSearch, this);
        },

        /**
        * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
        * This hook is the same one that SAPUI5 controls get after being rendered.
        * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage **/
        onAfterRendering: function(oEvent) {
            //add form fields to variant
            this._initialCustomVariant();
            //trigger first filter
            this.onTreeUpdateStarted();
            //init droppable
            this.refreshDroppable(oEvent);
        },

        /**
         *
         * @param oEvent
         */
        onBeforeRebindTable: function(oEvent) {
            var oBindingParams = oEvent.getParameter('bindingParams');
            oBindingParams.parameters.numberOfExpandedLevels = 1;
        },

        /**
         * initial draggable after every refresh of table
         * for example after go to next page
         * @param oEvent
         */
        onBusyStateChanged : function (oEvent) {
            var parameters = oEvent.getParameters();
            if(parameters.busy === false){
                this._jDroppable(this);
            }
        },

        /**
         * initialize or update droppable after updating tree list
         * @param oEvent
         */
        refreshDroppable : function (oEvent) {
            if(this._oDroppableTable){
                this._jDroppable(this);
            }
        },

        /**
         * trigger add filter to tree table for the first time
         */
        onTreeUpdateStarted: function () {
            if(!this.firstLoad){
                this._triggerFilterSearch();
                this.firstLoad = true;
            }
        },

        /**
         * search on searchfield in header
         * @param oEvent
         */
        onSearchResources : function (oEvent) {
            this._triggerFilterSearch();
        },

        /**
         * open FilterSettingsDialog
         * @param oEvent
         */
        onFilterButtonPress : function (oEvent) {
            this._initFilterDialog();
            this._oFilterSettingsDialog.open();
        },

        /**
         * when a new variant is selected trigger search
         * new Filters are bind to tree table
         * @param oEvent
         */
        onSelectVariant : function (oEvent) {
            this._triggerFilterSearch();
        },

        /**
         * ViewSettingsDialog confirm filter
         * @param oEvent
         */
        onFilterSettingsConfirm : function (oEvent) {
            this._triggerFilterSearch();
        },

        /**
         * reset custom controls
         * @param oEvent
         */
        onFilterSettingsReset : function (oEvent) {
            //reset multiInput custom filter
            var oCustomFilter = sap.ui.getCore().byId("idGroupFilterItem");
            this._filterGroupInput.setTokens([]);
            oCustomFilter.setFilterCount(0);

            //set default view setting
            this._setDefaultFilterView();

            //set default date range
            this._setDefaultFilterDateRange();
        },

        /**
         * on multiinput changed in filter settings dialog
         * @param oEvent
         */
        onChangeGroupFilter: function (oEvent) {
            var oCustomFilter = sap.ui.getCore().byId("idGroupFilterItem");
            var aTokens = this._filterGroupInput.getTokens();

            oCustomFilter.setFilterCount(aTokens.length);
            this.counterResourceFilter = aTokens.length+2;
            this.getModel("viewModel").setProperty("/counterResourceFilter", this.counterResourceFilter);
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
         * on select checkbox in resource tree row
         * @param oEvent
         */
        onCheckResource: function (oEvent) {
            var oSource = oEvent.getSource();
            var parent = oSource.getParent();
            var sPath = parent.getBindingContext().getPath();
            var oParams = oEvent.getParameters();
            var data = this.getModel().getProperty(sPath);

            if(data.NodeType === "RES_GROUP"){
                //this._selectResourceGroupChilds(oParams.selected, parent, sPath);
            }
        },

        /**
         * button press in footer show dialog planning calendar
         * @param oEvent
         */
        onPressShowPlanningCal: function (oEvent) {
            if (!this._oPlanningCalDialog) {
                this._oPlanningCalDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.ResourceCalendarDialog", this);
                this.getView().addDependent(this._oPlanningCalDialog);
            }
            this._oPlanningCalDialog.open();
        },

        /**
         * on press cancel in dialog close it
         * @param oEvent
         */
        onModalCancel: function (oEvent) {
            if (this._oPlanningCalDialog) {
                this._oPlanningCalDialog.close();
            }
            if (this._oAssignInfoDialog) {
                this._oAssignInfoDialog.close();
            }
        },

        /**
         * on press link of assignment in resource tree row
         * get parent row path and bind this path to the dialog or showing assignment information
         * @param oEvent
         */
        onPressAssignmentLink: function (oEvent) {
            var oSource = oEvent.getSource(),
                oRowContext = oSource.getParent().getBindingContext(),
                sPath = null;

            if (!this._oAssignInfoDialog) {
                this._oAssignInfoDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.AssignInfoDialog", this);
                this.getView().addDependent(this._oAssignInfoDialog);
            }

            if(oRowContext) {
                sPath = oRowContext.getPath();
                this._oAssignInfoDialog.bindElement(sPath);
                this._oAssignInfoDialog.open();
                console.log(this.getModel().getProperty(sPath));
            }else{
                var msg = this.getResourceBundle().getText("notFoundContext");
                this.showMessageToast(msg);
            }
        },

        /**
         * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
         */
        onExit: function() {
            if(this._oFilterSettingsDialog){
                this._oFilterSettingsDialog.destroy();
            }
            if (this._oPlanningCalDialog) {
                this._oPlanningCalDialog.destroy();
            }
            if (this._oAssignInfoDialog) {
                this._oAssignInfoDialog.destroy();
            }
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * configure tree table
         * @param oDataTable
         * @private
         */
        _configureDataTable : function (oDataTable) {
            oDataTable.setEnableBusyIndicator(true);
            oDataTable.setSelectionMode('None');
            oDataTable.setColumnHeaderVisible(false);
            oDataTable.setEnableCellFilter(false);
            oDataTable.setEnableColumnReordering(false);
            oDataTable.setEditable(false);
            oDataTable.setWidth("100%");
            oDataTable.attachBusyStateChanged(this.onBusyStateChanged, this);
            //oDataTable.attachFilter(this.onFilterChanged, this);
        },

        /**
         * init custom smart variant management and add filter controls to it
         * @private
         */
        _initialCustomVariant: function () {
            var oVariant = this.byId("customResourceVariant");
            this._initFilterDialog();

            oVariant.addFilter(this._searchField);
            oVariant.addFilter(this._filterDateRange1);
            oVariant.addFilter(this._filterSelectView);
            oVariant.addFilter(this._filterGroupInput);
        },

        /**
         * set default filter for resource tree
         * @private
         */
        _initFilterDialog: function () {
            if (!this._oFilterSettingsDialog) {
                this._oFilterSettingsDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.FilterSettingsDialog", this);
                this.getView().addDependent(this._oFilterSettingsDialog);

                //counter for default date range and default selected view
                this._searchField = this.byId("searchField");
                this._filterSelectView = sap.ui.getCore().byId("viewFilterItem");
                this._filterDateRange1 = sap.ui.getCore().byId("dateRange1");
                this._filterDateRange2 = sap.ui.getCore().byId("dateRange2");

                //set default view setting
                this._setDefaultFilterView();
                //set default date range
                this._setDefaultFilterDateRange();

                //*** add checkbox validator
                this._filterGroupInput = sap.ui.getCore().byId("multiGroupInput");
                this._filterGroupInput.addValidator(function(args){
                    var text = args.text;
                    return new Token({key: text, text: text});
                });
            }
        },

        /**
         * triggers request with all setted filters
         * @private
         */
        _triggerFilterSearch: function () {
            var binding = this._oDataTable.getBinding("rows");
            var aFilters = this._getAllFilters();
            binding.filter(aFilters, "Application");
        },

        /**
         * collection of all filter from view settings dialog and also from search field
         * @returns {Array}
         * @private
         */
        _getAllFilters: function () {
            var aFilters = [];
            var oViewModel = this.getModel("viewModel");

            oViewModel.setProperty("/counterResourceFilter", this.counterResourceFilter);

            // filter dialog values
            //view setting
            var oViewFilterItems = this._filterSelectView.getItems();
            for (var i = 0; i < oViewFilterItems.length; i++) {
                var obj = oViewFilterItems[i];
                if(obj.getSelected()){
                    var key = obj.getKey();
                    aFilters.push(new Filter("NodeType", FilterOperator.EQ, key));
                }
            }

            //set date range
            var sDateControl1 = this._filterDateRange1.getValue();
            var sDateControl2 = this._filterDateRange2.getValue();
            sDateControl1 = this.formatter.date(sDateControl1);
            sDateControl2 = this.formatter.date(sDateControl2);
            var oDateRangeFilter = new Filter("StartDate", FilterOperator.BT, sDateControl1, sDateControl2);
            aFilters.push(oDateRangeFilter);

            //filter for Resource group
            var aTokens = this._filterGroupInput.getTokens(),
                aTokenFilter = [];

            if(aTokens && aTokens.length > 0){
                var parentNodeFilter = new Filter("ParentNodeId", FilterOperator.EQ, "");
                //get all tokens
                for (var j = 0; j < aTokens.length; j++) {
                    var token = aTokens[j];
                    aTokenFilter.push(
                        new Filter("Description", FilterOperator.Contains, token.getKey())
                    );
                }
                aFilters.push(new Filter({
                    filters: aTokenFilter,
                    and: false
                }));
                /*aFilters.push(new Filter({
                    filters: [groupFilter, parentNodeFilter],
                    and: true
                }));*/
            }
            oViewModel.setProperty("/resourceFilterView", aFilters);

            //get search field value
            var sSearchField = this._searchField.getValue();
            oViewModel.setProperty("/resourceSearchString", sSearchField);
            if (sSearchField && sSearchField.length > 0) {
                aFilters.push(new Filter("Description", FilterOperator.Contains, sSearchField));
            }

            var resourceFilter = new Filter({filters: aFilters, and: true});
            oViewModel.setProperty("/resourceFilterAll", resourceFilter);

            return  resourceFilter;
        },

        /**
         * set filter date range before first request in filter settings dialog
         * @private
         */
        _setDefaultFilterDateRange: function () {
            //set default date range from 1month
            var d = new Date();
            d.setMonth(d.getMonth() - 1);
            var dateRange1Id = this._filterDateRange1.getId();
            var dateRange2Id = this._filterDateRange2.getId();

            // save default date range global
            this.defaultDateRange[dateRange1Id] = this.formatter.date(d);
            this.defaultDateRange[dateRange2Id] = this.formatter.date(new Date());

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
         * dropped demands assign and save
         * @param _this
         * @private
         */
        _jDroppable: function (_this) {
            setTimeout(function() {
                var droppableTableId = _this._oDroppableTable.getId();
                var droppedElement = $("#"+droppableTableId+" tbody tr, #"+droppableTableId+" li");

                try{
                    if(droppedElement.hasClass("ui-droppable")){
                        droppedElement.droppable( "destroy" );
                    }
                }catch(error){
                    console.warn(error);
                }

                droppedElement.droppable({
                    accept: ".ui-draggable",
                    classes: {
                        "ui-droppable-hover": "ui-droppable-hover",
                        "ui-droppable-active": "ui-droppable-active"
                    },
                    drop: function( event, ui ) {
                        var dropTargetId = event.target.id,
                            targetElement = sap.ui.getCore().byId(dropTargetId),
                            oContext = targetElement.getBindingContext();

                        if(oContext){
                            var targetPath = oContext.getPath();
                            var targetObj = _this.getModel().getProperty(targetPath);

                            //don't drop on orders
                            if(targetObj.NodeType === "ASSIGNMENT"){
                                return;
                            }

                            var draggedElements = ui.helper[0],
                                aSources = [];
                            $(draggedElements).find('li').each(function (idx, obj) {
                                aSources.push({sPath: $(this).attr('id')});
                            });
                            _this.assignedDemands(aSources, targetPath);
                        }
                    }
                });
            }, 1000);
        }

    });
});