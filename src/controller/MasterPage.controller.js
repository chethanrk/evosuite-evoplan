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
            // Note: This example is based on mock data, so defining the number of expended levels in the beforeRebindTable event should be avoided for
            // performance reasons.
            oBindingParams.parameters.numberOfExpandedLevels = 2;
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

        _jDroppable: function (_this) {
            if(_this._oDroppableTable){
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
                        var dropTargetId = event.target.id;
                        var targetElement = sap.ui.getCore().byId(dropTargetId),
                            oContext = targetElement.getBindingContext(),
                            targetPath = oContext.getPath(),
                            sourcePath = ui.helper[0].id;
                        _this._addEntry(sourcePath, targetPath);
                    }
                });
            }
        },

        _addEntry: function (sourcePath, targetPath) {
            var sourceData = this.getModel().getProperty(sourcePath),
                targetData = this.getModel().getProperty(targetPath);

            var newRowObj = {
                PARENT_NODE: targetData.HIERARCHY_NODE,
                DESCRIPTION: sourceData.WorkOrder +" "+sourceData.WorkOrderDescription,
                DRILLDOWN_STATE: "collapsed",
                LEVEL: targetData.LEVEL+1,
                MAGNITUDE: 0,
                SERVER_INDEX: 0,
                ISCONTAINER: 0,
            };

            var newEntry = this.getModel().createEntry('/TechnicianSet', {properties: newRowObj});
            this._oDroppableTable.getModel().refresh();
            console.log(this.getModel());
        },

        /**
        * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
        * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage
        **/
        onExit: function() {

        }

    });
});
