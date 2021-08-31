sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentActionsController",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/ganttFormatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Popup",
	"sap/gantt/simple/CoordinateUtils",
	"com/evorait/evoplan/model/Constants"
], function (Controller, formatter, ganttFormatter, Filter, FilterOperator, Popup, CoordinateUtils, Constants) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.gantt.newgantt", {

		formatter: formatter,

		ganttFormatter: ganttFormatter,

		selectedResources: [],

		mTreeState: {},

		_oEventBus: null,

		_firstVisit: "newgantt",

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 */
		onInit: function () {
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oAssignementModel = this.getModel("assignment");

			this._oEventBus.subscribe("BaseController", "refreshGanttChart", this._refreshGanttChart, this);

			//set on first load required filters
			this._treeTable = this.getView().byId("ganttResourceTreeTable");
			this._ganttChart = this.getView().byId("ganttResourceAssignments");
			this._axisTime = this.getView().byId("idAxisTime");
			this._userData = this.getModel("user").getData();

			this.getRouter().getRoute("newgantt").attachPatternMatched(function () {
				//this._routeName = Constants.GANTT.NAME;
				this._mParameters = {
					bFromNewGantt: true
				};
			}.bind(this));

			if (this._userData.ENABLE_RESOURCE_AVAILABILITY) {
				this._ganttChart.addStyleClass("resourceGanttWithTable");
			}

			// dirty fix will be removed when evoplan completly moved to 1.84
			if (parseFloat(sap.ui.getVersionInfo().version) === 1.71) {
				this._axisTime.setZoomLevel(3);
			}

			this._defaultGanttHorizon();

			this._viewId = this.getView().getId();
			this.getOwnerComponent().GanttResourceFilter.init(this.getView(), this._treeTable);
			this.getOwnerComponent().GanttActions.init(this.getView(), this.getModel(), this.getOwnerComponent(), this.getModel("assignment"));
		},

		onBusyStateChanged: function (oEvent) {
			var parameters = oEvent.getParameters();

			if (parameters.busy !== false && !this._isLoaded) {
				this._isLoaded = true;
				this._setDefaultTreeDateRange();
			}
			if (parameters.busy === false) {
				if (Object.keys(this.mTreeState).length > 0) {
					this._restoreTreeState();
				}
			}
			/*if (parameters.busy === false) {
				if (Object.keys(this.mTreeState).length > 0) {
					this._restoreTreeState();
				}

			}*/
		},

		_refreshGanttChart: function (oEvent) {
			var oTreeTable = this.getView().byId("ganttResourceTreeTable"),
				oTreeBinding = oTreeTable.getBinding("rows");
			//reset the changes
			this.resetChanges();
			//Get the tree state of gantt tree table before refresh
			if (oTreeBinding && !this._bFirsrTime) {
				this.mTreeState = this._getTreeState();
				oTreeBinding.refresh();
			}
			this._bFirsrTime = false;
		},

		/**
		 * Resets the selected resource if selected
		 */
		resetChanges: function () {
			var oModel = this.getModel();
			// reset the model changes
			if (oModel.hasPendingChanges()) {
				oModel.resetChanges();
			}
			// Resetting selected resource
			this.selectedResources = [];
			this.byId("idButtonreassign").setEnabled(false);
			this.byId("idButtonunassign").setEnabled(false);
			this.byId("idButtonCreUA").setEnabled(false);
			this.byId("idButtonTimeAlloc").setEnabled(false);
		},

		/* map the current tree state with expand and collapse on each level
		 * before tree is doing a new GET request
		 * @private
		 */
		_getTreeState: function () {
			var oBindings = this._treeTable.getBinding(),
				aNodes = oBindings.getNodes(),
				oCollection = {};

			for (var i = 0; i < aNodes.length; i++) {
				oCollection[aNodes[i].key] = {
					path: aNodes[i].key,
					level: aNodes[i].level,
					nodeState: aNodes[i].nodeState
				};
			}
			return oCollection;
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
			var oDateFrom, oDateTo, //oUserModel = this.getModel("user"),
				aFilters = [];

			//oDateFrom = mParameters ? mParameters.dateFrom : oUserModel.getProperty("/GANT_START_DATE");
			//oDateTo = mParameters ? mParameters.dateTo : oUserModel.getProperty("/GANT_END_DATE");

			//Fetching Dates from the DateRange Control
			oDateFrom = this.getView().byId("idDateRangeGantt2").getDateValue();
			oDateTo = this.getView().byId("idDateRangeGantt2").getSecondDateValue();

			aFilters.push(new Filter("StartDate", FilterOperator.LE, formatter.date(oDateTo)));
			aFilters.push(new Filter("EndDate", FilterOperator.GE, formatter.date(oDateFrom)));
			return aFilters;
		},
		/**
		 * Set Default Horizon times
		 * @private
		 */
		_defaultGanttHorizon: function () {
			this._ganttChart.setAxisTimeStrategy(this._createGanttHorizon(this._axisTime.getZoomLevel(), {
				StartDate: this.getModel("user").getProperty("/GANT_START_DATE"),
				EndDate: this.getModel("user").getProperty("/GANT_END_DATE")
			}));
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
				iNewEffort = this.getOwnerComponent().GanttActions.getTimeDifference(oParams.newTime[0], oParams.newTime[1]);
			//		iNewEffort = this.getTimeDifference(oParams.newTime[0],oParams.newTime[1]);

			oViewModel.setProperty("/ganttSettings/busy", true);
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");

		//	if (oParams.shape && oParams.shape.sParentAggregationName === "shapes2") {
				if (oParams.shape && oParams.shape.sParentAggregationName === "shapes3") {
				//	this._updateAssignmentModel(oData.Guid).then(function (oAssignmentObj) {
			//	this.getOwnerComponent().GanttActions._updateAssignmentModel(oData.AssignmentGuid).then(function (oAssignmentObj) {
				this.getOwnerComponent().GanttActions._updateAssignmentModel(oData.Guid).then(function (oAssignmentObj) {
					if (oAssignmentObj.AllowChange) {
						oAssignmentObj.DateFrom = oParams.newTime[0];
						oAssignmentObj.DateTo = oParams.newTime[1];
						oModel.setProperty(oRowContext.getPath() + "/ResAsgnDateFrom", oAssignmentObj.DateFrom);
						oModel.setProperty(oRowContext.getPath() + "/ResAsgnDateTo", oAssignmentObj.DateTo);
						oViewModel.setProperty("/ganttSettings/busy", false);
						return;
					} else {
						oModel.resetChanges([oRowContext.getPath()]);
						oViewModel.setProperty("/ganttSettings/busy", false);
						return;
					}

				}.bind(this));
			}
		},

		/**
		 * Event triggered when right clicked on gantt shape,
		 * The context menu showing un-assign button will be shown.
		 * @param oEvent
		 */
		onShapeContextMenu: function (oEvent) {
			var oShape = oEvent.getParameter("shape"),
				oViewModel = this.getModel("viewModel"),
				oAppView = this.getModel("appView"),
				sCurrentRoute = oAppView.getProperty("/currentRoute"),
				oModel, sPath, sAssignGuid, sStatus;

		//	if (oShape && oShape.sParentAggregationName === "shapes2") {
					if (oShape && oShape.sParentAggregationName === "shapes3") {
				this._selectedShapeContext = oShape.getBindingContext();
				oModel = this._selectedShapeContext.getModel();
				sPath = this._selectedShapeContext.getPath();
				sAssignGuid = oModel.getProperty(sPath).Guid;
			//	sAssignGuid = oModel.getProperty(sPath).AssignmentGuid;
				sStatus = oModel.getProperty(sPath).DEMAND_STATUS;
				if (!this._menu || sCurrentRoute !== this._firstVisit) {
					this._menu = sap.ui.xmlfragment(
						"com.evorait.evoplan.view.gantt.fragments.ShapeContextMenu",
						this, sCurrentRoute
					);
					this.getView().addDependent(this._menu);
					this._firstVisit = sCurrentRoute;
				}
				if (sStatus !== "COMP") {
					//	this._updateAssignmentModel(sAssignGuid).then(function (data) {
					this.getOwnerComponent().GanttActions._updateAssignmentModel(sAssignGuid).then(function (data) {
						oViewModel.setProperty("/ganttSettings/shapeOpearation/unassign", data.AllowUnassign);
						oViewModel.setProperty("/ganttSettings/shapeOpearation/reassign", data.AllowReassign);
						oViewModel.setProperty("/ganttSettings/shapeOpearation/change", data.AllowChange);
						oViewModel.setProperty("/ganttSettings/shapeData", data);
						var eDock = Popup.Dock;
						this._menu.open(true, oShape, eDock.BeginTop, eDock.endBottom, oShape);
					}.bind(this));
				}

			}
		},

		/**
		 * double click on a shape
		 * open assignment detail dialog
		 * @param oEvent
		 */
		// onShapeDoubleClick: function (oEvent) {
		// 	var oParams = oEvent.getParameters(),
		// 		oContext = oParams.shape.getBindingContext(),
		// 		oRowContext = oParams.rowSettings.getParent().getBindingContext(),
		// 		oShape = oParams.shape,
		// 		sMsg;
		// 	if (oShape && oShape.sParentAggregationName === "shapes3") {
		// 		// to identify the action done on respective page
		// 		localStorage.setItem("Evo-Action-page", "ganttSplit");
		// 		if (oContext) {
		// 			this.getOwnerComponent().planningCalendarDialog.open(this.getView(), [oRowContext.getPath()], {
		// 				bFromGantt: true
		// 			}, oShape.getTime());
		// 		} else {
		// 			sMsg = this.getResourceBundle().getText("notFoundContext");
		// 			this.showMessageToast(sMsg);
		// 		}
		// 	}
		// },
		onShapeDoubleClick: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oContext = oParams.shape.getBindingContext(),
				oRowContext = oParams.rowSettings.getParent().getBindingContext(),
				oShape = oParams.shape,
				oRowContextPath = oRowContext.getPath().split("/")[1],
				sMsg, oResourcePath;

			var oNodes = this._treeTable.getBinding().getNodes();
			for (var n = 0; n < oNodes.length; n++) {
				if (oNodes[n].key === oRowContextPath) {
					oResourcePath = oNodes[n].originalParent.context.getPath();
					break;
				}
			}
		//	if (oShape && oShape.sParentAggregationName === "shapes2") {
					if (oShape && oShape.sParentAggregationName === "shapes3") {
				// to identify the action done on respective page
				localStorage.setItem("Evo-Action-page", "ganttSplit");
				if (oContext) {
					this.getOwnerComponent().planningCalendarDialog.open(this.getView(), [oResourcePath], {
						bFromNewGantt: true
					}, oShape.getTime());
				} else {
					sMsg = this.getResourceBundle().getText("notFoundContext");
					this.showMessageToast(sMsg);
				}
			}
		},

		/**
		 * When user select a resource by selecting checkbox enable/disables the
		 * appropriate buttons in the footer.
		 * @param oEvent
		 * @Author Pranav
		 */
		onChangeSelectResource: function (oEvent) {
			var oSource = oEvent.getSource(),
				parent = oSource.getParent(),
				sPath = parent.getBindingContext().getPath(),
				oParams = oEvent.getParameters();

			//Sets the property IsSelected manually
			this.getModel().setProperty(sPath + "/IsSelected", oParams.selected);

			if (oParams.selected) {
				this.selectedResources.push(sPath);

			} else if (this.selectedResources.indexOf(sPath) >= 0) {
				//removing the path from this.selectedResources when user unselect the checkbox
				this.selectedResources.splice(this.selectedResources.indexOf(sPath), 1);
			}

			if (this.selectedResources.length > 0) {
				this.byId("idButtonreassign").setEnabled(true);
				this.byId("idButtonunassign").setEnabled(true);

			} else {
				this.byId("idButtonreassign").setEnabled(false);
				this.byId("idButtonunassign").setEnabled(false);
			}
			var oData = this.getModel().getProperty(this.selectedResources[0]);

			if (this.selectedResources.length === 1 && oData && oData.NodeType === "RESOURCE" && oData.ResourceGuid !== "" && oData.ResourceGroupGuid !==
				"") {
				this.byId("idButtonCreUA").setEnabled(true);
				this.byId("idButtonTimeAlloc").setEnabled(true);
			} else {
				this.byId("idButtonCreUA").setEnabled(false);
				this.byId("idButtonTimeAlloc").setEnabled(false);
			}
		},

		/**
		 * open the create unavailability dialog for selected resource
		 * @param oEvent
		 */
		onCreateAbsence: function (oEvent) {
			var oResourceBundle = this.getResourceBundle();
			if (this.selectedResources.length === 0) {
				this.showMessageToast(oResourceBundle.getText("ymsg.selectRow"));
				return;
			}
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");

			this.getOwnerComponent().manageAvail.open(this.getView(), [this.selectedResources[0]], {
				bFromNewGantt: true
			});

		},
		/**
		 * open the Time Allocation dialog for selected resource
		 * @param oEvent
		 */
		onTimeAllocPress: function (oEvent) {
			var oResourceBundle = this.getResourceBundle();
			if (this.selectedResources.length === 0) {
				this.showMessageToast(oResourceBundle.getText("ymsg.selectRow"));
				return;
			}
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");

			this.getOwnerComponent().manageAvail.open(this.getView(), [this.selectedResources[0]], {
				bFromNewGantt: true
			}, "timeAlloc");

		},

		/**
		 * Open's Dialog containing assignments to reassign
		 * @param oEvent
		 */
		onPressReassign: function (oEvent) {
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");
			this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, false, {
				bFromNewGantt: true
			});
		},
		/**
		 * Open's Dialog containing assignments to unassign
		 * @param oEvent
		 */
		onPressUnassign: function (oEvent) {
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");
			this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, true, {
				bFromNewGantt: true
			});
		},

		/**
		 * on click on today adjust the view of Gantt horizon.
		 */
		onPressToday: function (oEvent) {
			//	this.changeGanttHorizonViewAt(this.getModel("viewModel"), this._axisTime.getZoomLevel(), this._axisTime);
			this._ganttChart.setAxisTimeStrategy(this._createGanttHorizon(this._axisTime.getZoomLevel(), {
				StartDate: this.getView().byId("idDateRangeGantt2").getDateValue(),
				EndDate: this.getView().byId("idDateRangeGantt2").getSecondDateValue()
			}));

		},

		/**
		 * Open the Gantt Demands Filter Dialog 
		 */
		onPressGanttResourceFilters: function () {
			this.getOwnerComponent().GanttResourceFilter.open(this.getView(), this._treeTable);
		},

		/**
		 * After Resource tree GET request restore the expand/collapse state
		 * from before refresh
		 * @private
		 * @Author: Pranav
		 */
		_restoreTreeState: function () {
			var oBindings = this._treeTable.getBinding(),
				aNodes = oBindings.getNodes(),
				expandIdx = [],
				collapseIdx = [];

			for (var j = 0; j < aNodes.length; j++) {
				if (this.mTreeState[aNodes[j].key] && !aNodes[j].nodeState.isLeaf) {
					if (!aNodes[j].nodeState.expanded && this.mTreeState[aNodes[j].key].nodeState.expanded) {
						expandIdx.push(j);
						delete this.mTreeState[aNodes[j].key];
					} else if (!aNodes[j].nodeState.collapsed && this.mTreeState[aNodes[j].key].nodeState.collapsed) {
						collapseIdx.push(j);
					}
				}
			}
			collapseIdx.reverse();
			if (expandIdx.length > 0) {
				this._treeTable.expand(expandIdx);
			} else if (collapseIdx.length > 0) {
				for (var index = 0; index < collapseIdx.length; index++) {
					this._treeTable.collapse(collapseIdx[index]);
				}
			} else {
				this.mTreeState = {};
			}
		},
		/**
		 * Calls the respective function import to create assignments
		 * @param {Object} aSources Demand paths
		 * @param {Object} oTarget Resource Path
		 * @private
		 */
		_assignDemands: function (oResourceData, aSources, oTarget, oTargetDate, bCheckAvail, aGuids) {
			var oUserModel = this.getModel("user");

			if (!bCheckAvail && oUserModel.getProperty("/ENABLE_RESOURCE_AVAILABILITY") &&
				oUserModel.getProperty("/ENABLE_ASSIGNMENT_STRETCH") && oUserModel.getProperty("/ENABLE_QUALIFICATION")) {
				this._checkAssignmentForStretch(oResourceData, aSources, oTarget, oTargetDate, aGuids, this._checkResourceQualification.bind(this));
			} else if (!bCheckAvail && oUserModel.getProperty("/ENABLE_RESOURCE_AVAILABILITY") &&
				oUserModel.getProperty("/ENABLE_ASSIGNMENT_STRETCH") && !oUserModel.getProperty("/ENABLE_QUALIFICATION")) {
				this._checkAssignmentForStretch(oResourceData, aSources, oTarget, oTargetDate, aGuids);
			} else if (oUserModel.getProperty("/ENABLE_QUALIFICATION")) {
				this._checkResourceQualification(aSources, oTarget, oTargetDate, null, aGuids);
			} else {
				Promise.all(this.assignedDemands(aSources, oTarget, oTargetDate, null, aGuids))
					.then(this._refreshAreas.bind(this)).catch(function (error) {});
			}
		},

		/**
		 * Proceed to assignment with Stretch, check if Date Time is not valid
		 * @param {Object} aSources Demand paths
		 * @param {Object} oTarget Resource Path
		 * @private
		 */
		_checkAssignmentForStretch: function (oResourceData, aSources, oTarget, oTargetDate, aGuids, fnCheckValidation) {
			var oViewModel = this.getModel("viewModel"),
				oResourceModel = this.getResourceBundle();
			if (oResourceData.NodeType !== "RES_GROUP" && (oResourceData.NodeType === "RESOURCE" && oResourceData.ResourceGuid &&
					oResourceData.ResourceGuid !== "")) {

				this._checkAvailability(aSources, oTarget, oTargetDate, aGuids).then(function (availabilityData) {
					if (availabilityData.PastFail) {
						oViewModel.setProperty("/ganttSettings/busy", false);
						return;
					}
					if (!availabilityData.Unavailable) {
						if (fnCheckValidation) {
							fnCheckValidation.call(this, aSources, oTarget, oTargetDate, availabilityData.Endtimestamp, aGuids, this._mParameters);
						} else {
							Promise.all(this.assignedDemands(aSources, oTarget, oTargetDate, availabilityData.Endtimestamp, aGuids))
								.then(this._refreshAreas.bind(this)).catch(function (error) {});
						}
					} else {
						this._showConfirmMessageBox(oResourceModel.getText("ymsg.extendMsg")).then(function (value) {
							if (value === "NO" && fnCheckValidation) {
								fnCheckValidation.call(this, aSources, oTarget, oTargetDate, availabilityData.EndtimestampWithstretch, aGuids, this._mParameters);
							} else if (value === "YES" && fnCheckValidation) {
								fnCheckValidation.call(this, aSources, oTarget, oTargetDate, availabilityData.Endtimestamp, aGuids, this._mParameters);
							} else if (value === "YES") {
								Promise.all(this.assignedDemands(aSources, oTarget, oTargetDate, availabilityData.Endtimestamp, aGuids))
									.then(this._refreshAreas.bind(this)).catch(function (error) {});
							} else {
								Promise.all(this.assignedDemands(aSources, oTarget, oTargetDate, availabilityData.EndtimestampWithstretch, aGuids))
									.then(this._refreshAreas.bind(this)).catch(function (error) {});
							}
						}.bind(this));
					}
				}.bind(this));
			} else {
				fnCheckValidation.call(this, aSources, oTarget, oTargetDate, null, aGuids, this._mParameters);
			}
		},
		/**
		 *
		 * @param aSources
		 * @param oTarget
		 * @param oTargetDate
		 * Checking Availability
		 * @private
		 */
		_checkAvailability: function (aSources, oTarget, oTargetDate, aGuids) {
			var oModel = this.getModel(),
				sGuid = aSources ? oModel.getProperty(aSources[0] + "/Guid") : aGuids[0].split("'")[1];
			return new Promise(function (resolve, reject) {
				this.executeFunctionImport(oModel, {
					ResourceGuid: oModel.getProperty(oTarget + "/ResourceGuid"),
					StartTimestamp: oTargetDate || new Date(),
					DemandGuid: sGuid
				}, "ResourceAvailabilityCheck", "GET").then(function (data) {
					resolve(data);
				});
			}.bind(this));
		},

		/**
		 * Proceed to Qualification Check for Demand Assignment/Reassignment/Update, before Service call (Call Function Import) 
		 * @param {Object} aSourcePaths Demand paths
		 * @param {Object} oTarget Resource Path
		 * @private
		 */
		_checkResourceQualification: function (aSourcePaths, oTarget, oTargetDate, oNewEndDate, aGuids, mParameters) {
			var oTargetObject = this.getModel().getProperty(oTarget);
			this.checkQualification(aSourcePaths, oTargetObject, oTargetDate, oNewEndDate, aGuids).then(function (data) {
				if (data.result.results && data.result.results.length) {
					this.getModel("viewModel").setProperty("/QualificationMatchList", {
						TargetObject: oTargetObject,
						QualificationData: data.result.results,
						SourcePaths: aSourcePaths,
						mParameter: mParameters,
						targetDate: oTargetDate,
						newEndDate: oNewEndDate,
						aGuids: aGuids
					});
					this.getOwnerComponent().QualificationCheck.open(this, this.getView(), mParameters);
				} else {
					Promise.all(this.assignedDemands(aSourcePaths, oTarget, oTargetDate, oNewEndDate, aGuids))
						.then(this._refreshAreas.bind(this)).catch(function (error) {}.bind(this));
				}
			}.bind(this));
		},
		/**
		 * Formatter for the color fill
		 * Based on the group type the fill the color will be rendered.
		 * A -> White
		 * N -> Pattern
		 * @param sType
		 * @return {string}
		 */
		getPattern: function (sType, sColour) {
			if (sType === "N") {
				return "url(#" + this._viewId + "--unavailability)";
			} else if (sType === "A") {
				return "#90EE90";
			} else if (sType === "O") {
				return "transparent";
			} else if (sType === "T") {
				return "url(#" + this._viewId + "--oncallorovertime)";
			} else if (sType === "L") {
				return sColour;
			} else {
				return "transparent";
			}

		},
		/**
		 * Format legend colors to differentiate between pattern and colors
		 * @param sCode
		 * @param sType
		 * @return {*}
		 */
		formatLegend: function (sCode, sType) {
			if (sType === "COLOUR") {
				return sCode;
			} else {
				return "url(#" + this._viewId + "--" + sCode + ")";
			}
		},

		/**
		 * Calls the delete assignment method when you select un-assign button
		 * show reassignment dialog when select menu "Assign new"
		 * @param oEvent
		 */
		handleMenuItemPress: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oSelectedItem = oParams.item,
				sButtonText = oSelectedItem.getText(),
				oCustomData = oSelectedItem.getAggregation("customData"),
				sFunctionKey = oCustomData.length ? oCustomData[0].getValue() : null,

				oModel = this._selectedShapeContext.getModel(),
				sPath = this._selectedShapeContext.getPath(),
				//	sAssignGuid = oModel.getProperty(sPath).Guid,
				sAssignGuid = oModel.getProperty(sPath).AssignmentGuid,
				sPath = "/AssignmentSet('" + sAssignGuid + "')",
				oSelectedData = [{
					oData: {
						Guid: oModel.getProperty(sPath).DemandGuid
					}
				}],
				mParameters = {
					bFromNewGantt: true
				},
				oAppModel = this.getModel("appView");

			if (oAppModel.getProperty("/currentRoute") === "ganttSplit") {
				mParameters = {
					bFromGanttSplit: true
				};
			}
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");

			if (sButtonText === this.getResourceBundle().getText("xbut.buttonUnassign")) {
				//do unassign
				this.byId("container").setBusy(true);
				this.deleteAssignment(oModel, sAssignGuid).then(this._refreshAreas.bind(this));

			} else if (sButtonText === this.getResourceBundle().getText("xbut.buttonReassign")) {
				//show reassign dialog
				//oView, isReassign, aSelectedPaths, isBulkReAssign, mParameters, callbackEvent
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), true, [sPath], false, null, "ganttShapeReassignment");
			} else if (sButtonText === this.getResourceBundle().getText("xbut.buttonChange")) {
				// Change
				this.getOwnerComponent().assignInfoDialog.open(this.getView(), null, null, mParameters, sPath);
			} else if (sButtonText === this.getResourceBundle().getText("xbut.buttonExecuteFunction") && !oSelectedItem.getSubmenu()) {
				// Set Function
				var oDemandPath = oModel.getProperty(sPath).Demand.__ref;
				this.onGetAssignmentDemand(oDemandPath).then(function (oDemandData) {
					var oSelectedDemandPath = [{
						sPath: "/" + oDemandPath,
						oData: oDemandData
					}];
					this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedDemandPath, mParameters);
				}.bind(this));
			} else {
				if (sFunctionKey) {
					this._oEventBus.publish("StatusSelectDialog", "changeStatusDemand", {
						selectedPaths: oSelectedData,
						functionKey: sFunctionKey,
						parameters: mParameters
					});
				}
			}
		},
		/**
		 * Unassign assignment with delete confirmation dialog. 
		 */
		_deleteAssignment: function (oModel, sAssignGuid) {
			this._showConfirmMessageBox.call(this, this.getResourceBundle().getText("ymsg.confirmDel")).then(function (data) {
				if (data === "YES") {
					this.deleteAssignment(oModel, sAssignGuid).then(this._refreshAreas.bind(this));
				} else {
					this.byId("container").setBusy(false);
					return;
				}
			}.bind(this));
		},

		/**
		 * reassign a demand to a new resource by context menu
		 * @private
		 */
		_reassignShape: function (sChannel, sEvent, oData) {
			var sourceData;
			if (sEvent === "ganttShapeReassignment") {
				for (var i = 0; i < oData.aSourcePaths.length; i++) {
					sourceData = this.getModel().getProperty(oData.aSourcePaths[i]);
					//	this._updateAssignmentModel(sourceData.Guid).then(function (oAssignmentObj) {
					this.getOwnerComponent().GanttActions._updateAssignmentModel(sourceData.AssignmentGuid).then(function (oAssignmentObj) {
						if (oAssignmentObj.AllowReassign) {
							oAssignmentObj.NewAssignPath = oData.sAssignPath;
							this._oAssignementModel.setData(oAssignmentObj);
							this.updateAssignment(true, {
								bFromGantt: true
							});
						} else {
							this.getModel().resetChanges(oData.aSourcePaths);
						}

					}.bind(this));
				}
			}
		},

		/**
		 * Refresh the Gantt tree and Demand table of Gantt view.
		 * @param data
		 * @param oResponse
		 * @private
		 */
		_refreshAreas: function (data, oResponse) {
			this.showMessage(oResponse);
			this._refreshGanttChart();
			if (this._routeName !== Constants.GANTT.SPLIT) {
				this._oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
			}
		},

		/**
		 * on press link of assignment in Gantt tree row
		 * get parent row path and bind this path to the dialog or showing assignment information
		 * @param oEvent
		 */
		onPressAssignmentLink: function (oEvent) {
			var oSource = oEvent.getSource(),
				oRowContext = oSource.getParent().getBindingContext();

			if (oRowContext) {
				this.assignmentPath = oRowContext.getPath();
				this.getOwnerComponent().assignInfoDialog.open(this.getView(), this.assignmentPath, null, this._mParameters);
			} else {
				var msg = this.getResourceBundle().getText("notFoundContext");
				this.showMessageToast(msg);
			}
		},

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
		onAfterRendering: function () {
			var oTable = this.getView().byId("ganttResourceTreeTable"),
				oBinding = oTable.getBinding("rows"),
				oViewModel = this.getModel("viewModel"),
				iSelectionPane = oViewModel.getProperty("/ganttSelectionPane");

			// To show busy indicator when filter getting applied.
			oBinding.attachDataRequested(function () {
				oViewModel.setProperty("/ganttSettings/busy", true);
			});
			oBinding.attachDataReceived(function () {
				oViewModel.setProperty("/ganttSettings/busy", false);
				oViewModel.setProperty("/ganttSelectionPane", iSelectionPane);
				this._ganttChart.setSelectionPanelSize(iSelectionPane);
			}.bind(this));
		},
		/**
		 * On click on expand the tree nodes gets expand to level 1
		 * On click on collapse all the tree nodes will be collapsed to root.
		 * @param oEvent
		 */
		onClickExpandCollapse: function (oEvent) {
			var oButton = oEvent.getSource(),
				oCustomData = oButton.getCustomData();

			if (oCustomData[0].getValue() === "EXPAND" && this._treeTable) {
				this._treeTable.expandToLevel(1);
			} else {
				this._treeTable.collapseAll();
			}
		},
		/**
		 * To fetch Demand data on Gantt Context Menu Set Function
		 */
		onGetAssignmentDemand: function (sPath) {
			return new Promise(function (oResolve, oReject) {
				this.byId("container").setBusy(true);
				this.getModel().read("/" + sPath, {
					success: function (oData) {
						this.byId("container").setBusy(false);
						oResolve(oData);
					}.bind(this),
					error: function (oError) {
						this.byId("container").setBusy(false);
						oReject(oError);
					}
				});
			}.bind(this));
		},
		/**
		 * Adjusting Gantt Horizon as per the selected DateRange
		 * @Author Chethan RK
		 */
		onChangeDateRange: function () {
			this._setDefaultTreeDateRange();
			this._ganttChart.setAxisTimeStrategy(this._createGanttHorizon(this._axisTime.getZoomLevel(), {
				StartDate: this.getView().byId("idDateRangeGantt2").getDateValue(),
				EndDate: this.getView().byId("idDateRangeGantt2").getSecondDateValue()
			}));
		},
		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 */
		//	onExit: function() {
		//
		//	}

	});

});