sap.ui.define([
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
    "com/evorait/evoplan/controller/BaseController",
    "sap/m/CustomTreeItem"
], function(Device, JSONModel, Filter, FilterOperator, FilterType, BaseController, CustomTreeItem) {
    "use strict";

    return BaseController.extend('com.evorait.evoplan.controller.MasterPage', {

        /**
        * Called when a controller is instantiated and its View controls (if available) are already created.
        * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
        * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage **/
        onInit: function() {
            //this._oApplication = this.getApplication();
            this._oDroppableTable = this.byId("droppableTable");
            this._oDataTable = this._oDroppableTable.getTable();
            this._configureDataTable(this._oDataTable);

            this._oPullToRefresh = this.byId("pullToRefresh");
            this._oListFilterState = {
                aSearch: []
            };
            this._iRunningListUpdates = 0;
            //this._initializeViewModel();

        },

        /**
        * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
        * (NOT before the first rendering! onInit() is used for that one!).
        * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage
        **/
        onBeforeRendering: function() {

        },

        /**
        * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
        * This hook is the same one that SAPUI5 controls get after being rendered.
        * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage **/
        onAfterRendering: function() {
            if(this._oDroppableTable){
                this._jDroppable(this);
            }
        },

        onBeforeRebindTable: function(oEvent) {
            var oBindingParams = oEvent.getParameter('bindingParams');

            oBindingParams.parameters.numberOfExpandedLevels = 2;

            /*var aFilters = oEvent.mParameters.bindingParams.filters,
                aSorters = oEvent.mParameters.bindingParams.sorter;*/

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

        onSearch : function (oEvent) {
            var sQuery = oEvent.getSource().getValue(),
                aFilters = [];
            var tableBindingPath = this._oDroppableTable.getTableBindingPath();
            //this._oDroppableTable.fireBeforeRebindTable();
        },

        /**
         *
         * @param oEvent
         */
        onFilterButtonPress : function (oEvent) {
            if (!this._oFilterSettingsDialog) {
                this._oFilterSettingsDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.FilterSettingsDialog", this);
            }
            // toggle compact style
            jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oFilterSettingsDialog);
            this._oFilterSettingsDialog.open();
        },

        /**
         *
         * @param oEvent
         */
        onSwitchViewButtonPress : function (oEvent) {
            if (!this._oViewSettingsPopover) {
                this._oViewSettingsPopover = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.ViewSettingsPopover", this);
                this.getView().addDependent(this._oViewSettingsPopover);
            }
            this._oViewSettingsPopover.openBy(oEvent.getSource());
        },

        /**
         * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
         * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage
         **/
        onExit: function() {
            if(this._oFilterSettingsDialog){
                this._oFilterSettingsDialog.destroy();
            }
            if(this._oViewSettingsPopover){
                this._oViewSettingsPopover.destroy();
            }
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        _configureDataTable : function (oDataTable) {
            oDataTable.setEnableBusyIndicator(true);
            oDataTable.setSelectionMode('None');
            oDataTable.setColumnHeaderVisible(false);
            oDataTable.setEnableColumnReordering(false);
            oDataTable.setEditable(false);
            oDataTable.setWidth("100%");
            oDataTable.attachBusyStateChanged(this.onBusyStateChanged, this);
        },

        _jDroppable: function (_this) {
            setTimeout(function() {
                var droppableTableId = _this._oDroppableTable.getId();
                var droppedElement = $("#"+droppableTableId+" tbody tr");

                try{
                    if(droppedElement.hasClass("ui-droppable")){
                        droppedElement.droppable( "destroy" );
                    }
                }catch(error){
                    console.log(error);
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
                            $(draggedElements).find('li').each(function (idx, obj) {
                                _this._addEntries($(this).attr('id'), targetPath);
                            });
                        }
                    }
                });
            }, 1000);
        },

        _addEntries: function (sourcePath, targetPath) {
            var sourceData = this.getModel().getProperty(sourcePath),
                targetData = this.getModel().getProperty(targetPath);

            var newRowObj = {
                PARENT_NODE: targetData.HIERARCHY_NODE,
                DESCRIPTION: sourceData.Guid +" "+sourceData.DemandDesc,
                DRILLDOWN_STATE: "collapsed",
                LEVEL: targetData.LEVEL+1,
                MAGNITUDE: 0,
                SERVER_INDEX: 0,
                ISCONTAINER: 0
            };

            var newEntry = this.getModel().createEntry('/TechnicianSet', {properties: newRowObj});
            this._oDroppableTable.getModel().refresh();
        }


    });
});
