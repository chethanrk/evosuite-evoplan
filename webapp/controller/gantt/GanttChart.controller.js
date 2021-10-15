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

			if (this._userData.ENABLE_RESOURCE_AVAILABILITY) {
				this._ganttChart.addStyleClass("resourceGanttWithTable");
			}

			// dirty fix will be removed when evoplan completly moved to 1.84
			if (parseFloat(sap.ui.getVersionInfo().version) === 1.71) {
				this._axisTime.setZoomLevel(3);
			}

			this._viewId = this.getView().getId();
			this.getOwnerComponent().GanttResourceFilter.init(this.getView(), this._treeTable);
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
				msg = this.getResourceBundle().getText("msg.ganttShapeDropError");

			if (!oParams.targetRow && !oParams.targetShape) {
				this.showMessageToast(msg);
				return;
			}
			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");
			//get target data
			var oTargetContext = oParams.targetRow ? oParams.targetRow.getBindingContext("ganttModel") : oParams.targetShape.getParent().getParent()
				.getBindingContext("ganttModel"),
				oTargetData = oTargetContext ? oTargetContext.getObject() : null,
				oDraggedShapeDates = oParams.draggedShapeDates;

			// If you drop in empty gantt area where there is no data OR assign is not allowed
			if (!oTargetData || !this.isAssignable({
					data: oTargetData
				})) {
				this.showMessageToast(msg);
				return;
			}
			//could be multiple shape pathes
			for (var key in oDraggedShapeDates) {
				var sSourcePath = Utility.parseUid(key).shapeDataName,
					sTargetPath = oTargetContext.getPath(),
					oSourceData = this.getModel("ganttModel").getProperty(sSourcePath),
					sRequestType = oSourceData.ObjectId !== oTargetData.NodeId ? this.mRequestTypes.reassign : this.mRequestTypes.update;

				//set new time and resource data to gantt model, setting also new pathes
				this._setShapeDropData(sSourcePath, sTargetPath, oDraggedShapeDates[key], oParams);
				//get demand details to this assignment
				this._getRelatedDemandData(oSourceData).then(function (oResult) {
					this.oGanttModel.setProperty(oSourceData.sPath + "/Demand", oResult.Demand);
					return this._validateAndSendChangedData(oSourceData.sPath, sRequestType); //validate and save data
				}.bind(this), function (oError) {
					this._resetChanges(oSourceData.sPath);
				}.bind(this));
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
				oData = oRowContext.getObject(),
				sPath = oRowContext.getPath(),
				oShape = oParams.shape;

			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");
			this.oGanttModel.setProperty(sPath + "/DateFrom", oParams.newTime[0]);
			this.oGanttModel.setProperty(sPath + "/DateTo", oParams.newTime[1]);

			if (oShape && oShape.sParentAggregationName === "shapes3") {
				this._showBusyForShape(oShape, true);
				this._getRelatedDemandData(oData).then(
					function (oResult) {
						this.oGanttModel.setProperty(sPath + "/Demand", oResult.Demand);
						this._validateAndSendChangedData(sPath, this.mRequestTypes.resize).then(function () {
							this._showBusyForShape(oShape, false);
						}.bind(this));
					}.bind(this),
					function (oError) {
						this._showBusyForShape(oShape, false);
						this._resetChanges(sPath);
					}.bind(this));
			}
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
				return "#FFF";
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
		/* =========================================================== */
		/* intern methods                                              */
		/* =========================================================== */

		/**
		 * set onShapeDrop data to new target
		 * @param {String} sSourcePath - source oGanttModel path
		 * @param {Object} oTargetPath - target oGanttModel path
		 * @param {Object} oDraggedShapeData - data from one dragged shape
		 * @param {Object} oParams - onShapeDrop parameters
		 */
		_setShapeDropData: function (sSourcePath, sTargetPath, oDraggedShapeData, oParams) {
			var oSourceData = this.oGanttModel.getProperty(sSourcePath),
				oTargetData = this.oGanttModel.getProperty(sTargetPath);

			var oSourceStartDate = moment(oDraggedShapeData.time),
				oSourceEndDate = moment(oDraggedShapeData.endTime),
				duration = oSourceEndDate.diff(oSourceStartDate, "seconds"),
				newEndDate = moment(oParams.newDateTime).add(duration, "seconds");

			oSourceData.DateFrom = oParams.newDateTime;
			oSourceData.DateTo = newEndDate.toDate();
			oSourceData.sSourcePath = sSourcePath;
			oSourceData.sPath = sSourcePath;

			if (oTargetData.ResourceGuid !== oSourceData.ResourceGuid) {
				var sSourceParentPath = sSourcePath.split("/AssignmentSet/results/")[0];
				oSourceData.ResourceGuid = oTargetData.ResourceGuid;
				oSourceData.ResourceGroupGuid = oTargetData.ResourceGroupGuid;
				oSourceData.NewAssignPath = sTargetPath;
				oSourceData.OldAssignPath = sSourceParentPath;

				//move assignment to new parent in Gantt view
				var aTargetAssignments = this.oGanttModel.getProperty(sTargetPath + "/AssignmentSet/results"),
					aSourceAssignments = this.oGanttModel.getProperty(sSourceParentPath + "/AssignmentSet/results");
				for (var i = 0; i < aSourceAssignments.length; i++) {
					if (aSourceAssignments[i].ObjectId === oSourceData.ObjectId) {
						aSourceAssignments.splice(i, 1);
						aTargetAssignments.push(oSourceData);
						oSourceData.sPath = sTargetPath + "/AssignmentSet/results/" + (aTargetAssignments.length - 1);
						break;
					}
				}
			}
		},

		/**
		 * Resets a changed data by model path
		 * Or when bResetAll then all changes are resetted
		 * @param sPath
		 * @param bResetAll
		 */
		_resetChanges: function (sPath, bResetAll) {
			var oPendingChanges = this.oGanttModel.getProperty("/pendingChanges");
			if (oPendingChanges[sPath]) {
				if (!this._resetNewPathChanges(oPendingChanges[sPath])) {
					var oOriginData = this.oGanttOriginDataModel.getProperty(sPath);
					this.oGanttModel.setProperty(sPath, _.cloneDeep(oOriginData));
				}
				delete oPendingChanges[sPath];

			} else if (bResetAll) {
				for (var key in oPendingChanges) {
					if (!this._resetNewPathChanges(oPendingChanges[sPath])) {
						this.oGanttModel.setProperty(key, _.cloneDeep(this.oGanttOriginDataModel.getProperty(key)));
					}
				}
				this.oGanttModel.setProperty("/pendingChanges", {});
			}
		},

		/**
		 * resets data when there was a path changes of shapes
		 * @param {Object} oPendings - GanttModel path /pendingChanges
		 */
		_resetNewPathChanges: function (oPendings) {
			if (oPendings.NewAssignPath) {
				this.oGanttModel.setProperty(oPendings.NewAssignPath, _.cloneDeep(this.oGanttOriginDataModel.getProperty(oPendings.NewAssignPath)));
				this.oGanttModel.setProperty(oPendings.OldAssignPath, _.cloneDeep(this.oGanttOriginDataModel.getProperty(oPendings.OldAssignPath)));
				return true;
			}
			return false;
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
				if (oOriginData[key] !== oData[key] && !oData[key].hasOwnProperty("__deferred") && !oData[key].hasOwnProperty("Demand")) {
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

				if (!this._validateChangedData(oPendingChanges[sPath], oData, sType)) {
					this._resetChanges(sPath);
					reject();
				}
				this.clearMessageModel();
				var oParams = this._getAssignFnImportObj(oData);

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
						resolve(oResData);
					}.bind(this),
					function (oError) {
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
		_validateChangedData: function (oChanges, oData, sType) {
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
					reject();
				}
				//has it a new parent
				if (this.mRequestTypes.reassign === sType && oChanges.ResourceGuid) {
					var oNewParent = this.oGanttModel.getProperty(oChanges.NewAssignPath);
					if (!this.isAssignable({
							data: oNewParent
						})) {
						reject();
					}
					//is parent not available then show warning and ask if they want proceed
					if (!this.isAvailable(null, oNewParent)) {
						this.showMessageToProceed().then(function () {
							//yes proceed please
							resolve();
						}, reject);
					}
				}
				//todo check qualification
				return resolve();
			}.bind(this));
		},

		/**
		 * validate shape data on resize
		 * @param {Object} oShape
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
						if (data === sap.m.MessageBox.Action.YES) {
							resolve();
						} else {
							reject();
						}
					}.bind(this));
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

			if (oUserData.ENABLE_RESOURCE_AVAILABILITY && oUserData.ENABLE_ASSIGNMENT_STRETCH && oUserData.ENABLE_QUALIFICATION) {
				// TODO Valiate Stretch and qualifications
				Promise.all(this.assignedDemands(aSources, oTarget, oTargetDate, null, aGuids))
					.then(function (data) {
						console.log(data);
						// TODO Push the new assignment into both the model
					}).catch(function (error) {});
			} else if (oUserData.ENABLE_RESOURCE_AVAILABILITY && oUserData.ENABLE_ASSIGNMENT_STRETCH && !oUserData.ENABLE_QUALIFICATION) {
				// TODO Validate the Stretch
			} else if (oUserData.ENABLE_QUALIFICATION) {
				// TODO Validate the qualifications
			} else {
				// TODO No validation is required the demand can assigned directly
			}
		},

		/**
		 * prepare object for function import call
		 * @param oData
		 * @return Object
		 */
		_getAssignFnImportObj: function (oData) {
			return {
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
				console.log(data);
				this._addAssignemets(data[0].results);
				this._addAvailabilities(data[1].results);
				this.getModel().setUseBatch(true);
				this._treeTable.setBusy(false);
				this.oGanttOriginDataModel.setProperty("/data", _.cloneDeep(this.oGanttModel.getProperty("/data")));
			}.bind(this));
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
		}

	});

});