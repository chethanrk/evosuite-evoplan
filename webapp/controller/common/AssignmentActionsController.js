/**
 * The file AssignmentActionsController will be exactly same as AssignmentController.
 * All methods in this file will call executeFunctionImport method and will return promise
 * of action performed.
 * 
 */
sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"sap/m/MessageBox"
], function (AssignmentsController, MessageBox) {
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
				aPromises = [];

			this.clearMessageModel();

			for (var i = 0; i < aItems.length; i++) {
				var sDemandGuid = oModel.getProperty(aItems[i]).Guid,
					oParams = {
						"DemandGuid": sDemandGuid,
						"ResourceGroupGuid": targetObj.ResourceGroupGuid,
						"ResourceGuid": targetObj.ResourceGuid
					};
				// When we drop on the Gantt chart directly
				if (oTargetDate) {
					oParams.DateFrom = oTargetDate;
					oParams.TimeFrom = {
						ms: oTargetDate.getTime(),
						__edmType: "Edm.Time"
					};
					oParams.DateTo = oTargetDate;
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
				"AssignmentGUID": sAssignmentGuid
			}, "DeleteAssignment", "POST");
		},
		/**
		 * proceed to Service call after validation
		 * 
		 * @param {Object} aSourcePaths
		 * @param {String} targetObj
		 * @param {Object} oParams
		 * @param {Object} mParameters
		 **/
		checkQualification: function (aSourcePaths, targetObj, oTargetDate, oNewEndDate) {
			var oQualificationParameters,
				oModel = this.getModel(),
				sDemandGuids = "";
			return new Promise(function (resolve, reject) {

				for (var i = 0; i < aSourcePaths.length; i++) {
					var demandObj = oModel.getProperty(aSourcePaths[i]);
					if (sDemandGuids === "") {
						sDemandGuids = demandObj.Guid;
					} else {
						sDemandGuids = sDemandGuids + "//" + demandObj.Guid;
					}
				}
				oQualificationParameters = {
					DemandMultiGuid: sDemandGuids,
					ObjectId: targetObj.NodeId, //targetObj.ResourceGroupGuid,
					StartTimestamp: oTargetDate,
					EndTimestamp: oNewEndDate | oTargetDate         
				};
				this.executeFunctionImport(oModel, oQualificationParameters, "ValidateDemandQualification", "POST").then(function (oData,
					response) {
					resolve({
						params: oQualificationParameters,
						result: oData
					});
				}.bind(this));
			}.bind(this));
		}
	});
});