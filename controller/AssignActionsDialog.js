sap.ui.define([
    "com/evorait/evoplan/controller/BaseController",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (BaseController, formatter, Filter, FilterOperator, MessageToast) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.AssignActionsDialog", {


        init: function () {
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("BaseController", "refreshActionTable", this._triggerRefreshTable, this);
        },
        /**
         * initialize and get dialog object
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        getDialog : function () {
            // create dialog lazily
            if (!this._oDialog) {
                // create dialog via fragment factory
                this._oDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.AssignActionsDialog", this);
            }
            return this._oDialog;
        },
        /**
         * open dialog
         * get detail data from resource and resource group
         * @param oView
         * @param sBindPath
         */
        open : function (oView,aSelectedResources,isUnAssign) {
            this._oView = oView;
            this._aSelectedResources = aSelectedResources;
            this._isUnAssign = isUnAssign;
            var oDialog = this.getDialog();
            oView.addDependent(oDialog);
            oDialog.open();
        },
        onBeforeRebind: function(oEvent) {
            var mBindingParams = oEvent.getParameter("bindingParams");
            mBindingParams.parameters["expand"] = "DemandToAssignment";
            this._filterDemandTable(this._aSelectedResources);
        },
        onDialogOpen : function (oEvent) {
            var oUnAssignBtn =  sap.ui.getCore().byId("idButtonBulkUnAssign");
            var oReAssignBtn =  sap.ui.getCore().byId("idButtonBulkReAssign");
            this._oAssignMentSmartTable = sap.ui.getCore().byId("idDemandAssignmentTable");
            this._oAssignMentTable = sap.ui.getCore().byId("idDemandAssignmentTable").getTable();

            if(this._isUnAssign){
                oUnAssignBtn.setVisible(true);
                oReAssignBtn.setVisible(false);
            }else{
                oUnAssignBtn.setVisible(false);
                oReAssignBtn.setVisible(true);
            }
            if(this.isFirstTime)
                this._filterDemandTable(this._aSelectedResources);

            this.isFirstTime = true;
        },
        onUnassign:function (oEvent) {
            var eventBus = sap.ui.getCore().getEventBus(),
                oTable = this._oAssignMentTable,
                aContexts = oTable.getSelectedContexts(),
                oData;

            //check at least one demand selected
            if(aContexts.length === 0){
                var msg = this._oView.getController().getResourceBundle().getText('ymsg.selectMinItem');
                MessageToast.show(msg);
                return;
            }
            oData = this.validateDemands(oTable);
            if(oData.bValidate){
                 eventBus.publish("AssignActionsDialog", "bulkDeleteAssignment", {
                        aContexts: aContexts
                 });
                 this.onCloseDialog();
            }else{
                this._showAssignErrorDialog.call(this._oView.getController(),oData.aDemands,true);
                return;
            }
        },
        onReassign:function (oEvent) {
            var eventBus = sap.ui.getCore().getEventBus(),
                oTable = this._oAssignMentTable,
                aContexts = oTable.getSelectedContexts(),
                oData;

            //check at least one demand selected
            if(aContexts.length === 0){
                var msg = this._oView.getController().getResourceBundle().getText('ymsg.selectMinItem');
                MessageToast.show(msg);
                return;
            }
            // Flag is to identify the action
            oData = this.validateDemands(oTable,true);
            if(oData.bValidate){
                eventBus.publish("AssignActionsDialog", "selectAssign", {
                    oView: this._oView,
                    isReassign: this.reAssign,
                    aSelectedContexts : aContexts,
                    isBulkReassign : true
                });
            }else{
                this._showAssignErrorDialog.call(this._oView.getController(),oData.aDemands,true);
                return;
            }
        },
        /**
         * To validate the selected demands eligible to perform the following action
         *
         * @param oTable Table object
         * @param bForReassign To identify the action.
         * @return {{bValidate: boolean, aDemands: Array}}
         */
        validateDemands:function (oTable,bForReassign) {
            var aSelectedItems = oTable.getSelectedItems(),
                bValidate = true,
                aDemands = [];

            oTable.removeSelections(); // reomoves the selected items

            for(var i in aSelectedItems){
                var oItem = aSelectedItems[i],
                    oContext = oItem.getBindingContext(),
                    sPath = oContext.getPath(),
                    oModel = oContext.getModel(),
                    bFlag = undefined;

                if (bForReassign)
                    bFlag  = oModel.getProperty(sPath+"/ALLOW_REASSIGN");
                else
                    bFlag  = oModel.getProperty(sPath+"/ALLOW_UNASSIGN");

                if(bFlag){
                    oTable.setSelectedItem(oItem);
                }else{
                    bValidate = false;
                    aDemands.push(oModel.getProperty(sPath+"/DemandDesc"));
                }
            }
            return {
                bValidate:bValidate,
                aDemands:aDemands
            };
        },
        /**
         * Return resource filters on selected resources
         *
         * @param aSelectedResources {Array} Selected Resources
         * @return aResourceFilters Filters
         */
        _getResourceFilters: function(aSelectedResources){
            var aResources = [],
                aResourceFilters = [],
                oModel = this._oView.getModel();

            for (var i = 0; i < aSelectedResources.length; i++) {
                var obj = oModel.getProperty(aSelectedResources[i]);
                if (obj.NodeType === "RESOURCE") {
                    aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGuid + "//" + obj.ResourceGroupGuid));
                } else if (obj.NodeType === "RES_GROUP") {
                    aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid));
                }
            }
            if (aResources.length > 0) {
                aResourceFilters.push(new Filter({
                    filters: aResources,
                    and: false
                }));
            }
            return aResourceFilters;
        },
        _filterDemandTable: function(aSelectedResources, oTable){
            var oModel = this._oView.getModel();

            oModel.read("/AssignmentSet",{
                filters:this._getResourceFilters(aSelectedResources),
                success:function (oData, oResponse) {
                    console.log(oData);
                    var aAssignments = oData.results,
                        aDemands = [],
                        aDemandFilters = [];
                    for(var i in aAssignments){
                        aDemands.push(new Filter("Guid",FilterOperator.EQ,aAssignments[i].DemandGuid));
                    }
                    if (aDemands.length > 0) {
                        aDemandFilters.push(new Filter({
                            filters: aDemands,
                            and: false
                        }));
                    }else{
                        aDemandFilters.push(new Filter({
                            filters: [new Filter("Guid",FilterOperator.EQ,null)],
                            and: false
                        }));

                    }
                    this._oAssignMentTable.getBinding("items").filter(aDemandFilters);

                }.bind(this)
            });
        },
        _triggerRefreshTable : function () {
            this._oAssignMentSmartTable.rebindTable();
        },
        /**
         * close dialog
         */
        onCloseDialog : function () {
            this._oAssignMentTable.removeSelections();
            this.getDialog().close();
        }
    });
});