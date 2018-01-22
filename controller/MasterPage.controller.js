sap.ui.define([
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
    "com/evorait/evoplan/model/formatter",
    "com/evorait/evoplan/controller/BaseController",
], function(Device, JSONModel, Filter, FilterOperator, FilterType, formatter, BaseController) {
    "use strict";

    return BaseController.extend('com.evorait.evoplan.controller.MasterPage', {

        formatter: formatter,

        defaultDateRange: [],

        /**
        * Called when a controller is instantiated and its View controls (if available) are already created.
        * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
        * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage **/
        onInit: function() {
            this._oDroppableTable = this.byId("droppableTable");
            this._oTreeVariant = this.byId("treeVariantManagment");
            this._aFilters = [];

            //add fragment FilterSettingsDialog to the view
            this._initFilterDialog();
        },

        /**
        * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
        * This hook is the same one that SAPUI5 controls get after being rendered.
        * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage **/
        onAfterRendering: function(oEvent) {
            this.refreshDroppable(oEvent);
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
         *
         * @param oEvent
         */
        onToggleOpenState: function (oEvent) {
            var params = oEvent.getParameters();
            console.log(params);
            if(params.expanded){

            }
        },

        /**
         * @param oEvent
         */
        onSearchResources : function (oEvent) {
            //var binding = this._oDroppableTable.getBinding("items");
            var oItem = this._oDroppableTable.getItems(0);
            var oTemplateItem = oItem.clone();
            this._oDroppableTable.unbindAggregation("items");
            this._oDroppableTable.bindAggregation("items", {
            	path: "",
            	template: oTemplateItem,
            	filter: this.getAllFilters()
            });
            // var aFilters = this._getAllFilters();
            //binding.filter(aFilters, "Application");
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
         * Todo: get saved variant
         * when a new variant is selected
         * values will be populated to FilterSettingsDialog
         * new Filters are bind to tree table
         * @param oEvent
         */
        onSelectVariant : function (oEvent) {
            var params = oEvent.getParameters();
            var oBinding = this._oDroppableTable.getBinding("items");
            var oGroupFilter = sap.ui.getCore().byId("idCustomFilterItem").getCustomControl();
            var oViewFilter = sap.ui.getCore().byId("viewFilterItem").getControl();

            //set values in FilterSettingsDialog
            //filter for Resource group
            var value = "blub";
            oGroupFilter.setValue(value);
            oGroupFilter.setFilterCount(1);
            this._aFilters.push(new Filter("ParentNodeId", FilterOperator.Contains, value));

            //filter view
            var key = "monthly";
            oViewFilter.setKey(key);
            this._aFilters.push(new Filter("View", FilterOperator.Contains, key));

            oBinding.filter(this._aFilters, "Application");

        },

        /**
         * Todo: save this._aFilters
         * when the Save Variant dialog is closed with OK for a variant
         * @param oEvent
         */
        onSaveVariant : function (oEvent) {
            //todo save this._aFilters
        },

        /**
         * Todo: is this needed?
         * when users apply changes to variants in the Manage Variants dialog
         * @param oEvent
         */
        onManageVariant : function (oEvent) {

        },

        /**
         * ViewSettingsDialog confirm filter
         * @param oEvent
         */
        onFilterSettingsConfirm : function (oEvent) {
            var oBinding = this._oDroppableTable.getBinding("items");
            var aFilters = this._getAllFilters();
            oBinding.filter(aFilters, "Application");
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

        /**
         * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
         * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage
         **/
        onExit: function() {
            if(this._oFilterSettingsDialog){
                this._oFilterSettingsDialog.destroy();
            }
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

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
            }

            //trigger first filter search

        },

        /**
         * collection of all filter from view settings dialog and also from search field
         * @returns {Array}
         * @private
         */
        _getAllFilters: function () {
            var aFilters = [];

            //get search field value
            var sSearchField = this.byId("searchFieldResources").getValue();
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
            sDateControl1 = this.formatter.formatFilterDate(sDateControl1);
            sDateControl2 = this.formatter.formatFilterDate(sDateControl2);
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

            aFilters.push(new Filter("HierarchyLevel", FilterOperator.GE, 0));

            return  new Filter({
                filters: aFilters,
                and: true
            });
        },

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
                            oContext = targetElement.getBindingContext(),
                            draggedElements = ui.helper[0];

                        if(oContext){
                            var targetPath = oContext.getPath();
                            var aSources = [];
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