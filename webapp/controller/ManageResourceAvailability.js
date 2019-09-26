sap.ui.define([
    "com/evorait/evoplan/controller/AssignmentsController",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (BaseController, formatter, Filter, FilterOperator, JSONModel, Fragment) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.ManageResourceAvailability", {

        formatter: formatter,

        init: function () {
        },
        /**
         * init and get dialog view
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        open: function (oView, aSelectedPath, mParameters) {
            // create dialog lazily
            if (!this._oDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.evorait.evoplan.view.fragments.ManageResourceAvailability",
                    controller: this
                }).then(function (oDialog) {
                    this._oDialog = oDialog;
                    this.onOpen(oDialog, oView, aSelectedPath, mParameters);
                }.bind(this));
            }else {
                this.onOpen(this._oDialog, oView, aSelectedPath, mParameters);
            }
        },

        /**
         * Open's the popover
         * @param oView
         * @param oEvent
         */
        onOpen: function (oDialog, oView, aSelectedPath, mParameters) {
            // var oDialog = this.getDialog(oView);
            this._oView = oView;
            this._component = oView.getController().getOwnerComponent();
            this._oModel = this._component.getModel();
            this._calendarModel = this._component.getModel("calendarModel")
            this._mParameters = mParameters || {bFromHome:true};
            this._resourceBundle = this._oView.getController().getResourceBundle();
            this._id = this._oView.getId();
            this._oApp = Fragment.byId(this._id,"navCon");
            if(this._mParameters.bFromPlannCal){
                this._resource = this._calendarModel.getProperty(aSelectedPath[0]).ResourceGuid;
            }else{
                this._resource = this._oModel.getProperty(aSelectedPath[0]+"/ResourceGuid");
                this._resourceName = this._oModel.getProperty(aSelectedPath[0]+"/Description");

            }

            oDialog.setTitle(this._resourceName);
            oDialog.addStyleClass(this._component.getContentDensityClass());
            // connect dialog to view (models, lifecycle)
            oView.addDependent(oDialog);
            // this.configureList(this._resource);
            oDialog.open();
        },
        onClickItem : function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem"),
                oContext = oSelectedItem.getBindingContext(),
                oModel = oContext.getModel(),
                sPath = oContext.getPath(),
                oData = oModel.getProperty(sPath);

            var oDetail = Fragment.byId(this._id,"detail");
            oDetail.bindElement(sPath);

            this._oApp.to(this._id+"--detail");


        },
        /**
         * On back check for data dirty
         * if data is dirty show confirmation box, if not navigates to master page
         * @param oEvent
         */
        onNavBack : function (oEvent) {
            var oChanges = this._getChangedData(oEvent);
            if(!oChanges){
                this._oApp.back();
            }else{
                this._showConfirmMessageBox.call(this._oView.getController(),this._resourceBundle.getText("ymsg.confirmMsg")).then(function(data){
                    if(data === "YES"){
                        this._oApp.back();
                    }else{
                        this._oModel.resetChanges();
                    }
                }.bind(this))
            }

        },
        _getChangedData : function(oEvent){
            var oSource = oEvent.getSource(),
                oContext = oSource.getBindingContext(),
                sPath = oContext.getPath(),
                aPath = sPath.split(""),
                oChanges;

            // remove the first character
            aPath.shift();

            oChanges = this._oModel.hasPendingChanges() ? this._oModel.getPendingChanges()[aPath.join("")] : undefined;
            return oChanges;

        },
        configureList: function (oEvent) {
            var oList, oBinding;

            oList = Fragment.byId(this._id, "idResourceAvailList").getList();
            oBinding = oList.getBinding("items");

            oBinding.filter(new Filter("ResourceGuid",FilterOperator.EQ, this._resource));
        },
        onSaveAvail : function (oEvent) {
            var oChanges = this._getChangedData(oEvent);
            if(oChanges){
                this._oModel.resetChanges();
            }else {
                this.showMessageToast(this._resourceBundle.getText("sdf"))
            }
        },

        onCreateUnAvail : function (oEvent) {
            this._oModel.metadataLoaded().then(function () {
                var oContext = this._oModel.createEntry("/ResourceAvailabilitySet", {
                    properties: {
                        DateFrom: new Date(),
                        DateTo: new Date(),
                        AvailType: "",
                        ResourceDescription:this._resourceName
                    }
                });
                var oDetail = Fragment.byId(this._id, "create");
                oDetail.setBindingContext(oContext);
                this._oApp.to(this._id+"--create");
            }.bind(this));
        },
        /**
         * On Close check for data dirty
         * if data is dirty show confirmation box, if not close the dialog
         * @param oEvent
         */
        onClose : function (oEvent) {
            this._oDialog.close();
        },
    });
});