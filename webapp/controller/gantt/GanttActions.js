/* globals _ */
sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Token",
	"sap/m/Tokenizer",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast"
], function (AssignmentsController, formatter, Filter, FilterOperator, Token, Tokenizer, Fragment, MessageToast) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.gantt.GanttActions", {

		/**
		 * formatter for for Gantt view
		 */
		isBusyShape: function (bAllowProperty, bIsBusy) {
			return bAllowProperty && !bIsBusy;
		},

		/**
		 * get full path off assignment 
		 * @param {String} Guid
		 */
		_getAssignmentDataModelPath: function (Guid) {
			return "/" + this.getModel().createKey("AssignmentSet", {
				Guid: Guid
			});
		},
		/**
		 * multi assignments of demands
		 * Preceed to assignment 
		 * @param oResourceData
		 * @param aSource
		 * @param oTarget
		 * @param oTargetDate
		 * @param aFixedAppointmentObjects
		 */
		AssignMultipleDemands: function (oResourceData, aSources, oTarget, oTargetDate, aFixedAppointmentObjects) {
			var oModel = this.getModel(),
				aPromises = [],
				oDemandObj,
				oParams;

			// creating function import calls for fixed appointments
			for (var i in aFixedAppointmentObjects) {
				oParams = {
					DemandGuid: aFixedAppointmentObjects[i].Guid,
					ResourceGroupGuid: oResourceData.ResourceGroupGuid,
					ResourceGuid: oResourceData.ResourceGuid,
					DateFrom: this.setCustomDateTime(aFixedAppointmentObjects[i].FIXED_APPOINTMENT_START_DATE, aFixedAppointmentObjects[i].FIXED_APPOINTMENT_START_TIME),
					TimeFrom: {},
					DateTo: this.setCustomDateTime(aFixedAppointmentObjects[i].FIXED_APPOINTMENT_END_DATE, aFixedAppointmentObjects[i].FIXED_APPOINTMENT_END_TIME),
					TimeTo: {}
				};
				oParams.TimeFrom.ms = oParams.DateFrom ? oParams.DateFrom.getTime() : 0;
				oParams.TimeTo.ms = oParams.DateTo ? oParams.DateTo.getTime() : 0;
				aPromises.push(this.executeFunctionImport(oModel, oParams, "CreateAssignment", "POST"));
			}

			oParams = {
				DemandGuid: "",
				ResourceGroupGuid: oResourceData.ResourceGroupGuid,
				ResourceGuid: oResourceData.ResourceGuid,
				DateFrom: oTargetDate,
				TimeFrom: {
					ms: oTargetDate ? oTargetDate.getTime() : 0
				}
			};
			// creating function import calls for multi assignment for non-fixed appointments
			for (var i in aSources) {
				oDemandObj = oModel.getProperty(aSources[i]);

				if (this._mParameters.bFromNewGanttSplit) {
					oDemandObj = this._getDemandObjectSplitPage(aSources[i]);
				}
				if (this.getModel("user").getProperty("/ENABLE_NETWORK_ASSIGNMENT") && oDemandObj.OBJECT_SOURCE_TYPE === "DEM_PSNW") {
					oParams.DemandGuid = oParams.DemandGuid + "," + oDemandObj.Guid + "//" + oDemandObj.Duration;
				} else {
					oParams.DemandGuid = oParams.DemandGuid + "," + oDemandObj.Guid + "//" + oDemandObj.DURATION;
				}
			}
			if (oParams.DemandGuid) {
				oParams.DemandGuid = oParams.DemandGuid.substr(1);
				aPromises.push(this.executeFunctionImport(this.getModel(), oParams, "CreateMultiAssignment", "POST"));
			}

			return aPromises;
		},
		/**
		 * save assignment after drop
		 * Calls the function import of create assignment the returns the promise.
		 * 
		 * @param {Object} aSourcePaths
		 * @param {String} sTargetPath
		 * @return {Promise}
		 */
		assignedDemands: function (aSourcePaths, sTargetPath, oTargetDate, oNewEndDate, aGuids) {
			var oModel = this.getModel(),
				oViewModel = this.getModel("viewModel"),
				oGanttModel = this.getModel("ganttModel"),
				targetObj = oGanttModel.getProperty(sTargetPath),
				aItems = aSourcePaths ? aSourcePaths : aGuids,
				aDragSession = oViewModel.getData().dragSession,
				aGanttDemandDragged = aDragSession && aDragSession.length ? aDragSession[0] : "fromGanttSplit",
				aFixedAppointments = oViewModel.getProperty("/aFixedAppointmentsList")[0],
				aPromises = [],
				oDemandObj;
			if (aGanttDemandDragged === "fromGanttSplit" || !oModel.getProperty(aItems[0])) {
				aGanttDemandDragged = {};
				aGanttDemandDragged.bFromGanttSplit = true;
				// aGanttDemandDragged.sPath = oViewModel.getProperty("/ganttSettings/aGanttSplitDemandData/sPath");
				aGanttDemandDragged.oData = oViewModel.getProperty("/ganttSettings/aGanttSplitDemandData")[0];
				aGanttDemandDragged.oData.FIXED_APPOINTMENT_START_DATE = new Date(aGanttDemandDragged.oData.FIXED_APPOINTMENT_START_DATE);
				aGanttDemandDragged.oData.FIXED_APPOINTMENT_END_DATE = new Date(aGanttDemandDragged.oData.FIXED_APPOINTMENT_END_DATE);
			}

			this.clearMessageModel();

			for (var i = 0; i < aItems.length; i++) {
				oDemandObj = aGanttDemandDragged.bFromGanttSplit ? aGanttDemandDragged.oData : oModel.getProperty(aItems[i]);
				var sDemandGuid = oDemandObj ? oDemandObj.Guid : aItems[i].split("'")[1],
					oParams = {
						DemandGuid: sDemandGuid,
						ResourceGroupGuid: targetObj.ResourceGroupGuid,
						ResourceGuid: targetObj.ResourceGuid
					};
				// When we drop on the Gantt chart directly
				if (oTargetDate) {
					oParams.DateFrom = oTargetDate;
					oParams.TimeFrom = {
						ms: oTargetDate.getTime(),
						__edmType: "Edm.Time"
					};
					oParams.DateTo = oNewEndDate || oTargetDate;
					oParams.TimeTo = targetObj.EndTime;
				} else {
					// When we drop it on resource tree rows
					if (targetObj.StartDate) {
						oParams.DateFrom = targetObj.StartDate;
						oParams.TimeFrom = targetObj.StartTime;
					} else {
						oParams.DateFrom = new Date(); // When Start Date Null/In the Simple view today date will sent
						oParams.TimeFrom = targetObj.StartTime;
					}

					if (targetObj.EndDate) {
						oParams.DateTo = targetObj.EndDate;
						oParams.TimeTo = targetObj.EndTime;
					} else {
						oParams.DateTo = new Date(); // When Start Date Null/In the Simple view today date will sent
						oParams.TimeTo = targetObj.EndTime;
					}
				}

				if (this.getModel("user").getProperty("/ENABLE_ASGN_DATE_VALIDATION") && this._mParameters.bFromNewGantt && aGanttDemandDragged.IsSelected) {
					oParams.DateFrom = formatter.mergeDateTime(aGanttDemandDragged.oData.FIXED_ASSGN_START_DATE, aGanttDemandDragged.oData.FIXED_ASSGN_START_TIME);
					oParams.TimeFrom.ms = oParams.DateFrom.getTime();
					oParams.DateTo = formatter.mergeDateTime(aGanttDemandDragged.oData.FIXED_ASSGN_END_DATE, aGanttDemandDragged.oData.FIXED_ASSGN_END_TIME);
					oParams.TimeTo.ms = oParams.DateTo.getTime();
				}
				//Cost Element, Estimate and Currency fields update for Vendor Assignment
				if (this.getModel("user").getProperty("/ENABLE_EXTERNAL_ASSIGN_DIALOG") && targetObj.ISEXTERNAL && aGanttDemandDragged.oData.ALLOW_ASSIGNMENT_DIALOG) {
					oParams.CostElement = aGanttDemandDragged.oData.CostElement;
					oParams.Estimate = aGanttDemandDragged.oData.Estimate;
					oParams.Currency = aGanttDemandDragged.oData.Currency;
				}
				//Effort and Effort Unit fields update for PS Demands Network Assignment
				if (this.getModel("user").getProperty("/ENABLE_NETWORK_ASSIGNMENT") && this._mParameters.bFromNewGantt && aGanttDemandDragged.oData
					.OBJECT_SOURCE_TYPE === "DEM_PSNW") {
					oParams.Effort = aGanttDemandDragged.oData.Duration;
					oParams.EffortUnit = aGanttDemandDragged.oData.DurationUnit;
				}
				//Fixed Appointments for Gantt
				if (aFixedAppointments && aFixedAppointments.IsSelected) {
					oDemandObj.FIXED_APPOINTMENT_START_DATE = this.setCustomDateTime(oDemandObj.FIXED_APPOINTMENT_START_DATE, oDemandObj.FIXED_APPOINTMENT_START_TIME);
					oDemandObj.FIXED_APPOINTMENT_END_DATE = this.setCustomDateTime(oDemandObj.FIXED_APPOINTMENT_END_DATE, oDemandObj.FIXED_APPOINTMENT_END_TIME);
					oParams.DateFrom = oDemandObj.FIXED_APPOINTMENT_START_DATE;
					oParams.TimeFrom = {};
					oParams.TimeFrom.ms = oDemandObj.FIXED_APPOINTMENT_START_DATE ? oDemandObj.FIXED_APPOINTMENT_START_DATE.getTime() : 0;
					oParams.DateTo = oDemandObj.FIXED_APPOINTMENT_END_DATE;
					oParams.TimeTo = {};
					oParams.TimeTo.ms = oDemandObj.FIXED_APPOINTMENT_END_DATE ? oDemandObj.FIXED_APPOINTMENT_END_DATE.getTime() : 0;
				}
				aPromises.push(this.executeFunctionImport(oModel, oParams, "CreateAssignment", "POST"));
			}
			return aPromises;
		},
		/**
		 * Deletes the assignment
		 *
		 * @since 3.0
		 * @param oModel Odata model
		 * @param sAssignmentGuid
		 * @return {Promise}
		 */
		deleteAssignment: function (oModel, sAssignmentGuid) {
			return this.executeFunctionImport(oModel, {
				AssignmentGUID: sAssignmentGuid
			}, "DeleteAssignment", "POST");
		},
		/**
		 * update assignment 
		 * @param {String} sPath
		 */
		_updateAssignment: function (oModel, oParams, mParameters) {
			return this.executeFunctionImport(oModel, oParams, "UpdateAssignment", "POST", mParameters, true);
		},

		/**
		 * show simple confirm dialog
		 * when action was pressed (custom or proceed action) then promise resolve is returned
		 * @param {String} sAction
		 * @param {String} sMsg
		 * return {Promise}
		 */
		showMessageToProceed: function (sAction, sMsg) {
			return new Promise(function (resolve, reject) {
				var oResourceBundle = this.getResourceBundle(),
					oComponent = this.getOwnerComponent();
				sAction = sAction || oResourceBundle.getText("xbut.proceed");
				sMsg = sMsg || oResourceBundle.getText("ymsg.availability");

				sap.m.MessageBox.warning(
					sMsg, {
						actions: [sAction, sap.m.MessageBox.Action.CANCEL],
						styleClass: oComponent.getContentDensityClass(),
						onClose: function (sValue) {
							return sValue === sAction ? resolve() : reject();
						}
					}
				);
			});
		},

		/**
		 * Validation of demand for resource qualification
		 * 
		 * @param {Array} aSourcePaths - collection of demand pathes
		 * @param {String} targetObj - target resource for node ID
		 * @param {Object} oTargetDate - new start date 
		 * @param {Object} oNewEndDate - new end date
		 * @param {Array} aGuids - collection of IDs from Demands
		 **/
		checkQualification: function (aSourcePaths, oTargetObj, oTargetDate, oNewEndDate, aGuids) {
			var oQualificationParameters,
				oModel = this.getModel(),
				sDemandGuids = "",
				sObjectId,
				aItems = aSourcePaths ? aSourcePaths : aGuids;
			return new Promise(function (resolve, reject) {
				//collect all demand Guids for function import
				for (var i = 0; i < aItems.length; i++) {
					var sPath = aItems[i].sPath ? aItems[i].sPath : aItems[i];
					if (sPath.indexOf("'") >= 0 && !aSourcePaths) {
						sPath = sPath.split("'")[1];
					}

					var oDemandObj = oModel.getProperty(sPath);
					var sDemandGuid = oDemandObj ? oDemandObj.Guid : aItems[i];
					if (sDemandGuids === "") {
						sDemandGuids = sDemandGuid;
					} else {
						sDemandGuids = sDemandGuids + "//" + sDemandGuid;
					}
				}
				sObjectId = oTargetObj.NodeId;
				if (oTargetObj.NodeType === "ASSIGNMENT") {
					sObjectId = oTargetObj.ObjectId;
				}
				oQualificationParameters = {
					DemandMultiGuid: sDemandGuids,
					ObjectId: sObjectId, //oTargetObj.NodeId, //targetObj.ResourceGroupGuid,
					StartTimestamp: oTargetDate,
					EndTimestamp: oNewEndDate ? oNewEndDate : oTargetDate
				};
				this.executeFunctionImport(oModel, oQualificationParameters, "ValidateDemandQualification", "POST").then(
					function (oData, response) {
						resolve({
							params: oQualificationParameters,
							result: oData
						});
					}, reject);
			}.bind(this));
		},

		/**
		 *
		 * @param aSources - Demands as sources
		 * @param oTarget - Resource as target
		 * @param oTargetDate - date and time on which demand is dropped
		 * Checking Availability of resource to stretch the assignment end date.
		 * @private
		 */
		_checkAvailability: function (aSources, oTarget, oTargetDate, aGuids) {
			var oModel = this.getModel(),
				oGanttModel = this.getModel("ganttModel"),
				sGuid = aSources ? oModel.getProperty(aSources[0] + "/Guid") : aGuids[0].split("'")[1];
			return new Promise(function (resolve, reject) {
				this.executeFunctionImport(oModel, {
					ResourceGuid: oGanttModel.getProperty(oTarget + "/ResourceGuid"),
					StartTimestamp: oTargetDate || new Date(),
					DemandGuid: sGuid
				}, "ResourceAvailabilityCheck", "GET").then(function (data) {
					resolve(data);
				});
			}.bind(this));
		},

		/**
		 * Creating Gantt Horizon for New Gant Layout
		 * @param iZoomLevel - Gantt Axis ZoomLevel
		 * @param oTotalHorizonDates {object} Dates
		 * @Author Chethan RK
		 */
		_createGanttHorizon: function (oAxisTimeStrategy, iZoomLevel, oTotalHorizonDates) {
			var oVisibleHorizonDates = this._getVisibleHorizon(iZoomLevel, oTotalHorizonDates);
			//Setting Total Horizon for Gantt
			oAxisTimeStrategy.setTotalHorizon(new sap.gantt.config.TimeHorizon({
				startTime: oTotalHorizonDates.StartDate,
				endTime: oTotalHorizonDates.EndDate
			}));
			//Setting Visible Horizon for Gantt
			oAxisTimeStrategy.setVisibleHorizon(new sap.gantt.config.TimeHorizon({
				startTime: oVisibleHorizonDates.StartDate,
				endTime: oVisibleHorizonDates.EndDate
			}));
		},
		/**
		 * Adjusting Visible Horizon for New Gant Layout
		 * @param iZoomLevel - Gantt Axis ZoomLevel
		 * @param oTotalHorizonDates {object} Dates
		 * @Author Chethan RK
		 */
		_getVisibleHorizon: function (iZoomLevel, oTotalHorizonDates) {
			var sStartDate,
				sEndDate,
				sMidDate,
				sCurrentDate = new Date();

			//Checking if Current Date is included within the selected DateRange 
			if (sCurrentDate <= oTotalHorizonDates.EndDate && sCurrentDate >= oTotalHorizonDates.StartDate) {
				if (iZoomLevel >= 8) {
					sStartDate = moment().startOf("hour").toDate();
					sEndDate = moment().endOf("hour").add(1, "hour").toDate();
				} else {
					sStartDate = moment().startOf("day").subtract(1, "day").toDate();
					sEndDate = moment().endOf("day").add(1, "day").toDate();
				}
			} else {
				//If Selected DateRange is beyond Current Date, then the VisibleHorizon Dates are picked as Mid Date of the selected DateRange
				sMidDate = new Date((oTotalHorizonDates.StartDate.getTime() + oTotalHorizonDates.EndDate.getTime()) / 2);
				sStartDate = new Date(sMidDate.setDate(sMidDate.getDate() - 2));
				sEndDate = new Date(sMidDate.setDate(sMidDate.getDate() + 3));
			}

			return {
				StartDate: sStartDate,
				EndDate: sEndDate
			};
		},

		/**
		 * Resets a changed data by model path
		 * Or when bResetAll then all changes are resetted
		 * @param sPath
		 * @param bResetAll
		 */
		_resetChanges: function (sPath, bResetAll) {
			var oGanttModel = this.getModel("ganttModel"),
				oGanttOriginDataModel = this.getModel("ganttOriginalData");

			var oPendingChanges = oGanttModel.getProperty("/pendingChanges");
			if (oPendingChanges[sPath]) {
				if (!this._resetNewPathChanges(oPendingChanges[sPath], oGanttModel, oGanttOriginDataModel)) {
					var oOriginData = oGanttOriginDataModel.getProperty(sPath);
					oGanttModel.setProperty(sPath, _.cloneDeep(oOriginData));
				}
				delete oPendingChanges[sPath];
			} else if (bResetAll) {
				for (var key in oPendingChanges) {
					if (!this._resetNewPathChanges(oPendingChanges[sPath], oGanttModel, oGanttOriginDataModel)) {
						oGanttModel.setProperty(key, _.cloneDeep(oGanttOriginDataModel.getProperty(key)));
					}
				}
				oGanttModel.setProperty("/pendingChanges", {});
			}
		},

		/**
		 * resets data when there was a path changes of shapes
		 * @param {Object} oPendings - GanttModel path /pendingChanges
		 * @param {Object} oGanttModel
		 * @param {Object} oGanttOriginDataModel
		 */
		_resetNewPathChanges: function (oPendings, oGanttModel, oGanttOriginDataModel) {
			if (oPendings.NewAssignPath) {
				oGanttModel.setProperty(oPendings.NewAssignPath, _.cloneDeep(oGanttOriginDataModel.getProperty(oPendings.NewAssignPath)));
				oGanttModel.setProperty(oPendings.OldAssignPath, _.cloneDeep(oGanttOriginDataModel.getProperty(oPendings.OldAssignPath)));
				return true;
			}
			return false;
		},

		/**
		 * Promise for fetching details about assignment demand
		 * coming from backend or alsready loaded data
		 * @param oData
		 * @private
		 */
		_getRelatedDemandData: function (oData, bInvalidate) {
			return new Promise(function (resolve, reject) {
				if (oData.Demand && oData.Demand.Guid && !bInvalidate) {
					resolve(oData);
				} else {
					var sPath = this.getModel().createKey("AssignmentSet", {
							Guid: oData.Guid
						}),
						oAssignData = this.getModel().getProperty("/" + sPath);
					if (oAssignData && oAssignData.Demand && oAssignData.Demand.Guid && !bInvalidate) {
						resolve(oAssignData);
					} else {
						this.getModel().read("/" + sPath, {
							urlParameters: {
								$expand: "Demand"
							},
							success: resolve,
							error: reject
						});
					}
				}
			}.bind(this));
		},

		/**
		 * Unassign assignment with delete confirmation dialog. 
		 */
		_deleteAssignment: function (oModel, sAssignGuid, sPath, oEventBus) {
			var oGanttModel = this.getModel("ganttModel");
			this._showConfirmMessageBox.call(this, this.getResourceBundle().getText("ymsg.confirmDel")).then(function (data) {
				oGanttModel.setProperty(sPath + "/busy", true);
				if (data === "YES") {
					this.deleteAssignment(oModel, sAssignGuid).then(function () {
							oGanttModel.setProperty(sPath + "/busy", false);
							this.getModel("ganttModel").setProperty(sPath, null);
							this.getModel("ganttOriginalData").setProperty(sPath, null);
							this._deleteChildAssignment(sAssignGuid, sPath);
							oEventBus.publish("BaseController", "refreshCapacity", {
								sTargetPath: sPath.split("/AssignmentSet/results/")[0]
							});
							oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
						}.bind(this),
						function () {
							oGanttModel.setProperty(sPath + "/busy", false);
						});
				} else {
					oGanttModel.setProperty(sPath + "/busy", false);
				}
			}.bind(this));
		},

		/**
		 * Unassign assignment with delete confirmation dialog and removing the child assignment node from GanttModel
		 * @param sAssignGuid
		 * @param sPath
		 * @private
		 */
		_deleteChildAssignment: function (sAssignGuid, sPath) {
			var oGanttModel = this.getModel("ganttModel"),
				oGanttOriginalModel = this.getModel("ganttOriginalData"),
				aAssignmentData, sChildPath;
			if (sPath.length > 60) {
				sChildPath = sPath.substring(0, 27);
				sChildPath = sChildPath + "/AssignmentSet/results/";
				aAssignmentData = oGanttModel.getProperty(sChildPath);
				for (var a in aAssignmentData) {
					if (sAssignGuid === aAssignmentData[a].Guid) {
						aAssignmentData.splice(a, 1);
						break;
					}
				}
				var oOriginData = oGanttModel.getProperty(sChildPath);
				oGanttOriginalModel.setProperty(sChildPath, _.cloneDeep(oOriginData));
			}
			oGanttModel.refresh(true);
			oGanttOriginalModel.refresh(true);
		},

		/**
		 * Resets a changed data by model path on both Parent and Child Nodes
		 * @param sPath
		 * @param oOriginalData
		 * @since 2205
		 */
		_resetParentChildNodes: function (sPath, oOriginalData) {
			var oGanttModel = this.getModel("ganttModel"),
				oGanttOriginDataModel = this.getModel("ganttOriginalData"),
				oTargetObj = oGanttModel.getProperty(sPath),
				sChildPath, aChildrenData, sNewPath, sAssignmentPath, aAssignmentData, aChildNodeData, sObjectIDRelation, sObjectID;
			oGanttModel.setProperty(sPath + "/ResourceAvailabilitySet", oOriginalData.ResourceAvailabilitySet);
			if (oTargetObj.Guid === "") {
				this._resetUnSavedNodeData(sPath, oOriginalData);
			} else {
				//Condition when we Change at Assignment Nodes
				if (sPath.length > 60) {
					sAssignmentPath = sPath.substring(0, 27);
					sAssignmentPath = sAssignmentPath + "/AssignmentSet/results";
					aAssignmentData = oGanttModel.getProperty(sAssignmentPath);
					sObjectIDRelation = oTargetObj.OBJECT_ID_RELATION + "//" + oTargetObj.ResourceGuid;
					oTargetObj.OBJECT_ID_RELATION = sObjectIDRelation;
					for (var a in aAssignmentData) {
						if (oTargetObj.Guid === aAssignmentData[a].Guid) {
							sNewPath = sAssignmentPath + "/" + a;
							sObjectID = oTargetObj.Guid + "//" + oTargetObj.ResourceGuid + "//" + oTargetObj.ResourceGroupGuid;
							aChildNodeData = Object.assign({}, oTargetObj, {
								OBJECT_ID_RELATION: sObjectID
							});
							oGanttModel.setProperty(sNewPath, aChildNodeData);
							oGanttModel.setProperty(sNewPath + "/AssignmentSet", {
								results: [oTargetObj]
							});
							oGanttModel.setProperty(sNewPath + "/DemandDesc", oTargetObj.DemandDesc);
							oGanttModel.setProperty(sNewPath + "/NodeType", "ASSIGNMENT");
							oGanttOriginDataModel.setProperty(sNewPath, _.cloneDeep(oGanttModel.getProperty(sNewPath)));
							oGanttOriginDataModel.setProperty(sNewPath + "/AssignmentSet", _.cloneDeep(oGanttModel.getProperty(sNewPath + "/AssignmentSet")));
							break;
						}
					}
				} else {
					sChildPath = sPath.split("/AssignmentSet/results/")[0];
					aChildrenData = oGanttModel.getProperty(sChildPath + "/children");
					for (var c in aChildrenData) {
						if (oTargetObj.Guid === aChildrenData[c].Guid) {
							sNewPath = sChildPath + "/children/" + c;
							sObjectIDRelation = oTargetObj.OBJECT_ID_RELATION + "//" + oTargetObj.ResourceGuid;
							aChildNodeData = Object.assign({}, oTargetObj, {
								OBJECT_ID_RELATION: sObjectIDRelation
							});
							oGanttModel.setProperty(sNewPath + "/AssignmentSet", {
								results: [aChildNodeData]
							});
							oGanttModel.setProperty(sNewPath + "/DemandDesc", oTargetObj.DemandDesc);
							oGanttModel.setProperty(sNewPath + "/NodeType", "ASSIGNMENT");
							oGanttOriginDataModel.setProperty(sNewPath + "/AssignmentSet", _.cloneDeep(oGanttModel.getProperty(sNewPath + "/AssignmentSet")));
							break;
						}
					}
				}
				oGanttOriginDataModel.refresh(true);
				oGanttModel.refresh(true);
			}
		},
		/**
		 * Creating a new Assignment node and shape after assignmnet creation
		 * @param aData
		 * @param sTargetPath
		 * @param sDummyPath
		 * @since 2205
		 */
		_appendChildAssignment: function (aData, sTargetPath, sDummyPath) {
			var oGanttModel = this.getModel("ganttModel"),
				oGanttOriginalModel = this.getModel("ganttOriginalData"),
				aAssignmentData = oGanttModel.getProperty(sTargetPath + "/AssignmentSet/results"),
				aChildData, iChildAsgnLen, aChildAsgnData,
				iChildLength, sAssignmentGuid, sNewPath, aCloneChildData, aCloneChildAssignmentData, aResourceAvailabilities;
			if (!oGanttModel.getProperty(sTargetPath + "/children")) {
				oGanttModel.setProperty(sTargetPath + "/children", [aData]);
			} else {
				aChildAsgnData = oGanttModel.getProperty(sTargetPath + "/children");
				aChildAsgnData.push(aData);
				iChildAsgnLen = aChildAsgnData.length;
				if (aChildAsgnData[iChildAsgnLen - 1].Guid === aChildAsgnData[iChildAsgnLen - 2].Guid) {
					aChildAsgnData.splice(iChildAsgnLen - 1, 1);
				}
			}
			aChildData = oGanttModel.getProperty(sTargetPath + "/children");
			iChildLength = aChildData.length - 1;
			aResourceAvailabilities = oGanttModel.getProperty(sTargetPath + "/ResourceAvailabilitySet");
			var xPath = sTargetPath + "/children/" + iChildLength;
			sAssignmentGuid = oGanttModel.getProperty(xPath + "/Guid");
			oGanttModel.setProperty(xPath + "/DemandDesc", aData.DemandDesc);
			for (var a in aAssignmentData) {
				if (sAssignmentGuid === aAssignmentData[a].Guid) {
					sNewPath = xPath + "/AssignmentSet";
					oGanttModel.setProperty(sNewPath, {
						results: [aData]
					});
					oGanttModel.setProperty(xPath + "/NodeType", "ASSIGNMENT");
					oGanttModel.setProperty(xPath + "/ResourceAvailabilitySet", aResourceAvailabilities);
					oGanttModel.setProperty(sNewPath + "/results/0" + "/OBJECT_ID_RELATION", aData.OBJECT_ID_RELATION + "//" + aData.ResourceGuid);
				}
			}
			aCloneChildData = oGanttModel.getProperty(xPath);
			oGanttOriginalModel.setProperty(xPath, _.cloneDeep(aCloneChildData));
			aCloneChildAssignmentData = oGanttModel.getProperty(sNewPath);
			oGanttOriginalModel.setProperty(sNewPath, _.cloneDeep(aCloneChildAssignmentData));
			oGanttModel.refresh(true);
			oGanttOriginalModel.refresh(true);
		},
		/**
		 * getting Demand objects form local model coming from gantt split
		 * @param sPath
		 * @since 2205
		 */
		_getDemandObjectSplitPage: function (sPath) {
			var aDragSessionData = this.getModel("viewModel").getProperty("/dragSession");
			for (var i = 0; i < aDragSessionData.length; i++) {
				if (aDragSessionData[i].sPath === sPath) {
					return aDragSessionData[i].oData;
				}
			}
		},

		/**
		 * check for unsaved data in Demand table
		 * on click on navigate acion navigate to Demand Detail Page
		 * modified method since 2201, by Rakesh Sahu
		 * @param oEvent
		 */
		onActionPress: function (oEvent) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				oViewModel = this.getModel("viewModel"),
				oModel = this.getModel(),
				bDemandEditMode = oViewModel.getProperty("/bDemandEditMode");

			this.oRow = oEvent.getParameter("row");

			if (bDemandEditMode && oModel.hasPendingChanges()) {
				this.showDemandEditModeWarningMessage().then(function (bResponse) {
					var sDiscard = oResourceBundle.getText("xbut.discard&Nav"),
						sSave = oResourceBundle.getText("xbut.buttonSave");

					if (bResponse === sDiscard) {
						oModel.resetChanges();
						oViewModel.setProperty("/bDemandEditMode", false);
						this._navToDetail(null, this.oRow);
					} else
					if (bResponse === sSave) {
						oViewModel.setProperty("/bDemandEditMode", false);
						this.submitDemandTableChanges();
					}
				}.bind(this));

			} else {
				if (bDemandEditMode) {
					oViewModel.setProperty("/bDemandEditMode", false);
				}
				this._navToDetail(oEvent);
			}
		},

		/**
		 * navigation to demand detail page
		 * added method since 2201, by Rakesh Sahu
		 * @param oEvent
		 * @param oRow
		 */
		_navToDetail: function (oEvent, oRow) {
			var oRouter = this.getRouter();
			if (oEvent.getSource().getId().includes("link")) {
				oRouter.navTo("ganttDemandDetails", {
					guid: oEvent.getSource().getBindingContext().getProperty("DemandGuid")
				});

			} else {
				oRow = oRow ? oRow : oEvent.getParameter("row");
				var oContext = oRow.getBindingContext(),
					sPath = oContext.getPath(),
					oModel = oContext.getModel(),
					oData = oModel.getProperty(sPath),
					oUserDetail = this.getModel("appView");
				this.getModel("viewModel").setProperty("/Disable_Assignment_Status_Button", false);
				if (oUserDetail.getProperty("/currentRoute") === "splitDemands") {
					oRouter.navTo("splitDemandDetails", {
						guid: oData.Guid
					});
				} else {
					oRouter.navTo("ganttDemandDetails", {
						guid: oData.Guid
					});
				}
			}
		},

		/**
		 * handle Order id link press event in Gantt Popover
		 * added method since 2205, by Rakesh Sahu
		 * @param oEvent
		 */
		onPressOrderNumber: function (oEvent) {
			this.sAppName = 'EvoOrder';
			this.handleGanttPopoverNavigation(oEvent);
		},

		/**
		 * handle Notification Number link press event in Gantt Popover
		 * added method since 2205, by Rakesh Sahu
		 * @param oEvent
		 */
		onPressNotficationNumber: function (oEvent) {
			this.sAppName = 'EvoNotify';
			this.handleGanttPopoverNavigation(oEvent);
		},

		/**
		 * handle navigation from Gantt Popover to EvoOrder/EvoNotify
		 * added method since 2205, by Rakesh Sahu
		 * @param oEvent
		 */
		handleGanttPopoverNavigation: function (oEvent) {
			this.oSource = oEvent.getSource();
			var sDemandGuid = this.oSource.getBindingContext().getProperty("DemandGuid"),
				sDemandPath = "/DemandSet('" + sDemandGuid + "')";

			this.getOwnerComponent().readData(sDemandPath).then(function (oDemandData) {
				var oAppInfo = this.getAppInfo(this.oSource.getModel("navLinks").getData(), this.sAppName);
				this.handleNavigationLinkAction(oDemandData, oAppInfo, this.oSource.getModel("viewModel"), this.oSource.getModel(
					"user"));
			}.bind(this));
		},

		/**
		 * get appInfo to navigate from Gantt Popover to EvoOrder/EvoNotify
		 * added method since 2205, by Rakesh Sahu
		 * @param oEvent
		 */
		getAppInfo: function (aNavData, AppName) {
			for (var i in aNavData) {
				if (aNavData[i].ApplicationName === AppName) {
					return aNavData[i];
				}
			}
		},

		/**
		 * Hiding Relationships for the selected assignment path
		 * @param sPath
		 * since 2205
		 */
		_hideRelationships: function (sPath) {
			var oGanttModel = this.getModel("ganttModel");
			oGanttModel.setProperty(sPath + "/RelationshipSet/results", []);
			oGanttModel.setProperty(sPath + "/busy", false);
			oGanttModel.refresh(true);
		},

		/**
		 * Fetching Relationships and appending the data for the selected assignment path
		 * @param sPath
		 * @param oData
		 * since 2205
		 */
		_showRelationships: function (sPath, oData) {
			var sMsg, oGanttModel = this.getModel("ganttModel"),
				oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				aFilters = [
					new Filter("DemandGuid", FilterOperator.EQ, oData.DemandGuid),
					new Filter("DateFrom", FilterOperator.EQ, this.getView().byId("idDateRangeGantt2").getDateValue()),
					new Filter("DateTo", FilterOperator.EQ, this.getView().byId("idDateRangeGantt2").getSecondDateValue())
				];
			this.getModel("appView").setProperty("/busy", true);
			this._getRelationships(aFilters).then(function (aData, oResponse) {
				this.getModel("appView").setProperty("/busy", false);
				if (aData.results.length === 0) {
					sMsg = oResourceBundle.getText("ymsg.noRelationships", [oData.ORDERID, oData.OPERATIONID]);
					sap.m.MessageToast.show(sMsg);
				}
				this.showMessage(oResponse);
				oGanttModel.setProperty(sPath + "/RelationshipSet", aData);
				oGanttModel.setProperty(sPath + "/busy", false);
				oGanttModel.refresh(true);
			}.bind(this));
		},

		/*
		 * Fetching Relationships for selected Assignments
		 * @param aFilters
		 * since 2205
		 */
		_getRelationships: function (aFilters) {
			return new Promise(function (resolve, reject) {
				this.getModel().read("/RelationshipSet", {
					filters: aFilters,
					success: function (aData, oResponse) {
						resolve(aData, oResponse);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			}.bind(this));
		},

		/*
		 * Handle press of Calculate travel time Button in gantt toolbar
		 * @param oEvent
		 * since 2205
		 */
		onCalculateRoutePress: function (oEvent) {
			var oButton = oEvent.getSource(),
				oView = this.getView(),
				oStarDate = this.getModel("user").getProperty("/DEFAULT_GANT_START_DATE"),
				oEndDate = this.getModel("user").getProperty("/DEFAULT_GANT_END_DATE"),
				sSourceId = oEvent.getSource().getId();

			this.routeOperation = sSourceId.includes("Optimize") ? "Optimize" : "Calculate";
			if (!this._oCalendarPopover) {
				Fragment.load({
					name: "com.evorait.evoplan.view.map.fragments.RouteDateFilter",
					id: oView.getId(),
					controller: this
				}).then(function (oPopover) {
					this._oCalendarPopover = oPopover;
					this.getView().addDependent(this._oCalendarPopover);
					this._oCalendarPopover.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					this.getView().byId("DRSMap").setMinDate(oStarDate);
					this.getView().byId("DRSMap").setMaxDate(oEndDate);
					this._oCalendarPopover.openBy(oButton);
				}.bind(this));
			} else {
				this.getView().byId("DRSMap").setMinDate(oStarDate);
				this.getView().byId("DRSMap").setMaxDate(oEndDate);
				this._oCalendarPopover.openBy(oButton);
			}
		},
		
		/*
		 * Closing the calendar popover for route calculation
		 * @param oEvent
		 * since 2205
		 */
		onCloseDialog: function (oEvent) {
			this._oCalendarPopover.close();
		},
		
		/**
		 * Fetching Assignment Status for selected Assignments
		 * @param sUri
		 * since 2205
		 */
		_getAssignmentStatus: function (sUri) {
			return new Promise(function (resolve, reject) {
				this.getModel().read(sUri, {
					success: function (oData, oResponse) {
						resolve(oData);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Resetting parent assignments after reassigning to other resources 
		 * @param sSourcePath
		 * @since 2205
		 */
		_resetParentNodeData: function (sPath, sSourcePath, aData) {
			var oGanttModel = this.getModel("ganttModel"),
				oGanttOriginDataModel = this.getModel("ganttOriginalData");
			if (sSourcePath) {
				var sParentPath = sSourcePath.substring(0, 27),
					sNewPath = sParentPath + "/AssignmentSet/results",
					sParentSplitPath = sSourcePath.split("/AssignmentSet")[0],
					sSplitPath = sParentSplitPath.split("/"),
					index = sSplitPath[sSplitPath.length - 1],
					sChildPath = sPath.split("/AssignmentSet/results")[0],
					aParentAssgnData = oGanttModel.getProperty(sNewPath);
				aParentAssgnData.splice(index, 1);
				oGanttOriginDataModel.setProperty(sNewPath, _.cloneDeep(oGanttModel.getProperty(sNewPath)));
				if (!oGanttModel.getProperty(sChildPath + "/children")) {
					oGanttModel.setProperty(sChildPath + "/children", [aData]);
					oGanttModel.setProperty(sChildPath + "/children/0/NodeType", "ASSIGNMENT");
					oGanttModel.setProperty(sChildPath + "/children/0/AssignmentSet", {
						results: [aData]
					});
					oGanttModel.setProperty(sChildPath + "/children/0/AssignmentSet/results/0/OBJECT_ID_RELATION", aData.OBJECT_ID_RELATION +
						"//" + aData.ResourceGuid);
				}
			}
			oGanttOriginDataModel.refresh(true);
			oGanttModel.refresh(true);
		},

		/**
		 * Updating Assignment Status for Assignmnets after changing
		 * @param sPath
		 * @param sAsgnStsFnctnKey
		 * @since 2205
		 */
		_updateAssignmentStatus: function (sPath, sAsgnStsFnctnKey, aData) {
			var oGanttModel = this.getModel("ganttModel"),
				oGanttOriginDataModel = this.getModel("ganttOriginalData"),
				sParentPath, sChildPath, sChildSplitPath, index;
			if (sPath.length > 60) {
				sParentPath = sPath.split("/AssignmentSet/results/")[0];
				oGanttModel.setProperty(sParentPath + "/STATUS", sAsgnStsFnctnKey);
				oGanttModel.setProperty(sParentPath + "/DEMAND_STATUS_COLOR", aData.DEMAND_STATUS_COLOR);
				oGanttModel.setProperty(sParentPath + "/DEMAND_STATUS", aData.DEMAND_STATUS);
			} else {
				sChildPath = sPath.substring(0, 27);
				sChildSplitPath = sPath.split("/");
				index = sChildSplitPath[sChildSplitPath.length - 1];
				sChildPath = sChildPath + "/children/" + index;
				oGanttModel.setProperty(sChildPath + "/STATUS", sAsgnStsFnctnKey);
				oGanttModel.setProperty(sChildPath + "/DEMAND_STATUS_COLOR", aData.DEMAND_STATUS_COLOR);
				oGanttModel.setProperty(sChildPath + "/DEMAND_STATUS", aData.DEMAND_STATUS);
				oGanttModel.setProperty(sChildPath + "/AssignmentSet/results/0/STATUS", sAsgnStsFnctnKey);
				oGanttModel.setProperty(sChildPath + "/AssignmentSet/results/0/DEMAND_STATUS_COLOR", aData.DEMAND_STATUS_COLOR);
				oGanttModel.setProperty(sChildPath + "/AssignmentSet/results/0/DEMAND_STATUS", aData.DEMAND_STATUS);
			}
			oGanttModel.setProperty(sPath + "/STATUS", sAsgnStsFnctnKey);
			oGanttModel.setProperty(sPath + "/DEMAND_STATUS_COLOR", aData.DEMAND_STATUS_COLOR);
			oGanttModel.setProperty(sPath + "/DEMAND_STATUS", aData.DEMAND_STATUS);
			oGanttOriginDataModel.refresh(true);
			oGanttModel.refresh(true);
		},

		/**
		 * Resetting Assignment Shape Data when the data is unsaved 
		 * @param sPath
		 * @param oOriginalData
		 * @since 2205
		 */
		_resetUnSavedNodeData: function (sPath, oOriginalData) {
			var oGanttModel = this.getModel("ganttModel"),
				oGanttOriginDataModel = this.getModel("ganttOriginalData"),
				oTargetObj, sChildPath, sSplitChildPath, sObjectIDRelation, iIndex, aChildNodeData, aChildData, sNewPath;

			//Condition when we Change at Assignment Nodes
			if (sPath.length > 60) {
				sChildPath = sPath.substring(0, 27);
				sSplitChildPath = sPath.split("/AssignmentSet")[0];
				iIndex = sSplitChildPath[sSplitChildPath.length - 1];
				sNewPath = sChildPath + "/AssignmentSet/results/" + iIndex;
				aChildData = oGanttModel.getProperty(sNewPath);
				sObjectIDRelation = aChildData.OBJECT_ID_RELATION + "//" + aChildData.ResourceGuid; //+ "//" + aD1.ResourceGroupGuid;
				aChildNodeData = Object.assign({}, aChildData, {
					OBJECT_ID_RELATION: sObjectIDRelation
				});
				oGanttModel.setProperty(sPath, aChildNodeData);
				oGanttModel.setProperty(sNewPath, aChildData);
				oGanttOriginDataModel.setProperty(sNewPath, _.cloneDeep(oGanttModel.getProperty(sNewPath)));
			} else {
				oTargetObj = oOriginalData.AssignmentSet.results[0];
				iIndex = sPath[sPath.length - 1];
				sNewPath = sPath.split("/AssignmentSet")[0];
				sNewPath = sNewPath + "/children/" + iIndex;
				oGanttModel.setProperty(sNewPath, oTargetObj);
				oGanttModel.setProperty(sNewPath + "/AssignmentSet", {
					results: [oTargetObj]
				});
				sObjectIDRelation = oOriginalData.Guid + "//" + oOriginalData.ResourceGuid + "//" + oOriginalData.ResourceGroupGuid;
				aChildNodeData = Object.assign({}, oTargetObj, {
					OBJECT_ID_RELATION: sObjectIDRelation
				});
				oGanttModel.setProperty(sPath, aChildNodeData);
				oGanttOriginDataModel.setProperty(sNewPath, _.cloneDeep(oGanttModel.getProperty(sNewPath)));
			}
			oGanttModel.refresh(true);
			oGanttOriginDataModel.refresh(true);
		},

		/**
		 * Combining Multiple Assignment Creation Response to a single array
		 * @param [aResults]
		 * @return [aCreatedAssignments]
		 * @since 2205
		 */
		_getCreatedAssignments: function (aResults) {
			var aCreatedAssignments = [];
			for (var a in aResults) {
				var oCreatedAssignment = aResults[a].results;
				if (!oCreatedAssignment) {
					aCreatedAssignments.push(aResults[a]);
				} else {
					for (var a1 in oCreatedAssignment) {
						aCreatedAssignments.push(oCreatedAssignment[a1]);
					}
				}
			}
			return aCreatedAssignments;
		}
	});

});