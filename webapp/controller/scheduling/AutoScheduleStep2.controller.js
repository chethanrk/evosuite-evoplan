sap.ui.define([
  "com/evorait/evoplan/controller/BaseController",
  'sap/ui/model/Sorter',
  'sap/ui/model/Filter'
], function (BaseController, Sorter, Filter) {
  "use strict";

  return BaseController.extend("com.evorait.evoplan.controller.scheduling.AutoScheduleStep2", {
    _oResponseTable: null,

    /**
     * on init event
     */
    onInit: function () {
      this._oResponseTable = this.byId("step2_ResponseTable");
      this._oViewModel = this.getModel("viewModel");
    },

    /**
    * Call set filter on initial load of table
    */
    onAfterRendering: function () {
      this._setDataFilter();
    },

    /**
    * Return group header key for grouping in scheduled data on resource name
    */
    fnGetResName: function (oContext) {
      if (!this._oViewModel.getProperty("/Scheduling/iSelectedResponse")) {
        return oContext.getProperty('ResourceName');
      }
    },

    /**
    * Call set filter when radio button selected
    */
    onChangeResponseType: function () {
      this._setDataFilter();
    },


    /* =========================================================== */
    /* Private methods                                             */
    /* =========================================================== */

    /**
    * Sets filter on data based on scheduled and non-scheduled radio btn select
    * The filter set is on "PLANNED" boolean field from local JSON model
    */
    _setDataFilter: function(){
      var aFilters=[];
      if (!this._oViewModel.getProperty("/Scheduling/iSelectedResponse")) { //When scheduled demands
        aFilters.push(new Filter("PLANNED", "EQ", true));
      } else { //when non-scheduled demands
        aFilters.push(new Filter("PLANNED", "EQ", false));
      }
      this._oResponseTable.getBinding("items").filter(aFilters);
    }

  });
})