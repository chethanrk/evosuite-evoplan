sap.ui.define([
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
    "com/evorait/evoplan/controller/BaseController",
    "sap/ui/fl/Persistence",
    "sap/ui/comp/smartvariants/PersonalizableInfo"
], function(Device, JSONModel, Filter, FilterOperator, FilterType, BaseController, Persistence, PersonalizableInfo) {
    "use strict";

    return BaseController.extend('com.evorait.evoplan.controller.MasterPage', {

        /**
        * Called when a controller is instantiated and its View controls (if available) are already created.
        * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
        * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage **/
        onInit: function() {
            this._oDroppableTable = this.byId("droppableTable");
            this._aFilters = [];

            //todo fetch variantSet
            //this.byId("customVariant").currentVariantSetModified(true);

            //add fragment FilterSettingsDialog to the view
            if (!this._oFilterSettingsDialog) {
                this._oFilterSettingsDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.FilterSettingsDialog", this);
                this.getView().addDependent(this._oFilterSettingsDialog);
            }
        },

        /**
        * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
        * This hook is the same one that SAPUI5 controls get after being rendered.
        * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage **/
        onAfterRendering: function() {
            if(this._oDroppableTable){
                this._jDroppable(this);
            }
            this._initialCustomVariant();
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
         * @param oEvent
         */
        onSearch : function (oEvent) {
            var sQuery = oEvent.getSource().getValue();
            var aFilters = this._aFilters;
            var binding = this._oDroppableTable.getBinding("items");

            if (sQuery && sQuery.length > 0) {
                //only search on 0 and 1 Level
                var filter = new Filter("Description", FilterOperator.Contains, sQuery);
                //var filterLevel = new Filter("HierarchyLevel", FilterOperator.LE, 1);
                aFilters.push(filter);
            }
            binding.filter(aFilters, "Application");
        },

        /**
         * open FilterSettingsDialog
         * @param oEvent
         */
        onFilterButtonPress : function (oEvent) {
            this._initialFilterDialog();
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
            this._aFilters = [];

            this._initialFilterDialog();

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
        onBeforeSaveVariant : function (oEvent) {
            var params = oEvent.getParameters();
            console.log(params);
            console.log("onBeforeSaveVariant");

            if(params.overwrite){

            }
        },

        /**
         * Todo: is this needed?
         * when users apply changes to variants in the Manage Variants dialog
         * @param oEvent
         */
        onManageVariant : function (oEvent) {

        },

        /**
         * Todo: set right view filter parameters
         * ViewSettingsDialog confirm filter
         * @param oEvent
         */
        onFilterSettingsConfirm : function (oEvent) {
            var params = oEvent.getParameters();
            var oBinding = this._oDroppableTable.getBinding("items");
            var oGroupFilter = sap.ui.getCore().byId("idCustomFilterItem").getCustomControl();
            var oGroupFilterValue = oGroupFilter.getValue();
            var aFilters = [];

            //filter for selected view
            for (var i = 0; i < params.filterItems.length; i++) {
                var obj = params.filterItems[i];
                var key = obj.getKey();
                var filter = new Filter("View", FilterOperator.Contains, key);
                aFilters.push(filter);
            }

            //filter for Resource group
            var customFilter = new Filter("ParentNodeId", FilterOperator.Contains, oGroupFilterValue);
            aFilters.push(customFilter);
            //hold view settings globally for variant managment
            this._aFilters = aFilters;
            oBinding.filter(aFilters, "Application");
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

        _initialCustomVariant: function () {
            var oVariant = this.byId("customVariant");
            //console.log(oVariant);
            /*var persistencyKey = this.getModel("viewModel").getProperty("/persistencyKey");
            oVariant.setProperty("persistencyKey", persistencyKey);
            var _oControlPersistence = new Persistence(oVariant, "persistencyKey");
            console.log(_oControlPersistence);*/

            var searchField = this.byId("searchField");
            //console.log(this._oDroppableTable.getEntityType());

            var oPersInfo = new sap.ui.comp.smartvariants.PersonalizableInfo({
                type: "filterResources",
                keyName: "persistencyKey"
                //dataSource: ""
            });
            oPersInfo.setControl(searchField);
            oVariant.addPersonalizableControl(oPersInfo);
        },

        _initialFilterDialog: function () {
            if (!this._oFilterSettingsDialog) {
                this._oFilterSettingsDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.FilterSettingsDialog", this);
                this.getView().addDependent(this._oFilterSettingsDialog);
            }
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