sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Token",
	"sap/m/Tokenizer",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
	"sap/base/util/deepClone",
	"sap/base/util/deepEqual"
], function (AssignmentsController, formatter, Filter, FilterOperator, Token, Tokenizer, Fragment, MessageToast) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.gantt.GanttQualificationChecks", {
		
		/* =========================================================== */
		/* Event & Public methods                                      */
		/* =========================================================== */
		/**
		 * Opens the resource qualification dialog 
		 */
		onResourceIconPress: function (oEvent) {
			var oRow = oEvent.getSource().getParent(),
				oContext = oRow.getBindingContext("ganttModel"),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				oResourceNode = oModel.getProperty(sPath),
				sObjectId = oResourceNode.NodeId;

			if (oResourceNode.NodeType !== "ASSIGNMENT") {
				this.getOwnerComponent().ResourceQualifications.open(this.getView(), sObjectId);
			}
		},

		/**
		 * when shape was dragged to another place
		 * validate qualification for this resource node
		 * @param {String} sPath - path of assignment in Gantt Model
		 * @param {Object} oChanges - pending changes of this assignment in GanttModel
		 * @param {Object} oData - full assignment data with Demand data
		 */
		checkQualificationForChangedShapes: function (sPath, oChanges, oData) {
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
						resolve();
					}
				}.bind(this));
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
		 **/
		_checkQualification: function (aSourcePaths, oTargetObj, oTargetDate, oNewEndDate, aGuids) {
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
		},
	});
});