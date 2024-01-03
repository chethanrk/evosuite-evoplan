sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"sap/base/util/deepClone",
	"sap/base/util/deepEqual"
], function (AssignmentsController) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.gantt.GanttQualificationChecks", {
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.gantt.view.newgantt
		 */
		onInit: function () {
			AssignmentsController.prototype.onInit.apply(this, arguments);
		},

		/* =========================================================== */
		/* Public methods                                      */
		/* =========================================================== */
		/**
		 * when shape was dragged to another place
		 * validate qualification for this resource node
		 * @param {Object} oChanges - pending changes of this assignment in GanttModel
		 * @param {Object} oData - full assignment data with Demand data
		 */
		checkQualificationForChangedShapes: function (oChanges, oData) {
			return new Promise(function (resolve, reject) {
				var sTargetPath = oData.NewAssignPath ? oData.NewAssignPath : oChanges.OldAssignPath;
				var oTargetData = this.oGanttModel.getProperty(sTargetPath);
				this._sendCheckQualification(null, oTargetData, oData.DateFrom, oData.DateTo, [oData.DemandGuid], null).then(resolve, reject);
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
		 * @returns {Promise} if resource has the qualification or not
		 * @private
		 */
		checkResourceQualification: function (aSourcePaths, oTarget, oTargetDate, oNewEndDate, aGuids, mParameters) {
			return new Promise(function (resolve, reject) {
				var oTargetObject = this.oGanttModel.getProperty(oTarget);
				this._sendCheckQualification(aSourcePaths, oTargetObject, oTargetDate, oNewEndDate, aGuids, mParameters).then(resolve, reject);
			}.bind(this));
		},

		/* =========================================================== */
		/* Private methods                                             */
		/* =========================================================== */
		/**
		 * Proceed to Qualification Check for Demand Assignment/Reassignment/Update, before Service call (Call Function Import) 
		 * @param {Object} aSourcePaths Demand paths
		 * @param {Object} oTargetObject Resource Path
		 * @param {Object} oTargetDate Target date of assignment
		 * @param {Object} oNewEndDate new end date from streach validation
		 * @param {Object} aGuids Array of demand paths in case of split window
		 * @param {Object} mParameters parameters for function import
		 * @returns promise if resource has the matching qualification or opens qualification check popup
		 */
		_sendCheckQualification: function (aSourcePaths, oTargetObject, oTargetDate, oNewEndDate, aGuids, mParameters) {
			return new Promise(function (resolve, reject) {
				this._checkQualification(aSourcePaths, oTargetObject, oTargetDate, oNewEndDate, aGuids).then(function (data) {
					if (data.result.results && data.result.results.length) {
						this.oViewModel.setProperty("/QualificationMatchList", {
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
						resolve(oNewEndDate);
					}
				}.bind(this), function () {
					this.clearDragSession(this.getView());
				});
			}.bind(this));
		},

		/**
		 * Validation of demand for resource qualification
		 * 
		 * @param {Array} aSourcePaths - collection of demand pathes
		 * @param {String} targetObj - target resource for node ID
		 * @param {Object} oTargetDate - new start date 
		 * @param {Object} oNewEndDate - new end date
		 * @param {Array} aGuids - collection of IDs from Demands
		 * @returns the qualifications fetched of the selected data
		 **/
		_checkQualification: function (aSourcePaths, oTargetObj, oTargetDate, oNewEndDate, aGuids) {
			var oQualificationParameters,
				oModel = this.getModel(),
				sDemandGuids = "",
				sObjectId,
				sPath,
				oDemandObj,
				sDemandGuid,
				aItems = aSourcePaths ? aSourcePaths : aGuids;
			return new Promise(function (resolve, reject) {
				//collect all demand Guids for function import
				for (var i = 0; i < aItems.length; i++) {
					sPath = aItems[i].sPath ? aItems[i].sPath : aItems[i];
					if (sPath.indexOf("'") >= 0 && !aSourcePaths) {
						sPath = sPath.split("'")[1];
					}

					oDemandObj = oModel.getProperty(sPath);
					sDemandGuid = oDemandObj ? oDemandObj.Guid : aItems[i];
					//if blank then assigning the guid fetched from model
					if (sDemandGuids === "") {
						sDemandGuids = sDemandGuid;
					} else {
						sDemandGuids = sDemandGuids + "//" + sDemandGuid;
					}
				}
				sObjectId = oTargetObj.NodeId;
				// if the target is of type assignment
				if (oTargetObj.NodeType === "ASSIGNMENT") {
					sObjectId = oTargetObj.ObjectId;
					if (!sObjectId) {
						sObjectId = oTargetObj.NodeId;
					}
				}
				oQualificationParameters = {
					DemandMultiGuid: sDemandGuids,
					ObjectId: sObjectId,
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
		}
	});
});