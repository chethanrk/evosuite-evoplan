sap.ui.define([
    "com/evorait/evoplan/controller/BaseController",
    "com/evorait/evoplan/model/models",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, models, formatter, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.StatusSelectDialog", {

        formatter: formatter,

        init: function () {
            var eventBus = sap.ui.getCore().getEventBus();
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
        open : function (oView) {
            var oDialog = this.getDialog(),
                oDraggableTable = oView.byId("draggableList");
            // connect dialog to view (models, lifecycle)
            oView.addDependent(oDialog);

            this._oView = oView;
            this._selectedFunction = null;
            this._oDataTable = null;

            if(oDraggableTable){
                this._oDataTable = oDraggableTable.getTable();
            }

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

                if(this._oDataTable){
                    var selectedIdx = this._oDataTable.getSelectedIndices();
                    var selectedPaths = this._getSelectedRowPaths(this._oDataTable, selectedIdx, this._oView);

                    eventBus.publish("StatusSelectDialog", "changeStatusDemand", {
                        selectedPaths: selectedPaths,
                        functionKey: this._selectedFunction
                    });
                    this.onCloseDialog();
                    return;
                }
            }
            //show error message
            var msg = this._oView.getResourceBundle().getText("notFoundContext");
            this.showMessageToast(msg);
        },

        /**
         * close dialog
         */
        onCloseDialog : function (oEvent) {
            this.getDialog().close();
        }
    });
});