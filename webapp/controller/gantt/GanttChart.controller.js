/* globals _ */
sap.ui.define([
	"com/evorait/evoplan/controller/gantt/GanttActions",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/ganttFormatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Popup",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment",
	"sap/gantt/simple/CoordinateUtils",
	"com/evorait/evoplan/model/Constants",
	"sap/gantt/misc/Utility"
], function (Controller, formatter, ganttFormatter, Filter, FilterOperator, Popup, MessageToast, Fragment, CoordinateUtils, Constants,
	Utility) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.gantt.GanttChart", {

		formatter: formatter,
		ganttFormatter: ganttFormatter,
		selectedResources: [],

		oGanttModel: null,
		oGanttOriginDataModel: null,

		mRequestTypes: {
			update: "update",
			resize: "resize",
			reassign: "reassign",
			unassign: "unassign"
		},

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 */
		onInit: function () {
			this.oViewModel = this.getModel("viewModel");
			this.oUserModel = this.getModel("user");
			this._oEventBus = sap.ui.getCore().getEventBus();
			//set on first load required filters
			this._treeTable = this.getView().byId("ganttResourceTreeTable");
			this._ganttChart = this.getView().byId("ganttResourceAssignments");
			this._axisTime = this.getView().byId("idAxisTime");
			this._userData = this.getModel("user").getData();

			this._oEventBus.subscribe("BaseController", "refreshAssignments", this._refreshAssignments, this);
			this._oEventBus.subscribe("BaseController", "refreshAvailabilities", this._refreshAvailabilities, this);
			this._oEventBus.subscribe("BaseController", "resetSelections", this._resetSelections, this);
			this._oEventBus.subscribe("AssignTreeDialog", "ganttShapeReassignment", this._reassignShape, this);
			this.getRouter().getRoute("newgantt").attachPatternMatched(function () {
				this._routeName = Constants.GANTT.NAME;
				this._mParameters = {
					bFromNewGantt: true
				};
				this.oGanttModel = this.getView().getModel("ganttModel");
				this.oGanttOriginDataModel = this.getView().getModel("ganttOriginalData");

				this.oGanttModel.setSizeLimit(999999999);
				this.oGanttOriginDataModel.setSizeLimit(999999999);
				if (this.oGanttModel.getProperty("/data/children").length === 0) {
					this._loadGanttData();
				} else {
					this._addAssociations.bind(this)();
				}
			}.bind(this));

			// this.getRouter().getRoute("ganttSplit").attachPatternMatched(function () {
			// 	this._routeName = Constants.GANTT.SPLIT;
			// 	this._mParameters = {
			// 		bFromNewGanttSplit: true
			// 	};
			// }.bind(this));

			if (this._userData.ENABLE_RESOURCE_AVAILABILITY) {
				this._ganttChart.addStyleClass("resourceGanttWithTable");
			}

			// dirty fix will be removed when evoplan completly moved to 1.84
			if (parseFloat(sap.ui.getVersionInfo().version) === 1.71) {
				this._axisTime.setZoomLevel(3);
			}

			this._viewId = this.getView().getId();
			this.getOwnerComponent().GanttResourceFilter.init(this.getView(), this._treeTable);
			//initialize context menu
			this._initContextMenu();
		},

		/**
		 * on page exit
		 */
		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshAssignments", this._refreshAssignments, this);
		},
		/* =========================================================== */
		/* event methods                                               */
		/* =========================================================== */

		/**
		 * Open's the Gantt Chart Filter Dialog 
		 * 
		 */
		onPressGanttResourceFilters: function () {
			this.getOwnerComponent().GanttResourceFilter.open(this.getView(), this._treeTable);
		},
		/**
		 * On demand drop on gantt chart or resource
		 * 
		 */
		onDemandDrop: function (oEvent) {
			var oDraggedControl = oEvent.getParameter("draggedControl"),
				oDroppedControl = oEvent.getParameter("droppedControl"),
				oBrowserEvent = oEvent.getParameter("browserEvent"),
				oDragContext = oDraggedControl ? oDraggedControl.getBindingContext() : undefined,
				oDropContext = oDroppedControl.getBindingContext("ganttModel"),
				oDropObject = oDropContext.getObject(),
				slocStor = localStorage.getItem("Evo-Dmnd-guid"),
				sDragPath = oDragContext ? this.getModel("viewModel").getProperty("/gantDragSession") : slocStor.split(","),
				oAxisTime = this.byId("container").getAggregation("ganttCharts")[0].getAxisTime(),
				oViewModel = this.getModel("viewModel"),
				oResourceData = this.getModel("ganttModel").getProperty(oDropContext.getPath()),
				oSvgPoint;

			//Null check for
			if ((!oDragContext || !sDragPath) && !oDropContext) {
				return;
			}

			// Check the resource assignable or not
			// TODO Resource needs to be validated if resource is assignable or not

			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");

			if (oBrowserEvent.target.tagName === "rect" && oDragContext) { // When we drop on gantt chart in the same view
				oSvgPoint = CoordinateUtils.getEventSVGPoint(oBrowserEvent.target.ownerSVGElement, oBrowserEvent);
				this._validateDemands(oResourceData, sDragPath, oDropContext.getPath(), oAxisTime.viewToTime(oSvgPoint.x));

			} else if (oBrowserEvent.target.tagName === "rect" && !oDragContext) { // When we drop on gantt chart from split window
				oSvgPoint = CoordinateUtils.getEventSVGPoint(oBrowserEvent.target.ownerSVGElement, oBrowserEvent);
				this._validateDemands(oResourceData, null, oDropContext.getPath(), oAxisTime.viewToTime(oSvgPoint.x), sDragPath);

			} else if (oDragContext) { // When we drop on the resource 
				this._validateDemands(oResourceData, sDragPath, oDropContext.getPath(), null);

			} else { // When we drop on the resource from split window
				this._validateDemands(oResourceData, null, oDropContext.getPath(), null, sDragPath);

			}

		},

		/**
		 * When a shape is dragged inside Gantt
		 * and dropped to same row or another resource row
		 * @param oEvent
		 */
		onShapeDrop: function (oEvent) {
			var oParams = oEvent.getParameters(),
				msg = this.getResourceBundle().getText("msg.ganttShapeDropError"),
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
			localStorage.setItem("Evo-Action-page", "ganttSplit");

			//could be multiple shape pathes
			for (var key in oParams.draggedShapeDates) {
				var sSourcePath = Utility.parseUid(key).shapeDataName,
					sTargetPath = oTargetContext.getPath(),
					oSourceData = this.getModel("ganttModel").getProperty(sSourcePath),
					sRequestType = oSourceData.ObjectId !== oTargetData.NodeId ? this.mRequestTypes.reassign : this.mRequestTypes.update;

				//set new time and resource data to gantt model, setting also new pathes
				var sNewPath = this._setNewShapeDropData(sSourcePath, sTargetPath, oParams.draggedShapeDates[key], oParams);
				this._updateDraggedShape(sNewPath, sRequestType);
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
				oShape = oParams.shape;

			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");
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

			if (oShape && oShape.sParentAggregationName === "shapes3") {
				this._initContextMenu();
				this._openContextMenu(oShape, oContext);
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
				oData = this.oGanttModel.getProperty(sPath),
				oAppModel = this.getModel("appView"),
				sDataModelPath = this._getAssignmentDataModelPath(oData.Guid),
				mParameters = {
					bFromNewGantt: true,
					sSourcePath: sPath,
					bCustomBusy: true
				};
			//still needed?
			if (oAppModel.getProperty("/currentRoute") === "ganttSplit") {
				mParameters = {
					bFromNewGantt: false,
					bFromNewGanttSplit: true
				};
			}
			localStorage.setItem("Evo-Action-page", "ganttSplit");
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
				this.openAssignInfoDialog(this.getView(), sDataModelPath, null, mParameters, null);
			} else if (oSelectedItem.getText() === this.getResourceBundle().getText("xbut.buttonUnassign")) {
				//unassign
				this._deleteAssignment(this.getModel(), oData.Guid, sPath);
			} else if (oSelectedItem.getText() === this.getResourceBundle().getText("xbut.buttonReassign")) {
				//reassign
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), true, [sDataModelPath], false, mParameters,
					"ganttShapeReassignment");
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
			this._ganttChart.setAxisTimeStrategy(this._createGanttHorizon(this._axisTime.getZoomLevel(), {
				StartDate: this.getView().byId("idDateRangeGantt2").getDateValue(),
				EndDate: this.getView().byId("idDateRangeGantt2").getSecondDateValue()
			}));
			this.getModel("user").setProperty("/DEFAULT_GANT_START_DATE", oEvent.getParameter("from"));
			this.getModel("user").setProperty("/DEFAULT_GANT_END_DATE", oEvent.getParameter("to"));
			this._loadGanttData();
		},
		/**
		 * Opens the resource qualification dialog 
		 */
		onResourceIconPress: function (oEvent) {
			var oRow = oEvent.getSource().getParent(),
				oContext = oRow.getBindingContext(),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				oResourceNode = oModel.getProperty(sPath),
				sObjectId = oResourceNode.NodeId;

			if (oResourceNode.NodeType !== "ASSIGNMENT") {
				this.getOwnerComponent().ResourceQualifications.open(this.getView(), sObjectId);
			}
		},
		/**
		 * Open's Dialog containing assignments to reassign
		 * @param oEvent
		 */
		onPressReassign: function (oEvent) {
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");
			this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, false, this._mParameters);
		},
		/**
		 * Open's Dialog containing assignments to unassign
		 * @param oEvent
		 */
		onPressUnassign: function (oEvent) {
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");
			this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, true, this._mParameters);
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

			this.getOwnerComponent().manageAvail.open(this.getView(), [this.selectedResources[0]], this._mParameters);

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

			this.getOwnerComponent().manageAvail.open(this.getView(), [this.selectedResources[0]], this._mParameters, "timeAlloc");

		},

		/**
		 * on click on today adjust the view of Gantt horizon.
		 */
		onPressToday: function (oEvent) {
			this.changeGanttHorizonViewAt(this.getModel("viewModel"), this._axisTime.getZoomLevel(), this._axisTime);
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
			this.getModel("ganttModel").setProperty(sPath + "/IsSelected", oParams.selected);

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
			var oData = this.getModel("ganttModel").getProperty(this.selectedResources[0]);

			if (this.selectedResources.length === 1 && oData && oData.NodeType === "RESOURCE" && oData.ResourceGuid !== "" && oData.ResourceGroupGuid !==
				"") {
				this.byId("idButtonCreUA").setEnabled(true);
				this.byId("idButtonTimeAlloc").setEnabled(true);
			} else {
				this.byId("idButtonCreUA").setEnabled(false);
				this.byId("idButtonTimeAlloc").setEnabled(false);
			}

		},
		/* =========================================================== */
		/* intern methods                                              */
		/* =========================================================== */

		/**
		 * initialize context menu first time
		 */
		_initContextMenu: function () {
			if (!this._oContextMenu) {
				Fragment.load({
					name: "com.evorait.evoplan.view.gantt.fragments.ShapeContextMenu",
					controller: this
				}).then(function (oDialog) {
					this._oContextMenu = oDialog;
					this.getView().addDependent(this._oContextMenu);
				}.bind(this));
			}
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
				oSourceData.DateFrom = oParams.newDateTime;
				oSourceData.DateTo = newEndDate.toDate();
			}
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
			var oData = oContext.getObject();
			if (oData.DEMAND_STATUS !== "COMP") {
				this._getRelatedDemandData(oData).then(function (oResult) {
					oData.sPath = oContext.getPath();
					this.oGanttModel.setProperty(oData.sPath + "/Demand", oResult.Demand);
					this.oViewModel.setProperty("/ganttSettings/shapeData", oData);
					var eDock = Popup.Dock;
					this._oContextMenu.open(true, oShape, eDock.BeginTop, eDock.endBottom, oShape);
				}.bind(this));
			}
		},

		/**
		 * when shape was dragged or resized to another place
		 * update assignment
		 * @param {String} sPath
		 * @param {String} sRequestType
		 */
		_updateDraggedShape: function (sPath, sRequestType) {
			this.oGanttModel.setProperty(sPath + "/busy", true);
			var oData = this.oGanttModel.getProperty(sPath);
			//get demand details to this assignment
			this._getRelatedDemandData(oData).then(function (oResult) {
				this.oGanttModel.setProperty(sPath + "/Demand", oResult.Demand);
				this._validateAndSendChangedData(sPath, sRequestType).then(null, function () {
					//on reject validation or user don't want proceed
					this.oGanttModel.setProperty(sPath + "/busy", false);
					this._resetChanges(sPath);
				}.bind(this));
			}.bind(this), function (oError) {
				this.oGanttModel.setProperty(sPath + "/busy", false);
				this._resetChanges(sPath);
			}.bind(this));
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

				if (!this._validateChangedData(sPath, oPendingChanges[sPath], oData, sType)) {
					this._resetChanges(sPath);
					reject();
				}
				//when user wants proceed check qualification
				if (this.getModel("user").getProperty("/ENABLE_QUALIFICATION")) {
					this._checkQualificationForChangedShapes(sPath, oPendingChanges[sPath], oData).then(function () {
						this._proceedWithUpdateAssignment(sPath, sType, oPendingChanges, oData).then(resolve, reject);
					}.bind(this), reject);
				} else {
					this._proceedWithUpdateAssignment(sPath, sType, oPendingChanges, oData).then(resolve, reject);
				}
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
				this.clearMessageModel();
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
							this.oGanttOriginDataModel.setProperty(sPath, oResData);
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
		 * @param {Object} oChanges only changed data
		 * @param {Object} oData whole assignment data
		 * @param {String} sType from this._mRequestTypes
		 */
		_validateChangedData: function (sPath, oChanges, oData, sType) {
			return new Promise(function (resolve, reject) {
				var sDisplayMessage = "";
				//when shape was resized
				if (sType === this.mRequestTypes.resize) {
					this._validateShapeOnResize(oData).then(null, reject);
				}

				//is re-assign allowed
				if (this.mRequestTypes.reassign === sType && !oData.Demand.ALLOW_REASSIGN) {
					sDisplayMessage = this.getResourceBundle().getText("reAssignFailMsg");
					this._showAssignErrorDialog([oData.Description], null, sDisplayMessage);
					return reject(sDisplayMessage);
				}
				//has it a new parent
				if (this.mRequestTypes.reassign === sType && oChanges.ResourceGuid) {
					var oNewParent = this.oGanttModel.getProperty(oChanges.NewAssignPath);
					if (!this.isAssignable({
							data: oNewParent
						})) {
						return reject("Parent not assignable");
					}
					//is parent not available then show warning and ask if they want proceed
					if (!this.isAvailable(null, oNewParent)) {
						this.showMessageToProceed().then(resolve, reject);
					}
				}
			}.bind(this));
		},

		/**
		 * when shape was dragged to another place
		 * validate qualification for this resource node
		 * @param {String} sPath - path of assignment in Gantt Model
		 * @param {Object} oChanges - pending changes of this assignment in GanttModel
		 * @param {Object} oData - full assignment data with Demand data
		 */
		_checkQualificationForChangedShapes: function (sPath, oChanges, oData) {
			return new Promise(function (resolve, reject) {
				var sTargetPath = oData.NewAssignPath ? oData.NewAssignPath : oChanges.OldAssignPath;
				var oTargetData = this.oGanttModel.getProperty(sTargetPath);
				this._sendCheckQualification(null, oTargetData, oData.DateFrom, oData.DateTo, [oData.Demand.Guid], null).then(resolve, reject);
			}.bind(this));
		},
		/**
		 * Proceed to Qualification Check for Demand Assignment/Reassignment/Update, before Service call (Call Function Import) 
		 * @param {Object} aSourcePaths Demand paths
		 * @param {Object} oTarget Resource Path
		 * @param {Object} oTargetDate Target date of assignment
		 * @param {Object} oNewEndDate new end date from streach validation
		 * @param {Object} aGuids Array of demand paths in case of split window
		 * @param {Object} mParameters parameters for function import
		 * @private
		 */
		_checkResourceQualification: function (aSourcePaths, oTarget, oTargetDate, oNewEndDate, aGuids, mParameters) {
			return new Promise(function (resolve, reject) {
				var oTargetObject = this.getModel("ganttModel").getProperty(oTarget);
				this._sendCheckQualification(aSourcePaths, oTargetObject, oTargetDate, oNewEndDate, aGuids, mParameters).then(resolve, reject);
			}.bind(this));
		},

		/**
		 * Proceed to Qualification Check for Demand Assignment/Reassignment/Update, before Service call (Call Function Import) 
		 * @param {Object} aSourcePaths Demand paths
		 * @param {Object} oTargetObject Resource Path
		 * @param {Object} oTargetDate Target date of assignment
		 * @param {Object} oNewEndDate new end date from streach validation
		 * @param {Object} aGuids Array of demand paths in case of split window
		 * @param {Object} mParameters parameters for function import
		 */
		_sendCheckQualification: function (aSourcePaths, oTargetObject, oTargetDate, oNewEndDate, aGuids, mParameters) {
			return new Promise(function (resolve, reject) {
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
						this.getOwnerComponent().QualificationCheck.open(this, this.getView(), {}, resolve, reject);
					} else {
						resolve();
					}
				}.bind(this));
			}.bind(this));
		},

		/**
		 * validate shape data on resize
		 * @param {String} sPath
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
					this._showConfirmMessageBox(this.getResourceBundle().getText("xtit.effortvalidate")).then(function (data) {
						return data === sap.m.MessageBox.Action.YES ? resolve() : reject();
					});
				} else {
					resolve();
				}
			}.bind(this));
		},
		/**
		 * Calls the respective function import to create assignments
		 * @param {Object} oResourceData - Resource data on which demand is dropped
		 * @param {Object} aSources - Dragged Demand paths
		 * @param {Object} oTarget Dropped Resource Path
		 * @param {Object} oTargetDate - Target date and time when the demand is dropped
		 * @param {Object} aGuids Array of guids in case of split window 
		 * @private
		 */
		_validateDemands: function (oResourceData, aSources, oTarget, oTargetDate, aGuids) {
			var oUserData = this.getModel("user").getData();

			var sDummyPath = this._createDummyAssignment(oTarget, oTargetDate);
			this.oGanttModel.setProperty(sDummyPath + "/busy", true);

			if (oUserData.ENABLE_RESOURCE_AVAILABILITY && oUserData.ENABLE_ASSIGNMENT_STRETCH && oUserData.ENABLE_QUALIFICATION) {

				this._checkAssignmentForStretch(oResourceData, aSources, oTarget, oTargetDate, aGuids).then(function (oEndDate) {
					this._checkResourceQualification(aSources, oTarget, oTargetDate, oEndDate, aGuids).then(function (data) {
						Promise.all(this.assignedDemands(aSources, oTarget, oTargetDate, oEndDate, aGuids))
							.then(function (data) {
								this._addCreatedAssignment(data[0], oTarget, sDummyPath);
							}.bind(this)).catch(function (error) {});
					}.bind(this), function () {
						this.oGanttModel.setProperty(sDummyPath, null);
						this.oGanttModel.setProperty(sDummyPath + "/busy", false);
					}.bind(this));
				}.bind(this), function () {
					this.oGanttModel.setProperty(sDummyPath, null);
					this.oGanttModel.setProperty(sDummyPath + "/busy", false);
				}.bind(this));

			} else if (oUserData.ENABLE_RESOURCE_AVAILABILITY && oUserData.ENABLE_ASSIGNMENT_STRETCH && !oUserData.ENABLE_QUALIFICATION) {

				this._checkAssignmentForStretch(oResourceData, aSources, oTarget, oTargetDate, aGuids).then(function (oEndDate) {
					Promise.all(this.assignedDemands(aSources, oTarget, oTargetDate, oEndDate, aGuids))
						.then(function (data) {
							this._addCreatedAssignment(data[0], oTarget, sDummyPath);
						}.bind(this), function () {
							this.oGanttModel.setProperty(sDummyPath, null);
							this.oGanttModel.setProperty(sDummyPath + "/busy", false);
						}.bind(this));
				}.bind(this));

			} else if (oUserData.ENABLE_QUALIFICATION) {

				this._checkResourceQualification(aSources, oTarget, oTargetDate, null, aGuids).then(function (data) {
					Promise.all(this.assignedDemands(aSources, oTarget, oTargetDate, null, aGuids))
						.then(function (data) {
							this._addCreatedAssignment(data[0], oTarget, sDummyPath);
						}.bind(this), function () {
							this.oGanttModel.setProperty(sDummyPath, null);
							this.oGanttModel.setProperty(sDummyPath + "/busy", false);
						}.bind(this));
				}.bind(this));

			} else {
				Promise.all(this.assignedDemands(aSources, oTarget, oTargetDate, null, aGuids))
					.then(function (data) {
						this._addCreatedAssignment(data[0], oTarget, sDummyPath);
					}.bind(this));
			}
		},
		/**
		 * Proceed to assignment with Stretch, check if Date Time is not valid
		 * @param {Object} aSources Demand paths
		 * @param {Object} oTarget Resource Path
		 * @private
		 */
		_checkAssignmentForStretch: function (oResourceData, aSources, oTarget, oTargetDate, aGuids, fnCheckValidation) {
			var oResourceModel = this.getResourceBundle();
			return new Promise(function (resolve, reject) {
				if (oResourceData.NodeType !== "RES_GROUP" && (oResourceData.NodeType === "RESOURCE" && oResourceData.ResourceGuid &&
						oResourceData.ResourceGuid !== "")) {

					this._checkAvailability(aSources, oTarget, oTargetDate, aGuids).then(function (availabilityData) {
						if (!availabilityData.Unavailable) {
							resolve(availabilityData.Endtimestamp);
						} else {
							this._showConfirmMessageBox(oResourceModel.getText("ymsg.extendMsg")).then(function (value) {
								if (value === "YES") {
									resolve(availabilityData.Endtimestamp);
								} else {
									resolve(availabilityData.EndtimestampWithstretch);
								}
							}.bind(this));
						}
					}.bind(this), function () {
						reject();
					});
				} else {
					resolve();
				}
			}.bind(this));

		},
		/**
		 * Creating dummy assignment
		 * @param {Object} sTargetPath Target path for the resource
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
		 * @param data {Object} Response from function import
		 * @param sTargetPath {string} target path of resource
		 */
		_addCreatedAssignment: function (data, sTargetPath, sDummyPath) {
			if (data.Guid === "") {
				this.oGanttModel.setProperty(sDummyPath, null);
				return;
			}
			this.oGanttModel.setProperty(sDummyPath + "/busy", false);
			this.oGanttModel.setProperty(sDummyPath, data);
			this.oGanttOriginDataModel.setProperty(sDummyPath, data);
			if (this._routeName !== Constants.GANTT.SPLIT) {
				this._oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
			}
			this.oGanttModel.refresh();
		},
		/**
		 * Change view horizon time at specified timestamp
		 * @param oModel {object} viewModel
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

			//Setting VisibleHorizon for Gantt for supporting Patch Versions (1.71.35)
			if (oAxisTimeStrategy) {
				oAxisTimeStrategy.setVisibleHorizon(new sap.gantt.config.TimeHorizon({
					startTime: sStartDate,
					endTime: sEndDate
				}));
			} else {
				this.oViewModel.setProperty("/ganttSettings/visibleStartTime", sStartDate);
				this.oViewModel.setProperty("/ganttSettings/visibleEndTime", sEndDate);
			}
		},
		/**
		 * load tree data from a certain hierarchy level
		 * resolve returns increased level by step 1
		 * @params iLevel
		 */
		_loadTreeData: function (iLevel) {
			return new Promise(function (resolve) {
				var sEntitySet = "/GanttResourceHierarchySet",
					aFilters = [],
					mParams = {
						"$expand": "AssignmentSet,ResourceAvailabilitySet"
					},
					oUserData = this.getModel("user").getData();

				aFilters.push(new Filter("HierarchyLevel", FilterOperator.EQ, iLevel));
				aFilters.push(new Filter("StartDate", FilterOperator.LE, formatter.date(oUserData.DEFAULT_GANT_END_DATE)));
				aFilters.push(new Filter("EndDate", FilterOperator.GE, formatter.date(oUserData.DEFAULT_GANT_START_DATE)));
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
		 * 
		 */
		_loadGanttData: function () {
			//expanded level is 1 so load at first 0 and 1 hirarchy levels
			this._treeTable.setBusy(true);
			this._loadTreeData(0)
				.then(this._loadTreeData.bind(this))
				.then(function () {
					this._treeTable.expandToLevel(1);
					this._treeTable.setBusy(false);
					this._changeGanttHorizonViewAt(this._axisTime.getZoomLevel(), this._axisTime);
					this.oGanttOriginDataModel.setProperty("/data", _.cloneDeep(this.oGanttModel.getProperty("/data")));
					// this._addAssociations.bind(this)();
				}.bind(this));
		},
		/**
		 * when data was loaded then children needs added to right parent node
		 * @param iLevel
		 * @param oResData
		 */
		_addChildrenToParent: function (iLevel, oResData) {
			var aChildren = this.oGanttModel.getProperty("/data/children");
			var callbackFn = function (oItem) {
				oItem.children = [];
				oResData.forEach(function (oResItem) {
					if (oItem.NodeId === oResItem.ParentNodeId) {
						//add assignments as children in tree for expanding
						/*if (oResItem.AssignmentSet && oResItem.AssignmentSet.results.length > 0) {
							oResItem.children = oResItem.AssignmentSet.results;
							oResItem.children.forEach(function (oAssignItem, idx) {
								oResItem.AssignmentSet.results[idx].NodeType = "ASSIGNMENT";
								oResItem.AssignmentSet.results[idx].ResourceAvailabilitySet = oResItem.ResourceAvailabilitySet;
								var clonedObj = _.cloneDeep(oResItem.AssignmentSet.results[idx]);
								oResItem.children[idx].AssignmentSet = {
									results: [clonedObj]
								};
							});
						}*/
						oItem.children.push(oResItem);
					}
				});
			};
			aChildren = this._recurseChildren2Level(aChildren, iLevel, callbackFn);
			this.oGanttModel.setProperty("/data/children", aChildren);
		},

		/**
		 * loop trough all nested array of children
		 * When max level for search was reached execute callbackFn
		 * @param aChildren
		 * @param iMaxLevel
		 * @param callbackFn
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
				oUserData = this.getModel("user").getData(),
				aPromises = [];

			aFilters.push(new Filter("DateFrom", FilterOperator.LE, formatter.date(oUserData.DEFAULT_GANT_END_DATE)));
			aFilters.push(new Filter("DateTo", FilterOperator.GE, formatter.date(oUserData.DEFAULT_GANT_START_DATE)));
			this.getModel().setUseBatch(false);
			aPromises.push(this.getOwnerComponent().readData("/AssignmentSet", aFilters));
			aPromises.push(this.getOwnerComponent().readData("/ResourceAvailabilitySet", aFilters));
			this._treeTable.setBusy(true);
			Promise.all(aPromises).then(function (data) {
				this._addAssignemets(data[0].results);
				this._addAvailabilities(data[1].results);
				this.getModel().setUseBatch(true);
				this._treeTable.setBusy(false);
				this.oGanttOriginDataModel.setProperty("/data", _.cloneDeep(this.oGanttModel.getProperty("/data")));
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
				//update ganttModels with results from function import
				var aFilters = [],
					oUserData = this.getModel("user").getData(),
					aPromises = [];

				aFilters.push(new Filter("DateFrom", FilterOperator.LE, formatter.date(oUserData.DEFAULT_GANT_END_DATE)));
				aFilters.push(new Filter("DateTo", FilterOperator.GE, formatter.date(oUserData.DEFAULT_GANT_START_DATE)));
				this.getModel().setUseBatch(false);
				aPromises.push(this.getOwnerComponent().readData("/AssignmentSet", aFilters));
				this._treeTable.setBusy(true);
				Promise.all(aPromises).then(function (data) {
					this._addAssignemets(data[0].results);
					this.getModel().setUseBatch(true);
					this._treeTable.setBusy(false);
					this.oGanttOriginDataModel.setProperty("/data", _.cloneDeep(this.oGanttModel.getProperty("/data")));
				}.bind(this));
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
				aFilters = [],
				oUserData = this.getModel("user").getData();
			if (sChannel === "BaseController" && sEvent === "refreshAvailabilities") {
				aFilters.push(new Filter("DateFrom", FilterOperator.LE, formatter.date(oUserData.DEFAULT_GANT_END_DATE)));
				aFilters.push(new Filter("DateTo", FilterOperator.GE, formatter.date(oUserData.DEFAULT_GANT_START_DATE)));
				aFilters.push(new Filter("ResourceGuid", FilterOperator.EQ, oData.resource));
				this.getOwnerComponent().readData("/ResourceAvailabilitySet", aFilters).then(function (data) {
					this.oGanttModel.setProperty(sSelectedResourcePath + "/ResourceAvailabilitySet/results", data.results);
					this.oGanttOriginDataModel.setProperty(sSelectedResourcePath + "/ResourceAvailabilitySet/results", data.results);
					this.oGanttModel.refresh();
					this._resetSelections();
				}.bind(this));
			}
		},
		/**
		 * Adding assignemnts into Gantt data in Gantt Model 
		 * @Author Rahul
		 */
		_addAssignemets: function (aAssignments) {
			var aGanttData = this.oGanttModel.getProperty("/data/children");
			for (let i = 0; i < aGanttData.length; i++) {
				var aResources = aGanttData[i].children;
				for (let j = 0; j < aResources.length; j++) {
					var oResource = aResources[j];
					oResource.AssignmentSet.results = [];
					for (var k in aAssignments) {
						if (oResource.NodeId === aAssignments[k].ObjectId) {
							// aAssignments[k].NodeType = "ASSIGNMENT";
							// aAssignments[k].AssignmentSet = {};
							// aAssignments[k].AssignmentSet.results = [aAssignments[k]];
							oResource.AssignmentSet.results.push(aAssignments[k]);
						}
					}
					// oResource.children = _.cloneDeep(oResource.AssignmentSet.results);
				}
			}
			this.oGanttModel.refresh();
		},
		/**
		 * Adding avaialbilities into Gantt data in Gantt Model 
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
		}

	});

});