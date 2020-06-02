sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/m/MessageBox"
], function (BaseController, MessageBox) {
	return BaseController.extend("com.evorait.evoplan.controller.AssignmentsController", {

		/**
		 * save assignment after drop
		 * 
		 * @param {Object} aSourcePaths
		 * @param {String} sTargetPath
		 * @deprecated
		 */
		assignedDemands: function (aSourcePaths, sTargetPath, mParameters) {
			var oModel = this.getModel();
			var targetObj = oModel.getProperty(sTargetPath),
				bIsLast = null;
			this.clearMessageModel();

			for (var i = 0; i < aSourcePaths.length; i++) {
				var obj = aSourcePaths[i],
					demandObj = oModel.getProperty(obj.sPath),
					oParams = {
						"DemandGuid": demandObj.Guid,
						"ResourceGroupGuid": targetObj.ResourceGroupGuid,
						"ResourceGuid": targetObj.ResourceGuid
					};
				if (parseInt(i, 10) === aSourcePaths.length - 1) {
						bIsLast = true;
					}	
				if (this.isTargetValid(sTargetPath)) {
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
					this.callFunctionImport(oParams, "CreateAssignment", "POST", mParameters, bIsLast);
				} else {
					this._showConfirmMessageBox(this.getResourceBundle().getText("ymsg.targetValidity")).then(function (value) {
						if (value === "YES") {
							if (targetObj.RES_ASGN_START_DATE) {
								oParams.DateFrom = targetObj.RES_ASGN_START_DATE;
								oParams.TimeFrom = targetObj.RES_ASGN_START_TIME;
							} else {
								oParams.DateFrom = new Date(); // When Start Date Null/In the Simple view today date will sent
								oParams.TimeFrom = targetObj.RES_ASGN_START_TIME;
							}

							if (targetObj.RES_ASGN_END_DATE) {
								oParams.DateTo = targetObj.RES_ASGN_END_DATE;
								oParams.TimeTo = targetObj.RES_ASGN_END_TIME;
							} else {
								oParams.DateTo = new Date(); // When Start Date Null/In the Simple view today date will sent
								oParams.TimeTo = targetObj.RES_ASGN_END_TIME;
							}
							this.callFunctionImport(oParams, "CreateAssignment", "POST", mParameters, bIsLast);
						} 
					}.bind(this));
				}

			}
		},

		/**
		 * update assignment 
		 * @param {String} sPath
		 */
		updateAssignment: function (isReassign, mParameters) {
			var oData = this.getModel("assignment").getData(),
				sAssignmentGUID = oData.AssignmentGuid;

			if (isReassign && !oData.AllowReassign) {
				var msg = this.getResourceBundle().getText("reAssignFailMsg");
				this._showAssignErrorDialog([oData.Description], null, msg);
				return;
			}

			var oParams = {
				"DateFrom": oData.DateFrom || 0,
				"TimeFrom": {
					__edmtype: "Edm.Time",
					ms: oData.DateFrom.getTime()
				},
				"DateTo": oData.DateTo || 0,
				"TimeTo": {
					__edmtype: "Edm.Time",
					ms: oData.DateTo.getTime()
				},
				"AssignmentGUID": sAssignmentGUID,
				"EffortUnit": oData.EffortUnit,
				"Effort": oData.Effort,
				"ResourceGroupGuid": oData.ResourceGroupGuid,
				"ResourceGuid": oData.ResourceGuid
			};

			if (isReassign && oData.NewAssignPath) {
				var oResource = this.getModel().getProperty(oData.NewAssignPath);
				oParams.ResourceGroupGuid = oResource.ResourceGroupGuid;
				oParams.ResourceGuid = oResource.ResourceGuid;
			}
			this.clearMessageModel();
			if (isReassign && !this.isAssignable({
					sPath: oData.NewAssignPath
				})) {
				return;
			}
			if (isReassign && oData.NewAssignPath && !this.isAvailable(oData.NewAssignPath)) {
				this.showMessageToProceed(null, null, null, null, true, oParams, mParameters);
			} else {
				this.callFunctionImport(oParams, "UpdateAssignment", "POST", mParameters, true);
			}
		},
		/**
		 * Calls the update assignment function import for selected assignment in order to
		 * bulk reassignment
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param sAssignPath {string} new assign path for reassign
		 * @param aPaths {Array} selected assignment paths
		 */
		bulkReAssignment: function (sAssignPath, aContexts, mParameters) {
			var oModel = this.getModel(),
				oResource = oModel.getProperty(sAssignPath),
				bIsLast = null;
			// Clears the Message model
			this.clearMessageModel();

			for (var i in aContexts) {
				var sPath = aContexts[i].sPath;
				var oAssignment = oModel.getProperty(sPath);
				var oParams = {
					"AssignmentGUID": oAssignment.Guid,
					"EffortUnit": oAssignment.EffortUnit,
					"Effort": oAssignment.Effort,
					"ResourceGroupGuid": oResource.ResourceGroupGuid,
					"ResourceGuid": oResource.ResourceGuid
				};

				if (oResource.StartDate) {
					oParams.DateFrom = oResource.StartDate;
					oParams.TimeFrom = oResource.StartTime;
				} else {
					oParams.DateFrom = new Date(); // When Start Date Null/In the Simple view today date will sent
					oParams.TimeFrom = oResource.StartTime;
				}

				if (oResource.EndDate) {
					oParams.DateTo = oResource.EndDate;
					oParams.TimeTo = oResource.EndTime;
				} else {
					oParams.DateTo = new Date(); // When Start Date Null/In the Simple view today date will sent
					oParams.TimeTo = oResource.EndTime;
				}
				if (parseInt(i, 10) === aContexts.length - 1) {
					bIsLast = true;
				}
				// call function import
				this.callFunctionImport(oParams, "UpdateAssignment", "POST", mParameters, bIsLast);
			}
		},
		/**
		 * delete assignments in bulk
		 * @Author Rahul
		 * @version 2.0.6
		 * @param {Array} aContexts  Assignments contexts to be deleted.
		 */
		bulkDeleteAssignment: function (aContexts, mParameters) {
			var oModel = this.getModel(),
				bIsLast = null;
			this.clearMessageModel();
			for (var i in aContexts) {
				var sPath = aContexts[i].getPath();
				var sAssignmentGuid = oModel.getProperty(sPath + "/Guid");
				var oParams = {
					"AssignmentGUID": sAssignmentGuid
				};
				if (parseInt(i, 10) === aContexts.length - 1) {
					bIsLast = true;
				}

				this.callFunctionImport(oParams, "DeleteAssignment", "POST", mParameters, bIsLast);

			}
		},
		/**
		 * delete assignment
		 * @param sPath
		 */
		deleteAssignment: function (sId, mParameters) {
			var oParams = {
				"AssignmentGUID": sId
			};
			this.clearMessageModel();
			this.callFunctionImport(oParams, "DeleteAssignment", "POST", mParameters, true);
		},

		/**
		 * update demand function status on selected paths
		 * @param aSelectedPaths
		 * @param sFunctionKey
		 */
		updateFunctionDemand: function (aSelectedPaths, sFunctionKey, mParameters) {
			var oParams = {
					"Function": sFunctionKey
				},
				bIsLast = null;

			for (var i = 0; i < aSelectedPaths.length; i++) {
				oParams.DemandGuid = aSelectedPaths[i].oData.Guid;
				if (parseInt(i, 10) === aSelectedPaths.length - 1) {
					bIsLast = true;
				}
				this.callFunctionImport(oParams, "ExecuteDemandFunction", "POST", mParameters, bIsLast);
			}
		},

		/** 
		 * 
		 * @param aAssignments
		 */
		saveAllAssignments: function (oData) {
			var aAssignmentKeys = Object.keys(oData.assignments),
				aAbsenceKeys = Object.keys(oData.absences),
				aAssignments = oData.assignments,
				aAbsences = oData.absences,
				bIsLast = null;
			for (var i in aAssignments) {
				bIsLast = null;
				if (aAssignments[aAssignmentKeys[aAssignmentKeys.length - 1]] === aAssignments[i]) {
					bIsLast = true;
				}
				// call function import
				if (aAssignments[i]) {
					this.callFunctionImport(aAssignments[i], "UpdateAssignment", "POST", oData.mParameters, bIsLast);
				} else {
					this.callFunctionImport({
						AssignmentGUID: i
					}, "DeleteAssignment", "POST", oData.mParameters, bIsLast);
				}
			}
			for (var j in aAbsences) {
				bIsLast = null;
				if (aAbsences[aAbsenceKeys[aAbsenceKeys.length - 1]] === aAbsences[j]) {
					bIsLast = true;
				}
				// call function import
				if (aAbsences[j]) {
					this.callFunctionImport(aAbsences[j], "CreateAbsence", "POST", oData.mParameters, bIsLast);
				} else {
					//
				}
			}
		},
		/**
		 * Show the message to proceed with the assignment
		 * @param aSources Demands to be assigned
		 * @param sTargetPath Resource path
		 * @param bBulkReassign flag which says is it bulk reassignment
		 * @param aContexts - Assignment contexts to be reassigned (bulk reassignment) - only sent if bBulkReassign is true
		 * @param bUpdate - Single reassignment
		 * @param oParams - Update parameter for single assignment
		 *
		 */
		showMessageToProceed: function (aSources, sTargetPath, bBulkReassign, aContexts, bUpdate, oParams, mParameters) {
			var oResourceBundle = this.getResourceBundle(),
				oComponent = this.getOwnerComponent(),
				sAction = oResourceBundle.getText("xbut.proceed"),
				sMessage = oResourceBundle.getText("ymsg.availability");

			MessageBox.warning(
				sMessage, {
					actions: [sAction, sap.m.MessageBox.Action.CANCEL],
					styleClass: oComponent.getContentDensityClass(),
					onClose: function (sValue) {
						if (sValue === sAction && !bBulkReassign && !bUpdate) {
							this.assignedDemands(aSources, sTargetPath, mParameters);
						} else if (sValue === sAction && bBulkReassign) {
							this.bulkReAssignment(sTargetPath, aContexts, mParameters);
						} else if (sValue === sAction && bUpdate) {
							this.callFunctionImport(oParams, "UpdateAssignment", "POST", mParameters, true);
						}
					}.bind(this)
				}
			);
		}
	});
});