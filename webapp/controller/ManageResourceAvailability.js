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

        _dataDirty : false,

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
                    id: "ManageAbsense",
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
         * Sets the necessary value as global to this controller
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
            this._id = "ManageAbsense";
            this._dataDirty = false;
            this._oApp = Fragment.byId(this._id,"navCon");
            this._oSmartList = Fragment.byId(this._id, "idResourceAvailList");
            this._oList = Fragment.byId(this._id, "idResourceAvailList").getList();
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
        /**
         * Navigates to detail page on click on item
         * @param oEvent
         */
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
                        this.onSaveAvail(oEvent);
                    }else{
                        this._resetChanges(oEvent);
                        this._oApp.back();
                    }
                }.bind(this))
            }

        },
        /**
         * Checks if data dirty if data is dirty returns the changed data
         * if not dirty then returns undefined
         * @param oEvent
         * @param sProperty
         * @return {*} if data is dirty returns the changed data
         * if not dirty then returns undefined
         * @private
         */
        _getChangedData : function(oEvent, sProperty){
            var oSource = oEvent.getSource(),
                // In case of delete action the context fetch will be different
                oContext = (sProperty !== "DELETE") ? oSource.getBindingContext() :
                    oEvent.getParameter("listItem").getBindingContext(),
                sPath = oContext.getPath(),
                oData = this._oModel.getProperty(sPath),
                aPath = sPath.split(""),
                oChanges;


            // remove the first character
            aPath.shift();

            oChanges = this._oModel.hasPendingChanges() ? this._oModel.getPendingChanges()[aPath.join("")] : undefined;
            if(oChanges && sProperty !== "DELETE"){
                oData.DateFrom =oChanges.DateFrom ? oChanges.DateFrom : oData.DateFrom;
                oData.DateTo = oChanges.DateTo ? oChanges.DateTo : oData.DateTo;
                oData.AvailType=oChanges.AvailType ? oChanges.AvailType : oData.AvailType;
                return oData;
            }else if(sProperty === "DELETE"){
                return oData;
            }
            return undefined;


        },
        /**
         * Filter's the list by selected resource
         * @param oEvent
         */
        configureList: function (oEvent) {
            var oList, oBinding, aFilters,
                oViewFilterSettings = this._component ? this._component.filterSettingsDialog : null,
                sDateControl1 = oViewFilterSettings.getFilterDateRange()[0].getValue(),
                sDateControl2 = oViewFilterSettings.getFilterDateRange()[1].getValue();

            oList = Fragment.byId(this._id, "idResourceAvailList").getList();
            oBinding = oList.getBinding("items");
            aFilters = [
                new Filter("ResourceGuid",FilterOperator.EQ, this._resource),
                new Filter("DateFrom",FilterOperator.GE, sDateControl2),
                new Filter("DateTo",FilterOperator.LE, sDateControl1)
            ];
            oBinding.filter(new Filter({
                filters: aFilters,
                and: true
            }));
        },
        /**
         * This Event is triggered when creating/updating/deleting
         * @param oEvent
         * @param sProperty - The event parameters passed
         */
        onAction : function (oEvent, sProperty) {
            var oChanges = this._getChangedData(oEvent, sProperty),
                oUpdateData = {
                    ResourceGuid:this._resource
                };
            if(oChanges){
                if(sProperty === "SAVE"){
                    oUpdateData.StartTimestamp = oChanges.DateFrom;
                    oUpdateData.EndTimestamp = oChanges.DateTo;
                    oUpdateData.Guid = oChanges.Guid;
                    this._callFunction(oUpdateData);
                }else if(sProperty === "CREATE"){
                    oUpdateData.StartTimestamp = oChanges.DateFrom;
                    oUpdateData.EndTimestamp = oChanges.DateTo;
                    oUpdateData.AvailabilityType = oChanges.AvailType;
                    this._callFunction(oUpdateData);
                }else {
                    oUpdateData.Guid = oChanges.Guid;
                    this._callFunction(oUpdateData);
                }
                this._dataDirty = true;
                this._resetChanges(oEvent, sProperty);
                this._oApp.back();
            }else {
                this._dataDirty = false;
                this.showMessageToast(this._resourceBundle.getText("No Changes"));
            }
        },
        _validateDates : function (oData) {
            if(oData.dateFrom !== "" && oData.dateTo !== "" && oData.availType !== ""){
                if(oData.dateFrom.getTime() >= oData.dateTo.getTime()){
                    this.showMessageToast(oResourceBundle.getText("ymsg.datesInvalid"));
                    return false;
                }
                return true;
            }
        },
        /**
         * Resets changed values and resource tree selection
         * @param oEvent
         * @param sProperty
         * @private
         */
        _resetChanges : function (oEvent,sProperty) {
            var oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.publish("ManageAbsences","ClearSelection",{});
        },
        /**
         * Method triggered to create the unavailability
         * @param oEvent
         */
        onCreateUnAvail : function (oEvent) {
            this._oModel.metadataLoaded().then(function () {
                var oContext = this._oModel.createEntry("/ResourceAvailabilitySet", {
                    properties: {
                        DateFrom: moment().startOf("day").toDate(),
                        DateTo: moment().endOf("day").toDate(),
                        AvailType: "",
                        Description:"",
                        ResourceDescription:this._resourceName
                    }
                });
                var oDetail = Fragment.byId(this._id, "create");
                oDetail.setBindingContext(oContext);
                this._oApp.to(this._id+"--create");
            }.bind(this));
        },
        /**
         * Calls the respective function import
         * @param oData
         * @private
         */
        _callFunction : function (oData) {
            this._oDialog.setBusy(true);
            this.executeFunctionImport.call(this._oView.getController(), this._oModel, oData, "ManageAbsence" ,"POST").then(this._refreshList.bind(this))
        },
        /**
         * Refresh's the List
         * @param data
         * @private
         */
        _refreshList: function (data) {
            this._oDialog.setBusy(false);
            this._oSmartList.rebindList();
        },
        /**
         * On Close check for data dirty
         * if data is dirty show confirmation box, if not close the dialog
         * @param oEvent
         */
        onClose : function (oEvent) {
            this._refreshTreeGantt(oEvent);
        },
        /**
         * If any absence are created/updated/deleted the resource tree/ gantt will refreshed
         * based on the parameter
         * @param oEvent
         * @private
         */
        _refreshTreeGantt : function (oEvent) {
            var eventBus = sap.ui.getCore().getEventBus();
            if(this._dataDirty && this._mParameters.bFromGantt){
                // this.changeGanttHorizonViewAt(this._component.getModel("viewModel"),oData.dateFrom,oData.dateTo);
                eventBus.publish("BaseController", "refreshGanttChart", {});
            }else if(this._dataDirty && this._mParameters.bFromHome){
                eventBus.publish("BaseController", "refreshTreeTable", {});
            }
            this._dataDirty = false;
            this._oDialog.setBusy(false);
            this._oDialog.close();
        }
    });
});