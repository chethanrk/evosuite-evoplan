sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/m/MessageBox"
], function (BaseController, MessageBox) {
	return BaseController.extend("com.evorait.evoplan.controller.common.AssignmentsController", {
		/**
		 * save assignment after drop
		 * 
		 * @param {Object} aSourcePaths
		 * @param {String} sTargetPath
		 */
		assignedDemands: function (aSourcePaths, sTargetPath, mParameters) {
			var oParams = [],
				targetObj = this.getModel().getProperty(sTargetPath),
				bValdiMsgPopupFlag = this.getModel("user").getProperty("/ENABLE_RES_ASGN_VALID_MESG_DEM"), //Condition to check Global configuration for validation Mesg Popup
				bIsGroup = targetObj.NodeType === "RES_GROUP",
				bIsPool = targetObj.NodeType === "RESOURCE" && targetObj.ResourceGuid === "";

			if (bIsGroup || bIsPool || this.isTargetValid(sTargetPath) || !bValdiMsgPopupFlag) {
				oParams = this.setDateTimeParams(oParams, targetObj.StartDate, targetObj.StartTime, targetObj.EndDate, targetObj.EndTime);
				this.checkQualificationAssignment(aSourcePaths, targetObj, oParams, mParameters); //Proceed to check the Qualification
			} else {
				this.openTargetValiditynMsgBox(aSourcePaths, targetObj, oParams, mParameters);
			}
		},
		/**
		 * opens Msg Box where user can confirm the date for assignment
		 * @param {Object} aSourcePaths
		 * @param {String} targetObj
		 * @param {Object} oParams
		 * @param {Object} mParameters
		 * @Author Rakesh Sahu
		 **/
		openTargetValiditynMsgBox: function (aSourcePaths, targetObj, oParams, mParameters) {
			this._showConfirmMessageBox(this.getResourceBundle().getText("ymsg.targetValidity")).then(function (value) {
				if (value === "YES") {
					oParams = this.setDateTimeParams(oParams, targetObj.RES_ASGN_START_DATE, targetObj.RES_ASGN_START_TIME, targetObj.RES_ASGN_END_DATE,
						targetObj.RES_ASGN_END_TIME);
					this.checkQualificationAssignment(aSourcePaths, targetObj, oParams, mParameters); //Proceed to check the Qualification
				}
				if (value === "NO") {
					oParams = this.setDateTimeParams(oParams, targetObj.StartDate, targetObj.StartTime, targetObj.EndDate, targetObj.EndTime);
					this.checkQualificationAssignment(aSourcePaths, targetObj, oParams, mParameters); //Proceed to check the Qualification
				}
			}.bind(this));
		},
		/**
		 * Method to get formatted DemandGuids to be passed in Qualification Service
		 * @param {Object} oModel
		 * @param {Object} aSourcePaths
		 * @param {Boolean} bIsBulkReassign // true if Called from Bulk Reassignment
		 * @Author Rakesh Sahu
		 **/
		getFormattedDemandGuids: function (oModel, aSourcePaths, bIsBulkReassign) {
			var oContext,
				sPath,
				demandObj,
				sDemandGuids = "";
			for (var i = 0; i < aSourcePaths.length; i++) {
				oContext = aSourcePaths[i];
				sPath = bIsBulkReassign ? oContext.sPath + "/Demand" : oContext.sPath;
				demandObj = oModel.getProperty(sPath);
				if (sDemandGuids === "") {
					sDemandGuids = demandObj.Guid;
				} else {
					sDemandGuids = sDemandGuids + "//" + demandObj.Guid;
				}
			}
			return sDemandGuids;
		},
		/**
		 * Method to get Parameters to passed in check Qualification service call
		 * @param {String} DemandMultiGuid
		 * @param {String} ObjectId
		 * @param {DateTime} StartTimestamp
		 * @param {DateTime} EndTimestamp
		 * @param {String} AssignmentGUID // available for Update only
		 * @Author Rakesh Sahu
		 **/
		getQualificationCheckParameters: function (DemandMultiGuid, ObjectId, StartTimestamp, EndTimestamp, AssignmentGUID) {
			var oQualificationParameters = {
				DemandMultiGuid: DemandMultiGuid,
				ObjectId: ObjectId,
				StartTimestamp: StartTimestamp,
				EndTimestamp: EndTimestamp
			};
			if (AssignmentGUID) {
				oQualificationParameters.AssignmentGUID = AssignmentGUID;
			}
			return oQualificationParameters;
		},
		/**
		 * //Method to Setting up the properties to Use it in the Proceed Method in Qualification Dialog
		 * @param {Object} TargetObject
		 * @param {Object} QualificationData
		 * @param {Object} mParameters
		 * @param {String} SourceMethod
		 * @param {Object} SourcePaths
		 * @param {Object} oParams
		 * @param {String} AssignPath
		 * @param {Object} Contexts
		 * @Author Rakesh Sahu
		 **/
		setQualificationMatchResults: function (TargetObject, QualificationData, mParameters, SourceMethod, SourcePaths, oParams, AssignPath,
			Contexts) {
			this.getModel("viewModel").setProperty("/QualificationMatchList", {
				TargetObject: TargetObject,
				QualificationData: QualificationData,
				SourcePaths: SourcePaths,
				mParameter: mParameters,
				oParams: oParams,
				SourceMethod: SourceMethod,
				AssignPath: AssignPath,
				Contexts: Contexts
			});
		},

		/**
		 * proceed to Qualification Check for Demand Assignment, before Service call (Call Function Import)
		 * @param {Object} aSourcePaths
		 * @param {String} targetObj
		 * @param {Object} oParams
		 * @param {Object} mParameters
		 * @Author Rakesh Sahu
		 **/
		checkQualificationAssignment: function (aSourcePaths, targetObj, oParams, mParameters) {
			if (this.getModel("user").getProperty("/ENABLE_QUALIFICATION")) { //if Global parameter set True then need to check Qualification
				var oModel = this.getModel(),
					sDemandGuids = this.getFormattedDemandGuids(oModel, aSourcePaths), //getting formatted DemandGuids to be passed in Qualification Service
					oQualificationParameters = this.getQualificationCheckParameters(sDemandGuids, targetObj.NodeId, oParams.DateFrom, oParams.DateTo); //getting Parameters to passed in check Qualification service call

				//Calling Funtion Import to Check Qualification
				this.executeFunctionImport(oModel, oQualificationParameters, "ValidateDemandQualification", "POST").then(function (oData, response) {
					// Condition to Check if Qualification match service returns any result or Empty
					if (oData.results && oData.results.length) {
						//Setting up the properties to Use it in the Proceed Method in Qualification Dialog
						this.setQualificationMatchResults(targetObj, oData.results, mParameters, "assignedDemands", aSourcePaths, oParams);
						this.showQualificationResults(); //Method to Open Qualification Dialog
					} else {
						this.proceedToServiceCallAssignDemands(aSourcePaths, targetObj, mParameters, oParams);
					}
				}.bind(this));
			} else {
				//Qualification check is to be by-Passed, Directly Calling the final function for assignment
				this.proceedToServiceCallAssignDemands(aSourcePaths, targetObj, mParameters, oParams);
			}
		},
		/**
		 * proceed to Qualification Check for reassignments, before Service call (Call Function Import)
		 * @param {Object} oAssignmentData
		 * @param {Object} oParams
		 * @param {Object} mParameters
		 * @Author Rakesh Sahu
		 **/
		checkQualificationUpdate: function (oAssignmentData, oParams, mParameters) {
			if (this.getModel("user").getProperty("/ENABLE_QUALIFICATION")) {
				//need to check Qualification
				var oQualificationParameters,
					oModel = this.getModel(),
					sObjectId = oParams.ResourceGroupGuid,
					targetObj = this.getModel().getProperty(oAssignmentData.NewAssignPath);

				if (oParams.ResourceGuid) {
					sObjectId = oParams.ResourceGuid + "//" + sObjectId;
				}
				oQualificationParameters = this.getQualificationCheckParameters(oAssignmentData.DemandGuid, sObjectId, oAssignmentData.DateFrom,
					oAssignmentData.DateTo, oAssignmentData.AssignmentGuid); //getting Parameters to passed in check Qualification service call

				//Calling Funtion Import to Check Qualification
				this.executeFunctionImport(oModel, oQualificationParameters, "ValidateDemandQualification", "POST").then(function (oData, response) {
					// Condition to Check if Qualification match service returns any result or Empty
					if (oData.results && oData.results.length) {
						//Setting up the properties to Use it in the Proceed Method in Qualification Dialog
						this.setQualificationMatchResults(targetObj, oData.results, mParameters, "UpdateAssignment", null, oParams);
						this.showQualificationResults(); //Method to Open Qualification Dialog
					} else {
						this.callFunctionImport(oParams, "UpdateAssignment", "POST", mParameters, true);
					}
				}.bind(this));
			} else {
				//Qualification check is to be by-Passed, Directly Calling the final function for assignment
				this.callFunctionImport(oParams, "UpdateAssignment", "POST", mParameters, true);
			}
		},
		/**
		 * proceed to Qualification Check for reassignments, before Service call (Call Function Import)
		 * @param {Object} sAssignPath: target Resource Path
		 * @param {Object} aContexts: Source assginment objects
		 * @param {Object} mParameters
		 * @Author Rakesh Sahu
		 **/
		checkQualificationBulkReassignment: function (sAssignPath, aContexts, mParameters) {
			if (this.getModel("user").getProperty("/ENABLE_QUALIFICATION")) {
				//need to check Qualification
				var oModel = this.getModel(),
					sDemandGuids = this.getFormattedDemandGuids(oModel, aContexts, true), //getting formatted DemandGuids to be passed in Qualification Service
					targetObj = oModel.getProperty(sAssignPath),
					oParams = this.setDateTimeParams([], targetObj.StartDate, targetObj.StartTime, targetObj.EndDate, targetObj.EndTime),
					oQualificationParameters = this.getQualificationCheckParameters(sDemandGuids, targetObj.NodeId, oParams.DateFrom, oParams.DateTo); //getting Parameters to passed in check Qualification service call;

				//Calling Funtion Import to Check Qualification
				this.executeFunctionImport(oModel, oQualificationParameters, "ValidateDemandQualification", "POST").then(function (oData, response) {
					// Condition to Check if Qualification match service returns any result or Empty
					if (oData.results && oData.results.length) {
						//Setting up the properties to Use it in the Proceed Method in Qualification Dialog
						this.setQualificationMatchResults(targetObj, oData.results, mParameters, "bulkReAssignment", null, null, sAssignPath,
							aContexts);
						this.showQualificationResults(); //Method to Open Qualification Dialog
					} else {
						this.bulkReAssignmentFinalCall(sAssignPath, aContexts, mParameters);
					}
				}.bind(this));
			} else {
				//Qualification check is to be by-Passed, Directly Calling the final function for assignment
				this.bulkReAssignmentFinalCall(sAssignPath, aContexts, mParameters);
			}
		},
		/**
		 * Opens the Dialog containing Qualification check Results
		 * @param 
		 */
		showQualificationResults: function () {
			this.getOwnerComponent().QualificationCheck.open(this, this.getView());
		},
		/**
		 * proceed to Service call(Call Function Import) after Availibility, validation and Qualification check
		 * @param {Object} aSourcePaths
		 * @param {String} targetObj
		 * @param {Object} mParameters
		 * @param {Object} oParams
		 */
		proceedToServiceCallAssignDemands: function (aSourcePaths, targetObj, mParameters, oParams, aGuids) {
			var oModel = this.getModel(),
				bIsLast = null,
				aItems = aSourcePaths && aSourcePaths.length ? aSourcePaths : aGuids,
				oContext, sPath, demandObj;
			this.clearMessageModel();
			for (var i = 0; i < aItems.length; i++) {
				oContext = aItems[i];
				sPath = oContext.sPath ? oContext.sPath : oContext;
				demandObj = oModel.getProperty(sPath);

				oParams.DemandGuid = demandObj ? demandObj.Guid : sPath.split("'")[1];
				oParams.ResourceGroupGuid = targetObj.ResourceGroupGuid;
				oParams.ResourceGuid = targetObj.ResourceGuid;

				if (parseInt(i, 10) === aItems.length - 1) {
					bIsLast = true;
				}
				this.callFunctionImport(oParams, "CreateAssignment", "POST", mParameters, bIsLast);
			}
		},

		/**
		 * update assignment 
		 * @param {String} sPath
		 */
		updateAssignment: function (isReassign, mParameters) {
			var oData = this.getModel("assignment").getData(),
				sAssignmentGUID = oData.AssignmentGuid,
				sDisplayMessage,
				oResource;

			if (isReassign && !oData.AllowReassign) {
				sDisplayMessage = this.getResourceBundle().getText("reAssignFailMsg");
				this._showAssignErrorDialog([oData.Description], null, sDisplayMessage);
				return;
			}

			var oParams = {
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
				AssignmentGUID: sAssignmentGUID,
				EffortUnit: oData.EffortUnit,
				Effort: oData.Effort,
				ResourceGroupGuid: oData.ResourceGroupGuid,
				ResourceGuid: oData.ResourceGuid
			};

			if (isReassign && oData.NewAssignPath) {
				oResource = this.getModel().getProperty(oData.NewAssignPath);
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
				// Proceed to check the Qualification for UpdateAssignment
				this.checkQualificationUpdate(oData, oParams, mParameters);
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
			// Proceed to check the Qualification for Bulk Re-Assignment
			this.checkQualificationBulkReassignment(sAssignPath, aContexts, mParameters);
		},
		bulkReAssignmentFinalCall: function (sAssignPath, aContexts, mParameters) {
			var oModel = this.getModel(),
				oResource = oModel.getProperty(sAssignPath),
				bIsLast = null,
				sPath, oAssignment, oParams;
			// Clears the Message model
			this.clearMessageModel();

			for (var i in aContexts) {
				sPath = aContexts[i].sPath;
				oAssignment = oModel.getProperty(sPath);
				oParams = {
					AssignmentGUID: oAssignment.Guid,
					EffortUnit: oAssignment.EffortUnit,
					Effort: oAssignment.Effort,
					ResourceGroupGuid: oResource.ResourceGroupGuid,
					ResourceGuid: oResource.ResourceGuid
				};
				oParams = this.setDateTimeParams(oParams, oResource.StartDate, oResource.StartTime, oResource.EndDate, oResource.EndTime);
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
				bIsLast = null,
				sPath, sAssignmentGuid, oParams;
			this.clearMessageModel();
			for (var i in aContexts) {
				sPath = aContexts[i].getPath();
				sAssignmentGuid = oModel.getProperty(sPath + "/Guid");
				oParams = {
					AssignmentGUID: sAssignmentGuid
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
				AssignmentGUID: sId
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
					Function: sFunctionKey
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
		 * Submittion of all assignments changes as delete, manage or create absence
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
					this.callFunctionImport(aAbsences[j], "ManageAbsence", "POST", oData.mParameters, bIsLast);
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
							//Proceed to check the Qualification for UpdateAssignment
							this.checkQualificationUpdate(this.getModel("assignment").getData(), oParams, mParameters);
						}
					}.bind(this)
				}
			);
		},
		/**
		 * method to set Date and time into the payload for the assignment
		 * @param oParams Update parameter for single assignment
		 * @param vStartdate start date for the assignment
		 * @param vStartTime end time for the assignment
		 * @param vEndDate end date for the assignment
		 * @param vEndTime end time for the assignment
		 */
		setDateTimeParams: function (oParams, vStartdate, vStartTime, vEndDate, vEndTime, oTargetDate, oNewEndDate) {
			var vCurrentTime = new Date().getTime();
			if (vStartdate) {
				oParams.DateFrom = oTargetDate ? oTargetDate : vStartdate;
				oParams.TimeFrom = vStartTime;
			} else {
				oParams.DateFrom = oTargetDate ? oTargetDate : new Date(); // When Start Date Null/In the Simple view today date will sent
				oParams.TimeFrom = vStartTime;
				oParams.TimeFrom.ms = oTargetDate ? oTargetDate.getTime() : vCurrentTime;
			}

			if (vEndDate) {
				oParams.DateTo = oNewEndDate ? oNewEndDate : vEndDate;
				oParams.TimeTo = vEndTime;
			} else {
				oParams.DateTo = oNewEndDate ? oNewEndDate : new Date(); // When Start Date Null/In the Simple view today date will sent
				oParams.TimeTo = vEndTime;
				oParams.TimeTo.ms = oNewEndDate ? oNewEndDate.getTime() : vCurrentTime;
			}
			return oParams;
		}
	});
});