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
				oEventBus = sap.ui.getCore().getEventBus();

			this._setGanttTimeHorizon(defDateRange);

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
		_setDefaultTreeDateRange: function (mParameters) {
			var defDateRange = mParameters || formatter.getDefaultDateRange(),
				aFilters = [];

			aFilters.push(new Filter("StartDate", FilterOperator.LE, formatter.date(defDateRange.dateTo)));
			aFilters.push(new Filter("EndDate", FilterOperator.GE, formatter.date(defDateRange.dateFrom)));
			aFilters.push(new Filter("NodeType", FilterOperator.GE, "TIMENONE"));

			var binding = this.getView().byId("ganttResourceTreeTable").getBinding("rows");
			binding.filter(aFilters, "Application");
		},
		/**
		 * On Drop on the resource call the function import for
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

			// if(this.isAvailable(oDropContext.getPath())){
			// 	oPromise = this.assignedDemands([oDragContext.getPath()],oDropContext.getPath());
			// }

			oPromise = this.assignedDemands([oDragContext.getPath()],oDropContext.getPath());

			oPromise.then(function(data, response){
				this._refreshGanttChart();
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
         * @since 3.0
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
		},
        /**
         * on change of date range trigger the filter for gantt tree.
         * @since 3.0
         * @param oEvent
         */
        onChangeDateRange : function (oEvent) {
			var oFrom  = oEvent.getParameter("from"),
				oTo = oEvent.getParameter("to");

			this._setDefaultTreeDateRange({dateTo:oTo,dateFrom:oFrom});
            this._setGanttTimeHorizon({dateTo:oTo,dateFrom:oFrom});
        },
        /**
         * Set Time Horizon for Gantt chart
         * @since 3.0
         * @param defDateRange
         */
        _setGanttTimeHorizon : function (defDateRange) {
            var oViewModel = this.getModel("viewModel");

            oViewModel.setProperty("/ganttSettings/totalStartTime", defDateRange.dateFrom);
            oViewModel.setProperty("/ganttSettings/totalEndTime", defDateRange.dateTo);
            oViewModel.setProperty("/ganttSettings/visibleStartTime", moment().startOf("month").toDate()); 	// start of month
            oViewModel.setProperty("/ganttSettings/visibleEndTime", moment().endOf("month").toDate());
        },
        /**
         * on press link of assignment in resource tree row
         * get parent row path and bind this path to the dialog or showing assignment information
         * @param oEvent
         */
        onPressAssignmentLink: function (oEvent) {
            var oSource = oEvent.getSource(),
                oRowContext = oSource.getParent().getBindingContext();

            if (oRowContext) {
                this.assignmentPath = oRowContext.getPath();
                this.getOwnerComponent().assignInfoDialog.open(this.getView(), this.assignmentPath, null, {bFromGantt:true});
            } else {
                var msg = this.getResourceBundle().getText("notFoundContext");
                this.showMessageToast(msg);
            }
        },

});
});