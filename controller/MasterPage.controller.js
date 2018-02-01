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
         *  on multiinput changed
         * @param oEvent
         */
        onChangeGroupFilter: function (oEvent) {
            var oNewValue = oEvent.getParameter("value");
            var oCustomFilter = sap.ui.getCore().byId("idGroupFilterItem");

            // if the value has changed
            if (oNewValue && oNewValue !== "") {
                oCustomFilter.setFilterCount(1);
                oCustomFilter.setSelected(true);
            } else {
                oCustomFilter.setFilterCount(0);
                oCustomFilter.setSelected(false);
            }
        },

        /**
         * on date input changed
         * @param oEvent
         */
        onChangeDateRangeFilter: function (oEvent) {
            var oSource = oEvent.getSource();
            var oNewValue = oEvent.getParameter("value");
            var oCustomFilter = sap.ui.getCore().byId("idTimeframeFilterItem");
            oCustomFilter.setFilterCount(1);
            oCustomFilter.setSelected(true);

            // Date range should be never empty
            if (!oNewValue && oNewValue === "") {
                var lastValue = this.defaultDateRange[oSource.getId()] || this.formatter.date(new Date());
                oSource.setValue(lastValue);
            }
        },

        onPressResourceTitle: function (oEvent) {
            var oSource = oEvent.getSource();
            var parent = oSource.getParent();
            var binding = parent.getBindingContext();
            var oParams = oEvent.getParameters();
            console.log(oParams);
        },

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

        onPressShowPlanningCal: function (oEvent) {
            if (!this._oPlanningCalDialog) {
                this._oPlanningCalDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.ResourceCalendarDialog", this);
                this.getView().addDependent(this._oPlanningCalDialog);
            }
            this._oPlanningCalDialog.open();
        },

        onCalendarModalCancel: function (oEvent) {
            this._oPlanningCalDialog.close();
        },

        /**
         * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
         * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage
         **/
        onExit: function() {
            if(this._oFilterSettingsDialog){
                this._oFilterSettingsDialog.destroy();
            }
            if (this._oPlanningCalDialog) {
                this._oPlanningCalDialog.destroy();
            }
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */
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

        _initialCustomVariant: function () {
            var oVariant = this.byId("customResourceVariant");
            this._initFilterDialog();

            oVariant.addFilter(this.byId("searchField"));
            oVariant.addFilter(sap.ui.getCore().byId("dateRange1"));
            oVariant.addFilter(sap.ui.getCore().byId("viewFilterItem"));
            oVariant.addFilter(sap.ui.getCore().byId("multiGroupInput"));
        },

        /**
         * set default filter
         * @private
         */
        _initFilterDialog: function () {
            if (!this._oFilterSettingsDialog) {
                this._oFilterSettingsDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.FilterSettingsDialog", this);
                this.getView().addDependent(this._oFilterSettingsDialog);

                //set default date range from 1month
                var oCustomFilter = sap.ui.getCore().byId("idTimeframeFilterItem");
                var dateControl1 = sap.ui.getCore().byId("dateRange1");
                var dateControl2 = sap.ui.getCore().byId("dateRange2");
                var d = new Date();
                d.setMonth(d.getMonth() - 1);

                // save default date range global
                this.defaultDateRange[dateControl1.getId()] = this.formatter.date(d);
                this.defaultDateRange[dateControl2.getId()] = this.formatter.date(new Date());

                dateControl1.setValue(this.defaultDateRange[dateControl1.getId()]);
                dateControl2.setValue(this.defaultDateRange[dateControl2.getId()]);
                oCustomFilter.setFilterCount(1);
                oCustomFilter.setSelected(true);

                //*** add checkbox validator
                var oMultiInput = sap.ui.getCore().byId("multiGroupInput");
                oMultiInput.addValidator(function(args){
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
            //tree list
            //var binding = this._oDataTable.getBinding("items");
            //tree table
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

            //get search field value
            var sSearchField = this.byId("searchField").getValue();
            if (sSearchField && sSearchField.length > 0) {
                aFilters.push(new Filter("Description", FilterOperator.Contains, sSearchField));
            }

            // filter dialog values
            //view setting
            var oViewFilter = sap.ui.getCore().byId("viewFilterItem");
            var oViewFilterItems = oViewFilter.getItems();

            for (var i = 0; i < oViewFilterItems.length; i++) {
                var obj = oViewFilterItems[i];
                if(obj.getSelected()){
                    var key = obj.getKey();
                    aFilters.push(new Filter("NodeType", FilterOperator.EQ, key));
                }
            }

            //set default date range
            var sDateControl1 = sap.ui.getCore().byId("dateRange1").getValue();
            var sDateControl2 = sap.ui.getCore().byId("dateRange2").getValue();
            sDateControl1 = this.formatter.date(sDateControl1);
            sDateControl2 = this.formatter.date(sDateControl2);
            var oDateRangeFilter = new Filter("StartDate", FilterOperator.BT, sDateControl1, sDateControl2);
            aFilters.push(oDateRangeFilter);

            //filter for Resource group
            var oGroupFilter = sap.ui.getCore().byId("idGroupFilterItem").getCustomControl();
            var sGroupFilterVal = oGroupFilter.getValue();

            if(sGroupFilterVal && sGroupFilterVal !== ""){
                var groupFilter = new Filter({
                    filters: [
                        new Filter("ParentNodeId", FilterOperator.EQ, ""),
                        new Filter("Description", FilterOperator.Contains, sGroupFilterVal)
                    ],
                    and: true
                });
                aFilters.push(groupFilter);
            }

            return  new Filter({
                filters: aFilters,
                and: true
            });
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