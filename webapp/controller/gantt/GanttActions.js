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
					DateFrom: aFixedAppointmentObjects[i].FIXED_APPOINTMENT_START_DATE,
					TimeFrom: {},
					DateTo: aFixedAppointmentObjects[i].FIXED_APPOINTMENT_END_DATE,
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
			oParams.DemandGuid = oParams.DemandGuid.substr(1);
			aPromises.push(this.executeFunctionImport(this.getModel(), oParams, "CreateAssignment", "POST"));

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
					if (oAssignData.Demand && oAssignData.Demand.Guid && !bInvalidate) {
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
		 * @since 2205
		 */
		_resetParentChildNodes: function (sPath, oOriginData) {
			var oGanttModel = this.getModel("ganttModel"),
				oGanttOriginDataModel = this.getModel("ganttOriginalData"),
				oTargetObj = oGanttModel.getProperty(sPath),
				sChildPath, aChildrenData, sNewPath, sAssignmentPath, aAssignmentData;
			//Condition when we Change at Assignment Nodes
			if (sPath.length > 60) {
				sAssignmentPath = sPath.substring(0, 27);
				sAssignmentPath = sAssignmentPath + "/AssignmentSet/results";
				aAssignmentData = oGanttModel.getProperty(sAssignmentPath);
				for (var a in aAssignmentData) {
					if (oTargetObj.Guid === aAssignmentData[a].Guid) {
						sNewPath = sAssignmentPath + "/" + a;
						oGanttModel.setProperty(sNewPath, oTargetObj);
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
						oGanttModel.setProperty(sNewPath + "/AssignmentSet", {
							results: [oTargetObj]
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
				iChildLength, sAssignmentGuid, sNewPath, aCloneChildData, aCloneChildAssignmentData;
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

			var xPath = sTargetPath + "/children/" + iChildLength;
			sAssignmentGuid = oGanttModel.getProperty(xPath + "/Guid");
			for (var a in aAssignmentData) {
				if (sAssignmentGuid === aAssignmentData[a].Guid) {
					sNewPath = xPath + "/AssignmentSet";
					oGanttModel.setProperty(sNewPath, {
						results: [aData]
					});
					oGanttModel.setProperty(xPath + "/NodeType", "ASSIGNMENT");
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
		}

	});

});