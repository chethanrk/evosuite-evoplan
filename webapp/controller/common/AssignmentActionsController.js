/**
 * The file AssignmentActionsController will be exactly same as AssignmentController.
 * All methods in this file will call executeFunctionImport method and will return promise
 * of action performed.
 * 
 */
sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter"
], function (AssignmentsController, MessageBox, formatter) {
	return AssignmentsController.extend("com.evorait.evoplan.controller.common.AssignmentActionsController", {

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
				sDemandGuid,
				oParams;

			this.clearMessageModel();

			for (var i = 0; i < aItems.length; i++) {
				oDemandObj = oModel.getProperty(aItems[i]);
				sDemandGuid = oDemandObj ? oDemandObj.Guid : aItems[i].split("'")[1];
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
				if (this.getModel("user").getProperty("/ENABLE_ASGN_DATE_VALIDATION") && this._mParameters.bFromGantt && aGanttDemandDragged.IsSelected) {
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
		_updateAssignment: function (oModel, isReassign, oParams, mParameters) {
			var sDisplayMessage,
				oResource;

			// if (isReassign && !oData.AllowReassign) {
			// 	sDisplayMessage = this.getResourceBundle().getText("reAssignFailMsg");
			// 	this._showAssignErrorDialog([oData.Description], null, sDisplayMessage);
			// 	return;
			// }

			this.executeFunctionImport(oModel, oParams, "UpdateAssignment", "POST", mParameters, true).then(function (oData, oResponse) {

			}.bind(this));
			return;
			// var oParams = {
			// 	DateFrom: oData.DateFrom || 0,
			// 	TimeFrom: {
			// 		__edmtype: "Edm.Time",
			// 		ms: oData.DateFrom.getTime()
			// 	},
			// 	DateTo: oData.DateTo || 0,
			// 	TimeTo: {
			// 		__edmtype: "Edm.Time",
			// 		ms: oData.DateTo.getTime()
			// 	},
			// 	AssignmentGUID: sAssignmentGUID,
			// 	EffortUnit: oData.EffortUnit,
			// 	Effort: oData.Effort,
			// 	ResourceGroupGuid: oData.ResourceGroupGuid,
			// 	ResourceGuid: oData.ResourceGuid
			// };

			// if (isReassign && oData.NewAssignPath) {
			// 	oResource = this.getModel().getProperty(oData.NewAssignPath);
			// 	oParams.ResourceGroupGuid = oResource.ResourceGroupGuid;
			// 	oParams.ResourceGuid = oResource.ResourceGuid;
			// }
			this.clearMessageModel();
			if (isReassign && !this.isAssignable({
					sPath: oData.NewAssignPath
				})) {
				return;
			}
			if (isReassign && oData.NewAssignPath && !this.isAvailable(oData.NewAssignPath)) {
				this.showMessageToProceed(null, null, null, null, true, oParams, mParameters);
			} else {
				// Proceed to check the Qualification for UpdateAssignment
				// this.checkQualificationUpdate(oData, oParams, mParameters);
			}
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
		}
	});
});