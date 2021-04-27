sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentActionsController",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/ganttFormatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (Controller, formatter, ganttFormatter, Filter, FilterOperator) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.gantt.newgantt", {
		
		formatter: formatter,

		ganttFormatter: ganttFormatter,
		
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 */
		onInit: function () {
			this._defaultGanttHorizon();
		},
		
		onBusyStateChanged: function (oEvent) {
			var parameters = oEvent.getParameters();

			if (parameters.busy !== false && !this._isLoaded) {
				this._isLoaded = true;
				this._setDefaultTreeDateRange();
			}
			/*if (parameters.busy === false) {
				if (Object.keys(this.mTreeState).length > 0) {
					this._restoreTreeState();
				}

			}*/
		},
		
		/**
		 * set default filters for tree table
		 * @private
		 */
		_setDefaultTreeDateRange: function (mParameters) {
			var aFilters = this._getDefaultFilters(mParameters);
			var binding = this.getView().byId("ganttResourceTreeTable").getBinding("rows");
			binding.filter(aFilters, "Application");
		},
		/**
		 * Gets default filters for gantt
		 * @param mParameters
		 * @return {Array}
		 * @private
		 */
		_getDefaultFilters: function (mParameters) {
			var oDateFrom, oDateTo, oUserModel = this.getModel("user"),
				aFilters = [];

			oDateFrom = mParameters ? mParameters.dateFrom : oUserModel.getProperty("/GANT_START_DATE");
			oDateTo = mParameters ? mParameters.dateTo : oUserModel.getProperty("/GANT_END_DATE");

			aFilters.push(new Filter("StartDate", FilterOperator.LE, formatter.date(oDateTo)));
			aFilters.push(new Filter("EndDate", FilterOperator.GE, formatter.date(oDateFrom)));
			return aFilters;
		},
		/**
		 * Set Default Horizon times
		 * @private
		 */
		_defaultGanttHorizon: function () {
			var oViewModel = this.getModel("viewModel");
			this.changeGanttHorizonViewAt(oViewModel);
		}

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 */
		//	onExit: function() {
		//
		//	}

	});

});