/* globals _ */
sap.ui.define([
	"com/evorait/evoplan/controller/gantt/GanttActions",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/ganttFormatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/core/Popup",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment",
	"sap/gantt/simple/CoordinateUtils",
	"com/evorait/evoplan/model/Constants",
	"sap/gantt/misc/Utility",
	"sap/gantt/def/pattern/SlashPattern",
	"sap/gantt/def/pattern/BackSlashPattern",
	"com/evorait/evoplan/controller/map/MapUtilities",
	"sap/ui/util/Storage",
	"sap/gantt/def/gradient/Stop",
	"sap/gantt/def/gradient/LinearGradient",
	"com/evorait/evoplan/controller/scheduling/SchedulingActions",
	"sap/gantt/library"
], function (Controller, formatter, ganttFormatter, Filter, FilterOperator, FilterType, Popup, MessageToast, Fragment, CoordinateUtils,
	Constants,
	Utility, SlashPattern, BackSlashPattern, MapUtilities, Storage, Stop, LinearGradient, SchedulingActions, GanttLibrary) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.gantt.GanttChart", {

		formatter: formatter,
		ganttFormatter: ganttFormatter,
		selectedResources: [],

		oGanttModel: null,
		oGanttOriginDataModel: null,
		oSchedulingActions: undefined,

		mRequestTypes: {
			update: "update",
			resize: "resize",
			reassign: "reassign",
			unassign: "unassign"
		},

		bGanttFirstTime: true,

		localStorage: new Storage(Storage.Type.local, "EvoPlan"),

		_availabilityData: null,

		// Custom timeline option
		oTimelineOption: {
			"FiveMinutes": {
				innerInterval: {
					unit: GanttLibrary.config.TimeUnit.minute,
					span: 5,
					range: 32
				},
				largeInterval: {
					unit: GanttLibrary.config.TimeUnit.hour,
					span: 1,
					pattern: "HH / MMM d, yyyy, cccc"
				},
				smallInterval: {
					unit: GanttLibrary.config.TimeUnit.minute,
					span: 5,
					pattern: "mm "
				}
			},
			"FifteenMinutes": {
				innerInterval: {
					unit: GanttLibrary.config.TimeUnit.minute,
					span: 15,
					range: 48
				},
				largeInterval: {
					unit: GanttLibrary.config.TimeUnit.hour,
					span: 1,
					pattern: "HH / MMM d, yyyy, cccc"
				},
				smallInterval: {
					unit: GanttLibrary.config.TimeUnit.minute,
					span: 15,
					pattern: "mm "
				}
			},
			"Hour": {
				innerInterval: {
					unit: GanttLibrary.config.TimeUnit.hour,
					span: 1,
					range: 48
				},
				largeInterval: {
					unit: GanttLibrary.config.TimeUnit.day,
					span: 1,
					pattern: "MMMM dd, yyyy, cccc "
				},
				smallInterval: {
					unit: GanttLibrary.config.TimeUnit.hour,
					span: 1,
					pattern: "HH:mm "
				}
			},
			"SixHours": {
				innerInterval: {
					unit: GanttLibrary.config.TimeUnit.hour,
					span: 6,
					range: 64
				},
				largeInterval: {
					unit: GanttLibrary.config.TimeUnit.day,
					span: 1,
					pattern: "MMMM dd, yyyy, cccc "
				},
				smallInterval: {
					unit: GanttLibrary.config.TimeUnit.hour,
					span: 6,
					pattern: "HH:mm "
				}
			},
			"DayDate": {
				innerInterval: {
					unit: GanttLibrary.config.TimeUnit.day,
					span: 1,
					range: 64
				},
				largeInterval: {
					unit: GanttLibrary.config.TimeUnit.week,
					span: 1,
					pattern: "LLL yyyy, 'Week' ww  "
				},
				smallInterval: {
					unit: GanttLibrary.config.TimeUnit.day,
					span: 1,
					pattern: "EEE dd "
				}
			},
			"Date": {
				innerInterval: {
					unit: GanttLibrary.config.TimeUnit.day,
					span: 1,
					range: 32
				},
				largeInterval: {
					unit: GanttLibrary.config.TimeUnit.week,
					span: 1,
					pattern: "LLL yyyy, 'Week' ww  "
				},
				smallInterval: {
					unit: GanttLibrary.config.TimeUnit.day,
					span: 1,
					pattern: "dd "
				}
			},
			"CWWeek": {
				innerInterval: {
					unit: GanttLibrary.config.TimeUnit.week,
					span: 1,
					range: 56
				},
				largeInterval: {
					unit: GanttLibrary.config.TimeUnit.month,
					span: 1,
					pattern: "LLL yyyy "
				},
				smallInterval: {
					unit: GanttLibrary.config.TimeUnit.week,
					span: 1,
					pattern: "'CW' ww  "
				}
			},
			"WeekOfYear": {
				innerInterval: {
					unit: GanttLibrary.config.TimeUnit.week,
					span: 1,
					range: 32
				},
				largeInterval: {
					unit: GanttLibrary.config.TimeUnit.month,
					span: 1,
					pattern: "LLL yyyy "
				},
				smallInterval: {
					unit: GanttLibrary.config.TimeUnit.week,
					span: 1,
					pattern: "ww "
				}
			},
			"Month": {
				innerInterval: {
					unit: GanttLibrary.config.TimeUnit.day,
					span: 30,
					range: 48
				},
				largeInterval: {
					unit: GanttLibrary.config.TimeUnit.month,
					span: 3,
					pattern: "yyyy QQQ "
				},
				smallInterval: {
					unit: GanttLibrary.config.TimeUnit.month,
					span: 1,
					pattern: "LLL "
				}
			},
			"Quarter": {
				innerInterval: {
					unit: GanttLibrary.config.TimeUnit.day,
					span: 90,
					range: 48
				},
				largeInterval: {
					unit: GanttLibrary.config.TimeUnit.year,
					span: 1,
					pattern: "yyyy "
				},
				smallInterval: {
					unit: GanttLibrary.config.TimeUnit.month,
					span: 3,
					pattern: "QQQ "
				}
			},
			"Year": {
				innerInterval: {
					unit: GanttLibrary.config.TimeUnit.day,
					span: 360,
					range: 48
				},
				largeInterval: {
					unit: GanttLibrary.config.TimeUnit.year,
					span: 5,
					pattern: "yyyy "
				},
				smallInterval: {
					unit: GanttLibrary.config.TimeUnit.year,
					span: 1,
					pattern: "yyyy "
				}
			}
		},

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 */
		onInit: function () {
			this.oViewModel = this.getModel("viewModel");
			this.oUserModel = this.getModel("user");
			this.oAppViewModel = this.getModel("appView");
			this._oEventBus = sap.ui.getCore().getEventBus();
			//set on first load required filters
			this._treeTable = this.getView().byId("idGanttResourceTreeTable");
			this._ganttChart = this.getView().byId("idGanttResourceAssignments");
			this._axisTime = this.getView().byId("idAxisTime");
			this._userData = this.oUserModel.getData();

			this._oEventBus.subscribe("BaseController", "refreshAssignments", this._refreshAssignments, this);
			this._oEventBus.subscribe("BaseController", "refreshAvailabilities", this._refreshAvailabilities, this);
			this._oEventBus.subscribe("BaseController", "resetSelections", this._resetSelections, this);
			this._oEventBus.subscribe("AssignTreeDialog", "ganttShapeReassignment", this._reassignShape, this);
			this._oEventBus.subscribe("AssignTreeDialog", "ganttShapePRTReassignment", this._reassignPRTShape, this);
			this._oEventBus.subscribe("BaseController", "refreshCapacity", this._refreshCapacity, this);
			this._oEventBus.subscribe("BaseController", "refreshFullGantt", this._loadGanttData, this);
			this._oEventBus.subscribe("GanttFixedAssignments", "assignDemand", this._proceedToAssign, this);
			this._oEventBus.subscribe("GanttChart", "refreshResourceOnDelete", this._refreshResourceOnBulkDelete, this);
			this._oEventBus.subscribe("GanttChart", "refreshDroppedContext", this._refreshDroppedContext, this);
			this._oEventBus.subscribe("AutoSchedule", "calculateTravelTime", this.calculateTimeAfterScheduling, this);
			this._oEventBus.subscribe("GanttCharController", "onToolReassignGantt", this._onToolReassignGantt, this);
			this.getRouter().getRoute("newgantt").attachPatternMatched(function () {
				this._routeName = Constants.GANTT.NAME;
				this._mParameters = {
					bFromNewGantt: true
				};
				this._initializeGantt();
			}.bind(this));

			this.getRouter().getRoute("newGanttSplit").attachPatternMatched(function () {
				this._routeName = Constants.GANTT.SPLIT;
				this._mParameters = {
					bFromNewGanttSplit: true
				};
				this._initializeGantt();
			}.bind(this));

			this.getRouter().getRoute("ganttTools").attachPatternMatched(function () {
				this._routeName = Constants.GANTT.NAME;
				this._mParameters = {
					bFromGanttTools: true
				};
				this._initializeGantt();
			}.bind(this));

			this.getRouter().getRoute("GanttSplitTools").attachPatternMatched(function () {
				this._mParameters = {
					bFromGanttTools: true
				};
			}.bind(this));

			if (this._userData.ENABLE_RESOURCE_AVAILABILITY) {
				this._ganttChart.addStyleClass("resourceGanttWithTable");
			}

			this._axisTime.setTimeLineOptions(this.oTimelineOption); // Setting custom timeline option for optimizing in zoom level 9
			
			// dirty fix will be removed when evoplan completly moved to 1.84
			if (parseFloat(sap.ui.getVersionInfo().version) === 1.71) {
				this._axisTime.setZoomLevel(3);
			}

			this._viewId = this.getView().getId();
			this.getOwnerComponent().GanttResourceFilter.init(this.getView(), this._treeTable);

			this.bGanttHorizonChange = false; //Flag to identify Gantt Horizon Date Change

			this.oMapUtilities = new MapUtilities();
			var iDefNum = this.oUserModel.getProperty("/DEFAULT_TOOL_ASGN_DAYS") ? this.oUserModel.getProperty("/DEFAULT_TOOL_ASGN_DAYS") : 0;
			this.oViewModel.setProperty("/iDefToolAsgnDays", iDefNum);

			this.oSchedulingActions = new SchedulingActions(this);
		},

		/**
		 * on page exit
		 */
		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshAssignments", this._refreshAssignments, this);
			this._oEventBus.unsubscribe("BaseController", "refreshAvailabilities", this._refreshAvailabilities, this);
			this._oEventBus.unsubscribe("BaseController", "resetSelections", this._resetSelections, this);
			this._oEventBus.unsubscribe("AssignTreeDialog", "ganttShapeReassignment", this._reassignShape, this);
			this._oEventBus.unsubscribe("AssignTreeDialog", "ganttShapePRTReassignment", this._reassignPRTShape, this);
			this._oEventBus.unsubscribe("BaseController", "refreshCapacity", this._refreshCapacity, this);
			this._oEventBus.unsubscribe("GanttFixedAssignments", "assignDemand", this._proceedToAssign, this);
			this._oEventBus.unsubscribe("GanttChart", "refreshResourceOnDelete", this._refreshResourceOnBulkDelete, this);
			this._oEventBus.unsubscribe("GanttChart", "refreshDroppedContext", this._refreshDroppedContext, this);
		},
		/* =========================================================== */
		/* Event & Public methods                                      */
		/* =========================================================== */

		/**
		 * Open's the Gantt Chart Filter Dialog 
		 * 
		 */
		onPressGanttResourceFilters: function () {
			this.getOwnerComponent().GanttResourceFilter.open(this.getView(), this._treeTable);
		},

		/**
		 * double click on a shape
		 * open assignment detail popover
		 * @param oEvent
		 */
		onShapeDoubleClick: function (oEvent) {
			var oShapeContext = oEvent.getParameter("shape").getBindingContext("ganttModel"),
				sToolbarId = this.getView().byId("idPageGanttChart").getContent()[0].getToolbar().getId(),
				sNodeType = this.oGanttModel.getProperty(oShapeContext.getPath()).NODE_TYPE,
				bPRTAssgn = this.oGanttModel.getProperty(oShapeContext.getPath()).IS_PRT;
			if (sNodeType === "ASSIGNMENT" && !bPRTAssgn) {
				this.getOwnerComponent().GanttAssignmentPopOver.open(this.getView(), sap.ui.getCore().byId(sToolbarId + "-settingsButton"),
					oShapeContext);
			}
		},

		/**
		 * Event when visble horizont was changed
		 * @param oEvent
		 */
		onVisibleHorizonUpdate: function (oEvent, oStartTime, oEndTime) {
			if (!oEvent) {
				this.oGanttModel.setProperty("/settings", {
					startTime: new Date(oStartTime.setDate(oStartTime.getDate() - 1)),
					endTime: new Date(oEndTime.setDate(oEndTime.getDate() + 1))
				});
				this.oGanttModel.refresh();
				return;
			}
			var mParams = oEvent.getParameters(),
				sStartTime = mParams.currentVisibleHorizon.getStartTime();

			//sometimes Gantt view gets new rendered when opening context menu of shape
			//then visible horizon jumps to the very beginning of time
			//with this workaround tries setting it back to pressed shaped in view
			//when you got better solution then please change it
			//@author Michaela Schlage
			if (this._oContextMenu && this._oContextMenu.getPopup().isOpen()) {
				var oDate = this.oGanttModel.getProperty("/settings/startTime"),
					oNewStartDate = _.clone(oDate),
					bGanttViewJumped = false;

				if (typeof mParams.type === "undefined" && typeof oDate === "string" && sStartTime !== oDate) {
					bGanttViewJumped = true;
					oNewStartDate = moment(oDate.slice(0, 8) + "T" + oDate.slice(8)).toDate();
				} else {
					oNewStartDate = sap.gantt.misc.Format.abapTimestampToDate(oNewStartDate);
				}

				if (this._bFirstTimeContextMenuOpen || bGanttViewJumped) {
					setTimeout(function () {
						this._changeGanttHorizonViewAt(this._axisTime.getZoomLevel(), this._axisTime, oNewStartDate);
						this._bFirstTimeContextMenuOpen = false;
					}.bind(this), 0);
				}
			} else {
				this.oGanttModel.setProperty("/settings", {
					startTime: mParams.currentVisibleHorizon.getStartTime(),
					endTime: mParams.currentVisibleHorizon.getEndTime()
				});
			}

			//resetting buttons due to Resource selection is resetted.
			if (!(this.selectedResources && this.selectedResources.length)) {
				this._resetToolbarButtons();
			}
		},

		/**
		 * On demand drop on gantt chart or resource
		 * @param oEvent
		 */
		onDemandDrop: function (oEvent) {
			var oDraggedControl = oEvent.getParameter("draggedControl"),
				oDroppedControl = oEvent.getParameter("droppedControl"),
				oBrowserEvent = oEvent.getParameter("browserEvent"),
				oDragContext = oDraggedControl ? oDraggedControl.getBindingContext() : undefined,
				oDropContext = oDroppedControl.getBindingContext("ganttModel"),
				oDropObject = oDropContext.getObject(),
				bAllowVendorAssignment = this.getModel().getProperty(oDragContext + "/ALLOW_ASSIGNMENT_DIALOG"),
				sOperationStartDate = this.getModel().getProperty(oDragContext + "/FIXED_ASSGN_START_DATE"),
				sOperationEndDate = this.getModel().getProperty(oDragContext + "/FIXED_ASSGN_END_DATE"),
				sToolDrag = this.localStorage.get("Evo-toolDrag"),
				aPSDemandsNetworkAssignment = this._showNetworkAssignments(this.oViewModel);
			this.onShowOperationTimes(this.oViewModel);
			this.onAllowVendorAssignment(this.oViewModel, this.oUserModel);

			if (sToolDrag === "Tools") {
				this.onToolDrop(oEvent);
			} else {
				//Allowing Demand Drop only on Non-Assignmnet Nodes   @Since 2205
				if (oDropObject.NodeType !== "ASSIGNMENT") {
					//Checking PS Demands for Network Assignment 
					if (this.oUserModel.getProperty("/ENABLE_NETWORK_ASSIGNMENT") && aPSDemandsNetworkAssignment.length !== 0) {
						this.getOwnerComponent().NetworkAssignment.open(this.getView(), oDropObject, aPSDemandsNetworkAssignment, this._mParameters,
							oDraggedControl,
							oDroppedControl, oBrowserEvent);
					}
					//Checking Vendor Assignment for External Resources
					else if (this.oUserModel.getProperty("/ENABLE_EXTERNAL_ASSIGN_DIALOG") && oDropObject.ISEXTERNAL && bAllowVendorAssignment) {
						this.getOwnerComponent().VendorAssignment.open(this.getView(), oDropContext.getPath(), this._mParameters, oDraggedControl,
							oDroppedControl, oBrowserEvent);
					} else {
						if (this.oUserModel.getProperty("/ENABLE_ASGN_DATE_VALIDATION") && sOperationStartDate !== null && sOperationEndDate !==
							null) {
							this.getOwnerComponent().OperationTimeCheck.open(this.getView(), {
								bFromNewGantt: true
							}, oDropContext.getPath(), oDraggedControl, oDroppedControl, oBrowserEvent);
						} else {
							this.onProceedNewGanttDemandDrop(oDraggedControl, oDroppedControl, oBrowserEvent);
						}
					}
				}
			}
		},

		/**
		 * method to handle assignment process after dropping demand and completed the initial checks
		 * @param oDraggedControl dragged demand object
		 * @param oDroppedControl object into which the dragged items are dropped 
		 * @param oBrowserEvent   'Event' parameter of occured Event  
		 */
		onProceedNewGanttDemandDrop: function (oDraggedControl, oDroppedControl, oBrowserEvent) {
			var oDragContext = oDraggedControl ? oDraggedControl.getBindingContext() : undefined,
				oDropContext = oDroppedControl.getBindingContext("ganttModel"),
				oResourceData = this.oGanttModel.getProperty(oDropContext.getPath()),
				sDefaultPool = this.getModel("user").getProperty("/DEFAULT_POOL_FUNCTION"),
				bShowFutureFixedAssignments = this.oUserModel.getProperty("/ENABLE_FIXED_APPT_FUTURE_DATE"),
				bShowFixedAppointmentDialog;

			if (oResourceData.NodeType === "RES_GROUP") { //When demand dropped on Resource group
				if (!this.isAssignable({
					data: oResourceData
				})) {
					return;
				} else {
					if (sDefaultPool == "RESOURCE") { //If deafult pool function is Resource change drop context
						oDropContext = this._handlePoolAssignment(oDropContext, oResourceData);
						oResourceData = this.getModel("ganttModel").getProperty(oDropContext.getPath());
					}
				}
			}

			var slocStor = JSON.parse(this.localStorage.get("Evo-Dmnd-guid")),
				sDragPath = oDragContext ? this.oViewModel.getProperty("/gantDragSession") : this._getDragPaths(slocStor),
				oAxisTime = this.byId("idPageGanttChartContainer").getAggregation("ganttCharts")[0].getAxisTime(),

				oSvgPoint,
				sPath = sDragPath ? sDragPath[0] : undefined,
				oDemandObj = this._getDemandObjectsByPath(this.oViewModel.getProperty("/gantDragSession"), slocStor),
				oParams = {};
			this.oViewModel.setProperty("/aFixedAppointmentsList", []);

			//Null check for
			if ((!oDragContext || !sDragPath) && !oDropContext) {
				return;
			}

			//retreive the demand object, passed from Gantt split in local storage
			if (!oDemandObj) {
				oDemandObj = this._convertDateToObjects(slocStor[0]);
			}

			// Check the resource assignable or not
			// TODO Resource needs to be validated if resource is assignable or not

			// to identify the action done on respective page
			this.localStorage.put("Evo-Action-page", "ganttSplit");

			oParams.oResourceData = oResourceData;
			oParams.sDragPath = sDragPath;
			oParams.oTarget = oDropContext.getPath();

			if (oBrowserEvent.target.tagName === "rect" && oDragContext) { // When we drop on gantt chart in the same view
				oSvgPoint = CoordinateUtils.getEventSVGPoint(oBrowserEvent.target.ownerSVGElement, oBrowserEvent);
				//Condition added and Method is modified for fixed Appointments			// since Release/2201
				oParams.DateFrom = oAxisTime.viewToTime(oSvgPoint.x);
				this._handleDemandDrop("Gantt", oParams, oDemandObj, sDragPath, oResourceData, oDropContext, oAxisTime.viewToTime(oSvgPoint.x));

			} else if (oBrowserEvent.target.tagName === "rect" && !oDragContext) { // When we drop on gantt chart from split window
				oSvgPoint = CoordinateUtils.getEventSVGPoint(oBrowserEvent.target.ownerSVGElement, oBrowserEvent);
				oParams.DateFrom = oAxisTime.viewToTime(oSvgPoint.x);
				this._handleDemandDrop("Gantt-Split", oParams, oDemandObj, sDragPath, oResourceData, oDropContext, oAxisTime.viewToTime(oSvgPoint.x));

			} else if (oDragContext) { // When we drop on the resource 
				oParams.DateFrom = new Date(new Date().setHours(0));
				this._handleDemandDrop("Gantt", oParams, oDemandObj, sDragPath, oResourceData, oDropContext, new Date());

			} else { // When we drop on the resource from split window
				oParams.DateFrom = new Date(new Date().setHours(0));
				bShowFixedAppointmentDialog = this._checkFixedAppointPopupToDisplay(bShowFutureFixedAssignments, oParams.DateFrom, oDemandObj);
				if (bShowFixedAppointmentDialog) {
					this.openFixedAppointmentDialog(oParams, "Gantt-Split");
				} else if (sDragPath && sDragPath.length > 1) {
					this._handleMultipleAssignment(oResourceData, sDragPath, oDropContext.getPath(), new Date(), []);
				} else {
					this._validateAndAssignDemands(oResourceData, null, oDropContext.getPath(), new Date(), sDragPath);
				}

			}
		},

		/**
		 * Assign new drop context if Demand dropped on Resource group and Pool is resource
		 */
		_handlePoolAssignment: function (oDropContext, oResourceData) {
			var iPoolRes = oResourceData.children.length - 1,
				sDropPath = oDropContext.getPath(),
				sNewDropPath;
			sNewDropPath = sDropPath + "/children/" + iPoolRes;
			oDropContext = this.getView().getModel("ganttModel").getContext(sNewDropPath);
			return oDropContext;
		},

		/**
		 * Preceed to assignment via Fixed assignment Dialog Event bus call
		 * @param 
		 */
		_proceedToAssign: function (sChannel, oEvent, oData) {
			if (oData.sDragPath || oData.aFixedAppointmentObjects) {
				this._handleMultipleAssignment(oData.oResourceData, oData.sDragPath, oData.oTarget, oData.oTargetDate, oData.aFixedAppointmentObjects);
			} else {
				this._validateAndAssignDemands(oData.oResourceData, null, oData.oTarget, oData.oTargetDate, oData.aGuids);
			}
		},

		/**
		 * When a shape is dragged inside Gantt
		 * and dropped to same row or another resource row
		 * @param oEvent
		 */
		onShapeDrop: function (oEvent) {
			if (this.aSelectedAssignmentsPaths.length > 1) {
				this._handleShapeDropMultiAssignment(oEvent);
			} else {
				this._handleShapeDropReAssignment(oEvent);
			}
		},

		/**
		 * When a shape is dragging started
		 * Need to keep all selected assignment path for future manipulation
		 * @param oEvent
		 */
		onShapeDragStart: function (oEvent) {
			var aShapeUids = oEvent.getSource().getSelectedShapeUid(),
				sPath;
			this.aSelectedAssignmentsPaths = [];

			aShapeUids.forEach(function (oItem) {
				sPath = oItem.split(":").pop();
				sPath = sPath.split("[")[0];
				this.aSelectedAssignmentsPaths.push(sPath);
			}.bind(this));
		},

		/**
		 * When shapes getting selected 
		 * based on number of selection changing the axis movement direction
		 * @param oEvent
		 */
		onShapeSelectionChange: function (oEvent) {
			var aSelectedShapes = oEvent.getSource().getSelectedShapeUid();
			if (aSelectedShapes.length === 1) {
				this._initializeMultiAssignment(true);
			} else {
				this._initializeMultiAssignment();
			}
		},

		/**
		 * when shape was resized 
		 * validate shape new dates and if change is allowed
		 * @param oEvent
		 */
		onShapeResize: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oRowContext = oParams.shape.getBindingContext("ganttModel"),
				sPath = oRowContext.getPath(),
				oShape = oParams.shape,
				oData = this.oGanttModel.getProperty(sPath),
				msg;

			if (oData.IS_PRT && oData.PRT_ASSIGNMENT_TYPE === "PRTDEMASGN") {
				msg = this.getResourceBundle().getText("msg.notPossible");
				this.showMessageToast(msg);
				return;
			}

			// to identify the action done on respective page
			this.localStorage.put("Evo-Action-page", "ganttSplit");
			this.oGanttModel.setProperty(sPath + "/DateFrom", oParams.newTime[0]);
			this.oGanttModel.setProperty(sPath + "/DateTo", oParams.newTime[1]);
			this.oGanttModel.setProperty(sPath + "/OldAssignPath", sPath.split("/AssignmentSet/results/")[0]);

			if (oShape && oShape.sParentAggregationName === "shapes3") {
				this._updateDraggedShape(sPath, this.mRequestTypes.resize);
			}
		},

		/**
		 * right click on shape will show context menu with possible actions
		 * @param oEvent
		 */
		onShapeContextMenu: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oShape = oParams.shape,
				oContext = oShape.getBindingContext("ganttModel");

			this.oTargetPath = oContext.sPath;
			if (oShape && oShape.sParentAggregationName === "shapes3") {
				if (!this._oContextMenu) {
					Fragment.load({
						name: "com.evorait.evoplan.view.gantt.fragments.ShapeContextMenu",
						controller: this
					}).then(function (oDialog) {
						this._oContextMenu = oDialog;
						this.getView().addDependent(this._oContextMenu);
						this._openContextMenu(oShape, oContext);
						this._bFirstTimeContextMenuOpen = true;
					}.bind(this));
				} else {
					this._openContextMenu(oShape, oContext);
				}
			}
		},

		/**
		 * on context menu item press
		 * read custom data from button
		 */
		handleMenuItemPress: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oSelectedItem = oParams.item,
				sPath = oEvent.getSource().data("Path"),
				sFunctionKey = oSelectedItem.data("Function"),
				sAsgnStsFnctnKey = oSelectedItem.data("StatusFunction"),
				sRelationshipKey = oSelectedItem.data("RELATIONSHIP"),
				oData = this.oGanttModel.getProperty(sPath),
				oAppModel = this.oAppViewModel,
				sDataModelPath = this._getAssignmentDataModelPath(oData.Guid),
				mParameters = {
					bFromNewGantt: true,
					sSourcePath: sPath,
					bCustomBusy: true
				},
				oShape = oEvent.getSource().getPopup()._oPosition.of,
				oContext = oShape.getBindingContext("ganttModel"),
				oRowContext = oShape.getParent().getParent().getBindingContext("ganttModel");
			//still needed?
			if (oAppModel.getProperty("/currentRoute") === "ganttSplit") {
				mParameters = {
					bFromNewGantt: false,
					bFromNewGanttSplit: true
				};
			}
			this.localStorage.put("Evo-Action-page", "ganttSplit");
			this.oGanttModel.setProperty(sPath + "/busy", true);
			//get demand details to assignment

			if (sFunctionKey) {
				//user status update
				this._oEventBus.publish("StatusSelectDialog", "changeStatusDemand", {
					selectedPaths: [{
						oData: {
							Guid: oData.DemandGuid
						}
					}],
					functionKey: sFunctionKey,
					parameters: mParameters
				});

			} else if (oSelectedItem.getText() === this.getResourceBundle().getText("xbut.buttonChange")) {
				//change assignment
				this.openAssignInfoDialog(this.getView(), sDataModelPath, oContext, mParameters, null);
			} else if (oSelectedItem.getText() === this.getResourceBundle().getText("xbut.buttonUnassign")) {
				//unassign
				if (oData.IS_PRT) {
					this.deletePRTAssignment(oData, this._mParameters);
				} else {
					this._deleteAssignment(this.getModel(), oData.Guid, sPath, this._oEventBus);
				}

			} else if (oSelectedItem.getText() === this.getResourceBundle().getText("xbut.buttonReassign")) {
				//reassign
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), true, [sDataModelPath], false, mParameters,
					oData.IS_PRT ? "ganttShapePRTReassignment" : "ganttShapeReassignment", oData.IS_PRT ? true : false);
			} else if (sRelationshipKey) {
				//Show Relationships
				if (sRelationshipKey === "SHOW") {
					this._showRelationships(sPath, oData);
				} else { //Hide Relationships
					this._hideRelationships(sPath);
				}
			} else if (sAsgnStsFnctnKey) {
				//Changing Assignment Status
				this._onContextMenuAssignmentStatusChange(sPath, oData, sAsgnStsFnctnKey);
			} else if (oSelectedItem.getText() === this.getResourceBundle().getText("xbut.showPlanningCal")) {
				// Open Planning Calendar
				var sMsg;
				if (oContext) {
					this.getOwnerComponent().planningCalendarDialog.open(this.getView(), [oRowContext.getPath()], mParameters, oShape.getTime());
				} else {
					sMsg = this.getResourceBundle().getText("notFoundContext");
					this.showMessageToast(sMsg);
				}
			}
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
		 * Adjusting Gantt Horizon as per the selected DateRange
		 * @Author Chethan RK
		 */
		onChangeDateRange: function (oEvent) {
			this.bGanttHorizonChange = true; //Setting Gantt Horizon Flag as true when Dates are changed
			this._createGanttHorizon(this._axisTime, this._axisTime.getZoomLevel(), {
				StartDate: this.getView().byId("idDateRangeGantt2").getDateValue(),
				EndDate: this.getView().byId("idDateRangeGantt2").getSecondDateValue()
			});
			if (oEvent) {
				this.oUserModel.setProperty("/DEFAULT_GANT_START_DATE", oEvent.getParameter("from"));
				this.oUserModel.setProperty("/DEFAULT_GANT_END_DATE", oEvent.getParameter("to"));
			}
			this._resetToolbarButtons();
			this._loadGanttData();
		},
		/**
		 * Opens the resource qualification dialog 
		 */
		onResourceIconPress: function (oEvent) {
			var oRow = oEvent.getSource().getParent(),
				oContext = oRow.getBindingContext("ganttModel"),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				oResourceNode = oModel.getProperty(sPath),
				sObjectId = oResourceNode.NodeId;

			if (oResourceNode.NodeType !== "ASSIGNMENT" && this.getModel("user").getProperty("/ENABLE_QUALIFICATION")) {
				this.getOwnerComponent().ResourceQualifications.open(this.getView(), sObjectId);
			}
		},
		/**
		 * Open's Dialog containing assignments to reassign
		 * @param oEvent
		 */
		onPressReassign: function (oEvent) {
			// to identify the action done on respective page
			this.localStorage.put("Evo-Action-page", "ganttSplit");
			this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, false, this._mParameters);
		},
		/**
		 * Open's Dialog containing assignments to unassign
		 * @param oEvent
		 */
		onPressUnassign: function (oEvent) {
			// to identify the action done on respective page
			this.localStorage.put("Evo-Action-page", "ganttSplit");
			this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, true, this._mParameters);
		},

		/**
		 * on click on today adjust the view of Gantt horizon.
		 */
		onPressToday: function (oEvent) {
			this.changeGanttHorizonViewAt(this.oViewModel, this._axisTime.getZoomLevel(), this._axisTime);
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
				sPath = parent.getBindingContext("ganttModel").getPath(),
				oParams = oEvent.getParameters();

			//Sets the property IsSelected manually
			this.oGanttModel.setProperty(sPath + "/IsSelected", oParams.selected);

			if (oParams.selected) {
				this.selectedResources.push(sPath);

			} else if (this.selectedResources.indexOf(sPath) >= 0) {
				//removing the path from this.selectedResources when user unselect the checkbox
				this.selectedResources.splice(this.selectedResources.indexOf(sPath), 1);
			}

			if (this.selectedResources.length > 0) {
				this.byId("idButtonreassign").setEnabled(true);
				this.byId("idButtonunassign").setEnabled(true);
				this.byId("idButtonTimeAllocNew").setEnabled(true);
			} else {
				this.byId("idButtonTimeAllocNew").setEnabled(false);
				this.byId("idButtonreassign").setEnabled(false);
				this.byId("idButtonunassign").setEnabled(false);
			}
			var oData = this.oGanttModel.getProperty(this.selectedResources[0]);

			if (this.selectedResources.length === 1 && oData && oData.NodeType === "RESOURCE" && oData.ResourceGuid !== "" && oData.ResourceGroupGuid !==
				"") {
				this.byId("idCalculateRoute").setEnabled(true);
				this.byId("idOptimizeRoute").setEnabled(true);
			} else {
				this.byId("idCalculateRoute").setEnabled(false);
				this.byId("idOptimizeRoute").setEnabled(false);
			}

			//validate resource tree is selected or not for Auto/Re-Schedule
			this.oViewModel.setProperty("/Scheduling/selectedResources", this.selectedResources);
			this.oSchedulingActions.validateScheduleButtons();
			this.oSchedulingActions.validateReScheduleButton();
		},

		/**
		 * get Conditional shape for unavailabilities
		 * and set color pattern for some unavailabilities
		 * @param sTypeGroup
		 * @param sType
		 * @param sColor
		 * @param sPattern
		 */
		getAvalablitiyConditionalShape: function (sTypeGroup, sType, sColor, sPattern) {
			this._setAvailabilitiesPatterns(sTypeGroup, sType, sColor, sPattern);
			if (sTypeGroup === "L") {
				return 1;
			} else {
				return 0;
			}
		},

		/**
		 * Format legend colors to differentiate between pattern and colors
		 * and set color pattern for some unavailabilities who was not part of availabilities
		 * @param sType
		 * @param sCharCode
		 * @param sCharValue
		 * @param sColor
		 * @return {*}
		 */
		formatLegend: function (sType, sCharCode, sCharValue, sColor) {
			this._setAvailabilitiesPatterns(sCharCode, sCharValue, sColor, sType);
			if (sType === "COLOUR") {
				return sColor;
			} else {
				return "url(#" + this._viewId + "--availability-" + sCharCode + "-" + sCharValue + ")";
			}
		},

		/**
		 * on press link of assignment in resource tree row
		 * get parent row path and bind this path to the dialog or showing assignment information
		 * @param oEvent
		 * @since 2205
		 */
		onPressAssignmentLink: function (oEvent) {
			var oSource = oEvent.getSource();
			this.assignmentRowContext = oSource.getParent().getBindingContext("ganttModel");
			if (this.assignmentRowContext) {
				if (!this.assignmentRowContext.getObject().AssignmentGuid) {
					this.assignmentRowContext.getObject().AssignmentGuid = this.assignmentRowContext.getObject().Guid;
				}
				this.assignmentPath = "/AssignmentSet('" + this.assignmentRowContext.getObject().AssignmentGuid + "')";
				//For PRT Assignments
				if (this.assignmentRowContext.getObject().IS_PRT) {
					this.openToolsInfoDialog(this.getView(), this.assignmentPath, this.assignmentRowContext, this._mParameters);
				} else {
					this.openAssignInfoDialog(this.getView(), this.assignmentPath, this.assignmentRowContext, this._mParameters);
				}
			} else {
				var msg = this.getResourceBundle().getText("notFoundContext");
				this.showMessageToast(msg);
			}
		},

		/**
		 * Set fill gradient for duplicate assignments
		 * @param sColor -> primary color of gradient (same as assignment color)
		 */
		fillGradient: function (sColor, bDuplicate) {
			if (!bDuplicate) {
				return sColor;
			}
			if (!this._oSVG) {
				this._oSVG = this.getView().byId("idGanttChartSvgDefs");
				this._aGradientSVGDef = [];
			}
			var sGradId = this._viewId + "--dupGradient-" + sColor.replace("#", '');
			if (this._aGradientSVGDef.indexOf(sGradId) < 0) {
				var oGrad = new LinearGradient(sGradId, {
					x2: "1.5",
					y2: "10",
					stops: [new Stop({
						offSet: "0%",
						stopColor: sColor || "#fff"
					}),
					new Stop({
						offSet: "10%",
						stopColor: "#FFFF"
					})
					]
				});
				this._oSVGDef.insertDef(oGrad);
				this._aGradientSVGDef.push(sGradId);
			}
			return "url(#" + sGradId + ")";
		},

		/**
		 * when we try to drop the tool on the resource.
		 * @param oEvent 
		 */
		onToolDrop: function (oEvent) {
			var oDraggedControl = oEvent.getParameter("draggedControl"),
				oDroppedControl = oEvent.getParameter("droppedControl"),
				oBrowserEvent = oEvent.getParameter("browserEvent"),
				oDragContext = oDraggedControl ? oDraggedControl.getBindingContext() : undefined,
				oDropContext = oDroppedControl.getBindingContext("ganttModel"),
				oDropObject = oDropContext.getObject();
			this._mParameters = {
				bFromGanttTools: true
			};
			if (oDropObject.OBJECT_SOURCE_TYPE === "DEM_PMNO") {
				this.showMessageToast(this.getResourceBundle().getText("ymsg.prtToNotifNA"));
				oEvent.preventDefault();
			} else if (oDropObject.NodeType !== "RES_GROUP") {
				this.onProceedGanttToolDrop(oDraggedControl, oDroppedControl, oBrowserEvent);
			}
		},

		/**
		 * this method is used to check and add validations on the 
		 * tools dropped on resource and call the resprctive service for the same.
		 * @param {object} oDraggedControl 
		 * @param {object} oDroppedControl 
		 * @param {object} oBrowserEvent 
		 */
		onProceedGanttToolDrop: function (oDraggedControl, oDroppedControl, oBrowserEvent) {
			var oDragContext = oDraggedControl ? oDraggedControl.getBindingContext() : undefined,
				oDropContext = oDroppedControl.getBindingContext("ganttModel"),
				oResourceData = this.oGanttModel.getProperty(oDropContext.getPath()),
				sTargetPath = oDropContext.getPath(),
				aSources = JSON.parse(this.localStorage.get("Evo-aPathsData")) || this.oViewModel.getProperty("/dragSession"),
				oAxisTime = this.byId("idPageGanttChartContainer").getAggregation("ganttCharts")[0].getAxisTime(),
				iDefNum = this.oViewModel.getProperty("/iDefToolAsgnDays"),
				oSvgPoint, oTargetDate, endDate;

			if (oBrowserEvent.target.tagName === "rect" && oDragContext) { // When we drop on gantt chart in the same view
				oSvgPoint = CoordinateUtils.getEventSVGPoint(oBrowserEvent.target.ownerSVGElement, oBrowserEvent);
				oTargetDate = oAxisTime.viewToTime(oSvgPoint.x);
			} else if (oBrowserEvent.target.tagName === "rect" && !oDragContext) { // When we drop on gantt chart from split window
				oSvgPoint = CoordinateUtils.getEventSVGPoint(oBrowserEvent.target.ownerSVGElement, oBrowserEvent);
				oTargetDate = oAxisTime.viewToTime(oSvgPoint.x);
			} else if (oDragContext) { // When we drop on the resource 
				oTargetDate = new Date();
			} else { // When we drop on the resource from split window
				oTargetDate = new Date();
			}
			endDate = _.cloneDeep(oTargetDate);
			endDate.setDate(oTargetDate.getDate() + parseInt(iDefNum));
			this.oViewModel.setProperty("/PRT/defaultStartDate", oTargetDate);
			this.oViewModel.setProperty("/PRT/defaultEndDate", new Date(endDate));
			this.checksBeforeAssignTools(aSources, oResourceData, this._mParameters, sTargetPath);
		},

		/**
		 * to calculate travel time between assignment after auto schedul
		 */
		calculateTimeAfterScheduling: function () {
			var oTourReports = this.oViewModel.getProperty("/Scheduling/PTVResponse/tourReports"),
				oTourEvents,
				sResourceGuid,
				oStartDate,
				oEndDate,
				aTravelTimes = {};

			for (var i in oTourReports) {
				oTourEvents = oTourReports[i].tourEvents;
				sResourceGuid = oTourReports[i].vehicleId.substring(0, 32);
				aTravelTimes[sResourceGuid] = aTravelTimes[sResourceGuid] || [];
				for (var j in oTourEvents) {
					if (oTourEvents[j].eventTypes[0] === "DRIVING") {
						oStartDate = new Date(oTourEvents[j].startTime);
						oEndDate = new Date(oStartDate.getTime() + oTourEvents[j].duration * 1000);

						aTravelTimes[sResourceGuid].push({
							DateFrom: oStartDate,
							DateTo: oEndDate,
							Description: "Travel Time",
							Effort: (oTourEvents[j].duration / 3600).toFixed(2),
							TRAVEL_TIME: oTourEvents[j].duration
						});
					}
				}
			}
			this.oViewModel.setProperty("/ganttSettings/TravelTimes", aTravelTimes);
		},
		/* =========================================================== */
		/* Private methods                                             */
		/* =========================================================== */

		/**
		 * Initialize the fetch of data for Gantt chart
		 * 
		 */
		_initializeGantt: function () {
			this.oGanttModel = this.getView().getModel("ganttModel");
			this.oGanttOriginDataModel = this.getView().getModel("ganttOriginalData");

			this.oViewModel.setProperty("/ganttSelectionPane", "28%");
			this.oGanttModel.setSizeLimit(999999999);
			this.oGanttOriginDataModel.setSizeLimit(999999999);
			if (this.oGanttModel.getProperty("/data/children").length === 0) {
				this._loadGanttData();
			} else {
				this._addAssociations.bind(this)();
			}
			this._setGanttBgColor();

			// when navigating from Maps to Gantt 
			// onShowAssignments button click from the Resource Pin popover
			// apply the selected resource filter in the gantt view
			this._handleNavigationFromMap();

			this._resetSelections();
			//resetting buttons due to Resource selection is resetted.	
			this._resetToolbarButtons();
		},

		/**
		 * to reset buttons when navigate from Map or reset the selection of resources
		 */
		_resetToolbarButtons: function () {
			this.selectedResources = [];
			this.oViewModel.setProperty("/Scheduling/aSelectedResources", []);
			this.byId("idButtonreassign").setEnabled(false);
			this.byId("idButtonunassign").setEnabled(false);
			this.byId("idButtonTimeAllocNew").setEnabled(false);
			this.byId("idCalculateRoute").setEnabled(false);
			this.byId("idOptimizeRoute").setEnabled(false);

			//validate resource tree is selected or not for Auto/Re-Schedule
			this.oSchedulingActions.resetResourceForScheduling();
		},

		/**
		 * Preceed to assignment via Fixed assignment Dialog Event bus call
		 * @param 
		 */
		_proceedToAssign: function (sChannel, oEvent, oData) {
			if (oData.sDragPath || oData.aFixedAppointmentObjects) {
				this._handleMultipleAssignment(oData.oResourceData, oData.sDragPath, oData.oTarget, oData.oTargetDate, oData.aFixedAppointmentObjects);
			} else {
				this._validateAndAssignDemands(oData.oResourceData, null, oData.oTarget, oData.oTargetDate, oData.aGuids);
			}
		},
		/**
		 * method to handle shape Drop When a shape is dragged inside Gantt on same axis
		 * and dropped to same row or another resource row
		 * @param oEvent
		 */
		_handleShapeDropMultiAssignment: function (oEvent) {
			var oDataModel = this._treeTable.getModel("data"),
				oNewDateTime = oEvent.getParameter("newDateTime"),
				oDraggedShapeDates = oEvent.getParameter("draggedShapeDates"),
				sLastDraggedShapeUid = oEvent.getParameter("lastDraggedShapeUid"),
				oOldStartDateTime = oDraggedShapeDates[sLastDraggedShapeUid].time,
				oOldEndDateTime = oDraggedShapeDates[sLastDraggedShapeUid].endTime,
				iMoveWidthInMs = oNewDateTime.getTime() - oOldStartDateTime.getTime();

			this._updateAssignmentsDateTime(iMoveWidthInMs);
		},

		/**
		 * update new date time to dropped multiple assigments on same axis
		 * @param nTimeDifference
		 */
		_updateAssignmentsDateTime: function (nTimeDifference) {
			var bAllowFixedAppointments = this.oUserModel.getProperty("/ENABLE_GANTT_CHNG_FIXED_ASGN"),
				aAssignments = [],
				aPathsToBeRemoved = [],
				aUpdateAssignments = [],
				oAssignmentData,
				oParams;

			for (var i = 0; i < this.aSelectedAssignmentsPaths.length; i++) {
				oAssignmentData = this.oGanttModel.getProperty(this.aSelectedAssignmentsPaths[i]);
				// condition to check if assignment is FIXED APPOINTMENT and is allowed to change 
				if (!oAssignmentData.FIXED_APPOINTMENT || (oAssignmentData.FIXED_APPOINTMENT && bAllowFixedAppointments)) {
					aAssignments.push(oAssignmentData);
					oParams = this._getAssignmentParams(oAssignmentData, nTimeDifference);
					aUpdateAssignments.push(this.executeFunctionImport(this.getModel(), oParams, "UpdateAssignment", "POST"));
				} else {
					aPathsToBeRemoved.push(this.aSelectedAssignmentsPaths[i]);
				}
			}

			//removing assignments that are not movable
			for (var i = 0; i < aPathsToBeRemoved.length; i++) {
				this.aSelectedAssignmentsPaths.splice(aPathsToBeRemoved.indexOf(aPathsToBeRemoved[i]), 1);
			}

			//Calling "Update" function import to update date/time to backend
			this.oAppViewModel.setProperty("/busy", true);
			Promise.all(aUpdateAssignments).then(function (aPromiseAllResults) {
				this.oAppViewModel.setProperty("/busy", false);
				//method to update assignments in local json model
				this._updateResourceAssignments(aPromiseAllResults);
			}.bind(this));
		},
		/**
		 * to check if any Assignment falls in unavailability after multiassignment on same axis
		 * @param aAssignments
		 * since 2209
		 */
		_checkAssignmentsOnUnavailabilty: function (aAssignments) {
			var oModel = this.getModel();
			this.aUnavailabilityChecks = [];

			for (var i = 0; i < aAssignments.length; i++) {
				this.aUnavailabilityChecks.push(new Promise(function (resolve, reject) {
					this.executeFunctionImport(oModel, {
						ResourceGuid: aAssignments[i].ResourceGuid,
						StartTimestamp: aAssignments[i].DateFrom,
						EndTimestamp: aAssignments[i].DateTo,
						DemandGuid: aAssignments[i].DemandGuid,
						UnavailabilityCheck: true
					}, "ResourceAvailabilityCheck", "GET").then(function (data, oResponse) {
						resolve(data.Unavailable);
					}.bind(this));
				}.bind(this)));

			}

			this.oAppViewModel.setProperty("/busy", true);
			Promise.all(this.aUnavailabilityChecks).then(function (aPromiseAllResults) {
				this.oAppViewModel.setProperty("/busy", false);
				if (aPromiseAllResults.includes(true)) {
					this._showMessageForUnAvailability(aAssignments, aPromiseAllResults);
				}
			}.bind(this));
		},

		/**
		 * Display message for Assignment falls in unavailability after multiassignment on same axis
		 * @param oEvent
		 * since 2209
		 */
		_showMessageForUnAvailability: function (aAssignments, aUnavailableList) {
			var sMsgItem = "",
				item = {},
				iCounter = 0,
				aCheckGuids = [];

			for (var i = 0; i < aUnavailableList.length; i++) {
				if (aUnavailableList[i] && !aCheckGuids.includes(aAssignments[i].Guid)) {
					if (aAssignments[i].ORDERID) {
						sMsgItem = sMsgItem + aAssignments[i].ORDERID + " / " + aAssignments[i].OPERATIONID + "  " + aAssignments[i].DemandDesc +
							"\r\n";
					} else {
						sMsgItem = sMsgItem + aAssignments[i].NOTIFICATION + "  " + aAssignments[i].DemandDesc + "\r\n";
					}
					aCheckGuids.push(aAssignments[i].Guid);
					iCounter++;
				}
			}
			if (sMsgItem) {
				item.type = "Information";
				item.description = sMsgItem;
				item.subtitle = sMsgItem;
				item.title = this.getModel("i18n").getResourceBundle().getText("xmsg.assignedToUnavailability");
				item.counter = iCounter;
				this.getModel("MessageModel").setData([item]);
				sap.m.MessageToast.show(item.title + "\r\n" + item.subtitle, {
					duration: 6000
				});
			}
		},
		/**
		 * method to handle shape Drop When a shape is dragged inside Gantt to reassign
		 * and dropped to same row or another resource row
		 * @param oEvent
		 */
		_handleShapeDropReAssignment: function (oEvent) {
			var oParams = oEvent.getParameters(),
				msg = this.getResourceBundle().getText("msg.ganttShapeDropError"),
				oUserModel = this.getModel("user"),
				oTargetContext = oParams.targetRow ? oParams.targetRow.getBindingContext("ganttModel") : null;

			if (!oTargetContext && !oParams.targetShape) {
				this.showMessageToast(msg);
				return;
			}
			if (!oTargetContext) {
				oTargetContext = oParams.targetShape.getParent().getParent().getBindingContext("ganttModel");
			}
			//get target data
			var oTargetData = oTargetContext ? oTargetContext.getObject() : null;
			// If you drop in empty gantt area where there is no data OR assign is not allowed
			if (!oTargetData || !this.isAssignable({
				data: oTargetData
			})) {
				this.showMessageToast(msg);
				return;
			}

			// to identify the action done on respective page
			this.localStorage.put("Evo-Action-page", "ganttSplit");
			msg = this.getResourceBundle().getText("msg.notPossible");
			//could be multiple shape pathes
			for (var key in oParams.draggedShapeDates) {
				var sNewPath, bSameResourcePath,
					sSourcePath = Utility.parseUid(key).shapeDataName,
					sTargetPath = oTargetContext.getPath(),
					oSourceData = this.oGanttModel.getProperty(sSourcePath),
					sRequestType = oSourceData.ObjectId !== oTargetData.NodeId ? this.mRequestTypes.reassign : this.mRequestTypes.update,
					bSameResourcePath = sTargetPath.split("/").splice(0, 6).join("/") === sSourcePath.split("/").splice(0, 6).join("/");;
				if (oSourceData.PRT_ASSIGNMENT_TYPE === "PRTDEMASGN") { // Reassigning PRT deanmd assignemnt is restricted
					this.showMessageToast(msg);
					return;
				}
				//Allowing Assignment Shape Drop Only on Resource Nodes when dragged from different resources
				if (oTargetContext.getObject().NodeType === "RESOURCE" || bSameResourcePath) {
					// Here we check below of the source is PR or not.
					if (oSourceData.IS_PRT) {
						var oDraggedShapeData = oParams.draggedShapeDates[key]
						if (oDraggedShapeData) {
							var iDefNum = this.oViewModel.getProperty("/iDefToolAsgnDays"),
								oSourceDataDateFrom = oParams.newDateTime,
								oSourceDataDateTo = _.cloneDeep(oSourceDataDateFrom);
							oSourceDataDateTo.setDate(oSourceDataDateFrom.getDate() + parseInt(iDefNum));
						}
						// Assigning the To and From time to the dialog box model.
						this.oViewModel.setProperty("/PRT/defaultStartDate", oSourceDataDateFrom);
						this.oViewModel.setProperty("/PRT/defaultEndDate", oSourceDataDateTo);

						if (oUserModel.getProperty("/ENABLE_TOOL_ASGN_DIALOG")) {
							var mParameters = {
								bFromGanttToolReassign: true,
								sSourcePath: sSourcePath,
								sTargetPath: sTargetPath,
								draggedShapeDates: oParams.draggedShapeDates[key],
								oParams: oParams,
								sRequestType: sRequestType
							};
							this.openDateSelectionDialog(this.getView(), null, null, mParameters);
						} else {
							sNewPath = this._setNewShapeDropData(sSourcePath, sTargetPath, oParams.draggedShapeDates[key], oParams);
							this._updateDraggedShape(sNewPath, sRequestType, sSourcePath);
						}
					} else {
						//set new time and resource data to gantt model, setting also new pathes
						sNewPath = this._setNewShapeDropData(sSourcePath, sTargetPath, oParams.draggedShapeDates[key], oParams);
						this._updateDraggedShape(sNewPath, sRequestType, sSourcePath);
					}

				} else if (oTargetContext.getObject().NodeType === "ASSIGNMENT" || !oTargetContext.getObject().ResourceGuid) { // Reassigning PRT resource assignment to Demand assignment or PRT resource not allowed
					this.showMessageToast(msg);
				}
			}
		},
		/**
		 * method to handle shape drop When a shape for Tool is dragged inside Gantt to reassign
		 * and dropped to same row or another resource row
		 * @param sChannel {string}
		 * @param sEvent {string}
		 * @param mParam1 {oBject}
		 */
		_onToolReassignGantt: function (sChannel, sEvent, mParam1) {
			var sNewPath = this._setNewShapeDropData(mParam1.sSourcePath, mParam1.sTargetPath, mParam1.draggedShapeDates, mParam1.oParams);
			this._updateDraggedShape(sNewPath, mParam1.sRequestType, mParam1.sSourcePath);
		},
		/**
		 * set background color of Gantt by dynamic adding style sheet rule
		 * https://developer.mozilla.org/en-US/docs/Web/API/CSSRuleList
		 */
		_setGanttBgColor: function () {
			var styleEl = document.createElement('style');
			// Append <style> element to <head>
			document.head.appendChild(styleEl);
			// Grab style element's sheet
			var styleSheet = styleEl.sheet,
				bgColor = this.oUserModel.getProperty("/DEFAULT_GANTT_BG_COLOR");
			styleSheet.insertRule(".resourceGanttWithTable .sapGanttBackground .sapGanttBackgroundSVG {background: " + bgColor +
				" !important}", 0);
		},

		/**
		 * set onShapeDrop data to new target
		 * @param {String} sSourcePath - source oGanttModel path
		 * @param {Object} oTargetPath - target oGanttModel path
		 * @param {Object} oDraggedShapeData - data from one dragged shape
		 * @param {Object} oParams - onShapeDrop parameters
		 */
		_setNewShapeDropData: function (sSourcePath, sTargetPath, oDraggedShapeData, oParams) {
			var oSourceData = this.oGanttModel.getProperty(sSourcePath),
				oTargetData = this.oGanttModel.getProperty(sTargetPath);

			if (oDraggedShapeData) {
				var oSourceStartDate = moment(oDraggedShapeData.time),
					oSourceEndDate = moment(oDraggedShapeData.endTime),
					duration = oSourceEndDate.diff(oSourceStartDate, "seconds"),
					newEndDate = moment(oParams.newDateTime).add(duration, "seconds");
				if (oSourceData.IS_PRT) {
					oSourceData.DateFrom = this.oViewModel.getProperty("/PRT/defaultStartDate");
					oSourceData.DateTo = this.oViewModel.getProperty("/PRT/defaultEndDate");
				} else {
					oSourceData.DateFrom = oParams.newDateTime;
					oSourceData.DateTo = newEndDate.toDate();
				}
			}
			/*	Checking if the source is PRT so that the end date can be assigned based on the 
				iDefToolAsgnDays flag*/

			oSourceData.sSourcePath = sSourcePath;
			oSourceData.sPath = sSourcePath;
			oSourceData.OldAssignPath = sSourcePath.split("/AssignmentSet/results/")[0];

			//when shape has a new parent
			if (oTargetData.ResourceGuid !== oSourceData.ResourceGuid) {
				oSourceData = _.cloneDeep(oSourceData);
				oSourceData.ResourceGuid = oTargetData.ResourceGuid;
				oSourceData.ResourceGroupGuid = oTargetData.ResourceGroupGuid;
				oSourceData.NewAssignPath = sTargetPath;

				this.oGanttModel.setProperty(sSourcePath, null);
				//move assignment to new parent in Gantt view
				var aTargetAssignments = this.oGanttModel.getProperty(sTargetPath + "/AssignmentSet/results");
				aTargetAssignments.push(oSourceData);
				oSourceData.sPath = sTargetPath + "/AssignmentSet/results/" + (aTargetAssignments.length - 1);
				this.oGanttModel.setProperty(sTargetPath + "/AssignmentSet/results", aTargetAssignments);
			}
			return oSourceData.sPath;
		},

		/**
		 * reassign a demand to a new resource by context menu
		 * @param {String} sChannel
		 * @param {String} sEvent
		 * @param {Object} oData
		 * @private
		 */
		_reassignShape: function (sChannel, sEvent, oData) {
			if (sChannel === "AssignTreeDialog" && sEvent === "ganttShapeReassignment") {
				for (var i = 0; i < oData.aSourcePaths.length; i++) {
					var oTargetData = this.getModel().getProperty(oData.sAssignPath),
						sGanttPath = oData.parameters.sSourcePath,
						sTargetPath = this._getGanttModelPathByProperty("NodeId", oTargetData.NodeId, null);
					if (sTargetPath) {
						var sNewPath = this._setNewShapeDropData(sGanttPath, sTargetPath, null, {});
						this._updateDraggedShape(sNewPath, this.mRequestTypes.resize);
					}
				}
			}
		},
		/**
		 * reassign a PRT assignment to a new resource by context menu
		 * @param {String} sChannel
		 * @param {String} sEvent
		 * @param {Object} oData
		 * @private
		 */
		_reassignPRTShape: function (sChannel, sEvent, oData) {
			if (sChannel === "AssignTreeDialog" && sEvent === "ganttShapePRTReassignment") {
				for (var i = 0; i < oData.aSourcePaths.length; i++) {
					var oTargetData = this.getModel().getProperty(oData.sAssignPath),
						sPRTShapePath = oData.parameters.sSourcePath,
						oPRTShapeData = this.oGanttModel.getProperty(sPRTShapePath),
						sCurrentResourcePath = sPRTShapePath.split("/").splice(0, 6).join("/"),
						sTargetResourcePath = this._getGanttModelPathByProperty("NodeId", oTargetData.NodeId, null),
						oParams, oDateParams;

					oPRTShapeData.ResourceGroupGuid = oTargetData.ResourceGroupGuid;
					oPRTShapeData.ResourceGuid = oTargetData.ResourceGuid;
					this.oViewModel.setProperty("/PRT/AssignmentData", oPRTShapeData);
					oParams = this._getParams();
					oDateParams = this.getPRTDateParams(oPRTShapeData);
					if (oTargetData.NodeType === "ASSIGNMENT") {
						oParams.DateFrom = oTargetData.StartDate;
						oParams.DateTo = oTargetData.EndDate;
						oParams.TimeFrom = oTargetData.StartTime;
						oParams.TimeTo = oTargetData.EndTime;
						oParams.DemandGuid = oTargetData.DemandGuid;
						this.executeFunctionImport(this.getModel(), oParams, "ChangeToolAssignment", "POST").then(function () {
							this._refreshChangedResources(sTargetResourcePath, sCurrentResourcePath);
						}.bind(this));
					} else if (this.oUserModel.getProperty("/ENABLE_TOOL_ASGN_DIALOG")) {
						this.openDateSelectionDialog(this.getView(), oDateParams, oPRTShapeData, this._mParameters, true, {
							sCurrentResourcePath: sCurrentResourcePath,
							sTargetResourcePath: sTargetResourcePath
						});
					} else {
						oParams.DateFrom = oDateParams.DateFrom;
						oParams.DateTo = oDateParams.DateTo;
						oParams.TimeFrom = oDateParams.TimeFrom;
						oParams.TimeTo = oDateParams.TimeTo;
						this.executeFunctionImport(this.getModel(), oParams, "ChangeToolAssignment", "POST").then(function () {
							this._refreshChangedResources(sTargetResourcePath, sCurrentResourcePath);
						}.bind(this));
					}

				}
			}
		},

		/**
		 * Recursive method for children check of gantt model
		 * get path from gantt model by a special property, could be NodeId or ResourceGroup 
		 * @param {String} sProperty - property name
		 * @param {String} sValue - property value
		 * @param {String} sPath - recursive path for children check
		 */
		_getGanttModelPathByProperty: function (sProperty, sValue, sPath) {
			sPath = sPath || "/data/children";
			var aChildren = this.oGanttModel.getProperty(sPath);
			for (var i = 0; i < aChildren.length; i++) {
				if (aChildren[i][sProperty] === sValue) {
					sPath += "/" + i;
					return sPath;
				} else if (aChildren[i].children && aChildren[i].children.length > 0) {
					var sNewPath = this._getGanttModelPathByProperty(sProperty, sValue, sPath + "/" + i + "/children");
					if (sNewPath) {
						return sNewPath;
					}
				}
			}
			return null;
		},

		/**
		 * open context menu of shape
		 * @param {Object} oShape - shape control
		 * @param {Object} oContext - context bound to shape
		 */
		_openContextMenu: function (oShape, oContext) {
			var oData = oContext.getObject(),
				sPath = oContext.getPath(),
				bEnableRelationships = false;
			//Enabling Relationships for only Demand Assignments
			if (this.oUserModel.getProperty("/ENABLE_NETWORK_ASSIGN_GANTT") && sPath.length > 60 && !oData.IS_PRT) {
				bEnableRelationships = true;
			}
			if (oData.DEMAND_STATUS !== "COMP") {
				this._getRelatedDemandData(oData).then(function (oResult) {
					oData.sPath = oContext.getPath();
					this.oGanttModel.setProperty(oData.sPath + "/Demand", oResult.Demand);
					this.oViewModel.setProperty("/ganttSettings/shapeData", oData);
					this.oViewModel.setProperty("/ganttSettings/Enable_Relationships", bEnableRelationships);
					this._oContextMenu.open(true, oShape, Popup.Dock.BeginTop, Popup.Dock.EndBottom, oShape);
				}.bind(this));
			}
		},

		/**
		 * when shape was dragged or resized to another place
		 * update assignment
		 * @param {String} sPath
		 * @param {String} sRequestType
		 * @param {String} sSourcePath
		 */
		_updateDraggedShape: function (sPath, sRequestType, sSourcePath) {
			this.oGanttModel.setProperty(sPath + "/busy", true);
			var oData = this.oGanttModel.getProperty(sPath),
				oOriginalData = this.oGanttModel.getProperty(sPath);
			//get demand details to this assignment

			if (oData.IS_PRT) { // PRT reassignmnet
				this.oViewModel.setProperty("/PRT/AssignmentData", oData);
				this.onChangeTools().then(function (resolve) {
					this._refreshChangedResources(sPath, sSourcePath);
				}.bind(this), function (reject) {
					this._resetChanges(sPath);
				}.bind(this));
			} else { // Demand update
				this._getRelatedDemandData(oData).then(function (oResult) {
					this.oGanttModel.setProperty(sPath + "/Demand", oResult.Demand);
					return this._validateAndSendChangedData(sPath, sRequestType);
				}.bind(this), function (oError) {
					this.oGanttModel.setProperty(sPath + "/busy", false);
					this._resetChanges(sPath);
					this._refreshChangedResources(sPath);
				}.bind(this)).then(function (aData) {
					// these events
					this._oEventBus.publish("BaseController", "refreshCapacity", {
						sTargetPath: sPath.split("/AssignmentSet/results/")[0]
					});
					if (sSourcePath) {
						this._oEventBus.publish("BaseController", "refreshCapacity", {
							sTargetPath: sSourcePath.split("/AssignmentSet/results/")[0]
						});
					}

					if (sRequestType === "reassign") {
						//method call for updating resource assignment in case of single reassignment
						this._refreshChangedResources(sPath, sSourcePath);
						this._oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
					} else {
						//method call for updating resource assignment in case of Multi Assignment in same axis
						this._refreshChangedResources(sPath);
					}

					// in case of gantt shape drag from POOL to RESOURCE 
					// on successful call of CreateSplitStretchAssignments the response contains the array of split assignments
					// add those to the gantt view
					if (aData && aData.results && aData.results.length > 0) {
						var aCreatedAssignments = this._getCreatedAssignments(aData.results);
						if (aCreatedAssignments.length > 0) {
							this._addCreatedAssignment(aCreatedAssignments, sPath.split("/AssignmentSet/results/")[0]);
						}
					}
				}.bind(this), function () {
					//on reject validation or user don't want proceed
					this.oGanttModel.setProperty(sPath + "/busy", false);
					this._resetChanges(sPath);
					if (sRequestType !== "reassign") {
						this._refreshChangedResources(sPath);
					}
				}.bind(this));
			}
		},

		/**
		 * set changed values in another object with object path
		 * check every property value if it not same as original data
		 * and set it in a different object in ganttModel /pendingChanges
		 * @param sPath Json model path
		 * @param sType from this._mRequestTypes
		 */
		_updatePendingChanges: function (sPath, sType) {
			var oData = this.oGanttModel.getProperty(sPath),
				oOriginData = this.oGanttOriginDataModel.getProperty(sPath),
				oPendingChanges = this.oGanttModel.getProperty("/pendingChanges"),
				oUpdateObj = oPendingChanges[sPath];
			//is thre already some changed data for this path?
			if (!oUpdateObj) {
				oPendingChanges[sPath] = {};
			}
			if (!oOriginData) {
				oOriginData = this.oGanttOriginDataModel.getProperty(oData.sSourcePath);
			}
			//check every property value if it not same as original data
			for (var key in oData) {
				if (oOriginData[key] !== oData[key] && !oData[key].hasOwnProperty("__deferred") && !oData[key].hasOwnProperty("__metadata")) {
					//date needs special validation
					if (oData[key] instanceof Date) {
						var d1 = new Date(oOriginData[key]),
							d2 = new Date(oData[key]);
						if (d1.getTime() !== d2.getTime()) {
							oPendingChanges[sPath][key] = oData[key];
						}
					} else {
						oPendingChanges[sPath][key] = oData[key];
					}
				}
			}
			return oPendingChanges;
		},

		/**
		 * validate assignment changes
		 * and save it to backend
		 * @param {String} sPath ganttModel item path
		 * @param {String} sType from this._mRequestTypes
		 * @return {Promise} 
		 */
		_validateAndSendChangedData: function (sPath, sType) {
			return new Promise(function (resolve, reject) {
				var oPendingChanges = this._updatePendingChanges(sPath, sType),
					oData = this.oGanttModel.getProperty(sPath);

				var bSplitGlobalConfigEnabled = this.getModel("user").getProperty("/ENABLE_SPLIT_STRETCH_ASSIGN");

				this._validateChangedData(sPath, oPendingChanges[sPath], oData, sType).then(function (results) {
					if (this.oUserModel.getProperty("/ENABLE_QUALIFICATION")) {
						//when user wants proceed check qualification
						return this.checkQualificationForChangedShapes(sPath, oPendingChanges[sPath], oData);
					}
				}.bind(this)).then(function () {
					// in the case of gantt shape drag from POOL to RESOURCE cal the split checks
					// checks if the demand duration is more than the resource availablity
					if (bSplitGlobalConfigEnabled && oData.STATUS === "POOL") {
						this._proceedWithSplitOnReAssign(sPath, sType, oPendingChanges, oData, "RESOURCE").then(resolve, reject);
					} else {
						this._proceedWithUpdateAssignment(sPath, sType, oPendingChanges, oData).then(resolve, reject);
					}
				}.bind(this)).catch(function () {
					reject();
				}.bind(this));
			}.bind(this));
		},

		/**
		 * After qualification check make update of assignment
		 * @param {Object} sPath
		 * @param {Object} sType
		 * @param {Object} oPendingChanges
		 * @param {Object} oData
		 */
		_proceedWithUpdateAssignment: function (sPath, sType, oPendingChanges, oData) {
			return new Promise(function (resolve, reject) {
				var oParams = {
					DateFrom: oData.DateFrom || 0,
					TimeFrom: {
						__edmtype: "Edm.Time",
						ms: oData.DateFrom.getTime()
					},
					DateTo: oData.DateTo || 0,
					TimeTo: {
						__edmtype: "Edm.Time",
						ms: oData.DateTo.getTime()
					},
					AssignmentGUID: oData.Guid,
					EffortUnit: oData.EffortUnit,
					Effort: oData.Effort,
					ResourceGroupGuid: oData.ResourceGroupGuid,
					ResourceGuid: oData.ResourceGuid
				};

				//If assignment is duplicate then send the resource group id of original assignment
				if (oData.DUPLICATE_ASSIGNMENT_FLAG) {
					oParams.ResourceGroupGuid = oData.ORIGINAL_RESGRP_GUID;
				}

				//has new parent?
				if (this.mRequestTypes.reassign === sType && oPendingChanges[sPath].ResourceGuid) {
					oParams.ResourceGroupGuid = oData.ResourceGroupGuid;
					oParams.ResourceGuid = oData.ResourceGuid;
				}
				//save assignment data
				this._updateAssignment(this.getModel(), oParams).then(
					function (oResData) {
						if (oResData) {
							if (this.mRequestTypes.reassign) {
								this.oGanttOriginDataModel.setProperty(oData.sSourcePath, null);
							}
							this.oGanttOriginDataModel.setProperty(sPath, _.cloneDeep(oResData));
							this._resetChanges(sPath);
						}
						this.oGanttModel.setProperty(sPath + "/busy", false);
						resolve(oResData);
					}.bind(this),
					function (oError) {
						this.oGanttModel.setProperty(sPath + "/busy", false);
						this._resetChanges(sPath);
						reject(oError);
					}.bind(this));
			}.bind(this));
		},

		/**
		 * checks if changes of this assignment allowed to save
		 * when its re-assignment is parent available and allowed to assign
		 * @param {String} sPath contains the path
		 * @param {Object} oChanges only changed data
		 * @param {Object} oData whole assignment data
		 * @param {String} sType from this._mRequestTypes
		 */
		_validateChangedData: function (sPath, oChanges, oData, sType) {
			return new Promise(function (resolve, reject) {
				var sDisplayMessage = "";
				//when shape was resized
				if (sType === this.mRequestTypes.resize) {
					resolve(this._validateShapeOnResize(oData).then(function (resolve1, reject) {
						if (resolve1) {
							return true;
						} else {
							reject();
						}
					}.bind(this)));
				}

				//is re-assign allowed
				if (this.mRequestTypes.reassign === sType && !oData.Demand.ALLOW_REASSIGN) {
					sDisplayMessage = this.getResourceBundle().getText("reAssignFailMsg");
					this._showAssignErrorDialog([this.getMessageDescWithOrderID(oData, oData.Description)], null, sDisplayMessage);
					this._resetChanges(sPath);
					reject();
				}
				//has it a new parent
				if (this.mRequestTypes.reassign === sType && oChanges.ResourceGuid) {
					var oNewParent = this.oGanttModel.getProperty(oChanges.NewAssignPath);
					if (!this.isAssignable({
						data: oNewParent
					})) {
						return reject("Parent not assignable");
					} else if (!this.isAvailable(null, oNewParent)) {
						//is parent not available then show warning and ask if they want proceed
						resolve(this.showMessageToProceed().then(function (resolve, reject) {
							if (resolve) {
								return true;
							} else {
								reject();
							}
						}));
					} else {
						resolve(true);
					}
				} else {
					resolve(true);
				}
			}.bind(this));
		},

		/**
		 * validate shape data on resize
		 * @param {Object} oData
		 * @return Promise
		 */
		_validateShapeOnResize: function (oData) {
			return new Promise(function (resolve, reject) {
				var iDifference = moment(oData.DateTo).diff(moment(oData.DateFrom)),
					iNewEffort = ((iDifference / 1000) / 60) / 60,
					bEnableResizeEffortCheck = this.oUserModel.getProperty("/ENABLE_RESIZE_EFFORT_CHECK");
				if (!oData.Demand.ASGNMNT_CHANGE_ALLOWED) {
					reject();
				}
				//resized effort needs validated
				if (bEnableResizeEffortCheck && iNewEffort < oData.Effort) {
					resolve(this._showConfirmMessageBox(this.getResourceBundle().getText("xtit.effortvalidate")).then(function (data) {
						return data === sap.m.MessageBox.Action.YES ? true : false;
					}));
				} else {
					resolve(true);
				}
			}.bind(this));
		},
		/**
		 * Calls the respective function import to create assignments
		 * @param {Object} oResourceData - Resource data on which demand is dropped
		 * @param {Array} aSources - Dragged Demand paths
		 * @param {Object} oTarget Dropped Resource Path
		 * @param {Object} oTargetDate - Target date and time when the demand is dropped
		 * @param {Array} aGuids Array of guids in case of split window 
		 * @private
		 */
		_validateAndAssignDemands: function (oResourceData, aSources, oTarget, oTargetDate, aGuids) {
			var oUserData = this.oUserModel.getData();
			var sDummyPath = this._createDummyAssignment(oTarget, oTargetDate);
			this.oGanttModel.setProperty(sDummyPath + "/busy", true);
			var aFixedAppointments = this.oViewModel.getProperty("/aFixedAppointmentsList")[0];

			//Condition for checking Fixed Appointments Qualification check
			if (oUserData.ENABLE_QUALIFICATION && aFixedAppointments && aFixedAppointments.IsSelected) {
				this.checkResourceQualification(aSources, oTarget, oTargetDate, aFixedAppointments.FIXED_ASSGN_END_DATE, aGuids).then(function (
					data) {
					this._assignDemands(aSources, oTarget, oTargetDate, aFixedAppointments.FIXED_ASSGN_END_DATE, aGuids, sDummyPath);
				}.bind(this));
			} else if (oUserData.ENABLE_RESOURCE_AVAILABILITY && oUserData.ENABLE_ASSIGNMENT_STRETCH && oUserData.ENABLE_QUALIFICATION && !
				oUserData.ENABLE_SPLIT_STRETCH_ASSIGN) {
				this._checkAssignmentForStretch(oResourceData, aSources, oTarget, oTargetDate, aGuids).then(function (oEndDate) {
					return this.checkResourceQualification(aSources, oTarget, oTargetDate, oEndDate, aGuids);
				}.bind(this)).then(function (oEndDate) {
					this._assignDemands(aSources, oTarget, oTargetDate, oEndDate, aGuids, sDummyPath);
				}.bind(this)).catch(function () {
					this.clearDragSession(this.getView());
					this.oGanttModel.setProperty(sDummyPath, null);
					this.oGanttModel.setProperty(sDummyPath + "/busy", false);
				}.bind(this));

			} else if (oUserData.ENABLE_RESOURCE_AVAILABILITY && oUserData.ENABLE_ASSIGNMENT_STRETCH && !oUserData.ENABLE_QUALIFICATION && !
				oUserData.ENABLE_SPLIT_STRETCH_ASSIGN) {
				this._checkAssignmentForStretch(oResourceData, aSources, oTarget, oTargetDate, aGuids).then(function (oEndDate) {
					this._assignDemands(aSources, oTarget, oTargetDate, oEndDate, aGuids, sDummyPath);
				}.bind(this));

			} else if (oUserData.ENABLE_QUALIFICATION) {
				this.checkResourceQualification(aSources, oTarget, oTargetDate, null, aGuids).then(function (data) {
					this._assignDemands(aSources, oTarget, oTargetDate, null, aGuids, sDummyPath);
				}.bind(this));

			} else {
				this._assignDemands(aSources, oTarget, oTargetDate, null, aGuids, sDummyPath);
			}
		},

		/**
		 * Send assignment request to backend for all new assignments
		 * After assignment was created dummy placeholder assignment is replaced with real data 
		 * and busy state of dummy assignment is removed
		 * @param {Array} aSources
		 * @param {Object} oTarget
		 * @param {Date} oTargetDate
		 * @param {Date} oEndDate
		 * @param {Array} aGuids
		 * @param {String} sDummyPath
		 */
		_assignDemands: function (aSources, oTarget, oTargetDate, oEndDate, aGuids, sDummyPath) {

			this.assignedDemands(aSources, oTarget, oTargetDate, oEndDate, aGuids).then(
				function (aPromises) {
					this.clearDragSession(this.getView());
					return Promise.all(aPromises);
				}.bind(this),
				function () {
					if (sDummyPath) {
						this.oGanttModel.setProperty(sDummyPath, null);
						this.oGanttModel.setProperty(sDummyPath + "/busy", false);
					}
					reject();
				}.bind(this)
			).then(function (aResults) {
				var aCreatedAssignments = this._getCreatedAssignments(aResults);
				if (aCreatedAssignments.length > 0) {
					this._addCreatedAssignment(aCreatedAssignments, oTarget, sDummyPath);
				}
			}.bind(this)).catch(function () {
				if (sDummyPath) {
					this.oGanttModel.setProperty(sDummyPath, null);
					this.oGanttModel.setProperty(sDummyPath + "/busy", false);
				}
			}.bind(this));
		},

		/**
		 * Proceed to assignment with Stretch, check if Date Time is not valid
		 * @param {Object} aSources Demand paths
		 * @param {Object} oTarget Resource Path
		 * TODO parameters to be updated
		 * @return promise
		 * @private
		 */
		_checkAssignmentForStretch: function (oResourceData, aSources, oTarget, oTargetDate, aGuids, fnCheckValidation) {
			var oResourceModel = this.getResourceBundle();
			return new Promise(function (resolve, reject) {
				if (oResourceData.NodeType !== "RES_GROUP" && (oResourceData.NodeType === "RESOURCE" && oResourceData.ResourceGuid &&
					oResourceData.ResourceGuid !== "")) {

					this._checkAvailability(aSources, oTarget, oTargetDate, aGuids).then(function (availabilityData) {
						this._availabilityData = availabilityData;
						if (!this._availabilityData.Unavailable) {
							return resolve(this._availabilityData.Endtimestamp);
						} else {
							return this._showConfirmMessageBox(oResourceModel.getText("ymsg.extendMsg"));
						}
					}.bind(this), function () {
						this.clearDragSession(this.getView());
						reject();
					}).then(function (value) {
						if (value === "YES") {
							resolve(this._availabilityData.Endtimestamp);
						} else if (value === "NO") {
							resolve(this._availabilityData.EndtimestampWithstretch);
						}
					}.bind(this));
				} else {
					resolve();
				}
			}.bind(this));

		},
		/**
		 * Creating dummy assignment
		 * @param {String} sTargetPath Target path for the resource
		 * @param {Object} oTargetDate Target date on which demand is dropped
		 */
		_createDummyAssignment: function (sTargetPath, oTargetDate) {
			var oAssignment = {
				AssignmentType: "",
				DEMAND_STATUS: "ASGN",
				DEMAND_STATUS_COLOR: "#90EE90",
				DEMAND_STATUS_ICON: "sap-icon://employee-pane",
				DateFrom: moment(oTargetDate).toDate(),
				DateTo: moment(oTargetDate).add(5, "hour").toDate(),
				DemandGuid: "0AA10FE57E901EDC89EAB37B4CB92EB0",
				Description: "Loading. . .",
				Effort: "24.0",
				EffortUnit: "H",
				FIRSTNAME: "Ian",
				GROUP_DESCRIPTION: "Production Line (TEST)",
				Guid: "thisisdummyguidassignment",
				LASTNAME: "Robb",
				LATITUDE: "50.110942871000",
				LONGITUDE: "8.673195901300",
				NODE_TYPE: "RESOURCE",
				NOTIFICATION: "",
				NOTIFICATION_DESC: "",
				OPERATIONID: "0010",
				ORDERID: "830821",
				ObjectId: "0AA10FE57E901EE9BBCE7C31764A1B0D//0AA10FE57E901EE9BBCE7C317649FB0D",
				PERSON_NUMBER: "01000000",
				RESOURCE_DESCRIPTION: "Ian Robb",
				ResourceGroupGuid: "0AA10FE57E901EE9BBCE7C317649FB0D",
				ResourceGuid: "0AA10FE57E901EE9BBCE7C31764A1B0D",
				SUBOPERATIONID: "0000"
			};
			var aAssignments = this.oGanttModel.getProperty(sTargetPath).AssignmentSet.results;
			aAssignments.push(oAssignment);

			var sPath = sTargetPath + "/AssignmentSet/results/" + (aAssignments.length - 1);
			this.oGanttModel.setProperty(sTargetPath + "/AssignmentSet/results", aAssignments);

			this.oGanttModel.refresh();
			return sPath;
		},
		/**
		 * Add created assignment into the both the model after success creation of assignment
		 * @param data {Array} Response from function import
		 * @param sTargetPath {string} target path of resource
		 * @param sDummyPath {string} dummy path of resource
		 */
		_addCreatedAssignment: function (data, sTargetPath, sDummyPath) {
			var aAssignments = this.oGanttModel.getProperty(sTargetPath).AssignmentSet.results;
			for (var i = 0; i < data.length; i++) {
				if (data[i].Guid === "") {
					this.oGanttModel.setProperty(sDummyPath, null);
					return;
				}
				data[i].NodeType = "ASSIGNMENT";
				if (i > 0) {
					aAssignments.push(data[i]);
					sDummyPath = sTargetPath + "/AssignmentSet/results/" + (aAssignments.length - 1);
					this.oGanttModel.setProperty(sTargetPath + "/AssignmentSet/results", aAssignments);
				} else {
					this.oGanttModel.setProperty(sDummyPath + "/busy", false);
					this.oGanttModel.setProperty(sDummyPath, data[i]);

				}
				this.oGanttOriginDataModel.setProperty(sDummyPath, _.cloneDeep(data[i]));
				this.oGanttModel.refresh();
			}
			this._refreshChangedResources(sTargetPath);
			if (this._routeName !== Constants.GANTT.SPLIT) {
				this._oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
			}
			this.oGanttModel.refresh();
			this._oEventBus.publish("BaseController", "refreshCapacity", {
				sTargetPath: sTargetPath
			});
		},
		/**
		 * Change view horizon time at specified timestamp
		 * @param iZoomLevel {integer} 
		 * @param oAxisTimeStrategy {object} control
		 * @param oDate {object} date
		 */
		_changeGanttHorizonViewAt: function (iZoomLevel, oAxisTimeStrategy, oDate) {
			var sStartDate, sEndDate,
				date = oDate ? moment(oDate) : moment();

			if (iZoomLevel >= 8) {
				sStartDate = date.startOf("hour").toDate();
				sEndDate = date.endOf("hour").add(1, "hour").toDate();
			} else {
				sStartDate = date.startOf("day").subtract(1, "day").toDate();
				sEndDate = date.endOf("day").add(1, "day").toDate();
			}

			//Setting Existing Visible Horizon Dates On ContextMenu Opening For First Time To Avoid Jumping @since 2205
			if (this._bFirstTimeContextMenuOpen || !this.bGanttFirstTime) {
				sStartDate = this.oGanttModel.getProperty("/settings/startTime");
				sEndDate = this.oGanttModel.getProperty("/settings/endTime");
			}

			this.oGanttModel.setProperty("/settings", {
				startTime: sStartDate,
				endTime: sEndDate
			});

			//Setting VisibleHorizon for Gantt for supporting Patch Versions (1.71.35)
			if (oAxisTimeStrategy && !this.bGanttHorizonChange) {
				oAxisTimeStrategy.setVisibleHorizon(new sap.gantt.config.TimeHorizon({
					startTime: sStartDate,
					endTime: sEndDate
				}));
			} else {
				this.oViewModel.setProperty("/ganttSettings/visibleStartTime", sStartDate);
				this.oViewModel.setProperty("/ganttSettings/visibleEndTime", sEndDate);
			}
			this.bGanttHorizonChange = false; // Resetting/Clearing Gantt Horizon Flag
			this.bGanttFirstTime = false;
		},
		/**
		 * load tree data from a certain hierarchy level
		 * resolve returns increased level by step 1
		 * @params iLevel
		 * @param {array} aParamDemandsFilter
		 */
		_loadTreeData: function (iLevel, aParamDemandsFilter) {
			return new Promise(function (resolve) {
				var sEntitySet = "/GanttResourceHierarchySet",
					aFilters = [],
					mParams = {
						"$expand": "AssignmentSet,ResourceAvailabilitySet"
					},
					oUserData = this.oUserModel.getData(),
					aResourceTblFilters=[];
				aFilters.push(new Filter("HierarchyLevel", FilterOperator.EQ, iLevel));
				aFilters.push(new Filter("StartDate", FilterOperator.LE, formatter.date(oUserData.DEFAULT_GANT_END_DATE)));
				aFilters.push(new Filter("EndDate", FilterOperator.GE, formatter.date(oUserData.DEFAULT_GANT_START_DATE)));
				this.oSchedulingActions.setResourceTreeFilter(aFilters);
				if (aParamDemandsFilter && iLevel > 0) {
					for (var x in aParamDemandsFilter) {
						aFilters.push(aParamDemandsFilter[x]);
					}
				}
				//is also very fast with expands
				this.getOwnerComponent().readData(sEntitySet, aFilters, mParams).then(function (oResult) {
					if (iLevel > 0) {
						this._addChildrenToParent(iLevel, oResult.results);
					} else {
						this.oGanttModel.setProperty("/data/children", oResult.results);
					}
					resolve(iLevel + 1);
				}.bind(this));
			}.bind(this));
		},
		/**
		 * Load the tree data and process the data to create assignments as child nodes
		 * @param {string} sChannel (only in case of event bus)
		 * @param {string} sEvent (only in case of event bus)
		 * @param {array} aParamDemandsFilter in case of filter gantt trigerred from gantt demands table
		 */
		_loadGanttData: function (sChannel, sEvent, aParamDemandsFilter) {
			//expanded level is 1 so load at first 0 and 1 hirarchy levels
			this._treeTable.setBusy(true);
			this._loadTreeData(0, aParamDemandsFilter)
				.then(function (resolve) {
					return this._loadTreeData(resolve, aParamDemandsFilter);
				}.bind(this))
				.then(function (resolve) {
					return this._loadTreeData(resolve, aParamDemandsFilter);
				}.bind(this))
				.then(function (resolve) {
					this._treeTable.expandToLevel(1);
					this._treeTable.setBusy(false);
					this._changeGanttHorizonViewAt(this._axisTime.getZoomLevel(), this._axisTime);
					this.oGanttOriginDataModel.setProperty("/data", _.cloneDeep(this.oGanttModel.getProperty("/data")));
				}.bind(this));;
			this._resetToolbarButtons();
		},

		/**
		 * when data was loaded then children needs added to right parent node
		 * @param iLevel
		 * @param oResData
		 */
		_addChildrenToParent: function (iLevel, oResData) {
			var aChildren = this.oGanttModel.getProperty("/data/children"),
				aTravelTimes=[];
			var callbackFn = function (oItem, level) {
				oItem.children = [];
				oResData.forEach(function (oResItem) {

					if (oItem.NodeId === oResItem.ParentNodeId) {
						if (oResItem.NodeType === "ASSIGNMENT") { // if it's assignment node then push same assignment in AssignmentSet to show the Shape
							if (oResItem.AssignmentSet && oResItem.AssignmentSet.results.length > 0) {
								oResItem.children = _.cloneDeep(oResItem.AssignmentSet.results);
								oResItem.children.forEach(function (oAssignItem, idx) {
									oAssignItem.NodeType = "ASSIGNMENT";
									var clonedObj = _.cloneDeep(oAssignItem);
									oAssignItem.AssignmentSet = { // add PRT as children to to show shape
										results: [clonedObj]
									};
								});
							}
							oItem.AssignmentSet.results.forEach(function (oAsgn) {
								if (oAsgn.Guid === oResItem.AssignmentGuid) {
									var _cloneObj = _.cloneDeep(oAsgn);
									//Appending Object_ID_RELATION field with ResourceGuid for Assignment Children Nodes @since 2205 for Relationships
									_cloneObj.OBJECT_ID_RELATION = _cloneObj.OBJECT_ID_RELATION + "//" + _cloneObj.ResourceGuid;
									oResItem.AssignmentSet.results.push(_cloneObj);
								}
								if (parseFloat(oAsgn.TRAVEL_TIME) > 0){
									aTravelTimes = this._getAssignmentTravelTimeObject(aTravelTimes,oAsgn, oItem);
								}
								if (parseFloat(oAsgn.TRAVEL_BACK_TIME) > 0) {
									aTravelTimes = this._getAssignmentTravelTimeObject(aTravelTimes, oAsgn, oItem, true);
								}
							}.bind(this));
							
							oResItem.ResourceAvailabilitySet = oItem.ResourceAvailabilitySet; // copying resource availabilities to assignment node
						}
						oItem.children.push(oResItem);
						oItem.TravelTimes = {
							results: _.cloneDeep(aTravelTimes)
						}
						aTravelTimes = [];
					}
				}.bind(this));
			}.bind(this);
			aChildren = this._recurseChildren2Level(aChildren, iLevel, callbackFn);
			this.oGanttModel.setProperty("/data/children", aChildren);
		},
		
		/**
		 * loop trough all nested array of children
		 * When max level for search was reached execute callbackFn
		 * @param {Array} aChildren
		 * @param {Integer} iMaxLevel
		 * @param {Function} callbackFn
		 * @returns Array
		 */
		_recurseChildren2Level: function (aChildren, iMaxLevel, callbackFn) {
			function recurse(aItems, level) {
				for (var i = 0; i < aItems.length; i++) {
					var aChilds = aItems[i].children;
					if (level === (iMaxLevel - 1)) {
						if (callbackFn) {
							callbackFn(aItems[i]);
						}
					} else if (aChilds && aChilds.length > 0) {
						recurse(aChilds, level + 1);
					}
				}
			}
			recurse(aChildren, 0);
			return aChildren;
		},
		/**
		 * Adding associations to gantt hierarchy
		 * @Author Rahul
		 */
		_addAssociations: function () {
			var aFilters = [],
				oUserData = this.oUserModel.getData();
			//Refreshing Assignments for only updated Resources
			this._refreshUpdatedResources(); 
			aFilters.push(new Filter("DateFrom", FilterOperator.LE, formatter.date(oUserData.DEFAULT_GANT_END_DATE)));
			aFilters.push(new Filter("DateTo", FilterOperator.GE, formatter.date(oUserData.DEFAULT_GANT_START_DATE)));
			this.getOwnerComponent().readData("/ResourceAvailabilitySet", aFilters, null, "sAvailabilityBatchId").then(function (oData) {
				this._addAvailabilities(oData.results);
			}.bind(this));
		},
		
		/**
		 * fetch event when callFunctionImport happened in BaseController
		 * @param {String} sChannel
		 * @param {String} sEvent
		 * @param {Object} oData - oData{mParams, oSourceData, oResultData}
		 * @Author Rahul
		 */
		_refreshAssignments: function (sChannel, sEvent, oData) {
			if (sChannel === "BaseController" && sEvent === "refreshAssignments") {
				var aFilters = [],
					oUserData = this.oUserModel.getData(),
					aPromises = [];

				//update ganttModels with results from function import
				if (this.bDoNotRefreshTree) {
					aFilters.push(new Filter("ObjectId", FilterOperator.EQ, this.oResource.ResourceGuid + "//" + this.oResource.ResourceGroupGuid));
					aFilters.push(new Filter("DateFrom", FilterOperator.LE, formatter.date(oUserData.DEFAULT_GANT_END_DATE)));
					aFilters.push(new Filter("DateTo", FilterOperator.GE, formatter.date(oUserData.DEFAULT_GANT_START_DATE)));
					this.oAppViewModel.setProperty("/busy", true);
					this.getOwnerComponent()._getData("/AssignmentSet", [aFilters]).then(function (result) {
						this.updateResourceAfterRouting(result);
						this.oAppViewModel.setProperty("/busy", false);
					}.bind(this));
					this.bDoNotRefreshTree = false;
				} else {
					aFilters.push(new Filter("DateFrom", FilterOperator.LE, formatter.date(oUserData.DEFAULT_GANT_END_DATE)));
					aFilters.push(new Filter("DateTo", FilterOperator.GE, formatter.date(oUserData.DEFAULT_GANT_START_DATE)));
					this.getModel().setUseBatch(false);
					aPromises.push(this.getOwnerComponent().readData("/AssignmentSet", aFilters));
					this.oAppViewModel.setProperty("/busy", true);
					Promise.all(aPromises).then(function (data) {
						this._addAssignments(data[0].results);
						this.getModel().setUseBatch(true);
						this.oAppViewModel.setProperty("/busy", false);
						this.oGanttOriginDataModel.setProperty("/data", _.cloneDeep(this.oGanttModel.getProperty("/data")));
						this.oGanttOriginDataModel.refresh();
					}.bind(this));
				}
				
			}
		},

		/**
		 * fetch event when callFunctionImport happened in BaseController
		 * @param {String} sChannel
		 * @param {String} sEvent
		 * @param {Object} oData - oData{mParams, oSourceData, oResultData}
		 * @Author Rahul
		 */
		_refreshAvailabilities: function (sChannel, sEvent, oData) {
			var sSelectedResourcePath = this.selectedResources[0],
				aFilters,
				oUserData = this.oUserModel.getData(),
				sResourceGuid,
				aPromises = [];
			if (sChannel === "BaseController" && sEvent === "refreshAvailabilities") {
				for (var i in this.selectedResources) {
					sResourceGuid = this.oGanttModel.getProperty(this.selectedResources[i]).ResourceGuid;
					aFilters = [
						new Filter("DateFrom", FilterOperator.LE, formatter.date(oUserData.DEFAULT_GANT_END_DATE)),
						new Filter("DateTo", FilterOperator.GE, formatter.date(oUserData.DEFAULT_GANT_START_DATE)),
						new Filter("ResourceGuid", FilterOperator.EQ, sResourceGuid)
					];
					aPromises.push(this.getOwnerComponent().readData("/ResourceAvailabilitySet", aFilters));
				}
				this.oAppViewModel.setProperty("/busy", true);
				Promise.all(aPromises).then(function (aResults) {
					for (i in this.selectedResources) {
						this.oGanttModel.setProperty(this.selectedResources[i] + "/ResourceAvailabilitySet", aResults[i]);
						this.oGanttOriginDataModel.setProperty(this.selectedResources[i] + "/ResourceAvailabilitySet", _.cloneDeep(aResults[i]));
					}
					this.oGanttModel.refresh();
					this._resetSelections();
					this.oAppViewModel.setProperty("/busy", false);
				}.bind(this));
			}
		},
		/**
		 * Adding assignemnts into Gantt data in Gantt Model 
		 * @param {Array} aAssignments
		 * @Author Rahul
		 */
		_addAssignments: function (aAssignments) {
			var aGanttData = this.oGanttModel.getProperty("/data/children"),
				aTravelTimes = [];
			for (let i = 0; i < aGanttData.length; i++) {
				var aResources = aGanttData[i].children;
				if (aResources) {
					for (let j = 0; aResources && j < aResources.length; j++) {
						var oResource = aResources[j];
						aTravelTimes = [];
						oResource.AssignmentSet.results = [];
						oResource.children = []; //Updating resource child nodes
						for (var k in aAssignments) {
							if (oResource.NodeId === aAssignments[k].ObjectId) {
								oResource.AssignmentSet.results.push(aAssignments[k]);
								aAssignments[k].ResourceAvailabilitySet = oResource.ResourceAvailabilitySet;
								oResource.children.push(aAssignments[k]);
								oResource.children.forEach(function (oAssignItem, idx) { //Updating resource child node data
									oAssignItem.NodeType = "ASSIGNMENT";
									var _cloneObj = _.cloneDeep(oAssignItem);
									_cloneObj.OBJECT_ID_RELATION = _cloneObj.OBJECT_ID_RELATION + "//" + _cloneObj.ResourceGuid;
									oAssignItem.AssignmentSet = {
										results: [_cloneObj]
									};
								});
								if (parseFloat(aAssignments[k].TRAVEL_TIME) > 0) {
									aTravelTimes = this._getAssignmentTravelTimeObject(aTravelTimes,aAssignments[k],oResource);
								}
								if (parseFloat(aAssignments[k].TRAVEL_BACK_TIME) > 0) {
									aTravelTimes = this._getAssignmentTravelTimeObject(aTravelTimes, aAssignments[k], oResource, true);
								}
							}
						}
						//Adding Travel time if available for the resource
						oResource.TravelTimes = {
							results: _.cloneDeep(aTravelTimes)
						};
					}
				}
			}

			this.oGanttModel.refresh();
		},
		/**
		 * Adding availabilities into Gantt data in Gantt Model 
		 * @param {Array} aAvailabilities
		 * @Author Rahul
		 */
		_addAvailabilities: function (aAvailabilities) {
			var aGanttData = this.oGanttModel.getProperty("/data/children");
			for (let i = 0; i < aGanttData.length; i++) {
				var aResources = aGanttData[i].children;
				for (let j = 0; j < aResources.length; j++) {
					var oResource = aResources[j];
					oResource.ResourceAvailabilitySet.results = [];
					for (var k in aAvailabilities) {
						if (oResource.NodeId === aAvailabilities[k].ObjectId) {
							oResource.ResourceAvailabilitySet.results.push(aAvailabilities[k]);
						}
					}
				}
			}
			this.oGanttModel.refresh();
		},
		/**
		 * Resets the selected resource if selected and disable the action buttons
		 */
		_resetSelections: function () {
			for (var i in this.selectedResources) {
				this.oGanttModel.setProperty(this.selectedResources[i] + "/IsSelected", false);
			}
			this.selectedResources = [];
			this._resetToolbarButtons();
		},
		/**
		 *  refreshes the utilization in gantt chart table
		 * //TODO update the parameters sChannel and sEvent not in use
		 */
		_refreshCapacity: function (sChannel, sEvent, oData) {
			var aSelectedResourcePath = this.selectedResources;

			if (this.bDoNotRefreshCapacity) {
				this.bDoNotRefreshCapacity = false;
				return;
			}

			if (oData.sTargetPath) {
				this._refreshCapacities([oData.sTargetPath]);
			} else if (aSelectedResourcePath.length > 0) {
				this._refreshCapacities(aSelectedResourcePath);
			} else {
				this._loadGanttData();
			}
		},
		/**
		 * refreshes the utilization in gantt chart table by calling GanttResourceHierarchySet
		 * @param {Array} aSelectedResourcePath
		 * */
		_refreshCapacities: function (aSelectedResourcePath) {
			var aFilters = [],
				oUserData = this.oUserModel.getData(),
				oTargetData,
				sNodeId = "";

			for (var i in aSelectedResourcePath) {
				aFilters = [];
				oTargetData = this.oGanttModel.getProperty(aSelectedResourcePath[i]);
				if (oTargetData) {
					sNodeId = oTargetData.NodeId;
				}
				aFilters.push(new Filter("HierarchyLevel", FilterOperator.LE, 1));
				aFilters.push(new Filter("StartDate", FilterOperator.LE, formatter.date(oUserData.DEFAULT_GANT_END_DATE)));
				aFilters.push(new Filter("EndDate", FilterOperator.GE, formatter.date(oUserData.DEFAULT_GANT_START_DATE)));
				aFilters.push(new Filter("NodeId", FilterOperator.EQ, sNodeId));

				this._updateCapacity(aFilters, aSelectedResourcePath[i]);
			}

		},
		/**
		 * refreshes the utilization in gantt chart table by calling GanttResourceHierarchySet
		 * @param {Array} aFilters
		 * @param {String} sPath
		 * */
		_updateCapacity: function (aFilters, sPath) {
			this.oGanttModel.setProperty(sPath + "/busy", true);
			this.getOwnerComponent().readData("/GanttResourceHierarchySet", aFilters).then(function (data) {
				if (data.results[0]) {
					//added condition to remove error in consol as unable to get data sometimes
					this.oGanttModel.setProperty(sPath + "/Utilization", data.results[0].Utilization);
					this.oGanttOriginDataModel.setProperty(sPath + "/Utilization", data.results[0].Utilization);
					this.oGanttModel.setProperty(sPath + "/busy", false);
				}
				this.oGanttModel.refresh();
			}.bind(this));
			// }
		},
		/**
		 * check if Fixed appointment dialog to display or not
		 * @param {Boolean} bShowFutureFixedAssignments
		 * @param {Object} oStartDate
		 * @param {Object} oDemandObj
		 **/
		_checkFixedAppointPopupToDisplay: function (bShowFutureFixedAssignments, oStartDate, oDemandObj) {
			var isFixedAppointment = false;
			this.aFixedAppointmentDemands = [];
			oDemandObj.forEach(function (oItem) {
				isFixedAppointment = oItem.FIXED_APPOINTMENT && ((bShowFutureFixedAssignments && oStartDate < oItem.FIXED_APPOINTMENT_START_DATE) ||
					oStartDate > oItem.FIXED_APPOINTMENT_START_DATE ||
					oStartDate > oItem.FIXED_APPOINTMENT_LAST_DATE);
				if (isFixedAppointment) {
					this.aFixedAppointmentDemands.push(oItem);
				}
			}.bind(this));

			return this.aFixedAppointmentDemands.length;
		},
		/**
		 * Converting date into objects from String passed from Gantt Split
		 * @param {Object} oParams
		 * @param {String} sSource
		 * */
		_openFixedAppointmentDialog: function (oParams, sSource) {
			this.oViewModel.setProperty("/aFixedAppointmentsList", this.aFixedAppointmentDemands);
			this.getOwnerComponent().FixedAppointmentsList.open(this.getView(), [], oParams, this._mParameters, sSource);
		},

		/**
		 * Converting date into objects from String passed from Gantt Split
		 * @param {Array} aDemandData
		 **/
		_convertDateToObjects: function (aDemandData) {
			var oDemandObjects = [];
			aDemandData.forEach(function (oItem) {
				oItem.FIXED_APPOINTMENT_START_DATE = new Date(oItem.FIXED_APPOINTMENT_START_DATE);
				oItem.FIXED_APPOINTMENT_END_DATE = new Date(oItem.FIXED_APPOINTMENT_END_DATE);
				oItem.FIXED_ASSGN_START_DATE = new Date(oItem.FIXED_ASSGN_START_DATE);
				oItem.FIXED_ASSGN_END_DATE = new Date(oItem.FIXED_ASSGN_END_DATE);

				oDemandObjects.push(oItem);

			}.bind(this));

			this.oViewModel.setProperty("/ganttSettings/aGanttSplitDemandData", oDemandObjects);
			return oDemandObjects;
		},

		/**
		 * Set color pattern for some unavailabilities
		 * @param {String} sTypeGroup
		 * @param {String} sType
		 * @param {String} sColor
		 * @param {String} sPattern
		 */
		_setAvailabilitiesPatterns: function (sTypeGroup, sType, sColor, sPattern) {
			if (sPattern) {
				var sPatternName = this._viewId + "--availability-" + sTypeGroup + "-" + sType,
					oCtrl = null;
				//get SVGDev control in view
				if (!this._oSVGDef) {
					this._oSVGDef = this.getView().byId("idGanttChartSvgDefs");
					this._aAvailabilitySVGDef = [];
				}

				//when pattern control was not yet created
				if (this._aAvailabilitySVGDef.indexOf(sPatternName) < 0) {
					//create SlashPattern
					if (sPattern === "SlashPattern") {
						oCtrl = new SlashPattern(sPatternName, {
							backgroundColor: "white",
							stroke: sColor || "#eee"
						});
						this._oSVGDef.insertDef(oCtrl);
						this._aAvailabilitySVGDef.push(sPatternName);
					}
					if (sPattern === "BackslashPattern") {
						oCtrl = new BackSlashPattern(sPatternName, {
							backgroundColor: "white",
							stroke: sColor || "#eee"
						});
						this._oSVGDef.insertDef(oCtrl);
						this._aAvailabilitySVGDef.push(sPatternName);
					}
				}
			}
		},

		/**
		 * multi assignments of demands via Fixed assignment Dialog Event bus call
		 * handle demand assignment for Gantt Json model 
		 * @param {Object} oResourceData
		 * @param {Array} aSource
		 * @param {Object} oTarget
		 * @param {Object} oTargetDate
		 * @param {Array} aFixedAppointmentObjects
		 * since 2205
		 */
		_handleMultipleAssignment: function (oResourceData, aSources, oTarget, oTargetDate, aFixedAppointmentObjects) {
			var sDummyPath = this._createDummyAssignment(oTarget, oTargetDate);
			this.oGanttModel.setProperty(sDummyPath + "/busy", true);

			this.assignMultipleDemands(oResourceData, aSources, oTarget, oTargetDate, aFixedAppointmentObjects).then(
				function (aPromises) {
					Promise.all(aPromises).then(
						function (aResults, oResponse) {
							if (aResults.length > 0) {
								var aCreatedAssignments = this._getCreatedAssignments(aResults);
								if (aCreatedAssignments.length > 0) {
									this._addCreatedAssignment(aCreatedAssignments, oTarget, sDummyPath);
								} else {
									this.oGanttModel.setProperty(sDummyPath, null);
									this.oGanttModel.setProperty(sDummyPath + "/busy", false);
								}
							}
							//	this._oEventBus.publish("BaseController", "refreshAssignments", aResults);
							//	this._oEventBus.publish("BaseController", "refreshCapacity", {});
						}.bind(this),
						function () {
							if (sDummyPath) {
								this.oGanttModel.setProperty(sDummyPath, null);
								this.oGanttModel.setProperty(sDummyPath + "/busy", false);
							}
						}.bind(this)
					);
					this.clearDragSession(this.getView());
				}.bind(this),
				function () {
					if (sDummyPath) {
						this.oGanttModel.setProperty(sDummyPath, null);
						this.oGanttModel.setProperty(sDummyPath + "/busy", false);
					}
				}.bind(this)
			);
		},
		/**
		 * getting demand Objects form paths
		 * handle demand assignment for Gantt Json model 
		 * @param {Array} aPaths_gantt
		 * @param oDemands_ganttSplit
		 * //TODO oDemands_ganttSplit looks like an Array as per the below code but the naming convention is of Object
		 * since 2205
		 */
		_getDemandObjectsByPath: function (aPaths_gantt, oDemands_ganttSplit) {
			var oDemandObjects = [];
			if (this._mParameters.bFromNewGanttSplit) {
				oDemands_ganttSplit.forEach(function (oItem) {
					oDemandObjects.push(oItem.oDemandObject);
				}.bind(this));
				oDemandObjects = this._convertDateToObjects(oDemandObjects);
			} else {
				aPaths_gantt.forEach(function (sPath) {
					oDemandObjects.push(this.getModel().getProperty(sPath));
				}.bind(this));
			}
			return oDemandObjects;
		},
		/**
		 * getting dragged paths from localstorage from Gantt Split
		 * handle demand assignment for Gantt Json model 
		 * @param slocStor
		 * since 2205
		 */
		_getDragPaths: function (slocStor) {
			var aPaths = [];
			for (var i in slocStor) {
				aPaths.push(slocStor[i].sPath);
			}
			return aPaths;
		},

		/**
		 * OnSelection of Assignment Status Change
		 * @param {String} sPath
		 * @param {Object} oData
		 * @param {String} sAsgnStsFnctnKey
		 * since 2205
		 */
		_onContextMenuAssignmentStatusChange: function (sPath, oData, sAsgnStsFnctnKey) {
			var sUri = "/AssignmentSet('" + oData.Guid + "')";
			this._getAssignmentStatus(sUri).then(function (data) {
				if (data["ALLOW_" + sAsgnStsFnctnKey]) {
					this.oAppViewModel.setProperty("/busy", true);
					var oParams = {
						Function: sAsgnStsFnctnKey,
						AssignmentGUID: oData.Guid
					};
					return this.executeFunctionImport(this.getModel(), oParams, "ExecuteAssignmentFunction", "POST");
				} else {
					reject();
				}
			}.bind(this)).then(
				function (aData) {
					this.oAppViewModel.setProperty("/busy", false);
					this._oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
					this._updateAssignmentStatus(sPath, sAsgnStsFnctnKey, aData);
				}.bind(this)).catch(function () {
					sap.m.MessageBox.error(this.getModel("i18n").getResourceBundle().getText("assignmentNotPossible"));
				}.bind(this));
			this.oGanttModel.setProperty(sPath + "/busy", false);
			this.oGanttModel.refresh(true);
		},

		/**
		 * when navigating from Maps to Gantt 
		 * onShowAssignments button click from the Resource Pin popover
		 * apply the selected resource filter in the gantt view
		 * also apply the date range from Map resource tree filterbar
		 */
		_handleNavigationFromMap: function () {
			// apply the resource filter
			this.getOwnerComponent().GanttResourceFilter.applyNavigationFilters();

			// set the date range from Maps
			var aNavigationDateRange = this.oViewModel.getProperty("/ganttDateRangeFromMap");
			if (aNavigationDateRange.length) {
				this.getView().byId("idDateRangeGantt2").setDateValue(new Date(aNavigationDateRange[0]));
				this.getView().byId("idDateRangeGantt2").setSecondDateValue(new Date(aNavigationDateRange[1]));
			}
		},

		/**
		 * creating filter object to read assignments of selected date 
		 * @param {Object} oResource
		 * @param {Object} oDateFrom
		 * @param {Object} oDateTo
		 * since 2205
		 */
		_getFiltersToReadAssignments: function (oResource, oDateFrom, oDateTo) {
			var aFilters = [];
			//if ResourceGuid blank then its POOL else assignment
			if (oResource.ResourceGuid === "") {
				aFilters.push(new Filter("ObjectId", FilterOperator.EQ, oResource.ResourceGroupGuid + "//" + "X"));
			} else {
				aFilters.push(new Filter("ObjectId", FilterOperator.EQ, oResource.ResourceGuid + "//" + oResource.ResourceGroupGuid));
			}
			aFilters.push(new Filter("DateTo", FilterOperator.GE, oDateFrom));
			aFilters.push(new Filter("DateFrom", FilterOperator.LE, oDateTo.setHours(23, 59, 59, 999)));
			return new Filter(aFilters, true);
		},

		/**
		 * Setting the gantt char Visible horizon to see selected date assignments
		 * @param {Object} ODate
		 * since 2205
		 */
		_setGanttVisibleHorizon: function (oDate) {
			if (this._axisTime) {
				oDate = new Date(oDate.setDate(oDate.getDate() - 2));
				this._axisTime.setVisibleHorizon(new sap.gantt.config.TimeHorizon({
					startTime: new Date(oDate.setHours(0, 0, 0)),
					endTime: new Date(oDate.setHours(23, 59, 59, 999))
				}));
			} else {
				this.onVisibleHorizonUpdate(null, new Date(oDate.setHours(0, 0, 0)), new Date(oDate.setHours(23, 59, 59, 999)));
			}
		},

		/**
		 * Method to get parameters to updated assignments to backend with new date/time
		 * @param {Object} oAssignment
		 * @param {Integer} nTimeDifference
		 * since 2209
		 */
		_getAssignmentParams: function (oAssignment, nTimeDifference) {
			var oParams = {
				DateFrom: new Date(oAssignment.DateFrom.getTime() + nTimeDifference),
				TimeFrom: {
					ms: oAssignment.DateFrom.getTime() + nTimeDifference
				},
				DateTo: new Date(oAssignment.DateTo.getTime() + nTimeDifference),
				TimeTo: {
					ms: oAssignment.DateTo.getTime() + nTimeDifference
				},
				AssignmentGUID: oAssignment.Guid,
				ResourceGroupGuid: oAssignment.ResourceGroupGuid,
				ResourceGuid: oAssignment.ResourceGuid
			};

			return oParams;
		},
		/**
		 * method for switch to toggle between Multi Assignment on Axis or reAssignment operation
		 * @param {Boolean} bVerticalMovement
		 * since 2209
		 */
		_initializeMultiAssignment: function (bVerticalMovement) {
			if (bVerticalMovement) {
				this._ganttChart.setProperty("dragOrientation", sap.gantt.DragOrientation.Free, true);
			} else {
				this._ganttChart.setProperty("dragOrientation", sap.gantt.DragOrientation.Horizontal, true);
			}
		},
		/**
		 * Method to update resouces after recheduling multiple Assignments on same axis
		 * @param {Array} aUpdatedAssignments
		 * since 2209
		 */
		_updateResourceAssignments: function (aUpdatedAssignments) {
			var oAssignment,
				oParentAssignment,
				aCheckAvailability = [];

			//updating assignments according to backend data
			for (var i = 0; i < this.aSelectedAssignmentsPaths.length; i++) {
				oAssignment = this.oGanttModel.getProperty(this.aSelectedAssignmentsPaths[i]);
				if (aUpdatedAssignments[i].ObjectId) {
					oAssignment.DateFrom = aUpdatedAssignments[i].DateFrom;
					oAssignment.DateTo = aUpdatedAssignments[i].DateTo;
					oParentAssignment = this.oGanttModel.getProperty(this.aSelectedAssignmentsPaths[i].split("/").splice(0, 8).join("/"));
					if (oAssignment.AssignmentSet) {
						oAssignment.AssignmentSet.results[0].DateFrom = oAssignment.DateFrom;
						oAssignment.AssignmentSet.results[0].DateTo = oAssignment.DateTo;
					} else {
						oParentAssignment.DateFrom = oAssignment.DateFrom;
						oParentAssignment.DateTo = oAssignment.DateTo;
					}
					aCheckAvailability.push(oAssignment);
				}
			}
			this.oGanttModel.refresh();
			this.bDoRefreshResourceAssignments = false;

			// Resource availability check for moved assignment to show the Information message
			this._checkAssignmentsOnUnavailabilty(aCheckAvailability);
		},

		/**
		 * handle refresh operation of source and target Resources in single reassignment operation
		 * @param {String} sTargetPath
		 * @param {String} sSourcePath
		 * since 2301.1.0
		 * @Author Rakesh Sahu
		 */
		_refreshChangedResources: function (sTargetPath, sSourcePath) {
			var oUserData = this.oUserModel.getData(),
				oTargetResource = this.oGanttModel.getProperty(sTargetPath.split("/").splice(0, 6).join("/")),
				oSourceResource,
				aFilters, aPromises = [];

			this._oTargetResourcePath = sTargetPath.split("/").splice(0, 6).join("/");
			aFilters = this._getFiltersToReadAssignments(oTargetResource, oUserData.DEFAULT_GANT_START_DATE, oUserData.DEFAULT_GANT_END_DATE);
			aPromises.push(this.getOwnerComponent().readData("/AssignmentSet", [aFilters]));

			if (sSourcePath) {
				this._oSourceResourcePath = sSourcePath.split("/").splice(0, 6).join("/");
				oSourceResource = this.oGanttModel.getProperty(this._oSourceResourcePath);
				aFilters = this._getFiltersToReadAssignments(oSourceResource, oUserData.DEFAULT_GANT_START_DATE, oUserData.DEFAULT_GANT_END_DATE);
				aPromises.push(this.getOwnerComponent().readData("/AssignmentSet", [aFilters]));
			}

			this.oAppViewModel.setProperty("/busy", true);
			Promise.all(aPromises).then(function (data) {
				this._updateAfterReAssignment(data, oTargetResource, oSourceResource);
				this._updateDuplicateAssignment(oTargetResource);
			}.bind(this));

		},

		/**
		 * Refresh assignments of duplicate/original resource when assignment is changed for original/duplicate resource
		 */
		_updateDuplicateAssignment: function (oTargetResource) {
			if (oTargetResource.DUPLICATE_RESOURCE) {
				var aFilters = [],
					oUserData = this.oUserModel.getData(),
					aPromise = [],
					aUpdateResources = [];

				var aGanttData = this.oGanttModel.getData().data.children;
				var aResGrps = oTargetResource.DUPLICATE_RESGRP_GUIDS.split('/');
				for (var i = 0; i < aResGrps.length - 1; i++) {

					aFilters = [];
					aFilters.push(new Filter("DateFrom", FilterOperator.LE, formatter.date(oUserData.DEFAULT_GANT_END_DATE)));
					aFilters.push(new Filter("DateTo", FilterOperator.GE, formatter.date(oUserData.DEFAULT_GANT_START_DATE)));

					aGanttData.forEach(function (aChildren) {
						if (aChildren.NodeId == aResGrps[i]) {
							aChildren.children.forEach(function (aResources) {
								if (aResources.ResourceGuid == oTargetResource.ResourceGuid) {
									aUpdateResources.push(aResources);
									aFilters.push(new Filter("ObjectId", FilterOperator.EQ, aResources.ResourceGuid + "//" + aResources.ResourceGroupGuid));
								}
							}.bind(this));
						}
					}.bind(this));
					aPromise.push(this.getOwnerComponent().readData("/AssignmentSet", aFilters)); // Push promises for update resource's assignments list
				}

				Promise.all(aPromise).then(function (aData) {
					for (var i in aData) {
						this.oResource = aUpdateResources[i];
						this._updateAfterReAssignment([aData[i]], this.oResource); // Update assignment set and children of Resource in local model
						this.oAppViewModel.setProperty("/busy", false);
					}
				}.bind(this));
			} else {
				this.oAppViewModel.setProperty("/busy", false);
			}
		},
		/**
		 * handle refresh assignments of source and target Resources in single reassignment operation
		 * @param {Array} aData
		 * @param {Object} oTargetResource
		 * @param {Object} oSourceResource
		 * since 2301.1.0
		 * @Author Rakesh Sahu
		 */
		_updateAfterReAssignment: function (aData, oTargetResource, oSourceResource) {
			oTargetResource.AssignmentSet.results = aData[0].results.filter(function (sKey) { //Filtering Demand Assignments
				return sKey.IS_PRT === false;
			});
			this._updateResourceChildren(oTargetResource, this._updateDmdPRTAssignments(aData[0].results));
			this.oGanttOriginDataModel.setProperty(this._oTargetResourcePath, _.cloneDeep(this.oGanttModel.getProperty(this._oTargetResourcePath)));

			if (oSourceResource) {
				oSourceResource.AssignmentSet.results = aData[1].results.filter(function (sKey) { //Filtering Demand Assignments
					return sKey.IS_PRT === false;
				});
				this._updateResourceChildren(oSourceResource, this._updateDmdPRTAssignments(aData[1].results));
				this.oGanttOriginDataModel.setProperty(this._oSourceResourcePath, _.cloneDeep(this.oGanttModel.getProperty(this._oSourceResourcePath)));
			}
			this.oGanttModel.refresh();
			this.oGanttOriginDataModel.refresh();
		},
		/**
		 * creating children node for all the assignments of given resource
		 * @param {Object} oResource
		 * since 2301.1.0
		 * @Author Rakesh Sahu
		 */
		_updateResourceChildren: function (oResource, aChildAsgnData) {
			var aTravelTimes = [];
			if (oResource.AssignmentSet) {
				oResource.AssignmentSet.results = aChildAsgnData;
				oResource.children = aChildAsgnData;
				oResource.children.forEach(function (oAsgnObj) {
					oAsgnObj.NodeType = "ASSIGNMENT";
					if (oAsgnObj.children) {
						oAsgnObj.children.forEach(function (oAssignItem) {
							oAssignItem.NodeType = "ASSIGNMENT";
							var clonedAsgnObj = _.cloneDeep(oAssignItem);
							oAssignItem.AssignmentSet = {
								results: [clonedAsgnObj]
							};
						}.bind(this));
					}
					oAsgnObj.ResourceAvailabilitySet = oResource.ResourceAvailabilitySet;
					var clonedObj = _.cloneDeep(oAsgnObj);
					//Appending Object_ID_RELATION field with ResourceGuid for Assignment Children Nodes @since 2205 for Relationships
					clonedObj.OBJECT_ID_RELATION = clonedObj.OBJECT_ID_RELATION + "//" + clonedObj.ResourceGuid;
					oAsgnObj.AssignmentSet = {
						results: [clonedObj]
					};
					//added the below code for calculating the travel times when coming from different views
					if (parseFloat(oAsgnObj.TRAVEL_TIME) > 0) {
						aTravelTimes = this._getAssignmentTravelTimeObject(aTravelTimes,oAsgnObj,oResource);
					}
					if (parseFloat(oAsgnObj.TRAVEL_BACK_TIME) > 0) {
						aTravelTimes = this._getAssignmentTravelTimeObject(aTravelTimes, oAsgnObj, oResource, true);
					}
				}.bind(this));
				//Adding Travel time if available for the resource
				oResource.TravelTimes = {
					results: _.cloneDeep(aTravelTimes)
				};
			}
		},

		/**
		 * Handles multi assinment or single assignment on Gantt or resource drop
		 * @param sView - For cusotmizing base don Gantt/Gantt_Split view
		 * @param oParams - Parameters for fixed appointment dialog
		 * @param oDemandObj - Dropped demand
		 * @param sDragPath - Dragged path for demand
		 * @param oResourceData - Resorce for assignment creation
		 * @param oDropContext - Context of Dropped object
		 * @param oStartDate - Statrt date of assignment(Latest if dropped on Resource; Axistime if on Gantt)
		 */
		_handleDemandDrop: function (sView, oParams, oDemandObj, sDragPath, oResourceData, oDropContext, oStartDate) {
			var bShowFutureFixedAssignments = this.oUserModel.getProperty("/ENABLE_FIXED_APPT_FUTURE_DATE"),
				bShowFixedAppointmentDialog;
			bShowFixedAppointmentDialog = this._checkFixedAppointPopupToDisplay(bShowFutureFixedAssignments, oParams.DateFrom, oDemandObj);
			if (bShowFixedAppointmentDialog) {
				this._openFixedAppointmentDialog(oParams, sView);
			} else if (sDragPath && sDragPath.length > 1) {
				this._handleMultipleAssignment(oResourceData, sDragPath, oDropContext.getPath(), oStartDate, []);
			} else {
				switch (sView) {
					case "Gantt":
						this._validateAndAssignDemands(oResourceData, sDragPath, oDropContext.getPath(), oStartDate);
						break;
					case "Gantt-Split":
						this._validateAndAssignDemands(oResourceData, null, oDropContext.getPath(), oStartDate, sDragPath);
						break;
				}
			}
		},

		/**
		 * in case of gantt shape drag from POOL to RESOURCE cal the split checks
		 * checks if the demand duration is more than the resource availablity
		 * 
		 * @param {string} sPath - path of the dragged assignment
		 * @param {string} sType - reassign or update
		 * @param {object} oPendingChanges 
		 * @param {object} oData - demand Data
		 * @param {object} sResourceNodeType - node type of the target to which shape is dragged
		 */
		_proceedWithSplitOnReAssign: function (sPath, sType, oPendingChanges, oData, sResourceNodeType) {
			return new Promise(function (resolve, reject) {

				this.splitReassignResolve = resolve;
				this.splitReassignReject = reject;

				var oParams = {
					DateFrom: oData.DateFrom || 0,
					TimeFrom: {
						__edmtype: "Edm.Time",
						ms: oData.DateFrom.getTime()
					},
					DateTo: oData.DateTo || 0,
					TimeTo: {
						__edmtype: "Edm.Time",
						ms: oData.DateTo.getTime()
					},
					AssignmentGUID: oData.Guid,
					EffortUnit: oData.EffortUnit,
					Effort: oData.Effort,
					ResourceGroupGuid: oData.ResourceGroupGuid,
					ResourceGuid: oData.ResourceGuid,
					DemandGuid: oData.DemandGuid
				},
					mParameters = {
						path: sPath,
						type: sType,
						pendingChanges: oPendingChanges,
						demandData: oData
					};

				//has new parent?
				if (this.mRequestTypes.reassign === sType && oPendingChanges[sPath].ResourceGuid) {
					oParams.ResourceGroupGuid = oData.ResourceGroupGuid;
					oParams.ResourceGuid = oData.ResourceGuid;
				}

				this._checkAndExecuteSplitForGanttReAssign([oParams], mParameters, sResourceNodeType);

			}.bind(this));
		},

		/**
		 * method checks resourceAvailabilty for the selected demands 
		 * then confirms if the user wants to split the assignments
		 * on confirm/reject then calls the required function imports
		 * 
		 * @param {array} aAssignments array of demands for which resourceAvailabilty checks should happend before split
		 * @param {object} mParameters
		 * @param {string} sResourceNodeType - node type of the resource to which shape is dragged
		 */
		_checkAndExecuteSplitForGanttReAssign: function (aAssignments, mParameters, sResourceNodeType) {
			this.checkResourceUnavailabilty(aAssignments, mParameters, sResourceNodeType).catch(this.handlePromiseChainCatch)
				.then(this.showSplitConfirmationDialog.bind(this)).catch(this.handlePromiseChainCatch)
				.then(this._callRequiredFunctionImportsForReAssign.bind(this)).catch(this.handlePromiseChainCatch);
		},

		/**
		 * based on the response from split confirmation dialog calls the required function imports
		 * strucuture of oConfirmationDialogResponse :
		 * { arrayOfDemands : aAssignments,
		 *   arrayOfDemandsToSplit : [],
		 * 	 mParameters : properties to pass till the end of promise chain
		 *   splitConfirmation : "YES/NO"
		 * };
		 * @param {object} oConfirmationDialogResponse response from split confirmation dialog
		 * resolves the promise of assignMultipleDemands method
		 * 
		 */
		_callRequiredFunctionImportsForReAssign: function (oConfirmationDialogResponse) {
			if (oConfirmationDialogResponse) {

				var aDemands = oConfirmationDialogResponse.arrayOfDemands,
					aDemandGuidsToSplit = oConfirmationDialogResponse.arrayOfDemandsToSplit,
					sResourceNodeType = oConfirmationDialogResponse.nodeType,
					mParameters = oConfirmationDialogResponse.mParameters;

				var sPath = mParameters.path,
					sType = mParameters.type,
					oPendingChanges = mParameters.pendingChanges,
					oData = mParameters.demandData;

				if (aDemandGuidsToSplit.length === 0) {
					this._proceedWithUpdateAssignment(sPath, sType, oPendingChanges, oData)
						.then(this.splitReassignResolve, this.splitReassignReject);
				} else {
					if (aDemandGuidsToSplit.includes(aDemands[0].DemandGuid)) {
						aDemands[0].ResourceView = sResourceNodeType === "RESOURCE" ? "SIMPLE" : "DAILY";
						this.executeFunctionImport(this.getModel(), aDemands[0], "CreateSplitStretchAssignments", "POST")
							.then(this.splitReassignResolve, this.splitReassignReject);
					}
				}
			}
		},

		/*
		 * Assign new drop context if Demand dropped on Resource group and Pool is resource
		 */
		_handlePoolAssignment: function (oDropContext, oResourceData) {
			var iPoolRes = oResourceData.children.length - 1,
				sDropPath = oDropContext.getPath(),
				sNewDropPath;
			sNewDropPath = sDropPath + "/children/" + iPoolRes;
			oDropContext = this.getView().getModel("ganttModel").getContext(sNewDropPath);
			return oDropContext;
		},

		/**
		 * handle refresh operation of Resource after bulk delete operation
		 * copied from _refreshChangedResources
		 * since 2301.1.0
		 * @Author Bhumika Ranawat
		 */
		_refreshResourceOnBulkDelete: function (sChannel, sEvent, oData) {
			if (sChannel == "GanttChart" && sEvent == "refreshResourceOnDelete") {
				var oUserData = this.oUserModel.getData(),
					oTargetResource,
					aFilters, aPromises = [];

				for (var i in this.selectedResources) {
					oTargetResource = this.oGanttModel.getProperty(this.selectedResources[i]);
					aFilters = this._getFiltersToReadAssignments(oTargetResource, oUserData.DEFAULT_GANT_START_DATE, oUserData.DEFAULT_GANT_END_DATE);
					aPromises.push(this.getOwnerComponent().readData("/AssignmentSet", [aFilters]));
				}
				this.oAppViewModel.setProperty("/busy", true);
				Promise.all(aPromises).then(function (data) {
					for (var i in this.selectedResources) {
						oTargetResource = this.oGanttModel.getProperty(this.selectedResources[i]);
						oTargetResource.AssignmentSet = data[i];
						this._updateDeletedChildren(oTargetResource);
						this.oGanttOriginDataModel.setProperty(this.selectedResources[i], _.cloneDeep(this.oGanttModel.getProperty(this.selectedResources[
							i])));
					}
					this.oGanttModel.refresh();
					this.oGanttOriginDataModel.refresh();
					this.oAppViewModel.setProperty("/busy", false);
				}.bind(this));
			}
		},

		/**
		 * Updating children when no assignments are present
		 * copied from _updateResourceChildren
		 * @param {Object} oResource
		 * since 2301.1.0
		 * @Author Bhumika Ranawat
		 */
		_updateDeletedChildren: function (oResource) {
			oResource.children = oResource.AssignmentSet.results;
			oResource.children.forEach(function (oAssignItem, idx) {
				oResource.AssignmentSet.results[idx].NodeType = "ASSIGNMENT";
				oResource.AssignmentSet.results[idx].ResourceAvailabilitySet = oResource.ResourceAvailabilitySet;
				var clonedObj = _.cloneDeep(oResource.AssignmentSet.results[idx]);
				//Appending Object_ID_RELATION field with ResourceGuid for Assignment Children Nodes @since 2205 for Relationships
				clonedObj.OBJECT_ID_RELATION = clonedObj.OBJECT_ID_RELATION + "//" + clonedObj.ResourceGuid;
				oResource.children[idx].AssignmentSet = {
					results: [clonedObj]
				};
			}.bind(this));
		},
		/**
		 * Updating children node of a Resource
		 * including Demand and PRT assignments
		 * @param [aAssignments] Asignments
		 * @return [aAllAssignments] Resourse assignment children node
		 * since 2305.0.0
		 */
		_updateDmdPRTAssignments: function (aAssignments) {
			var aDmdAssignments = aAssignments.filter(function (sKey) { //Filtering Demand Assignments
				return sKey.IS_PRT === false;
			}),
				aPRTAssignments = aAssignments.filter(function (sKey) { //Filtering PRT Assignments
					return sKey.IS_PRT === true;
				}),
				sNodeId, aAllAssignments;
			aDmdAssignments.forEach(function (oDmdAsgn) {
				oDmdAsgn.children = [];
				sNodeId = oDmdAsgn.NODE_ID;
				aPRTAssignments.forEach(function (oPRTAsgn) {
					oPRTAsgn.children = [];
					if (sNodeId === oPRTAsgn.ObjectId) {
						oPRTAsgn.IS_PRT_DUPLICATE = "X";
						oDmdAsgn.children.push(oPRTAsgn);
					}
				}.bind(this));
			}.bind(this));
			aAllAssignments = aPRTAssignments.filter(function (sKey) {
				return sKey.IS_PRT_DUPLICATE !== "X";
			});
			return aAllAssignments.concat(aDmdAssignments);
		},
		/** 
		 * On removing the tool assignment 
		 * from gantt context Menu
		 * @param oEvent
		 */
		deletePRTAssignment: function (oData, mParameters) {
			this.executeFunctionImport(this.getModel(), {
				PrtAssignmentGuid: oData.Guid
			}, "DeleteToolAssignment", "POST").then(function (results) {
				this._refreshChangedResources(this.oTargetPath);
			}.bind(this));
		},

		_refreshDroppedContext: function (sChannel, sEvent, oData) {
			this._refreshUpdatedResources();
		},

		/**
		 * Removing Duplicate Objects from an Array 
		 * @param [aData]
		 * @returns [aUniqueArr]
		 * Since 2309
		 */
		_removeDuplicateObjects: function (aData) {
			var oUnique = {},
				aUniqueArr = [];
			aData.forEach(function(oResObj){
				if(!oUnique[oResObj.NodeId]){
					oUnique[oResObj.NodeId] = true;
					aUniqueArr.push(oResObj)
				}
			});
			return aUniqueArr;
		},
		/**
		 * Refreshing only the updated Resources Assignments
		 * when we navigate for the second/third time from other views
		 * Since 2309
		 */
		_refreshUpdatedResources: function () {
			var aGanttResGrpData = this.oGanttModel.getProperty("/data/children"),
				aUpdatedResData = this.oViewModel.getProperty("/aUpdatedResources"),
				sResPath,
				aUpdatedResources = this._removeDuplicateObjects(aUpdatedResData);
			this.oViewModel.setProperty("/aUpdatedResources", []);
			aUpdatedResources.forEach(function (oUpdatedResObj) {
				var sResGrpGuid = oUpdatedResObj.ResourceGroupGuid,
					sResNodeId = oUpdatedResObj.NodeId;
				sResPath = "/data/children/";
				aGanttResGrpData.forEach(function (oResGrpObj, iResGrpIdx) {
					if (sResGrpGuid === oResGrpObj.ResourceGroupGuid) {
						var oResource = oResGrpObj.children;
						if (oResource) {
							sResPath = sResPath + iResGrpIdx;
							oResource.forEach(function (oResObj, iResIdx) {
								if (oResObj.NodeId === sResNodeId) {
									sResPath = sResPath + "/children/" + iResIdx;
								}
							}.bind(this));
						}
					}
				}.bind(this));
				this._oEventBus.publish("BaseController", "refreshCapacity", {
					sTargetPath: sResPath
				});
				this._refreshChangedResources(sResPath);
			}.bind(this));
		},
		/**
		 * Creating Travel time object from given assignment object
		 * @param {Array} aTravelTimes stores all travel time objects
		 * @param {Object} oAssignment respective Assignment object 
		 * @param {Function} oResource respective Resource object to get Availabilities
		 * @param {Boolean}bIsTravelBack flag to differenticate between travel and travel Back time
		 * @returns Array
		 */
		_getAssignmentTravelTimeObject: function (aTravelTimes, oAssignment, oResource, bIsTravelBack) {
			var aAvailabilities = [],
				oTempDate,
				oDateTo,
				oDateFrom,
				nTravelTime,
				oBreakFrom,
				oBreakTo,
				nDurationDifference,
				bIsChanged = false,
				nBreakTimeDifference;

			if (bIsTravelBack) {
				// calculating date for travel back time object
				oTempDate = new Date(oAssignment.DateTo);
				nTravelTime = oAssignment.TRAVEL_BACK_TIME;
				oDateFrom = new Date(oTempDate);
				oDateTo = new Date(moment(oTempDate).add(nTravelTime, 'minutes'));
			} else {
				// calculating date for travel back time object
				oTempDate = new Date(oAssignment.DateFrom);
				nTravelTime = oAssignment.TRAVEL_TIME;
				oDateTo = new Date(oTempDate);
				oDateFrom = new Date(moment(oTempDate).add(-(nTravelTime), 'minutes'));
			}

			//Getting & Traversing availabilities of Resource to check for overlaps of break with Travel time
			if (oResource.ResourceAvailabilitySet && oResource.ResourceAvailabilitySet.results) {
				aAvailabilities = oResource.ResourceAvailabilitySet.results;
			}
			for (var i in aAvailabilities) {
				// condition to check breaks for same date
				if (aAvailabilities[i].AvailabilityTypeGroup === "B" && aAvailabilities[i].DateFrom.getDate() === oTempDate.getDate()) {
					oBreakFrom = aAvailabilities[i].DateFrom;
					oBreakTo = aAvailabilities[i].DateTo;

					// checking if travel start time falls between break
					if (moment(oBreakFrom) < moment(oDateFrom) && moment(oDateFrom) < moment(oBreakTo)) {
						
						// splitting the travel time object into two parts 
						// 1. after break ends
						// 2. before break starts
						nDurationDifference = this._getDateDuration(oBreakTo, oDateTo);
						nDurationDifference = nDurationDifference / 60;
						oDateFrom = new Date(oBreakTo);
						aTravelTimes.push({
							DateFrom: new Date(oDateFrom),
							DateTo: new Date(oDateTo),
							Description: "Travel Time",
							Effort: (nTravelTime / 60).toFixed(2),
							TRAVEL_TIME: parseFloat(nTravelTime / 60).toFixed(2)
						});
						oDateTo = new Date(oBreakFrom);
						oDateFrom = new Date(moment(oDateTo).add(-(nTravelTime - nDurationDifference), "minutes"));
						aTravelTimes.push({
							DateFrom: new Date(oDateFrom),
							DateTo: new Date(oDateTo),
							Description: "Travel Time",
							Effort: ((nTravelTime - nDurationDifference) / 60).toFixed(2),
							TRAVEL_TIME: parseFloat(((nTravelTime - nDurationDifference) / 60)).toFixed(2)
						});
						bIsChanged = true;
						break;
						// checking if travel end time falls between break
					} else if (moment(oBreakFrom) < moment(oDateTo) && moment(oDateTo) < moment(oBreakTo)) {
							// splitting the travel time object into two parts 
							// 1. before break starts
							// 2. after break ends
							nDurationDifference = this._getDateDuration(oDateFrom, oBreakFrom);
							nDurationDifference = nDurationDifference / 60;
							oDateTo = new Date(moment(oDateFrom).add(nDurationDifference, "minutes"));
							aTravelTimes.push({
								DateFrom: new Date(oDateFrom),
								DateTo: new Date(oDateTo),
								Description: "Travel Time",
								Effort: (nDurationDifference / 60).toFixed(2),
								TRAVEL_TIME: parseFloat(nDurationDifference / 60).toFixed(2)
							});
							// Add one object
							oDateFrom = new Date(oBreakTo);
							oDateTo = new Date(moment(oDateFrom).add((nTravelTime - nDurationDifference), "minutes"));
							aTravelTimes.push({
								DateFrom: new Date(oDateFrom),
								DateTo: new Date(oDateTo),
								Description: "Travel Time",
								Effort: ((nTravelTime - nDurationDifference) / 60).toFixed(2),
								TRAVEL_TIME: parseFloat(((nTravelTime - nDurationDifference) / 60)).toFixed(2)
							});
							bIsChanged = true;
							break;
					//condition added to handle the case where the dates are overlapping
					} else if(moment(oBreakFrom) <= moment(oDateTo) && moment(oDateTo) <= moment(oBreakTo)){
						nBreakTimeDifference = this._getDateDuration(oBreakFrom, oBreakTo);
						nBreakTimeDifference = nBreakTimeDifference / 60;
						oDateFrom = new Date(moment(oDateFrom).add(-(nBreakTimeDifference), 'minutes'));
						oDateTo = new Date(oBreakFrom);
						
						nDurationDifference = this._getDateDuration(oDateFrom, oBreakFrom);
						nDurationDifference = nDurationDifference / 60;

						aTravelTimes.push({
							DateFrom: new Date(oDateFrom),
							DateTo: new Date(oDateTo),
							Description: "Travel Time",
							Effort: (nTravelTime / 60).toFixed(2),
							TRAVEL_TIME: parseFloat(nTravelTime / 60).toFixed(2)
						});						
						bIsChanged = true;
						break;
					}
				}
			}

			// check if travel time splitted
			if (!bIsChanged) {

				// adding single travel time object if it's not splitted
				aTravelTimes.push({
					DateFrom: new Date(oDateFrom),
					DateTo: new Date(oDateTo),
					Description: "Travel Time",
					Effort: (nTravelTime / 60).toFixed(2),
					TRAVEL_TIME: parseFloat(nTravelTime / 60).toFixed(2)
				});
			}

			// returning array of travel times with updated elements
			return aTravelTimes;
		},

		/**
		 * To calculate time duration between two date values considering time 
		 * @param {Object} oDateFrom Start date and time 
		 * @param {Object} oDateTo End date and time 
		 * @return {Number} Duration between given start and end data/time
		 */
		_getDateDuration: function (oStartDate, oEndDate) {
			return Math.ceil((oEndDate.getTime() - oStartDate.getTime()) / 1000);
		},
	});

});