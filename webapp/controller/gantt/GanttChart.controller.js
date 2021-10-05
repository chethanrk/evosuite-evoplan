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
			reassign: "reassign",
			unassign: "unassign"
		},

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 */
		onInit: function () {
			this._oAssignementModel = this.getModel("assignment");
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
					//Todo refresh assignments & availabilities
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
		},

		/* =========================================================== */
		/* event methods                                               */
		/* =========================================================== */

		/**
		 * @param oEvent
		 */
		onShapeDrop: function (oEvent) {
			var oParams = oEvent.getParameters();
			if (!oParams.targetRow && !oParams.targetShape) {
				return;
			}

			var oTargetContext = oParams.targetRow ? oParams.targetRow.getBindingContext("ganttModel") : oParams.targetShape.getParent().getParent()
				.getBindingContext("ganttModel"),
				oTargetData = oTargetContext ? oTargetContext.getObject() : null,
				oDraggedShape = oParams.draggedShapeDates;

			console.log("blub");

			for (var key in oDraggedShape) {
				var sSourcePath = Utility.parseUid(key).shapeDataName;
				this._validateShapeData(key, sSourcePath, oTargetData, oDraggedShape, oParams);
			}
		},
		/**
		 * when shape was resized
		 * @param oEvent
		 */
		onShapeResize: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oRowContext = oParams.shape.getBindingContext("ganttModel"),
				oData = oRowContext.getObject(),
				iNewEffort = this.getTimeDifference(oParams.newTime[0], oParams.newTime[1]),
				bEnableResizeEffortCheck = this.oUserModel.getProperty("/ENABLE_RESIZE_EFFORT_CHECK");

			// to identify the action done on respective page
			localStorage.setItem("Evo-Action-page", "ganttSplit");

			if (oParams.shape && oParams.shape.sParentAggregationName === "shapes3") {
				if (!oData.AllowChange) {
					return;
				}

				oData.DateFrom = oParams.newTime[0];
				oData.DateTo = oParams.newTime[1];
				this.oViewModel.setProperty("/ganttSettings/busy", true);
				//resized effort needs validated
				if (bEnableResizeEffortCheck && iNewEffort < oData.Effort) {
					this._showConfirmMessageBox(this.getResourceBundle().getText("xtit.effortvalidate"))
						.then(function (data) {
							if (data === "YES") {
								this.updateAssignment(oRowContext.getPath());
								return;
							}
						}.bind(this));
				} else {
					this.updateAssignment(oRowContext.getPath());
					return;
				}
				this.oViewModel.setProperty("/ganttSettings/busy", false);
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
			this.getModel("user").setProperty("/GANT_START_DATE", oEvent.getParameter("from"));
			this.getModel("user").setProperty("/GANT_END_DATE", oEvent.getParameter("to"));
			this._loadGanttData();
		},
		/* =========================================================== */
		/* intern methods                                              */
		/* =========================================================== */

		/**
		 * validate droped data if there can really created for this date and resource
		 */
		_validateShapeData: function (sKey, sSourcePath, oTargetData, oDraggedShape, oParams) {
			console.log(sKey);
			var oSourceData = this.oGanttModel.getProperty(sSourcePath);

			console.log(oTargetData);

			if (oTargetData.NodeType === "ASSIGNMENT") {
				this._setShapeStartEndDate(sSourcePath, oDraggedShape[sKey], oParams.newDateTime);
			}
			if (oTargetData.ResourceGuid !== oSourceData.ResourceGuid) {
				//Todo set new parent
				//this._setShapeParent(sSourcePath, oTargetData.ResourceGuid);
			}
			//this._updatePendingChanges(sSourcePath, this.mRequestTypes.update);
			//this._setNewAssignmentData(oData, oRowContext.getPath());
		},

		/**
		 * sets new start and end date for assignment
		 * @param sPath
		 * @param mParams
		 * @param newDateTime
		 */
		_setShapeStartEndDate: function (sPath, mParams, newDateTime) {
			var oSourceStartDate = moment(mParams.time),
				oSourceEndDate = moment(mParams.endTime),
				duration = oSourceEndDate.diff(oSourceStartDate, "seconds"),
				newEndDate = moment(newDateTime).add(duration, "seconds");

			this.oGanttModel.setProperty(sPath + "/DateFrom", mParams.time);
			this.oGanttModel.setProperty(sPath + "/DateTo", newEndDate.toDate());
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
				var oOriginData = this.oGanttOriginDataModel.getProperty(sPath);
				this.oGanttModel.setProperty(sPath, _.cloneDeep(oOriginData));
				delete oPendingChanges[sPath];

			} else if (bResetAll) {
				for (var key in oPendingChanges) {
					this.oGanttModel.setProperty(key, _.cloneDeep(this.oGanttOriginDataModel.getProperty(key)));
				}
				this.oGanttModel.setProperty("/pendingChanges", {});
			}
		},

		/**
		 * set changed values in another object with object path
		 * @param sPath Json model path
		 * @param sType
		 */
		_updatePendingChanges: function (sPath, sType) {
			var oData = this.oGanttModel.getProperty(sPath),
				oOriginData = this.oGanttOriginDataModel.getProperty(sPath),
				oPendingChanges = this.oGanttModel.getProperty("/pendingChanges"),
				oUpdateObj = oPendingChanges[sPath];

			//is thre already some changed data for this path?
			if (!oUpdateObj) {
				oPendingChanges[sPath] = {
					isCreate: sType === this.mRequestTypes.create,
					isUpdate: sType === this.mRequestTypes.update,
					isDelete: sType === this.mRequestTypes.unassign
				};
			}
			for (var key in oData) {
				if (oOriginData[key] !== oData[key] && !oData[key].hasOwnProperty("__deferred")) {
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
		 * set changed data to assignment model
		 * @param oData
		 */
		updateAssignment: function (sPath, sType) {
			return new Promise(function (resolve, reject) {
				var oPendingChanges = this._updatePendingChanges(sPath, sType),
					oData = this.oGanttModel.getProperty(sPath),
					sDisplayMessage = "";

				if (this.mRequestTypes.reassign && !oData.AllowReassign) {
					sDisplayMessage = this.getResourceBundle().getText("reAssignFailMsg");
					this._showAssignErrorDialog([oData.Description], null, sDisplayMessage);
					reject({
						error: sDisplayMessage
					});
				}

				this.clearMessageModel();
				//Todo
				var oParams = this._getAssignFnImportObj(oData);
				if (this.mRequestTypes.reassign && oData.NewAssignPath) {
					oParams.ResourceGroupGuid = oPendingChanges[sPath].ResourceGroupGuid;
					oParams.ResourceGuid = oPendingChanges[sPath].ResourceGroupGuid;
				}

			}.bind(this));

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
				AssignmentGUID: oData.AssignmentGuid,
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

					console.log(this.oGanttModel.getProperty("/data"));
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
		}

	});

});