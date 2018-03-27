sap.ui.define([
    "com/evorait/evoplan/controller/BaseController",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, formatter, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.AssignActionsDialog", {


        init: function () {
            var eventBus = sap.ui.getCore().getEventBus();
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
        onDialogOpen : function (oEvent) {
            var aResources = [];
            var aResourceFilters = [];
            var oModel = this._oView.getModel();
            this._oAssignMentTable = sap.ui.getCore().byId("idDemandAssignmentTable");

            var oUnAssignBtn =  sap.ui.getCore().byId("idButtonBulkUnAssign");
            var oReAssignBtn =  sap.ui.getCore().byId("idButtonBulkReAssign");
            if(this._isUnAssign){
                oUnAssignBtn.setVisible(true);
                oReAssignBtn.setVisible(false);
            }else{
                oUnAssignBtn.setVisible(false);
                oReAssignBtn.setVisible(true);
            }
            for (var i = 0; i < this._aSelectedResources.length; i++) {
                var obj = oModel.getProperty(this._aSelectedResources[i]);
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
            this._oAssignMentTable.getBinding("items").filter(aResourceFilters);
        },
        /*onBeforeRebind: function(oEvent) {
            var mBindingParams = oEvent.getParameter("bindingParams");
            mBindingParams.parameters["expand"] = "Demand";
        },*/
        onUnassign:function (oEvent) {
            var eventBus = sap.ui.getCore().getEventBus(),
                oTable = this._oAssignMentTable,
                aContexts = oTable.getSelectedContexts(),
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
                oModel = this._oView.getModel(),
                aContexts = oTable.getSelectedContexts(),
                oData = this.validateDemands(oTable,true);

            if(oData.bValidate){
                var eventBus = sap.ui.getCore().getEventBus();
                eventBus.publish("AssignActionsDialog", "selectAssign", {
                    oView: this._oView,
                    isReassign: this.reAssign,
                    aSelectedContexts : aContexts,
                    isBulkReassign : true
                });
                //this.onCloseDialog();
            }else{
                this._showAssignErrorDialog.call(this._oView.getController(),oData.aDemands,true);
                return;
            }
        },
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
                    bFlag  = oModel.getProperty(sPath+"/Demand/ALLOW_REASSIGN");
                else
                    bFlag  = oModel.getProperty(sPath+"/Demand/ALLOW_UNASSIGN");

                if(bFlag){
                    oTable.setSelectedItem(oItem);
                }else{
                    bValidate = false;
                    aDemands.push(oModel.getProperty(sPath+"/Demand/DemandDesc"));
                }
            }
            return {
                bValidate:bValidate,
                aDemands:aDemands
            };
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