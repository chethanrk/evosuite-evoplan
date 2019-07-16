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

		_oEventBus: null,


		/**
		 * controller life cycle on init event
		 */
		onInit: function () {
			this._oEventBus = sap.ui.getCore().getEventBus();

			//set gantt chart view range
			var defDateRange = formatter.getDefaultDateRange(),
				oViewModel = this.getModel("viewModel");
			//oViewModel.setProperty("/ganttSettings/totalStartTime", defDateRange.dateFrom);
			//oViewModel.setProperty("/ganttSettings/totalEndTime", defDateRange.dateTo);
			oViewModel.setProperty("/ganttSettings/totalStartTime", moment().startOf("month").subtract(2, "months").toDate());
			oViewModel.setProperty("/ganttSettings/totalEndTime", moment().endOf("month").add(2, "months").toDate());
			oViewModel.setProperty("/ganttSettings/visibleStartTime", moment().startOf("month").toDate()); 	// start of month
			oViewModel.setProperty("/ganttSettings/visibleEndTime", moment().endOf("month").toDate()); 		// end of month

			//route matched
			this.getRouter().getRoute("gantt").attachPatternMatched(this._onObjectMatched, this);
			this._oEventBus.subscribe("BaseController", "refreshGanttChart", this._refreshGanttChart, this);

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

		/**
		 * when tree table busy state changed
		 * on first load add tree filters
		 * @param oEvent
		 */
		onBusyStateChanged: function(oEvent){
			var parameters = oEvent.getParameters();
			if (parameters.busy !== false && !this._isLoaded) {
				this._isLoaded = true;
				this._setDefaultTreeDateRange();
			}
		},

		/**
		 * when a shape was dropped to another place
		 * it should be not droppable to another assignments only to resources
		 * @param oEvent
		 */
		onShapeDrop: function(oEvent){
			console.log("onShapeDrop");
			var oParams = oEvent.getParameters(),
				targetContext = oParams.targetRow.getBindingContext(),
				targetData = targetContext.getObject(),
				draggedShape = oParams.draggedShapeDates,
				sLastDraggedShapeUid = oEvent.getParameter("lastDraggedShapeUid"),
				oNewDateTime = oEvent.getParameter("newDateTime"),
				oOldStartDateTime = draggedShape[sLastDraggedShapeUid].time,
				oOldEndDateTime = draggedShape[sLastDraggedShapeUid].endTime;

			Object.keys(draggedShape).forEach(function (sShapeUid) {
				var sourcePath = this._getShapeBindingContextPath(sShapeUid),
					sourceData = this.getModel().getProperty(sourcePath);

				console.log(sourceData);

				if(targetData.NodeType === "ASSIGNMENT" && sourceData.NodeId !== targetData.NodeId){
					//Todo: show message that drag to another assignment is not possible
					return;
				}

				var iMoveWidthInMs = oNewDateTime.getTime() - oOldStartDateTime.getTime();
				var oOldDateTime = draggedShape[sShapeUid].time;
				oOldEndDateTime = draggedShape[sShapeUid].endTime;
				oNewDateTime = new Date(oOldDateTime.getTime() + iMoveWidthInMs);
				var oNewEndDateTime = new Date(oOldEndDateTime.getTime() + iMoveWidthInMs);


				//this._saveDraggedShape();
				var newPath = targetContext.getPath(),
					newDateTime = oParams.newDateTime;

				var oAssignment = {
					showError: false,
					AssignmentGuid: sourceData.AssignmentGuid,
					Description: sourceData.Description,
					AllowReassign: false,
					AllowUnassign: false,
					AllowChange:true,
					NewAssignPath: null,
					NewAssignId: null,
					NewAssignDesc: null,
					isNewAssignment: false,
					DemandGuid: sourceData.DemandGuid,
					DemandStatus: "",
					OrderId: "",
					OperationNumber: "",
					SubOperationNumber: "",
					DateFrom:"",
					DateTo:""
				};

				/*oAssignment.AssignmentGuid = oAssignmentData.Guid;
				oAssignment.Description = oAssignmentData.Demand.DemandDesc;
				oAssignment.DemandGuid = oAssignmentData.DemandGuid;
				oAssignment.DemandStatus = oAssignmentData.Demand.Status;
				oAssignment.DateFrom = oAssignmentData.DateFrom;
				oAssignment.DateTo = oAssignmentData.DateTo;
				this.oAssignmentModel = oView.getModel("assignment");
				this.oAssignmentModel.setData(oAssignment);*/

				/*this._oEventBus.publish("AssignInfoDialog", "updateAssignment", {
					isReassign: sourceData.NodeId !== targetData.NodeId,
					parameters: {

					}
				});*/

			}.bind(this));
		},

		/**
		 * when the shape off assignment was resized save new timespan to backend
		 * Todo
		 */
		onShapeResize: function(oEvent){
			console.log("onShapeResize");
			var oParams = oEvent.getParameters();
		},

		/**
		 * double click on a shape
		 * open assignment detail dialog
		 * @param oEvent
		 */
		onShapeDoubleClick: function(oEvent){
			console.log("onShapeDoubleClick");
			var oParams = oEvent.getParameters();
			var oRowContext = oParams.shape.getBindingContext();

			if (oRowContext) {
				this.getOwnerComponent().assignInfoDialog.open(this.getView(), oRowContext.getPath());
			} else {
				var msg = this.getResourceBundle().getText("notFoundContext");
				this.showMessageToast(msg);
			}
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
				oPromise;

			// if(this.isAvailable(oDropContext.getPath())){
			// 	oPromise = this.assignedDemands([oDragContext.getPath()],oDropContext.getPath());
			// }

			oPromise = this.assignedDemands([oDragContext.getPath()],oDropContext.getPath());

			oPromise.then(function(data, response){
				this._refreshGanttChart();
				this._oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
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
		},

		/**
		 * get shape binding path
		 * from dragged data object
		 * @param sShapeUid
		 * @private
		 */
		_getShapeBindingContextPath: function(sShapeUid){
			var oParsedUid = sap.gantt.misc.Utility.parseUid(sShapeUid);
			return oParsedUid.shapeDataName;
		}

});
});