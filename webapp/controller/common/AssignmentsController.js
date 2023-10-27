sap.ui.define([
	"com/evorait/evoplan/controller/common/DemandTableOperations",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment"
], function (DemandTableOperations, MessageBox, formatter, Constants, Fragment) {

	return DemandTableOperations.extend("com.evorait.evoplan.controller.common.AssignmentsController", {
		onInit: function () {
			// call super class onInit
			DemandTableOperations.prototype.onInit.apply(this, arguments);
		},

		/**
		 * save assignment after drop
		 * 
		 * @param {Object} aSourcePaths
		 * @param {String} sTargetPath
		 */
		assignedDemands: function (aSourcePaths, sTargetPath, mParameters) {
			var oParams = [],
				targetObj = this.getModel().getProperty(sTargetPath),
				bValdiMsgPopupFlag = this.getModel("user").getProperty("/ENABLE_RES_ASGN_VALID_CHECK"), //Condition to check Global configuration for validation Mesg Popup
				bIsGroup = targetObj.NodeType === "RES_GROUP",
				bIsPool = targetObj.NodeType === "RESOURCE" && targetObj.ResourceGuid === "",
				bValidNodeType = targetObj.NodeType === "RESOURCE" || targetObj.NodeType === "RES_GROUP";

			//Added new condition to Check & show resource availability for WEEK/MONTH view
			if (this.checkToShowAvailabilities(targetObj)) {
				this.getResourceAvailabilityInfo(targetObj).then(function (results) {
					this.getModel("viewModel").setProperty("/availabilities/data", results);
					this.getModel("viewModel").setProperty("/availabilities/isToAssign", true);
					this.getOwnerComponent().ResourceAvailabilities.open(this.getView(), aSourcePaths, targetObj, this._mParameters);
				}.bind(this));
			} else if (bIsGroup || bIsPool || this.isTargetValid(sTargetPath) || !bValdiMsgPopupFlag || !bValidNodeType) {
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
			if (this.getModel("user").getProperty("/ENABLE_QUALIFICATION") && !(mParameters && mParameters.bFromResourcQualification)) { //if Global parameter set True then need to check Qualification
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
		proceedToServiceCallAssignDemands: function (aSourcePaths, targetObj, mParameters, oDateParams, aGuids) {
			var oModel = this.getModel(),
				bIsLast = null,
				aItems = aSourcePaths && aSourcePaths.length ? aSourcePaths : aGuids,
				aGanttDragSession = this.getModel("viewModel").getData().dragSession,
				aGanttDemandDragged = aGanttDragSession ? aGanttDragSession[0] : null,
				oContext, sPath, demandObj, aOperationTimeParams,
				aAllParameters = [],
				bContinue,
				bShowFutureFixedAssignments = this.getModel("user").getProperty("/ENABLE_FIXED_APPT_FUTURE_DATE"),
				oParams;
			this.aFixedAppointmentPayload = [];
			this.aFixedAppointmentDemands = [];
			this.clearMessageModel();
			//Storing Updated Resources Information for Refreshing only the selected resources in Gantt View
			this.updatedResources(this.getModel("viewModel"), this.getModel("user"), targetObj);

			for (var i = 0; i < aItems.length; i++) {
				oParams = {};
				oParams.DateFrom = oDateParams.DateFrom;
				oParams.TimeFrom = oDateParams.TimeFrom;
				oParams.DateTo = oDateParams.DateTo;
				oParams.TimeTo = oDateParams.TimeTo;
				oContext = aItems[i];
				sPath = oContext.sPath ? oContext.sPath : oContext;
				demandObj = oModel.getProperty(sPath);
				bContinue = true;

				oParams.DemandGuid = demandObj ? demandObj.Guid : sPath.split("'")[1];
				oParams.ResourceGroupGuid = targetObj.ResourceGroupGuid;
				oParams.ResourceGuid = targetObj.ResourceGuid;

				if (this.getModel("user").getProperty("/ENABLE_ASGN_DATE_VALIDATION") && targetObj.NodeType === "RESOURCE") {
					if (oContext.IsSelected) {
						oParams.DateFrom = formatter.mergeDateTime(oContext.oData.FIXED_ASSGN_START_DATE, oContext.oData.FIXED_ASSGN_START_TIME);
						oParams.TimeFrom.ms = oParams.DateFrom.getTime();
						oParams.DateTo = formatter.mergeDateTime(oContext.oData.FIXED_ASSGN_END_DATE, oContext.oData.FIXED_ASSGN_END_TIME);
						oParams.TimeTo.ms = oParams.DateTo.getTime();
					} else {
						aOperationTimeParams = this.setDateTimeParams(oParams, targetObj.StartDate, targetObj.StartTime, targetObj.EndDate, targetObj.EndTime);
						oParams.DateFrom = aOperationTimeParams.DateFrom;
						oParams.TimeFrom.ms = aOperationTimeParams.TimeFrom.ms;
						oParams.DateTo = aOperationTimeParams.DateTo;
						oParams.TimeTo.ms = aOperationTimeParams.TimeTo.ms;
					}
					if (mParameters && mParameters.bFromGantt && aGanttDemandDragged.IsSelected) {
						oParams.DateFrom = formatter.mergeDateTime(aGanttDemandDragged.oData.FIXED_ASSGN_START_DATE, aGanttDemandDragged.oData.FIXED_ASSGN_START_TIME);
						oParams.TimeFrom.ms = oParams.DateFrom.getTime();
						oParams.DateTo = formatter.mergeDateTime(aGanttDemandDragged.oData.FIXED_ASSGN_END_DATE, aGanttDemandDragged.oData.FIXED_ASSGN_END_TIME);
						oParams.TimeTo.ms = oParams.DateTo.getTime();
					}

				}
				//Cost Element, Estimate and Currency fields update for Vendor Assignment
				if (this.getModel("user").getProperty("/ENABLE_EXTERNAL_ASSIGN_DIALOG") && targetObj.ISEXTERNAL) {
					if (oContext.oData.ALLOW_ASSIGNMENT_DIALOG) {
						oParams.CostElement = oContext.oData.CostElement;
						oParams.Estimate = oContext.oData.Estimate;
						oParams.Currency = oContext.oData.Currency;
					} else {
						oParams.CostElement = "";
						oParams.Estimate = "";
						oParams.Currency = "";
					}
				}
				//Effort and Effort Unit fields update for PS Demands Network Assignment
				if (this.getModel("user").getProperty("/ENABLE_NETWORK_ASSIGNMENT")) {
					if (oContext.oData.OBJECT_SOURCE_TYPE === "DEM_PSNW") {
						oParams.Effort = oContext.oData.Duration;
						oParams.EffortUnit = oContext.oData.DurationUnit;
					} else {
						oParams.Effort = "0";
						oParams.EffortUnit = "";
					}
				}

				//Condition added and Method is modified for fixed Appointments			// since Release/2201
				if (demandObj && demandObj.FIXED_APPOINTMENT) {
					if (oParams.DateFrom > demandObj.FIXED_APPOINTMENT_START_DATE || oParams.DateFrom > demandObj.FIXED_APPOINTMENT_LAST_DATE) {
						this.aFixedAppointmentPayload.push(oParams);
						this.aFixedAppointmentDemands.push(demandObj);
						bContinue = false;
					} else if (oParams.DateFrom < demandObj.FIXED_APPOINTMENT_START_DATE) {
						if (bShowFutureFixedAssignments) {
							this.aFixedAppointmentPayload.push(oParams);
							this.aFixedAppointmentDemands.push(demandObj);
							bContinue = false;
						}
					}
				}

				if (bContinue) {
					aAllParameters.push(oParams);
				}

			}

			//Condition added and Method is modified for fixed Appointments			// since Release/2201
			if (this.aFixedAppointmentPayload && this.aFixedAppointmentPayload.length) {
				this.getModel("viewModel").setProperty("/aFixedAppointmentsList", this.aFixedAppointmentDemands);
				this.getOwnerComponent().FixedAppointmentsList.open(this.getView(), this.aFixedAppointmentPayload, aAllParameters, mParameters);
			} else {
				// if global config enabled for split assignments
				// also call new logic only when drop happens on Respurce NodeType - RESOURCE or TIMEDAY
				// then first check with backend if resource availability is there for the assignment work hours 
				// since release 2301
				var bSplitGlobalConfigEnabled = this.getModel("user").getProperty("/ENABLE_SPLIT_STRETCH_ASSIGN"),
					sResourceNodeType = targetObj.NodeType;

				if (bSplitGlobalConfigEnabled && (sResourceNodeType === "RESOURCE" || sResourceNodeType === "TIMEDAY")) {
					this.checkAndExecuteSplitAssignments(aAllParameters, mParameters, sResourceNodeType);
				} else {
					for (var iIndex = 0; iIndex < aAllParameters.length; iIndex++) {
						if (parseInt(iIndex, 10) === aAllParameters.length - 1) {
							bIsLast = true;
						}
						this.callFunctionImport(aAllParameters[iIndex], "CreateAssignment", "POST", mParameters, bIsLast);
					}
					this.clearDragSession(this.getView());
				}
			}

		},

		/**
		 * method checks resourceAvailabilty for the selected demands 
		 * then confirms if the user wants to split the assignments
		 * on confirm/reject then calls the required function imports
		 * 
		 * @param {array} aAssignments array of demands for which resourceAvailabilty checks should happend before split
		 */
		checkAndExecuteSplitAssignments: function (aAssignments, mParameters, sResourceNodeType) {
			this.checkResourceUnavailabilty(aAssignments, mParameters, sResourceNodeType).catch(this.handlePromiseChainCatch)
				.then(this.showSplitConfirmationDialog.bind(this)).catch(this.handlePromiseChainCatch)
				.then(this.callRequiredFunctionImports.bind(this)).catch(this.handlePromiseChainCatch);
		},

		/**
		 * based on the response from split confirmation dialog calls the required function imports
		 * strucuture of oConfirmationDialogResponse :
		 * { arrayOfDemands : aAssignments,
		 *   arrayOfDemandsToSplit : [],
		 *   splitConfirmation : "NO"
		 * };
		 * @param {object} oConfirmationDialogResponse response from split confirmation dialog
		 * 
		 */
		callRequiredFunctionImports: function (oConfirmationDialogResponse) {
			if (oConfirmationDialogResponse) {
				var aDemands = oConfirmationDialogResponse.arrayOfDemands,
					aDemandGuidsToSplit = oConfirmationDialogResponse.arrayOfDemandsToSplit,
					mParameters = oConfirmationDialogResponse.mParameters,
					sResourceNodeType = oConfirmationDialogResponse.nodeType,
					bIsLast;
				for (var iIndex = 0; iIndex < aDemands.length; iIndex++) {
					if (parseInt(iIndex, 10) === aDemands.length - 1) {
						bIsLast = true;
					}
					// if Demand is present in aDemandsForSplitAssignment it means the assignment is of more effort than the resource availability
					// 	thus call the functionImport 'CreateSplitStretchAssignment' 
					// else it means the resource availability is proper for the assignment 
					//  thus call the functionImport 'CreateAssignment'
					if (aDemandGuidsToSplit.includes(aDemands[iIndex].DemandGuid)) {
						aDemands[iIndex].ResourceView = sResourceNodeType === "RESOURCE" ? "SIMPLE" : "DAILY";
						this.callFunctionImport(aDemands[iIndex], "CreateSplitStretchAssignments", "POST", mParameters, bIsLast);
					} else {
						this.callFunctionImport(aDemands[iIndex], "CreateAssignment", "POST", mParameters, bIsLast);
					}
				}
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
				oResource,
				oDemandObj = this.getModel().getProperty("/DemandSet('" + oData.DemandGuid + "')"),
				bShowFutureFixedAssignments = this.getModel("user").getProperty("/ENABLE_FIXED_APPT_FUTURE_DATE"),
				bShowFixedAppointmentDialog, oParams;

			if (isReassign && !oData.AllowReassign) {
				sDisplayMessage = this.getResourceBundle().getText("reAssignFailMsg");
				this._showAssignErrorDialog([this.getMessageDescWithOrderID(oData, oData.Description)], null, sDisplayMessage);
				//when from new gantt shape busy state needs removed
				if (mParameters.bCustomBusy && (mParameters.bFromNewGantt || mParameters.bFromNewGanttSplit)) {
					this._oView.getModel("ganttModel").setProperty(mParameters.sSourcePath + "/busy", false);
				}
				return;
			}

			oParams = {
				DateFrom: oData.DateFrom || 0,
				TimeFrom: oData.TimeFrom || {
					__edmtype: "Edm.Time",
					ms: oData.DateFrom.getTime()
				},
				DateTo: oData.DateTo || 0,
				TimeTo: oData.TimeTo || {
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

			//Condition added and Method is modified for fixed Appointments			// since Release/2201

			bShowFixedAppointmentDialog = oDemandObj.FIXED_APPOINTMENT && (bShowFutureFixedAssignments && oParams.DateFrom < oDemandObj.FIXED_APPOINTMENT_START_DATE ||
				oParams.DateFrom > oDemandObj.FIXED_APPOINTMENT_START_DATE ||
				oParams.DateFrom > oDemandObj.FIXED_APPOINTMENT_LAST_DATE);

			if (bShowFixedAppointmentDialog) {
				this.getModel("viewModel").setProperty("/aFixedAppointmentsList", [oDemandObj]);
				this.getOwnerComponent().FixedAppointmentsList.open(this.getView(), oParams, [], mParameters, "reAssign", isReassign);
			} else {
				if (isReassign && oData.NewAssignPath && !this.isAvailable(oData.NewAssignPath)) {
					this.showMessageToProceed(null, null, null, null, true, oParams, mParameters);
				} else {
					// Proceed to check the Qualification for UpdateAssignment
					this.checkQualificationUpdate(oData, oParams, mParameters);
				}
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
				sPath, oAssignment, oParams, oDemandObj, bContinue = true,
				aAllParameters = [],
				bShowFutureFixedAssignments = this.getModel("user").getProperty("/ENABLE_FIXED_APPT_FUTURE_DATE");
			// Clears the Message model
			this.clearMessageModel();
			this.aFixedAppointmentPayload = [];
			this.aFixedAppointmentDemands = [];

			for (var i in aContexts) {
				sPath = aContexts[i].sPath;
				oAssignment = oModel.getProperty(sPath);
				bContinue = true;
				oParams = {
					AssignmentGUID: oAssignment.Guid,
					EffortUnit: oAssignment.EffortUnit,
					Effort: oAssignment.Effort,
					ResourceGroupGuid: oResource.ResourceGroupGuid,
					ResourceGuid: oResource.ResourceGuid
				};

				oParams = this.setDateTimeParams(oParams, oAssignment.DateFrom, {
					ms: oAssignment.DateFrom.getTime()
				}, oAssignment.DateTo, {
					ms: oAssignment.DateTo.getTime()
				});


				oDemandObj = this.getModel().getProperty("/DemandSet('" + oAssignment.DemandGuid + "')");

				//Conditon for PS Demand Network Assignments Update
				if (this.getModel("user").getProperty("/ENABLE_NETWORK_ASSIGNMENT") && oDemandObj.OBJECT_SOURCE_TYPE === "DEM_PSNW") {
					oParams = this.onReAssignParams(oAssignment, oParams, true);
				}
				//Conditon for Vendor Assignments Update
				if (this.getModel("user").getProperty("/ENABLE_EXTERNAL_ASSIGN_DIALOG") && oResource.ISEXTERNAL && oDemandObj.ALLOW_ASSIGNMENT_DIALOG) {
					oParams = this.onReAssignParams(oAssignment, oParams, null, true);
				}
				//Conditon for OperationTimes Assignments Update
				if (this.getModel("user").getProperty("/ENABLE_ASGN_DATE_VALIDATION") && oResource.NodeType === "RESOURCE") {
					oParams = this.onReAssignParams(oAssignment, oParams);
				}

				//Condition added and Method is modified for fixed Appointments			// since Release/2201
				if (oDemandObj && oDemandObj.FIXED_APPOINTMENT) {
					if (bShowFutureFixedAssignments && oParams.DateFrom < oDemandObj.FIXED_APPOINTMENT_START_DATE || oParams.DateFrom > oDemandObj.FIXED_APPOINTMENT_START_DATE ||
						oParams.DateFrom > oDemandObj.FIXED_APPOINTMENT_LAST_DATE) {
						this.aFixedAppointmentPayload.push(oParams);
						this.aFixedAppointmentDemands.push(oDemandObj);
						bContinue = false;
					}
				}
				if (bContinue) {
					aAllParameters.push(oParams);
				}

			}

			//Condition added and Method is modified for fixed Appointments			// since Release/2201
			if (this.aFixedAppointmentPayload && this.aFixedAppointmentPayload.length) {
				this.getModel("viewModel").setProperty("/aFixedAppointmentsList", this.aFixedAppointmentDemands);
				this.getOwnerComponent().FixedAppointmentsList.open(this.getView(), this.aFixedAppointmentPayload, aAllParameters, mParameters,
					"bulkReAssignment");
			} else {
				for (var i = 0; i < aAllParameters.length; i++) {
					if (parseInt(i, 10) === aAllParameters.length - 1) {
						bIsLast = true;
					}
					this.callFunctionImport(aAllParameters[i], "UpdateAssignment", "POST", mParameters, bIsLast);
				}
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
				oEventBus = sap.ui.getCore().getEventBus(),
				sPath, sAssignmentGuid, oParams;
			this.clearMessageModel();

			this.oPRTActions.checkToolExists(aContexts).then(function (resolve) {
				for (var i in aContexts) {
					sPath = aContexts[i].getPath();
					sAssignmentGuid = oModel.getProperty(sPath + "/Guid");
					oParams = {
						AssignmentGUID: sAssignmentGuid
					};
					if (parseInt(i, 10) === aContexts.length - 1) {
						bIsLast = true;
					}
					//Storing Updated Resources Information for Refreshing only the selected resources in Gantt View
					this.updatedResources(this.getModel("viewModel"), this.getModel("user"), oModel.getProperty(sPath));
					//oEventBus.publish("GanttChart", "refreshResourceOnDelete");
					this.callFunctionImport(oParams, "DeleteAssignment", "POST", mParameters, bIsLast);
				}
			}.bind(this));
		},

		/**
		 * delete assignment
		 * @param sPath
		 */
		deleteAssignment: function (sId, mParameters) {
			this.oPRTActions.checkToolExists([{
				AssignmentGUID: sId
			}]).then(function (resolve) {
				var oParams = {
					AssignmentGUID: sId
				};
				this.clearMessageModel();
				this.callFunctionImport(oParams, "DeleteAssignment", "POST", mParameters, true);
			}.bind(this));
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
			this.clearMessageModel();
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
				} else { }
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
					} else if (sValue === sap.m.MessageBox.Action.CANCEL) {
						//when from new gantt shape busy state needs removed
						if (mParameters.bCustomBusy && (mParameters.bFromNewGantt || mParameters.bFromNewGanttSplit)) {
							this.getModel("ganttModel").setProperty(mParameters.sSourcePath + "/busy", false);
						}
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
				oParams.TimeFrom = {};
				oParams.TimeFrom.ms = oTargetDate ? oTargetDate.getTime() : vCurrentTime;
			}

			if (vEndDate) {
				oParams.DateTo = oNewEndDate ? oNewEndDate : vEndDate;
				oParams.TimeTo = vStartTime.ms === 0 ? vStartTime : vEndTime;
			} else {
				oParams.DateTo = oNewEndDate ? oNewEndDate : new Date(); // When Start Date Null/In the Simple view today date will sent
				oParams.TimeTo = {};
				oParams.TimeTo.ms = oNewEndDate ? oNewEndDate.getTime() : vCurrentTime;
			}
			return oParams;
		},
		/*
		 *Method for checking Enabling Operation Times Demands
		 */
		onShowOperationTimes: function (oViewModel) {
			var aSources = oViewModel.getProperty("/dragSession"),
				aOperationTimes = [];

			//condition added to getData from gantt split : since 2205	
			if (!aSources) {
				aSources = JSON.parse(this.localStorage.get("Evo-aPathsData"));
			}
			for (var f in aSources) {
				aSources[f].IsDisplayed = true;
				aSources[f].IsSelected = true;
				if (aSources[f].oData.FIXED_ASSGN_END_DATE === null && aSources[f].oData.FIXED_ASSGN_START_DATE === null) {
					aSources[f].IsDisplayed = false;
					aSources[f].IsSelected = false;
					aOperationTimes.push(aSources[f]);
				}
			}
			oViewModel.refresh(true);
			return aOperationTimes.length;
		},

		openAssignInfoDialog: function (oView, sPath, oContext, mParameters, oDemandContext) {
			if (this.getOwnerComponent()) {
				this.oComponent = this.getOwnerComponent();
			} else {
				this.oComponent = oView.getController().getOwnerComponent();
			}
			if (!oDemandContext) {
				var bIsPRT = oContext.IS_PRT !== undefined ? oContext.IS_PRT : oContext.getObject().IS_PRT;
				var sObjectSourceType = oContext.OBJECT_SOURCE_TYPE ? oContext.OBJECT_SOURCE_TYPE : oContext.getObject().OBJECT_SOURCE_TYPE;
				if (bIsPRT) {
					this.oPRTActions.openToolsInfoDialog(oView, sPath, oContext, mParameters, sObjectSourceType);
				} else {
					this.openDialog(oView, sPath, oContext, mParameters, sObjectSourceType);
				}
			} else {
				var sObjectSourceType = oDemandContext.OBJECT_SOURCE_TYPE;
				if (oDemandContext.IS_PRT) {
					this.oPRTActions.openToolsInfoDialog(oView, sPath, oContext, mParameters, sObjectSourceType);
				} else {
					this.openDialog(oView, sPath, oContext, mParameters, sObjectSourceType);
				}
			}
		},

		openDialog: function (oView, sPath, oContext, mParameters, sObjectSourceType) {
			var sQualifier;
			if (sObjectSourceType === Constants.ANNOTATION_CONSTANTS.NETWORK_OBJECTSOURCETYPE) {
				sQualifier = Constants.ANNOTATION_CONSTANTS.NETWORK_QUALIFIER;
			} else if (sObjectSourceType === Constants.ANNOTATION_CONSTANTS.NOTIFICATION_OBJECTSOURCETYPE) {
				sQualifier = Constants.ANNOTATION_CONSTANTS.NOTIFICATION_QUALIFIER;
			} else {
				sQualifier = Constants.ANNOTATION_CONSTANTS.ORDER_QUALIFIER;
			}
			var mParams = {
				viewName: "com.evorait.evoplan.view.templates.AssignInfoDialog#" + sQualifier,
				annotationPath: "com.sap.vocabularies.UI.v1.Facets#" + sQualifier,
				entitySet: "AssignmentSet",
				controllerName: "AssignInfo",
				title: "xtit.assignInfoModalTitle",
				type: "add",
				smartTable: null,
				sPath: sPath,
				sDeepPath: "Demand",
				parentContext: oContext,
				oDialogController: this.oComponent.assignInfoDialog,
				refreshParameters: mParameters
			};
			this.oComponent.DialogTemplateRenderer.open(oView, mParams, this._afterDialogLoad.bind(this));
		},

		_afterDialogLoad: function (oDialog, oView, sPath, sEvent, data, mParams) {
			if (sEvent === "dataReceived") {
				//Fetching Context Data for PlanningCalendar 
				if (this._mParameters && this._mParameters.bFromPlannCal) {
					data = mParams.parentContext.getObject();
				}
				this.oComponent.assignInfoDialog.onOpen(oDialog, oView, null, null, mParams.refreshParameters, sPath, data);
			}
		},

		/*
		 *Method for checking Vendor Assignment Field
		 */
		onAllowVendorAssignment: function (oViewModel, oUserModel) {
			var aSources = oViewModel.getProperty("/dragSession"),
				aAllowVendorAssignment = [];
			for (var v in aSources) {
				if (!aSources[v].oData.ALLOW_ASSIGNMENT_DIALOG) {
					aSources[v].oData.CostElement = "";
					aSources[v].oData.Estimate = "";
					aSources[v].oData.Currency = "";
					aAllowVendorAssignment.push(aSources[v]);
				} else {
					aSources[v].oData.CostElement = "";
					aSources[v].oData.Estimate = "";
					aSources[v].oData.Currency = oUserModel.getProperty("/DEFAULT_CURRENCY");
				}
			}
			oViewModel.refresh(true);
			return aAllowVendorAssignment.length;
		},
		/*
		 *Method to check PS Demands for Network Assignment
		 *@param oViewModel 
		 */
		_showNetworkAssignments: function (oViewModel) {
			var aSources = oViewModel.getProperty("/dragSession"),
				aAllowNetworkAssignment = [];

			//condition added to getData from gantt split : since 2205	
			if (!aSources) {
				aSources = JSON.parse(this.localStorage.get("Evo-aPathsData"));
			}
			for (var n in aSources) {
				if (aSources[n].oData.OBJECT_SOURCE_TYPE === "DEM_PSNW") {
					aSources[n].oData.Duration = "";
					aSources[n].oData.DurationUnit = "";
					aAllowNetworkAssignment.push(aSources[n]);
				}
			}
			oViewModel.setProperty("/dragSession", aSources);
			oViewModel.refresh(true);
			return aAllowNetworkAssignment;
		},

		onReAssignParams: function (oAssignment, oParams, bNetworkCheck, bVendorCheck) {
			var aReAssignDragSession = this.getModel("viewModel").getData().dragSession;
			for (var a in aReAssignDragSession) {
				if (oAssignment.DemandGuid === aReAssignDragSession[a].oData.Guid) {
					if (aReAssignDragSession[a].IsSelected) {
						oParams.DateFrom = formatter.mergeDateTime(aReAssignDragSession[a].oData.FIXED_ASSGN_START_DATE, aReAssignDragSession[a].oData.FIXED_ASSGN_START_TIME);
						oParams.TimeFrom.ms = oParams.DateFrom.getTime();
						oParams.DateTo = formatter.mergeDateTime(aReAssignDragSession[a].oData.FIXED_ASSGN_END_DATE, aReAssignDragSession[a].oData.FIXED_ASSGN_END_TIME);
						oParams.TimeTo.ms = oParams.DateTo.getTime();
					}
					if (bNetworkCheck) {
						oParams.EffortUnit = aReAssignDragSession[a].oData.DurationUnit;
						oParams.Effort = aReAssignDragSession[a].oData.Duration;
					}
					if (bVendorCheck) {
						oParams.CostElement = aReAssignDragSession[a].oData.CostElement;
						oParams.Estimate = aReAssignDragSession[a].oData.Estimate;
						oParams.Currency = aReAssignDragSession[a].oData.Currency;
					}
				}
			}
			return oParams;
		},

		/**
		 * Check whether Assignment is changeable or reassignable
		 * @author Sagar since 2205
		 * @param mParameters - Object having dragged assignment data and dropped resource
		 */
		checkAssigmentIsReassignable: function (mParameters) {
			var oAssignmentData = mParameters.assignment,
				oResourceData = mParameters.resource,
				oDemandData = oAssignmentData.Demand,
				oResourceBundle = this.getResourceBundle();
			if (oAssignmentData.ResourceGroupGuid === oResourceData.ResourceGroupGuid && oAssignmentData.ResourceGuid === oResourceData.ResourceGuid &&
				!oDemandData.ASGNMNT_CHANGE_ALLOWED) { // validation for change
				this.showMessageToast(oResourceBundle.getText("ymsg.assignmentnotchangeable"));
				return false;
			} else if (!oDemandData.ASGNMNT_CHANGE_ALLOWED || !oDemandData.ALLOW_REASSIGN) { // validation for reassign
				this.showMessageToast(oResourceBundle.getText("ymsg.assignmentnotreassignable"));
				return false;
			}
			return true;
		},

		/**
		 * This function is called when assignment is moved to different node under same resource
		 * @author Giri
		 * @params - assignmentPath - It is the path where the assignment is to be assigned
		 *			 sResourcePath - It is path of Resource where it will be assigned
		 *			 updateParameters - To differentiate between Home and map screen
		 * */
		handleDropOnSameResource: function (assignmentPath, sResourcePath, updateParameters) {
			var mParams = {
				$expand: "Demand"
			};
			this.getOwnerComponent()._getData(assignmentPath, null, mParams)
				.then(function (oAssignData) {
					this._setAssignmentDetail(oAssignData, sResourcePath);
					this.updateAssignment(false, updateParameters);
				}.bind(this));
		},

		/**
		 * Setting dragged assignment to Assignment Model
		 * @author Sagar since 2205
		 * @param oAssignment - Dragged assignment data
		 * @param oResourcePath - Dropped resource
		 */
		_setAssignmentDetail: function (oAssignData, oResourcePath) {
			var oAssignmentModel = this.getModel("assignment"),
				oAssignment = this.getOwnerComponent().assignInfoDialog.getDefaultAssignmentModelObject(),
				oNewAssign, oDemandData, startDate, endDate;
			oAssignment.AssignmentGuid = oAssignData.Guid;
			oAssignment.DemandDesc = oAssignData.DemandDesc;
			oAssignment.DemandGuid = oAssignData.DemandGuid;
			oAssignment.DemandStatus = oAssignData.Demand.Status;
			oAssignment.DateFrom = oAssignData.DateFrom;
			oAssignment.DateTo = oAssignData.DateTo;
			oAssignment.ResourceGroupGuid = oAssignData.ResourceGroupGuid;
			oAssignment.ResourceGroupDesc = oAssignData.GROUP_DESCRIPTION;
			oAssignment.ResourceGuid = oAssignData.ResourceGuid;
			oAssignment.ResourceDesc = oAssignData.RESOURCE_DESCRIPTION;
			if (this.getModel("user").getProperty("/ENABLE_NETWORK_ASSIGNMENT")) {
				oAssignment.OldEffort = oAssignData.Effort;
				oAssignment.REMAINING_DURATION = oAssignData.REMAINING_DURATION;
				oAssignment.OBJECT_SOURCE_TYPE = oAssignData.OBJECT_SOURCE_TYPE;
			}

			oNewAssign = this.getModel().getProperty(oResourcePath);
			if (oNewAssign.NodeType !== "RESOURCE") {
				oAssignment = this.setDateTimeParams(oAssignment, oNewAssign.StartDate, oNewAssign.StartTime, oNewAssign.EndDate, oNewAssign.EndTime);
			} else {
				oAssignment = this.setDateTimeParams(oAssignment, oAssignment.DateFrom, {
					ms: oAssignment.DateFrom.getTime()
				}, oAssignment.DateTo, {
					ms: oAssignment.DateTo.getTime()
				});
			}
			oAssignmentModel.setData(oAssignment);

			oAssignmentModel.setProperty("/NewAssignPath", oResourcePath);
			oAssignmentModel.setProperty("/NewAssignId", oNewAssign.Guid || oNewAssign.NodeId);

			if (oAssignmentModel.getProperty("/NewAssignPath") !== null) {
				oAssignmentModel.getData().ResourceGuid = this.getView().getModel().getProperty(oAssignmentModel.getProperty(
					"/NewAssignPath") + "/ResourceGuid");
			}

			oAssignmentModel.setProperty("/showError", false);
			if (oAssignmentModel.getProperty("/DateFrom") === "" || oAssignmentModel.getProperty("/DateTo") === "") {
				oAssignmentModel.setProperty("/DateFrom", oNewAssign.DateFrom);
				oAssignmentModel.setProperty("/DateTo", oNewAssign.DateTo);
			}
			oAssignmentModel.setProperty("/Effort", oAssignData.Effort);
			oAssignmentModel.setProperty("/EffortUnit", oAssignData.EffortUnit);

			//Fetching Resource Start and End Date from AssignmentSet for validating on save
			oAssignmentModel.setProperty("/RES_ASGN_START_DATE", oAssignData.RES_ASGN_START_DATE);
			oAssignmentModel.setProperty("/RES_ASGN_END_DATE", oAssignData.RES_ASGN_END_DATE);
			oDemandData = oAssignData.Demand;
			oAssignmentModel.setProperty("/Description", oDemandData.DemandDesc);
			oAssignmentModel.setProperty("/AllowReassign", oDemandData.ALLOW_REASSIGN);
			oAssignmentModel.setProperty("/AllowUnassign", oDemandData.ALLOW_UNASSIGN);
			oAssignmentModel.setProperty("/AllowChange", oDemandData.ASGNMNT_CHANGE_ALLOWED);
			oAssignmentModel.setProperty("/OrderId", oDemandData.ORDERID);
			oAssignmentModel.setProperty("/OperationNumber", oDemandData.OPERATIONID);
			oAssignmentModel.setProperty("/SubOperationNumber", oDemandData.SUBOPERATIONID);
			oAssignmentModel.setProperty("/DemandStatus", oDemandData.Status);
			oAssignmentModel.setProperty("/DemandGuid", oDemandData.Guid);
			oAssignmentModel.setProperty("/Notification", oDemandData.NOTIFICATION);
			oAssignmentModel.setProperty("/objSourceType", oDemandData.OBJECT_SOURCE_TYPE);
		},

		/**
		 * Method for validation and reassignment of assignment while dragging and dropping with in Resource tree
		 * @author Sagar since 2205
		 * @param sAssignmentPath - Dragged assignment path
		 * @param oResourcePath - Dropped resource
		 * @param oView - calling View
		 * @param mParameter
		 */
		_reassignmentOnDrop: function (sAssignmentPath, sResourcePath, oView, mParameter) {
			var oViewModel = this.getModel("viewModel"),
				oModel = this.getModel(),
				oUserModel = this.getModel("user"),
				mParams,
				aSources = oViewModel.getProperty("/dragSession"),
				iOperationTimesLen = this.onShowOperationTimes(oViewModel),
				iVendorAssignmentLen = this.onAllowVendorAssignment(oViewModel, oUserModel),
				aPSDemandsNetworkAssignment = this._showNetworkAssignments(oViewModel),
				oTargetData = oModel.getProperty(sResourcePath);

			mParams = {
				$expand: "Demand"
			};
			this.getOwnerComponent()._getData(sAssignmentPath, null, mParams)
				.then(function (oAssignData) {
					if (!this.checkAssigmentIsReassignable({
						assignment: oAssignData,
						resource: oTargetData
					})) {
						return false;
					}
					this.getOwnerComponent().assignTreeDialog._assignPath = sResourcePath;
					this.getOwnerComponent().assignTreeDialog._aSelectedPaths = [this.getOwnerComponent().getModel().createBindingContext(
						sAssignmentPath)];
					this.getOwnerComponent().assignTreeDialog._bulkReAssign = true;
					this.getOwnerComponent().assignTreeDialog._mParameters = mParameter;
					if (aSources) {
						//Checking PS Demands for Network Assignment 
						if (oUserModel.getProperty("/ENABLE_NETWORK_ASSIGNMENT") && aPSDemandsNetworkAssignment.length !== 0) {
							this.getOwnerComponent().NetworkAssignment.open(this.getView(), sResourcePath, aPSDemandsNetworkAssignment, null);
						} //Checking Vendor Assignment for External Resources
						else if (oUserModel.getProperty("/ENABLE_EXTERNAL_ASSIGN_DIALOG") && oTargetData.ISEXTERNAL && aSources.length !==
							iVendorAssignmentLen) {
							this.getOwnerComponent().VendorAssignment.open(this.getView(), sResourcePath, null);
						} else if (oUserModel.getProperty("/ENABLE_ASGN_DATE_VALIDATION") && iOperationTimesLen !== aSources.length && oTargetData.NodeType ===
							"RESOURCE") {
							//Checking Operation Times
							this.getOwnerComponent().OperationTimeCheck.open(this.getView(), null, sResourcePath);
						} else {
							this._setAssignmentDetail(oAssignData, sResourcePath);
							this.updateAssignment(true, mParameter);
						}
					} else {
						this._setAssignmentDetail(oAssignData, sResourcePath);
						this.updateAssignment(true, mParameter);
					}
				}.bind(this));
		},

		/**
		 * 
		 * @param {object} oData - data object with assignments details
		 * @returns promise - which is resolved with oData on user oConfirmationDialogResponse
		 * and rejected on cancel press
		 */
		deleteSplitsUserConfirm: function (oData) {

			var oDeleteSplitsUserConfirmPromise = new Promise(function (resolve, reject) {

				this.splitDeleteDialogResolve = resolve;
				this.splitDeleteDialogReject = reject;
				this.splitDeleteDialogDataToResolve = oData;

				if (!this.oSplitDeleteConfirmDialog) {
					Fragment.load({
						id: "DeleteSplitsConfirmDialog",
						name: "com.evorait.evoplan.view.common.fragments.DeleteSplitsConfirmDialog",
						controller: this
					}).then(function (oDialog) {
						this.oSplitDeleteConfirmDialog = oDialog;
						this.getView().addDependent(this.oSplitDeleteConfirmDialog);
						this.oSplitDeleteConfirmDialog.open();
					}.bind(this));
				} else {
					this.oSplitDeleteConfirmDialog.open();
				}
			}.bind(this));

			return oDeleteSplitsUserConfirmPromise;
		},

		/**
		 * Method called on Proceed press in all splits unassign user confirmation dialog
		 */
		onProceedWithSplitDeletion: function () {
			if (this.oSplitDeleteConfirmDialog) {
				this.splitDeleteDialogResolve(this.splitDeleteDialogDataToResolve);
				this.oSplitDeleteConfirmDialog.close();
			}
		},

		/**
		 * Method called on Cancel press in all splits unassign user confirmation dialog
		 */
		onCancelSplitDeletion: function () {
			if (this.oSplitDeleteConfirmDialog) {
				this.splitDeleteDialogReject();
				this.oSplitDeleteConfirmDialog.close();
			}
		},

		/**
		 * Method called on reject/catch scenarios of split unassign confirm dialog
		 */
		_catchError: function (oError) {
			//do nothing
		},

		/**
		 * Method call to delete all assignments which are part of a split
		 * UI passes the Assignments Guid, deletion handled in backend
		 * 
		 * @param {object} oUserConfirmResponse 
		 * 
		 */
		deleteSplitAssignments: function (oUserConfirmResponse) {
			if (oUserConfirmResponse) {
				var sAssginmentGuid = oUserConfirmResponse.assignmentGuid,
					mParameters = oUserConfirmResponse.parameters;
				this.deleteAssignment(sAssginmentGuid, mParameters);
			}
		},
		/**
		* Function for capturing updated Resource Contexts from Assignments
		 * @param aContexts
		 * Since 2309
		 */
		_updatedAssignmentsPath: function (aContexts) {
			for (var a in aContexts) {
				this.updatedResources(this._oView.getModel("viewModel"), this._oView.getModel("user"), this._oView.getModel().getProperty(aContexts[a].getPath()));
			}
		}

	});
});