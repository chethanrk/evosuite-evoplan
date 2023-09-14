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
            this._oViewModel.setProperty("/Scheduling/sFilterCounts", this.getResourceBundle().getText("xbut.filters") + " (0)");

            var oBinding = this._oDemandsTable.getBinding("rows");
            oBinding.filter([]);
            oBinding.attachChange(function() {
                var aDataset = this._oSchedulingModel.getProperty("/step1/dataSet"),
                    isAutoSchedule = this._oSchedulingModel.getProperty("/isAutoSchedule");
                
                //visible filtered demands
                
                //all demands counter for scheduling

                this.getOwnerComponent().SchedulingDialog._setScheduleTableTitle(isAutoSchedule, aDataset.length)
            }.bind(this));
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
                aDataSet = this._oSchedulingModel.getProperty("/step1/dataSet"),
                aDemandList = this._oViewModel.getProperty("/Scheduling/demandList"),
                oContext = oParams.row.getBindingContext(this._sScheduleModelName),
                sDeleteGuid = oContext.getProperty("Guid");

            //Delete right entry also when filters are set to table
            for(var i=0, len=aDataSet.length; i<len; i++){
                if(sDeleteGuid === aDataSet[i].Guid){
                    //set counts for inside/outside date range again
                    if(aDataSet[i].dateRangeStatus === MessageType.Success){
                        var count = this._oSchedulingModel.getProperty("/inside");
                        this._oSchedulingModel.setProperty("/inside", --count);
                    } else if(aDataSet[i].dateRangeStatus === MessageType.Error){
                        var count = this._oSchedulingModel.getProperty("/outside");
                        this._oSchedulingModel.setProperty("/outside", --count);
                    }
                    aDataSet.splice(i, 1);

                    //removing demand from demand list as well
                    aDemandList.splice(i, 1);
                    
                    break;
                }
            }
            this._checkGeneratedResponse();
            this._oSchedulingModel.setProperty("/step1/dataSet", aDataSet);
            this._oViewModel.setProperty("/Scheduling/demandList", aDemandList);

            if(aDemandList.length === 0){
                this._oViewModel.setProperty("/Scheduling/SchedulingDialogFlags/bNextButtonVisible", false);
            }
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
            var oDate = oEvent.getSource().getValue();
            this._oViewModel.setProperty("/Scheduling/sStartDateValueState", "None");
            this.oSchedulingActions.validateDemandDateRanges(new Date(oDate), this._oViewModel.getProperty("/Scheduling/endDate"), false);
            this._checkGeneratedResponse();
            this._setCustomTableFilter(this._oSmartFilter);
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
            var oDate = oEvent.getSource().getValue();
            if (oDate){
                oDate = new Date(new Date(oDate).getTime() - 1000);
                oEvent.getSource().setDateValue(oDate);
            }else{
                oDate = new Date(oDate);
            }
            this._oViewModel.setProperty("/Scheduling/sEndDateValueState", "None");
            this.oSchedulingActions.validateDemandDateRanges(this._oViewModel.getProperty("/Scheduling/startDate"), oDate, true);
            this._checkGeneratedResponse();
            this._setCustomTableFilter(this._oSmartFilter);
        },

        /**
         * when user press demand filter for inside date range
         * @param {object} oEvent 
         */
        onPressInsideDate: function(oEvent){
            this._oInsideFilterBtn = oEvent.getSource();
            this._setCustomTableFilter(this._oSmartFilter);
        },

        /**
         * when user press demand filter for outside date range
         * @param {object} oEvent 
         */
        onPressOutsideDate: function(oEvent){
            this._oOutsideFilterBtn = oEvent.getSource();
            this._setCustomTableFilter(this._oSmartFilter);
        },

        /**
         * when aut scheduling show in Dialog a own filterbar
         * @param {*} oEvent 
         */
        onPressShowFilterbar: function(oEvent){
            this.getModel("viewModel").setProperty("/Scheduling/sFilterEntity", "ScheduleSelectSet");
            this.getModel("viewModel").setProperty("/Scheduling/sFilterPersistencyKey", "com.evorait.evosuite.evoplan.SchedulingSelectFilter");
            if(!this._oDemandFilterDialog){
                this._oDemandFilterDialog = Fragment.load({
                    name: "com.evorait.evoplan.view.scheduling.fragments.DemandFilterDialog",
                    controller: this,
                    type: "XML",
                    id:this.getView().getId()
                }).then(function(oDialog) {
                    oDialog.addStyleClass(this._oViewModel.getProperty("/densityClass"));
                    this.getView().addDependent(oDialog);
                    //used to access from SchedulingDialog to clear the filters on dialog close
                    this.getOwnerComponent().demandFilterDialog = oDialog;
                    return oDialog;
                }.bind(this));
            }
            this._oDemandFilterDialog.then(function(oDialog){
                oDialog.open();
            });
        },

        /**
         * close filter dialog and add all seleted filters 
         * to json demand table
         */
        onPressCloseFilterDialog: function(){
            if(this._oDemandFilterDialog){
                this._oDemandFilterDialog.then(function(oDialog){
                    oDialog.close();
                }.bind(this));
            }
        },
        /**
         * Called when utilization changes
         * @param {object} oEvent 
         */
        onUtilizationChange: function (oEvent) {
            this._checkGeneratedResponse();
        },

        onSchedulingFilterChange: function(oEvent){
            var oSmartFilter = oEvent.getSource();
            this._setCustomTableFilter(oSmartFilter);
        },



        /* =========================================================== */
		/* Private methods                                             */
		/* =========================================================== */

        /**
         * collect all filters and bind to json model table of demands
         * - Filter dialog
         * - Inside button
         * - Outside button
         * @param {Object} oSmartFilter - used for fetching the filters and applying the filters
         */
        _setCustomTableFilter: function(oSmartFilter){
            var aFilter = [];
        
            if(oSmartFilter){
                aFilter = oSmartFilter.getFilters();
                var sFilterCount = Object.keys(oSmartFilter.getFilterData()).length;
                this._oViewModel.setProperty("/Scheduling/sFilterCounts", this.getResourceBundle().getText("xbut.filters") + " (" + sFilterCount + ")");
            }
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
        },

        /**
         * check if response is there then reset the step buttons to regenerate plan
         * so columns will rerendered with proper widths
         */
        _checkGeneratedResponse: function(){
            var oResponse = this._oSchedulingModel.getProperty("/step2/dataSet");
            if (oResponse.length){
                this._oViewModel.setProperty("/Scheduling/InputDataChanged",this.getResourceBundle().getText("ymsg.InputDataChanged"));
                this._oViewModel.setProperty("/Scheduling/SchedulingDialogFlags/bFinishButtonVisible", false);
                this._oViewModel.setProperty("/Scheduling/SchedulingDialogFlags/bNextButtonVisible", true);
            }
        }
    });
})
