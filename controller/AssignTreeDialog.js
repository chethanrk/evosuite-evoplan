sap.ui.define([
    "com/evorait/evoplan/controller/BaseController",
    "com/evorait/evoplan/model/models",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, models, formatter, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.AssignTreeDialog", {

        formatter: formatter,

        init: function () {
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("AssignInfoDialog", "selectAssign", this._triggerOpenDialog, this);
        },

        /**
         * init and get dialog view
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        getDialog : function () {
            // create dialog lazily
            if (!this._oDialog) {
                // create dialog via fragment factory
                this._oDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.AssignSelectDialog", this);
            }
            return this._oDialog;
        },

        /**
         * open dialog
         * get detail data from resource and resource group
         * @param oView
         * @param sBindPath
         */
        open : function (oView, isReassign, aSelectedPaths) {
            var oDialog = this.getDialog();

            this._oView = oView;
            this._reAssign = isReassign;
            this._aSelectedPaths = aSelectedPaths;

            // connect dialog to view (models, lifecycle)
            oView.addDependent(oDialog);
            // open dialog
            oDialog.open();
        },

        /**
         * search on resource tree
         * @param oEvent
         */
        onSearchModal : function (oEvent) {
            var sQuery = oEvent.getSource().getValue() || "",
                oTable = sap.ui.getCore().byId("assignModalTable");

            var viewModel = this._oView.getModel("viewModel"),
                binding = oTable.getBinding("rows"),
                viewFilters = viewModel.getProperty("/resourceFilterView"),
                aFilters = viewFilters.slice(0);

            if(!aFilters && aFilters.length == 0){
                return;
            }

            aFilters.push(new Filter("Description", FilterOperator.Contains, sQuery));
            var resourceFilter = new Filter({filters: aFilters, and: true});
            binding.filter(resourceFilter, "Application");
        },

        /**
         *
         * @param oEvent
         */
        onSelectionChange : function (oEvent) {
            var oContext = oEvent.getParameter("rowContext");
            this._assignPath = oContext.sPath;
        },

        /**
         * save form data when demand selected from Demand table
         * or if set reassign save path in help model
         * @param oEvent
         */
        onSaveDialog : function (oEvent) {
            if(this._assignPath){
                var eventBus = sap.ui.getCore().getEventBus();

                if(this._reAssign){
                    eventBus.publish("AssignTreeDialog", "selectedAssignment", {
                        sPath: this._assignPath
                    });
                    this.onCloseDialog();
                    return;
                }

                if(this._aSelectedPaths){
                    eventBus.publish("AssignTreeDialog", "assignSelectedDemand", {
                        selectedPaths: this._aSelectedPaths,
                        assignPath: this._assignPath
                    });
                    this.onCloseDialog();
                    return;
                }
            }

            //show error message
            var msg = this._oView.getResourceBundle().getText("notFoundContext");
            this.showMessageToast(msg);
        },

        refreshDialogTable: function (oEvent) {
            var oTable = sap.ui.getCore().byId("assignModalTable");
            var binding = oTable.getBinding("rows");
            var aFilters = this._oView.getModel("viewModel").getProperty("/resourceFilterAll");
            binding.filter(aFilters, "Application");
        },

        /**
         * close dialog
         */
        onCloseDialog : function () {
            this.getDialog().close();
        },

        _triggerOpenDialog: function (sChanel, sEvent, oData) {
            if(sEvent === "selectAssign"){
                this.open(oData.oView, oData.isReassign);
            }
        }


    });
});