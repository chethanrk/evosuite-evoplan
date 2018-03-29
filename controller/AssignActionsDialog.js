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
            eventBus.subscribe("AssignTreeDialog", "closeActionDialog", this.onCloseDialog,this);
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
         * @Author Rahul
         * @version 2.0.6
         * @param oView - view in which it getting invoked.
         * @param aSelectedResources - selected resources before opening the dialog.
         * @param isUnAssign - to Identify action for which it is opened.
         */
        open : function (oView,aSelectedResources,isUnAssign) {
            this._oView = oView;
            this._aSelectedResources = aSelectedResources;
            this._isUnAssign = isUnAssign;
            this._resourceBundle = this._oView.getController().getResourceBundle();
            var oDialog = this.getDialog();
            oView.addDependent(oDialog);
            oDialog.open();
        },
        /**
         * Adding the expand clause to smart table by setting binding parameters on beforeRebind event
         * @Author Rahul
         * @version 2.0.6
         * @param oEvent
         */
        onBeforeRebind: function(oEvent) {
            var mBindingParams = oEvent.getParameter("bindingParams");
            mBindingParams.parameters["expand"] = "DemandToAssignment";
            this._filterDemandTable(this._aSelectedResources);
        },
        /**
         * Setting initial setting for dialog when it opens
         * Filters the resctive demands based on selected resource assignment
         *
         * @Author Rahul
         * @version 2.0.6
         * @param oEvent
         */
        onDialogOpen : function (oEvent) {
            var oUnAssignBtn =  sap.ui.getCore().byId("idButtonBulkUnAssign");
            var oReAssignBtn =  sap.ui.getCore().byId("idButtonBulkReAssign");
            var oDialog = this.getDialog();
            this._oAssignMentSmartTable = sap.ui.getCore().byId("idDemandAssignmentTable");
            this._oAssignMentTable = sap.ui.getCore().byId("idDemandAssignmentTable").getTable();


            if(this._isUnAssign){
                oUnAssignBtn.setVisible(true);
                oReAssignBtn.setVisible(false);
                oDialog.setTitle(this._resourceBundle.getText("xtit.unAssignTitle"));
            }else{
                oUnAssignBtn.setVisible(false);
                oReAssignBtn.setVisible(true);
                oDialog.setTitle(this._resourceBundle.getText("xtit.reAssignTitle"));
            }
            if(this.isFirstTime)
                this._filterDemandTable(this._aSelectedResources);

            this.isFirstTime = true;
        },
        /**
         * Event for unassign
         *
         * @Author Rahul
         * @version 2.0.6
         * @param oEvent
         */
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

            eventBus.publish("AssignActionsDialog", "bulkDeleteAssignment", {
                        aContexts: aContexts
            });
            this.onCloseDialog();
        },
        /**
         * Event for reassign.
         *
         * @Author Rahul
         * @version 2.0.6
         * @param oEvent
         */
        onReassign:function (oEvent) {
            var eventBus = sap.ui.getCore().getEventBus(),
                aContexts = this._oAssignMentTable.getSelectedContexts(),
                oData;

            //check at least one demand selected
            if(aContexts.length === 0){
                var msg = this._oView.getController().getResourceBundle().getText('ymsg.selectMinItem');
                MessageToast.show(msg);
                return;
            }
            eventBus.publish("AssignActionsDialog", "selectAssign", {
                oView: this._oView,
                isReassign: this.reAssign,
                aSelectedContexts : aContexts,
                isBulkReassign : true
            });
        },
        /**
         * To validate the selected demands eligible to perform the following action
         *
         * @Author Rahul
         * @version 2.0.6
         * @param oTable Table object
         * @param bForReassign To identify the action.
         * @return {{bValidate: boolean, aDemands: Array}}
         */
        validateDemands:function (aSelectedItems,bForReassign) {
            this._oAssignMentTable.removeSelections(); // reomoves the selected items

            for(var i in aSelectedItems){
                var oItem = aSelectedItems[i],
                    oContext = oItem.getBindingContext(),
                    sPath = oContext.getPath(),
                    oModel = oContext.getModel(),
                    bFlag = undefined;

                if (bForReassign)
                    bFlag  = oModel.getProperty(sPath+"/ALLOW_UNASSIGN");
                else
                    bFlag  = oModel.getProperty(sPath+"/ALLOW_REASSIGN");

                if(bFlag){
                    this._oAssignMentTable.setSelectedItem(oItem);
                }
            }
        },
        /**
         * Return resource filters on selected resources
         *
         * @Author Rahul
         * @version 2.0.6
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
        /**
         * Filters the demand by demand guids for filter assignments
         *
         * @Author Rahul
         * @version 2.0.6
         * @param aSelectedResources
         * @private
         */
        _filterDemandTable: function(aSelectedResources){
            var oModel = this._oView.getModel();

            oModel.read("/AssignmentSet",{
                filters:this._getResourceFilters(aSelectedResources),
                success:function (oData, oResponse) {
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
        /**
         * Checking selected demand is allowed for respective action on selection change of demand
         *
         * @Author Rahul
         * @version 2.0.6
         * @param oEvent
         */
        onSelectionChange:function (oEvent) {
            if(oEvent.getParameter("selected") && !oEvent.getParameter("selectAll")) {
                var oListItem = oEvent.getParameter("listItem"),
                    oContext = oListItem.getBindingContext(),
                    sPath = oContext.getPath(),
                    oModel = oContext.getModel(),
                    msg = "",
                    bFlag = false;

                if (!this._isUnAssign) {
                    bFlag = oModel.getProperty(sPath + "/ALLOW_REASSIGN");
                } else {
                    bFlag = oModel.getProperty(sPath + "/ALLOW_UNASSIGN");
                }
                oListItem.setSelected(bFlag);
            }else{
                if(oEvent.getParameter("selectAll")) {
                    var aListItems = oEvent.getParameter("listItems");
                    this.validateDemands(aListItems, this._isUnAssign);
                }
            }
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