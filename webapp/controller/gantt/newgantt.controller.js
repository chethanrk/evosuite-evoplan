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
		},
		/**
		 * On Drop on the resource tree rows or on the Gantt chart
		 * call the function import to create the assignment
		 * @param {object} oEvent
		 * @Author Rahul
		 * @since 3.0
		 *
		 */
		onDropOnResource: function (oEvent) {
			var oDraggedControl = oEvent.getParameter("draggedControl"),
				oDroppedControl = oEvent.getParameter("droppedControl"),
				oBrowserEvent = oEvent.getParameter("browserEvent"),
				oDragContext = oDraggedControl ? oDraggedControl.getBindingContext() : undefined,
				oDropContext = oDroppedControl.getBindingContext(),
				slocStor = localStorage.getItem("Evo-Dmnd-guid"),
				sDragPath = oDragContext ? this.getModel("viewModel").getProperty("/gantDragSession") : slocStor.split(","),
				oAxisTime = this.byId("container").getAggregation("ganttCharts")[0].getAxisTime(),
				oViewModel = this.getModel("viewModel"),
				oResourceData = this.getModel().getProperty(oDropContext.getPath()),
				oSvgPoint;

			//Null check for
			if ((!oDragContext || !sDragPath) && !oDropContext) {
				return;
			}

			oViewModel.setProperty("/ganttSettings/busy", true);
			// Check the resource assignable or not
			if (!this.isAssignable({
					data: oResourceData
				})) {
				oViewModel.setProperty("/ganttSettings/busy", false);
				return;
			}
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");
			if (oBrowserEvent.target.tagName === "rect" && oDragContext) {
				// When we drop on gantt chart
				oSvgPoint = CoordinateUtils.getEventSVGPoint(oBrowserEvent.target.ownerSVGElement, oBrowserEvent);
				// oAxisTime.viewToTime(<oSvgPoint>) will give the time stamp for dropped location
				this._assignDemands(oResourceData, sDragPath, oDropContext.getPath(), oAxisTime.viewToTime(oSvgPoint.x));
			} else if (oBrowserEvent.target.tagName === "rect" && !oDragContext) {
				oSvgPoint = CoordinateUtils.getEventSVGPoint(oBrowserEvent.target.ownerSVGElement, oBrowserEvent);
				this._assignDemands(oResourceData, null, oDropContext.getPath(), oAxisTime.viewToTime(oSvgPoint.x), false, sDragPath);
			} else if (oDragContext) {
				this._assignDemands(oResourceData, sDragPath, oDropContext.getPath(), null, true);
			} else {
				this._assignDemands(oResourceData, null, oDropContext.getPath(), null, true, sDragPath);
			}
		},
		/**
		 * when a shape was dropped to another place
		 * it should be not droppable to another assignments only to resources
		 * @param oEvent
		 */
		onShapeDrop: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oViewModel = this.getModel("viewModel"),
				msg = this.getResourceBundle().getText("msg.ganttShapeDropError"),
				oModel = this.getModel(),
				targetContext,
				targetData,
				draggedShape;

			if (!oParams.targetRow && !oParams.targetShape) {
				this.showMessageToast(msg);
				return;
			}
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");

			targetContext = oParams.targetRow ? oParams.targetRow.getBindingContext() : oParams.targetShape.getParent().getParent().getBindingContext();
			targetData = targetContext ? targetContext.getObject() : null;
			draggedShape = oParams.draggedShapeDates;
			// If you drop in empty gantt area where there is no data
			if (!targetData) {
				this.showMessageToast(msg);
				return;
			}

			// Check the resource assignable or not
			if (!this.isAssignable({
					data: targetData
				})) {
				oViewModel.setProperty("/ganttSettings/busy", false);
				return;
			}

			oViewModel.setProperty("/ganttSettings/busy", true);
			Object.keys(draggedShape).forEach(function (sShapeUid) {
				var sourcePath = this._getShapeBindingContextPath(sShapeUid),
					sourceData = this.getModel().getProperty(sourcePath),
					isReassign = sourceData.ObjectId !== targetData.NodeId,
					oSourceStartDate = moment(draggedShape[sShapeUid].time),
					oSourceEndDate = moment(draggedShape[sShapeUid].endTime),
					duration = oSourceEndDate.diff(oSourceStartDate, "seconds"),
					newEndDate = moment(oParams.newDateTime).add(duration, "seconds");

				this._updateAssignmentModel(sourceData.Guid).then(function (oAssignmentObj) {
					if (isReassign && !oAssignmentObj.AllowReassign) {
						oModel.resetChanges([sourcePath]);
						oViewModel.setProperty("/ganttSettings/busy", false);
						return;
					} else if (!oAssignmentObj.AllowChange) {
						oModel.resetChanges([sourcePath]);
						oViewModel.setProperty("/ganttSettings/busy", false);
						return;
					} else {
						oAssignmentObj.DateFrom = oParams.newDateTime;
						oAssignmentObj.DateTo = newEndDate.toDate();
						oAssignmentObj.NewAssignPath = targetContext.getPath();
						this._oAssignementModel.setData(oAssignmentObj);
						this.updateAssignment(isReassign, {
							bFromGantt: true
						});
					}
				}.bind(this));
			}.bind(this));
		},
		/**
		 * when the shape off assignment was resized save new timespan to backend
		 * @param oEvent
		 */
		onShapeResize: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oRowContext = oParams.shape.getBindingContext(),
				oData = this.getModel().getProperty(oRowContext.getPath()),
				oViewModel = this.getModel("viewModel"),
				oUserModel = this.getModel("user"),
				oModel = oRowContext.getModel(),
				oResourceBundle = this.getResourceBundle(),
				iNewEffort = this.getTimeDifference(oParams.newTime[0],oParams.newTime[1]);

			oViewModel.setProperty("/ganttSettings/busy", true);
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");

			if (oParams.shape && oParams.shape.sParentAggregationName === "shapes3") {
				this._updateAssignmentModel(oData.Guid).then(function (oAssignmentObj) {
					if (oAssignmentObj.AllowChange) {
						oAssignmentObj.DateFrom = oParams.newTime[0];
						oAssignmentObj.DateTo = oParams.newTime[1];
						if(oUserModel.getProperty("/ENABLE_RESIZE_EFFORT_CHECK") && iNewEffort < oAssignmentObj.Effort){
							this._showConfirmMessageBox(oResourceBundle.getText("xtit.effortvalidate")).then(function(data){
								if(data === "YES"){
									this._oAssignementModel.setData(oAssignmentObj);
									this.updateAssignment(false, {
										bFromGantt: true
									});
								}else{
									oModel.resetChanges([oRowContext.getPath()]);
									oViewModel.setProperty("/ganttSettings/busy", false);
									return;
								}
							}.bind(this));
							
						}else{
							this._oAssignementModel.setData(oAssignmentObj);
							this.updateAssignment(false, {
								bFromGantt: true
							});
						}
					} else {
						oModel.resetChanges([oRowContext.getPath()]);
						oViewModel.setProperty("/ganttSettings/busy", false);
						return;
					}

				}.bind(this));
			}
		},
			/**
		 * double click on a shape
		 * open assignment detail dialog
		 * @param oEvent
		 */
		onShapeDoubleClick: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oContext = oParams.shape.getBindingContext(),
				oRowContext = oParams.rowSettings.getParent().getBindingContext(),
				oShape = oParams.shape,
				sMsg;
			if (oShape && oShape.sParentAggregationName === "shapes3") {
				// to identify the action done on respective page
				localStorage.setItem("Evo-Action-page", "ganttSplit");
				if (oContext) {
					this.getOwnerComponent().planningCalendarDialog.open(this.getView(), [oRowContext.getPath()], {
						bFromGantt: true
					}, oShape.getTime());
				} else {
					sMsg = this.getResourceBundle().getText("notFoundContext");
					this.showMessageToast(sMsg);
				}
			}
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