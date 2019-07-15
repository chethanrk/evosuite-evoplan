sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentActionsController",
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
				oViewModel = this.getModel("viewModel"),
				oEventBus = sap.ui.getCore().getEventBus();
			oViewModel.setProperty("/ganttSettings/totalStartTime", defDateRange.dateFrom);
			oViewModel.setProperty("/ganttSettings/totalEndTime", defDateRange.dateTo);
			oViewModel.setProperty("/ganttSettings/visibleStartTime", moment().startOf("month").toDate()); 	// start of month
			oViewModel.setProperty("/ganttSettings/visibleEndTime", moment().endOf("month").toDate()); 		// end of month

			//route matched
			this.getRouter().getRoute("gantt").attachPatternMatched(this._onObjectMatched, this);
			oEventBus.subscribe("BaseController", "refreshGanttChart", this._refreshGanttChart, this);

			//set on first load required filters
			this._treeTable = this.getView().byId("ganttResourceTreeTable");
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

			aFilters.push(new Filter("StartDate", FilterOperator.LE, formatter.date(defDateRange.dateTo)));
			aFilters.push(new Filter("EndDate", FilterOperator.GE, formatter.date(defDateRange.dateFrom)));
			aFilters.push(new Filter("NodeType", FilterOperator.GE, "TIMENONE"));

			var binding = this.getView().byId("ganttResourceTreeTable").getBinding("rows");
			binding.filter(aFilters, "Application");
		},
		/**
		 * On Drop on the resource 
		 * @Author Rahul
		 * @since 3.0
		 * 
		 */
		onDropOnResource: function(oEvent){
			var oDraggedControl = oEvent.getParameter("draggedControl"),
				oDroppedControl = oEvent.getParameter("droppedControl"),
				oDragContext = oDraggedControl.getBindingContext(),
				oDropContext = oDroppedControl.getBindingContext(),
				oPromise,
				oEventBus =  sap.ui.getCore().getEventBus();
				
			if(this.isAvailable(oDropContext.getPath())){
				oPromise = this.assignedDemands([oDragContext.getPath()],oDropContext.getPath());
			}
			
			oPromise.then(function(data, response){
				this._refreshAfterOperations();
				oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
			}.bind(this));
			
		},
		/**
		 * On Drop on the resource 
		 * @Author Rahul
		 * @since 3.0
		 * 
		 */
		onDropOnGantt : function(oEvent) {
			// TODO Checking the possibility on dropping on gantt
		},
		
		/** 
		 * Refreshes the Gantt tree table.
		 * Note: There is workaround code written to fix the restore tree state.
		 * @constructor 
		 * @param oEvent
		 */
		_refreshGanttChart : function(oEvent){
			var oTreeTable = this.getView().byId("ganttResourceTreeTable"),
				oTreeBinding = oTreeTable.getBinding("rows");
			
			if(oTreeBinding){
                oTreeBinding._restoreTreeState().then(function(){
                        // Scrolled manually to fix the rendering 
                        var oScrollContainer = oTreeTable._getScrollExtension();
                        var iScrollIndex = oScrollContainer.getRowIndexAtCurrentScrollPosition();
                        if(iScrollIndex === 0){
                            oTreeTable._getScrollExtension().updateVerticalScrollPosition(33);
                        }else{
                            oTreeTable._getScrollExtension().scrollVertically(1);
                        }

                });

	}
		}

});
});