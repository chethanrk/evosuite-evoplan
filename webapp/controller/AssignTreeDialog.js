sap.ui.define([
    "com/evorait/evoplan/controller/AssignmentsController",
    "com/evorait/evoplan/model/models",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, models, formatter, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.AssignTreeDialog", {

        formatter: formatter,

        init: function () {
            this._eventBus = sap.ui.getCore().getEventBus();
            this._eventBus.subscribe("AssignInfoDialog", "selectAssign", this._triggerOpenDialog, this);
            this._eventBus.subscribe("AssignActionsDialog", "selectAssign", this._triggerOpenDialog, this);
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
         * @param isBulkReAssign - To Identify the action for the dialog is getting opened.
         */
        open : function (oView, isReassign, aSelectedPaths, isBulkReAssign, mParameters, callbackEvent) {
            var oDialog = this.getDialog();

            this._oView = oView;
            this._reAssign = isReassign;
            this._aSelectedPaths = aSelectedPaths;
            this._bulkReAssign = isBulkReAssign;
			this._mParameters = mParameters  || {bFromHome:true};
			this._callbackEvent = callbackEvent;
            this._component = this._oView.getController().getOwnerComponent();
            oDialog.addStyleClass(this._component.getContentDensityClass());
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

            if(!aFilters && aFilters.length === 0){
                return;
            }
            if(sQuery && sQuery!==""){
	            // aFilters.splice(3,1);
	            aFilters.push(new Filter("Description", FilterOperator.Contains, sQuery));
            }
            
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
                if(this._callbackEvent){
                    this._eventBus.publish("AssignTreeDialog", this._callbackEvent, {
                        sAssignPath: this._assignPath,
                        aSourcePaths: this._aSelectedPaths,
                        parameters : this._mParameters
                    });
                    this.onCloseDialog();
                    return;
                }
                // In case of bulk reassign
                if(this._bulkReAssign){
                    this._eventBus.publish("AssignTreeDialog", "bulkReAssignment", {
                        sPath: this._assignPath,
                        aContexts: this._aSelectedPaths,
                        parameters : this._mParameters
                    });
                    this.onCloseDialog();
                    this._eventBus.publish("AssignTreeDialog", "closeActionDialog", {});
                    return;
                }
                // In case single reassign
                if(this._reAssign){
                    this._eventBus.publish("AssignTreeDialog", "selectedAssignment", {
                        sPath: this._assignPath
                    });
                    this.onCloseDialog();
                    return;
                }
                if(this._aSelectedPaths){
                    this._eventBus.publish("AssignTreeDialog", "assignSelectedDemand", {
                        selectedPaths: this._aSelectedPaths,
                        assignPath: this._assignPath,
                        parameters : this._mParameters
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
		 * Refresh the table before opening the dialog
		 */
        refreshDialogTable: function (oEvent) {
                var oTable = sap.ui.getCore().byId("assignModalTable"),
                	oSearchField = sap.ui.getCore().byId("idSeachModalTree"),
                	binding = oTable.getBinding("rows"),
                	aFilters = this._oView.getModel("viewModel").getProperty("/resourceFilterView");
                 // Search field should be empty
                oSearchField.setValue("");
                binding.filter(aFilters, "Application");

        },

        /**
         * close dialog
         */
        onCloseDialog : function () {
            this.getDialog().close();
        },
		/**
		 * Open's dialog as per event channel to list the resources to reassign 
		 */
        _triggerOpenDialog: function (sChanel, sEvent, oData) {
            if(sChanel === "AssignInfoDialog" && sEvent === "selectAssign"){
                this.open(oData.oView, oData.isReassign, oData.parameters);
            }else if(sChanel === "AssignActionsDialog" && sEvent === "selectAssign"){
                this.open(oData.oView, oData.isReassign, oData.aSelectedContexts, oData.isBulkReassign, oData.parameters);
            }
        },
        exit:function(){
            this._eventBus.unsubscribe("AssignInfoDialog", "selectAssign", this._triggerOpenDialog, this);
            this._eventBus.unsubscribe("AssignActionsDialog", "selectAssign", this._triggerOpenDialog, this);
        }


    });
});