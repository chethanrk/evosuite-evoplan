sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/ganttFormatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (AssignmentsController, JSONModel, formatter, ganttFormatter, Filter, FilterOperator) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.Gantt", {

		formatter: formatter,

		ganttFormatter: ganttFormatter,

		_treeTable: null,


		/**
		 * controller life cycle on init event
		 */
		onInit: function () {

			//set gantt chart view range
			var defDateRange = formatter.getDefaultDateRange(),
				oViewModel = this.getModel("viewModel");
			oViewModel.setProperty("/ganttSettings/totalStartTime", defDateRange.dateFrom);
			oViewModel.setProperty("/ganttSettings/totalEndTime", defDateRange.dateTo);
			oViewModel.setProperty("/ganttSettings/visibleStartTime", moment().startOf("month").toDate()); 	// start of month
			oViewModel.setProperty("/ganttSettings/visibleEndTime", moment().endOf("month").toDate()); 		// end of month

			//route matched
			this.getRouter().getRoute("gantt").attachPatternMatched(this._onObjectMatched, this);

			//set on first load required filters
			this._treeTable = this.getView().byId("ganttResourceTreeTable");

			this._treeTable.setEnableBusyIndicator(true);
			this._treeTable.setSelectionMode("None");
			this._treeTable.setEnableCellFilter(false);
			this._treeTable.setEnableColumnReordering(false);
			this._treeTable.setEditable(false);
			this._treeTable.attachBusyStateChanged(this.onBusyStateChanged, this);
		},

		/**
		 * after page rendering
		 */
		onAfterRendering: function(){

		},

		/**
		 * on page exit
		 */
		onExit: function () {

		},


		/**
		 * ################### Events #########################
		 */

		onBusyStateChanged: function(oEvent){
			var parameters = oEvent.getParameters();
			if (parameters.busy !== false && !this._isLoaded) {
				this._isLoaded = true;
				this._setDefaultTreeDateRange();
			}
		},



		/**
		 * ################### Internal functions ###################
		 */

		/**
		 * when routing was matched
		 * @private
		 */
		_onObjectMatched: function () {

		},

		/**
		 * set default filters for tree table
		 * @private
		 */
		_setDefaultTreeDateRange: function () {
			var defDateRange = formatter.getDefaultDateRange(),
				aFilters = [];

			aFilters.push(new Filter("StartDate", FilterOperator.LE, formatter.date(defDateRange.dateFrom)));
			aFilters.push(new Filter("EndDate", FilterOperator.GE, formatter.date(defDateRange.dateTo)));
			aFilters.push(new Filter("NodeType", FilterOperator.GE, "TIMENONE"));

			//Todo when tree fetch is fixed in backend use this filters
			//var binding = this.getView().byId("ganttResourceTreeTable").getBinding("rows");
			//binding.filter(aFilters, "Application");
		}


	});

});