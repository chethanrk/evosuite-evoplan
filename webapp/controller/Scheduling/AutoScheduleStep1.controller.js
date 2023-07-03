sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
    "sap/ui/table/RowAction",
    "sap/ui/table/RowActionItem"
], function (BaseController, formatter, RowAction, RowActionItem) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.Scheduling.AutoScheduleStep1", {

        formatter: formatter,
        _oViewModel: null,
        _oDemandsTable: null,
        _oSchedulingModel: null,
        _sScheduleModelName: "SchedulingModel",

        /**
         * on init event
         */
        onInit: function(){
            this._oDemandsTable = this.byId("step1_SchedulingTable");
            this._setTableRowAction();

            this._oDateFrom = this.byId("ScheduleDateFrom");
            this._oDateTo = this.byId("ScheduleDateTo");
        },

        /**
         * on after view rendering
         */
        onAfterRendering: function(){
            this._oSchedulingModel = this.getOwnerComponent().getModel(this._sScheduleModelName);
            this._oViewModel = this.getModel("viewModel");
            this._oViewModel.setProperty("/Scheduling/bSchedulingTableBusy", false);

            //set default date from and date to
            this._oDateFrom.setDateValue(this._oViewModel.getProperty("/Scheduling/DateFrom"));
            this._oDateTo.setDateValue(this._oViewModel.getProperty("/Scheduling/DateTo"));
        },

        /**
         * when table busy state changed
         * @param {*} oEvent 
         */
        onBusyStateChanged: function(oEvent){
            var oParams = oEvent.getParameters();
            if(oParams.busy === false){
                this._doColumnResize();
            }
        },

        /**
         * delete demand entry from Json Model
         * @param {*} oEvent 
         */
        onColumnDeletePress: function(oEvent){
            var oParams = oEvent.getParameters(),
                iRowIdx = this._oDemandsTable.indexOfRow(oParams.row),
                aDataSet = this._oSchedulingModel.getProperty("/step1/dataSet");
                
            aDataSet.splice(iRowIdx, 1)
            this._oSchedulingModel.setProperty("/step1/dataSet", aDataSet);
        },

        /**
         * 
         * @param {*} oEvent 
         */
        onChangeDateFrom: function(oEvent){
            console.log(oEvent.getParameters());
            this._validateDateDifference(oEvent.getSource(), null);
        },
        /**
         * 
         */
        onChangeDateTo: function(oEvent){
            console.log(oEvent.getParameters());
            this._validateDateDifference(null, oEvent.getSource());
        },


        _validateDateDifference: function(DateFromChange, DateToChange){
            console.log(this._oDateFrom.getDateValue());
            console.log(this._oDateTo.getDateValue());
            //var diff = this._oDateTo.getDateValue().diff(this._oDateFrom.getDateValue(), 'days');
            //console.log(diff);
        },

        /**
         * set delete button row action to data grid table
         * @returns 
         */
        _setTableRowAction: function(){
            var oTemplate = this._oDemandsTable.getRowActionTemplate();
			if (oTemplate) {
				oTemplate.destroy();
				oTemplate = null;
			}
            oTemplate = new RowAction({items: [
                new RowActionItem({
                    icon: "sap-icon://delete", 
                    text: this.getResourceBundle().getText("xtol.deleteBtn"), 
                    press: this.onColumnDeletePress.bind(this),
                    visible: true
                })
            ]});
            this._oDemandsTable.setRowActionTemplate(oTemplate);
            this._oDemandsTable.setRowActionCount(1);
        },

        /**
         * resize columns after table are filled with data
         * so columns will rerendered with proper widths
         */
        _doColumnResize: function(){
            var aColumns = this._oDemandsTable.getColumns();
            for (var i = 0; i < aColumns.length; i++) {
                this._oDemandsTable.autoResizeColumn(i);
            }
        }


    });
})
