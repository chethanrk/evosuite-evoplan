sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
    "sap/ui/table/RowAction",
    "sap/ui/table/RowActionItem",
    "com/evorait/evoplan/controller/scheduling/SchedulingActions"
], function (BaseController, formatter, RowAction, RowActionItem, SchedulingActions) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.scheduling.AutoScheduleStep1", {

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

            this.oSchedulingActions = new SchedulingActions(this);
        },

        /**
         * on after view rendering
         */
        onAfterRendering: function(){
            this._oSchedulingModel = this.getOwnerComponent().getModel(this._sScheduleModelName);
            this._oViewModel = this.getModel("viewModel");
            this._oViewModel.setProperty("/Scheduling/bSchedulingTableBusy", false);
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
         * valiedate date from to for: 
         * max 14 day
         * not in past
         * end date not before start date
         * 
         * @param {*} oEvent 
         */
        onChangeDateFrom: function(oEvent){
            var oDate = oEvent.getSource().getDateValue();
            this.oSchedulingActions.validateDemandDateRanges(oDate, this._oDateTo.getDateValue());
        },

        /**
         * valiedate date from to for: 
         * max 14 day
         * not in past
         * end date not before start date
         * 
         * @param {*} oEvent 
         */
        onChangeDateTo: function(oEvent){
            var oDate = oEvent.getSource().getDateValue();
            this.oSchedulingActions.validateDemandDateRanges(this._oDateFrom.getDateValue(), oDate);
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
