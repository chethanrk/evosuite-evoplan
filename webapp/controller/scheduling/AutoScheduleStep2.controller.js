sap.ui.define([
  "com/evorait/evoplan/controller/BaseController",
  'sap/ui/model/Sorter'
], function (BaseController, Sorter) {
  "use strict";

  return BaseController.extend("com.evorait.evoplan.controller.scheduling.AutoScheduleStep2", {
    _oResponseTable: null,

    /**
     * on init event
     */
    onInit: function () {
      this._oResponseTable = this.byId("step2_ResponseTable");
    },

    fnGetResName: function (oContext) {
      return oContext.getProperty('ResourceName');
    },


    /* =========================================================== */
    /* Private methods                                             */
    /* =========================================================== */


  });
})