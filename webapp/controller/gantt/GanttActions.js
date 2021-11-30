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
		 * save assignment after drop
		 * Calls the function import of create assignment the returns the promise.
		 * 
		 * @param {Object} aSourcePaths
		 * @param {String} sTargetPath
		 * @return {Promise}
		 */
		assignedDemands: function (aSourcePaths, sTargetPath, oTargetDate, oNewEndDate, aGuids) {
			var oModel = this.getModel(),
				oGanttModel = this.getModel("ganttModel"),
				targetObj = oGanttModel.getProperty(sTargetPath),
				aItems = aSourcePaths ? aSourcePaths : aGuids,
				// aGanttDemandDragged = this.getModel("viewModel").getData().dragSession[0],
				aPromises = [],
				oDemandObj;

			this.clearMessageModel();

			for (var i = 0; i < aItems.length; i++) {
				oDemandObj = oModel.getProperty(aItems[i]);
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
				// not required for this release
				// if (this.getModel("user").getProperty("/ENABLE_ASGN_DATE_VALIDATION") && this._mParameters.bFromGantt && aGanttDemandDragged.IsSelected) {
				// 	oParams.DateFrom = aGanttDemandDragged.oData.FIXED_ASSGN_START_DATE;
				// 	oParams.TimeFrom.ms = aGanttDemandDragged.oData.FIXED_ASSGN_START_TIME.ms;
				// 	oParams.DateTo = aGanttDemandDragged.oData.FIXED_ASSGN_END_DATE;
				// 	oParams.TimeTo.ms = aGanttDemandDragged.oData.FIXED_ASSGN_END_TIME.ms;
				// }
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
				oQualificationParameters = {
					DemandMultiGuid: sDemandGuids,
					ObjectId: oTargetObj.NodeId, //targetObj.ResourceGroupGuid,
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
		_createGanttHorizon: function (iZoomLevel, oTotalHorizonDates) {
			var oVisibleHorizonDates = this._getVisibleHorizon(iZoomLevel, oTotalHorizonDates);
			return new sap.gantt.axistime.StepwiseZoomStrategy({
				zoomLevel: 3,
				visibleHorizon: new sap.gantt.config.TimeHorizon({
					startTime: oVisibleHorizonDates.StartDate,
					endTime: oVisibleHorizonDates.EndDate
				}),
				totalHorizon: new sap.gantt.config.TimeHorizon({
					startTime: oTotalHorizonDates.StartDate,
					endTime: oTotalHorizonDates.EndDate
				})
			});

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
							oEventBus.publish("BaseController", "refreshCapacity", {
								sTargetPath: sPath.split("/AssignmentSet/results/")[0]
							});
						}.bind(this),
						function () {
							oGanttModel.setProperty(sPath + "/busy", false);
						});
				} else {
					oGanttModel.setProperty(sPath + "/busy", false);
				}
			}.bind(this));
		}
	});

});