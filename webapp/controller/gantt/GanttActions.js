sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentActionsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Token",
	"sap/m/Tokenizer",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast"
], function (BaseController, formatter, Filter, FilterOperator, Token, Tokenizer, Fragment, MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.gantt.GanttActions", {

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
				targetObj = oModel.getProperty(sTargetPath),
				aItems = aSourcePaths ? aSourcePaths : aGuids,
				aGanttDemandDragged = this.getModel("viewModel").getData().dragSession[0],
				aPromises = [],
				oDemandObj,
				sDemandGuid;

			this.clearMessageModel();

			for (var i = 0; i < aItems.length; i++) {
				oDemandObj = oModel.getProperty(aItems[i]);
				sDemandGuid = oDemandObj ? oDemandObj.Guid : aItems[i].split("'")[1],
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
		 * proceed to Service call after validation
		 * 
		 * @param {Object} aSourcePaths
		 * @param {String} targetObj
		 * @param {Object} oParams
		 * @param {Object} mParameters
		 **/
		checkQualification: function (aSourcePaths, targetObj, oTargetDate, oNewEndDate, aGuids) {
			var oQualificationParameters,
				oModel = this.getModel(),
				sDemandGuids = "",
				aItems = aSourcePaths ? aSourcePaths : aGuids;
			return new Promise(function (resolve, reject) {
				for (var i = 0; i < aItems.length; i++) {
					var sPath = aItems[i].sPath ? aItems[i].sPath : aItems[i];
					var demandObj = oModel.getProperty(sPath);
					var sDemandGuid = demandObj ? demandObj.Guid : sPath.split("'")[1];
					if (sDemandGuids === "") {
						sDemandGuids = sDemandGuid;
					} else {
						sDemandGuids = sDemandGuids + "//" + sDemandGuid;
					}
				}
				oQualificationParameters = {
					DemandMultiGuid: sDemandGuids,
					ObjectId: targetObj.NodeId, //targetObj.ResourceGroupGuid,
					StartTimestamp: oTargetDate,
					EndTimestamp: oNewEndDate ? oNewEndDate : oTargetDate
				};
				this.executeFunctionImport(oModel, oQualificationParameters, "ValidateDemandQualification", "POST").then(function (oData,
					response) {
					resolve({
						params: oQualificationParameters,
						result: oData
					});
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
		}
	});

});