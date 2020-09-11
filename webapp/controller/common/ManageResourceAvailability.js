sap.ui.define([
    "com/evorait/evoplan/controller/common/AssignmentsController",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (BaseController, formatter, Filter, FilterOperator, JSONModel, Fragment) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.common.ManageResourceAvailability", {

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
            	oView.getModel("appView").setProperty("/busy", true);
                Fragment.load({
                    id: "ManageAbsense",
                    name: "com.evorait.evoplan.view.common.fragments.ManageResourceAvailability",
                    controller: this
                }).then(function (oDialog) {
                	oView.getModel("appView").setProperty("/busy", false);
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
            this._calendarModel = this._component.getModel("calendarModel");
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
            oDialog.open();
        },
        /**
         * Navigates to detail page on click on item
         * @param oEvent
         */
        onClickItem : function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem"),
                oContext = oSelectedItem.getBindingContext(),
                sPath = oContext.getPath();

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
                    if(data === "NO"){
                        this.onSaveAvail(oEvent);
                    }else{
                        this._resetChanges(oEvent);
                        this._oApp.back();
                    }
                }.bind(this));
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
            	oViewFilterSettings = this._oView.getController().oFilterConfigsController || null,
                sDateControl1,
                sDateControl2,
                oUserModel = this._component.getModel("user");

            if (this._mParameters.bFromGantt) {
                // if we decide to keep different date range for demand view and gantt view
                sDateControl1 = oUserModel.getProperty("/GANT_START_DATE");
                sDateControl2 = oUserModel.getProperty("/GANT_END_DATE");
            } else {
                sDateControl1 = oViewFilterSettings.getDateRange()[0];
                sDateControl2 = oViewFilterSettings.getDateRange()[1];
            }

            oList = Fragment.byId(this._id, "idResourceAvailList").getList();
            oBinding = oList.getBinding("items");
            aFilters = [
                new Filter("ResourceGuid",FilterOperator.EQ, this._resource),
                new Filter("DateFrom",FilterOperator.LE, sDateControl2),
                new Filter("DateTo",FilterOperator.GE, sDateControl1),
                new Filter("AvailabilityTypeGroup",FilterOperator.EQ, "N")
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
                    if(this._checkMandaoryFields(oChanges)){
                    	this._callFunction(oUpdateData);
                    }
                }else if(sProperty === "CREATE"){
                    oUpdateData.StartTimestamp = oChanges.DateFrom;
                    oUpdateData.EndTimestamp = oChanges.DateTo;
                    oUpdateData.AvailabilityType = oChanges.AvailType;
                    if(this._checkMandaoryFields(oChanges)){
                    	this._callFunction(oUpdateData);
                    }
                }else {
                    oUpdateData.Guid = oChanges.Guid;
                    this._deleteUnavailability(oUpdateData);
                }
                if(!this._checkMandaoryFields(oChanges)){
                    return;
                }
                this._resetChanges(oEvent, sProperty);
                this._oApp.back();
            }else {
                this._dataDirty = false;
                this.showMessageToast(this._resourceBundle.getText("No Changes"));
            }
        },
        /**
         * validates the dates entered
         * from date should be less than the to date
         */
        _validateDates : function (oData) {
            if(oData.dateFrom !== "" && oData.dateTo !== "" && oData.availType !== ""){
                if(oData.dateFrom.getTime() >= oData.dateTo.getTime()){
                    this.showMessageToast(this._resourceBundle.getText("ymsg.datesInvalid"));
                    return false;
                }
                return true;
            }
        },
        /**
         * Checks madatory fields 
         */
        _checkMandaoryFields : function(oChanges){
        	if(oChanges.DateFrom !== "" && oChanges.DateTo !== "" && oChanges.AvailType !==""){
        		return true;
        	}
        	this.showMessageToast(this._resourceBundle.getText("formValidateErrorMsg"));
        	return false;
        },
        /**
         * Resets changed values and resource tree selection
         * @param oEvent
         * @param sProperty
         * @private
         */
        _resetChanges : function (oEvent,sProperty) {
            var oEventBus = sap.ui.getCore().getEventBus();
            if(this._mParameters.bFromGantt){
                this._oModel.resetChanges();
                //to reset "Manage absence" btn enable/disable
				this._oView.getController().selectedResources = [];
				this._oView.byId("idButtonreassign").setEnabled(false);
				this._oView.byId("idButtonunassign").setEnabled(false);
				this._oView.byId("idButtonCreUA").setEnabled(false);
            }else if(this._mParameters.bFromHome){
                oEventBus.publish("ManageAbsences","ClearSelection",{});
            }
        },
        /**
         * Method triggered to create the unavailability
         * @param oEvent
         */
        onCreateUnAvail : function (oEvent) {
            var oUserModel = this._component.getModel("user"),
                sAvailType = oUserModel.getProperty("/DEFAULT_ABSENCE_TYPE").split(";");
            this._oModel.metadataLoaded().then(function () {
                var oContext = this._oModel.createEntry("/ResourceAvailabilitySet", {
                    properties: {
                        DateFrom: moment().startOf("day").toDate(),
                        DateTo: moment().endOf("day").toDate(),
                        AvailType: sAvailType[0],
                        Description:sAvailType[1],
                        ResourceDescription:this._resourceName
                    }
                });
                var oDetail = Fragment.byId(this._id, "create");
                oDetail.setBindingContext(oContext);
                this._oApp.to(this._id+"--create");
            }.bind(this));
        },
        /**
         * Deletes the absences 
         */
        _deleteUnavailability:function(oUpdateData){
        	 this._showConfirmMessageBox.call(this._oView.getController(),this._resourceBundle.getText("ymsg.confirmDel")).then(function(data){
                    if(data === "YES"){
                       this._callFunction(oUpdateData);
                    }else{
                       return;
                    }
                }.bind(this));
        },
        /**
         * Calls the respective function import
         * @param oData
         * @private
         */
        _callFunction : function (oData) {
            this._oDialog.setBusy(true);
            this._dataDirty = true;
            this.executeFunctionImport.call(this._oView.getController(), this._oModel, oData, "ManageAbsence" ,"POST").then(this._refreshList.bind(this));
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