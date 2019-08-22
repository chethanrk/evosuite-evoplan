sap.ui.define([
    "com/evorait/evoplan/controller/AssignmentsController",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], function (BaseController, formatter, Filter, FilterOperator, JSONModel) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.CreateResourceUnAvailability", {

        formatter: formatter,

        init: function () {
        },
        /**
         * init and get dialog view
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        getDialog: function () {
            // create dialog lazily
            if (!this._oDialog) {
                // create dialog via fragment factory
                this._oDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.CreateResourceUnAvailability", this);
            }
            return this._oDialog;
        },
        /**
         * Open's the popover
         * @param oView
         * @param oEvent
         */
        open: function (oView, sSelectedPath, mParameters) {
            var oDialog = this.getDialog();
            this._oView = oView;
            this._component = oView.getController().getOwnerComponent();
            this._oModel = this._component.getModel();
            this._resource = this._oModel.getProperty(sSelectedPath+"/ResourceGuid");

            oDialog.addStyleClass(this._component.getContentDensityClass());
            // connect dialog to view (models, lifecycle)
            oView.addDependent(oDialog);
            this._configureResourceAvail();
            oDialog.open();
        },

        /**
         * Initialize the time allocation Dialog with default values
         * @private
         */
        _configureResourceAvail: function () {
            var oResourceAvailModel = this._component.getModel("resourceAvail");

            if(oResourceAvailModel){
                this._resetFields(oResourceAvailModel);
            }else{
                oResourceAvailModel = new JSONModel();
                this._resetFields(oResourceAvailModel);
                this._component.setModel(oResourceAvailModel, "resourceAvail");
            }
        },
        /**
         * Resets the resourceAvail model
         * @param oResourceAvailModel
         * @private
         */

        _resetFields : function (oResourceAvailModel) {
            oResourceAvailModel.setData({
                dateFrom: moment().startOf("day").toDate(),
                dateTo: moment().endOf("day").toDate(),
                availType:"CL_LEAVE"
            });
        },
        /**
         * calls the function import createAbsence
         */
        onSaveUnAvail : function () {
            var oResourceAvailModel = this._component.getModel("resourceAvail"),
                oData  = oResourceAvailModel.getData();
            var oParams = {
                ResourceGuid:this._resource,
                EndTimestamp:oData.dateTo,
                StartTimestamp:oData.dateFrom,
                AvailabilityType:oData.availType
            };
            this._oDialog.setBusy(true);

            if(this.validateFields()){
                this.executeFunctionImport(this._oModel,oParams,"CreateAbsence","POST").then(this._refreshTreeGantt.bind(this,oData));
            }else{
                this._oDialog.setBusy(false);
            }
        },
        /**
         * Validate the all the fields if conditions satisfies return true
         * @return {boolean}
         */
        validateFields : function () {
            var oResourceAvailModel = this._component.getModel("resourceAvail"),
                oResourceBundle = this._component.getModel("i18n").getResourceBundle(),
                oData  = oResourceAvailModel.getData();
            if(oData.dateFrom !== "" && oData.dateTo !== "" && oData.desc !== "" && oData.availType !== ""){
                if(oData.dateFrom.getTime() >= oData.dateTo.getTime()){
                    this.showMessageToast(oResourceBundle.getText("ymsg.datesInvalid"));
                    return false;
                }
                return true;
            }
            this.showMessageToast(oResourceBundle.getText("formValidateErrorMsg"));
            return false;
        },
        /**
         * Refresh the Gantt chart
         * @private
         */
        _refreshTreeGantt : function (oData) {
            // var eventBus = sap.ui.getCore().getEventBus();
            // eventBus.publish("BaseController", "refreshGanttChart", {});
            this.changeGanttHorizonViewAt(this._component.getModel("viewModel"),oData.dateFrom,oData.dateTo);
            this._oDialog.setBusy(false);
            this._oDialog.close();
        },
        /**
         * Close the dialog
         * @param oEvent
         */
        onCloseDialog : function (oEvent) {
            this._oDialog.close();
        }
    });
});