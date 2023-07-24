sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
    "sap/ui/table/RowAction",
    "sap/ui/table/RowActionItem",
    "com/evorait/evoplan/controller/scheduling/SchedulingActions",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/MessageType",
    "sap/ui/core/Fragment"
], function (BaseController, formatter, RowAction, RowActionItem, SchedulingActions, Filter, FilterOperator, MessageType, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.scheduling.AutoScheduleStep1", {

        formatter: formatter,
        _oViewModel: null,
        _oDemandsTable: null,
        _oSchedulingModel: null,
        _sScheduleModelName: "SchedulingModel",

        _mFilters: {
            inside: new Filter("dateRangeStatus", FilterOperator.EQ, MessageType.Success),
            outside: new Filter("dateRangeStatus", FilterOperator.EQ, MessageType.Error)
        },

        /**
         * on init event
         */
        onInit: function(){
            this._oDemandsTable = this.byId("step1_SchedulingTable");
            this._setTableRowAction();

            this._oDateFrom = this.byId("ScheduleDateFrom");
            this._oDateTo = this.byId("ScheduleDateTo");
            this._btnInsideDateRange = this.byId("btnInsideDateRange");

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
                aDataSet = this._oSchedulingModel.getProperty("/step1/dataSet"),
                oMappedDemands = this._oSchedulingModel.getProperty("/oDemandMapping");

            //remove from demand mapping and from table dataset
            delete oMappedDemands[aDataSet[iRowIdx].Guid];
            aDataSet.splice(iRowIdx, 1)

            this._oSchedulingModel.setProperty("/step1/dataSet", aDataSet);
            this._oSchedulingModel.setProperty("/oDemandMapping", oMappedDemands);
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
            this.oSchedulingActions.validateDemandDateRanges(oDate, this._oDateTo.getDateValue(), false);
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
            this.oSchedulingActions.validateDemandDateRanges(this._oDateFrom.getDateValue(), oDate, true);
        },

        /**
         * when user press demand filter for inside date range
         * @param {object} oEvent 
         */
        onPressInsideDate: function(oEvent){
            this._oInsideFilterBtn = oEvent.getSource();
            this._setCustomTableFilter();
        },

        /**
         * when user press demand filter for outside date range
         * @param {object} oEvent 
         */
        onPressOutsideDate: function(oEvent){
            this._oOutsideFilterBtn = oEvent.getSource();
            this._setCustomTableFilter();
        },

        /**
         * 
         * @param {*} oEvent 
         */
        onPressShowFilterbar: function(oEvent){
            this._oDemandFilterDialog = Fragment.load({
                name: "com.evorait.evoplan.view.scheduling.fragments.DemandFilterDialog",
                controller: this,
				type: "XML"
            }).then(function(oDialog) {
                oDialog.addStyleClass(this._oViewModel.getProperty("/densityClass"));
                this.getView().addDependent(oDialog);
                return oDialog;
            }.bind(this));

            this._oDemandFilterDialog.then(function(oDialog){
                oDialog.open();
            });
        },

        onPressCloseFilterDialog: function(){
            if(this._oDemandFilterDialog){
                this._oDemandFilterDialog.then(function(oDialog){
                    oDialog.close();
                });
            }
        },


        /* =========================================================== */
		/* Private methods                                             */
		/* =========================================================== */

        _setCustomTableFilter: function(){
            var aFilter = [];
            if(this._oInsideFilterBtn && (this._oInsideFilterBtn.getPressed())){
                aFilter.push(this._mFilters.inside);
            }
            if(this._oOutsideFilterBtn && (this._oOutsideFilterBtn.getPressed())){
                aFilter.push(this._mFilters.outside);
            }

            this._oDemandsTable.getBinding("rows").filter(aFilter);
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
