sap.ui.define([
    "com/evorait/evoplan/controller/AssignmentsController",
    "com/evorait/evoplan/model/models",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, models, formatter, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.StatusSelectDialog", {

        formatter: formatter,

        init: function () {
        },

        /**
         * init and get dialog view
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        getDialog : function () {
            // create dialog lazily
            if (!this._oDialog) {
                // create dialog via fragment factory
                this._oDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.StatusSelectDialog", this);
            }
            return this._oDialog;
        },

        /**
         * open dialog
         * get detail data from resource and resource group
         * @param oView
         * @param sBindPath
         */
        open : function (oView, aSelectedPaths, mParameters) {
            var oDialog = this.getDialog();
            
            // connect dialog to view (models, lifecycle)
            oView.addDependent(oDialog);
			this._mParameters = mParameters || {bFromHome:true};
            this._oView = oView;
            this._selectedFunction = null;
            this._aSelectedPaths = aSelectedPaths;
            this._component = this._oView.getController().getOwnerComponent();
            // setting the content density class on dialog
            oDialog.addStyleClass(this._component.getContentDensityClass());
            //remove selection maybe from last time
            var oList = sap.ui.getCore().byId("selectStatusList");
            oList.clearSelection();

            // open dialog
            oDialog.open();
        },

        /**
         * on select status close
         * @param oEvent
         */
        onSelectionChange : function (oEvent) {
            var oSelected = oEvent.getParameters("selectedItem");
            this._selectedFunction = oSelected.selectedItem.getProperty("key");
        },

        /**
         * get selected key and selected demand pathes and publish event for saving
         * @param oEvent
         */
        onSaveDialog: function (oEvent) {
            if(this._selectedFunction && this._selectedFunction !== ""){
                var eventBus = sap.ui.getCore().getEventBus();

                if(this._aSelectedPaths){
                    var oData = this.validateStatusTransition(this._aSelectedPaths,this._selectedFunction);
                    if(oData.bChangable) {
                        eventBus.publish("StatusSelectDialog", "changeStatusDemand", {
                            selectedPaths: this._aSelectedPaths,
                            functionKey: this._selectedFunction,
                            parameters : this._mParameters
                        });
                        this.onCloseDialog();
                        return;
                    }else{
                        this._oView.byId("draggableList").getTable().clearSelection();
                        for(var j in oData.aIndices){
                            this._oView.byId("draggableList").getTable().addSelectionInterval(oData.aIndices[j],oData.aIndices[j]);
                        }
                        this.onCloseDialog();
                        this._showAssignErrorDialog.call(this._oView.getController(),oData.aNonChangable,true);
                        return;
                    }

                }
            }
            //show error message
            var msg = this._oView.getController().getResourceBundle().getText("notFoundContext");
            this.showMessageToast(msg);
        },

        validateStatusTransition : function(aSelectedPaths,sSelectedFunction){
            var aNonChangable  = [],aIndices = [],
                bChangable = true;
            for(var i in aSelectedPaths){
                var oDemand = aSelectedPaths[i].oData;
                if(!oDemand["ALLOW_"+sSelectedFunction]){
                    aNonChangable.push(oDemand.DemandDesc);
                    bChangable = false;
                }else{
                    aIndices.push(aSelectedPaths[i].index);
                }
            }
            return {
                aNonChangable:aNonChangable,
                bChangable:bChangable,
                aIndices:aIndices
            };
        },

        /**
         * close dialog
         */
        onCloseDialog : function (oEvent) {
            this.getDialog().close();
        }
    });
});