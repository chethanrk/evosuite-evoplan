sap.ui.define([
  "com/evorait/evoplan/controller/BaseController",
  'sap/ui/model/Filter',
  "sap/ui/core/Fragment",
  "sap/ui/model/FilterOperator",
], function (BaseController, Filter, Fragment, FilterOperator) {
  "use strict";

  return BaseController.extend("com.evorait.evoplan.controller.scheduling.AutoScheduleStep2", {
    _oResponseTable: null,
    _mFilters: {
      planned: new Filter("PLANNED", FilterOperator.EQ, true),
      nonPlanned: new Filter("PLANNED", FilterOperator.EQ, false)
    },

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
      this._oResponseTable.getBinding("items").filter(this._setDataFilter());
      this._oViewModel.setProperty("/Scheduling/sResponseFilterCounts", this.getResourceBundle().getText("xbut.filters") + " (0)");
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
      this._setCustomTableFilter();
    },

    /**
     * Opens filter dialog for response table
     */
    onShowFilters: function () {
      //To be changed when annotations for filters are added
      this.getModel("viewModel").setProperty("/Scheduling/sFilterEntity", "ScheduleResponseSet");
      this.getModel("viewModel").setProperty("/Scheduling/sFilterPersistencyKey", "com.evorait.evosuite.evoplan.SchedulingResponseFilter");
      if (!this._oResponseFilterDialog) {
        this._oResponseFilterDialog = Fragment.load({
          name: "com.evorait.evoplan.view.scheduling.fragments.DemandFilterDialog",
          controller: this,
          type: "XML"
        }).then(function (oDialog) {
          oDialog.addStyleClass(this._oViewModel.getProperty("/densityClass"));
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._oResponseFilterDialog.then(function (oDialog) {
        oDialog.open();
      });
    },

    /**
     * close filter dialog and add all seleted filters 
     * to json response table
     */
    onPressAddFilterDialog: function () {
      if (this._oResponseFilterDialog) {
        this._oResponseFilterDialog.then(function (oDialog) {
          this._setCustomTableFilter();
          oDialog.close();
        }.bind(this));
      }
    },

    /* =========================================================== */
    /* Private methods                                             */
    /* =========================================================== */

    /**
     * Sets filter on data based on scheduled and non-scheduled radio btn select
     * The filter set is on "PLANNED" boolean field from local JSON model
     */
    _setDataFilter: function () {
      if (!this._oViewModel.getProperty("/Scheduling/iSelectedResponse")) { //When scheduled demands
        return this._mFilters.planned;
      } else { //when non-scheduled demands
        return this._mFilters.nonPlanned;
      }
    },

    /**
     * collect all filters and bind to json model table of response
     * - Filter dialog
     */
    _setCustomTableFilter: function () {
      var oSmartFilter = sap.ui.getCore().byId("listReportFilter"),
        aFilter = [];

      if (oSmartFilter) {
        aFilter = oSmartFilter.getFilters();
        var sFilterCount = Object.keys(oSmartFilter.getFilterData()).length;
        this._oViewModel.setProperty("/Scheduling/sResponseFilterCounts", this.getResourceBundle().getText("xbut.filters") + " (" + sFilterCount + ")");
      }

      aFilter.push(this._setDataFilter());

      this._oResponseTable.getBinding("items").filter(aFilter);
    },

  });
})