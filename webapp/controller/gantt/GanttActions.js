/* globals _ */
sap.ui.define([
	"com/evorait/evoplan/controller/gantt/GanttRoute",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Token",
	"sap/m/Tokenizer",
	"sap/ui/core/Fragment",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (Controller, formatter, Filter, FilterOperator, Token, Tokenizer, Fragment, MessageBox, MessageToast) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.gantt.GanttActions", {

		/**
		 * formatter for for Gantt view
		 */
		isBusyShape: function (bAllowProperty, bIsBusy, bAuthCheck) {
			return Boolean(bAllowProperty && !bIsBusy && bAuthCheck);
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
		assignMultipleDemands: function (oResourceData, aSources, oTarget, oTargetDate, aFixedAppointmentObjects) {
			var oModel = this.getModel(),
				aPromises = [],
				oDemandObj,
				oParams;

			return new Promise(function (resolveMultiAssign, rejectMultiAssign) {

				this.resolveMultiAssign = resolveMultiAssign;
				this.rejectMultiAssign = rejectMultiAssign;

				// if global config enabled for split assignments
				// then first check with backend if resource availability is there for the assignment work hours 
				// also call new logic only when drop happens on Respurce NodeType - RESOURCE or TIMEDAY
				// since release 2301
				var bSplitGlobalConfigEnabled = this.getModel("user").getProperty("/ENABLE_SPLIT_STRETCH_ASSIGN"),
					sResourceNodeType = oResourceData.NodeType,
					bExecuteAssignmentSplitCode = bSplitGlobalConfigEnabled && (sResourceNodeType === "RESOURCE" || sResourceNodeType === "TIMEDAY"),
					aAllAssignmentsParams = [];

				// creating function import calls for fixed appointments
				for (var i in aFixedAppointmentObjects) {
					oParams = {
						DemandGuid: aFixedAppointmentObjects[i].Guid,
						ResourceGroupGuid: oResourceData.ResourceGroupGuid,
						ResourceGuid: oResourceData.ResourceGuid,
						DateFrom: this.setCustomDateTime(aFixedAppointmentObjects[i].FIXED_APPOINTMENT_START_DATE, aFixedAppointmentObjects[i].FIXED_APPOINTMENT_START_TIME),
						TimeFrom: {},
						DateTo: this.setCustomDateTime(aFixedAppointmentObjects[i].FIXED_APPOINTMENT_END_DATE, aFixedAppointmentObjects[i].FIXED_APPOINTMENT_END_TIME),
						TimeTo: {}
					};
					oParams.TimeFrom.ms = oParams.DateFrom ? oParams.DateFrom.getTime() : 0;
					oParams.TimeTo.ms = oParams.DateTo ? oParams.DateTo.getTime() : 0;
					aPromises.push(this.executeFunctionImport(oModel, oParams, "CreateAssignment", "POST"));
				}

				// non-fixed appointments
				// creating function import calls for multi assignment for non-fixed appointments
				for (var i in aSources) {
					oParams = {
						DemandGuid: "",
						ResourceGroupGuid: oResourceData.ResourceGroupGuid,
						ResourceGuid: oResourceData.ResourceGuid,
						DateFrom: oTargetDate,
						TimeFrom: {
							ms: oTargetDate ? oTargetDate.getTime() : 0
						}
					};

					oDemandObj = oModel.getProperty(aSources[i]);

					if (this._mParameters.bFromNewGanttSplit) {
						oDemandObj = this._getDemandObjectSplitPage(aSources[i]);
					}
					oParams.DemandGuid = oDemandObj.Guid;

					if (this.getModel("user").getProperty("/ENABLE_NETWORK_ASSIGNMENT") && oDemandObj.OBJECT_SOURCE_TYPE === "DEM_PSNW") {
						oParams.Duration = oDemandObj.Duration;
					} else {
						oParams.Duration = oDemandObj.DURATION;
					}

					aAllAssignmentsParams.push(oParams);
				}

				if (bExecuteAssignmentSplitCode) {
					this.checkAndExecuteSplitForGanttMultiAssign(aAllAssignmentsParams, {}, sResourceNodeType);
				} else {
					aPromises = this.createMultiAssignments(aAllAssignmentsParams);
					this.resolveMultiAssign(aPromises);
				}

			}.bind(this));
		},

		/**
		 * method to form the parameters and guids in required format
		 * and call the CreateMultiAssignment function import
		 * 
		 * @param {array} aAssignmentsParamsForMultiAssignment 
		 * @returns array of promises with CreateMultiAssignment function import call
		 */
		createMultiAssignments: function (aAssignmentsParamsForMultiAssignment) {
			var sDemandDurationConcat = "",
				aPromises = [];
			for (var iIndex in aAssignmentsParamsForMultiAssignment) {
				var oParams = aAssignmentsParamsForMultiAssignment[iIndex];
				sDemandDurationConcat = sDemandDurationConcat + "," + oParams.DemandGuid + "//" + oParams.Duration;
			}
			if (oParams.DemandGuid) {
				oParams.DemandGuid = sDemandDurationConcat.substring(1);
				delete oParams.Duration;
				aPromises.push(this.executeFunctionImport(this.getModel(), oParams, "CreateMultiAssignment", "POST"));
			}
			return aPromises;
		},

		/**
		 * method checks resourceAvailabilty for the selected demands 
		 * then confirms if the user wants to split the assignments
		 * on confirm/reject then calls the required function imports
		 * 
		 * @param {array} aAssignments array of demands for which resourceAvailabilty checks should happend before split
		 */
		checkAndExecuteSplitForGanttMultiAssign: function (aAssignments, mParameters, sResourceNodeType) {
			this.checkResourceUnavailabilty(aAssignments, mParameters, sResourceNodeType).catch(this.handlePromiseChainCatch.bind(this))
				.then(this.showSplitConfirmationDialog.bind(this)).catch(this.handlePromiseChainCatch.bind(this))
				.then(this.callRequiredFunctionImportsForMultiAssign.bind(this)).catch(this.handlePromiseChainCatch.bind(this));
		},

		/**
		 * based on the response from split confirmation dialog calls the required function imports
		 * strucuture of oConfirmationDialogResponse :
		 * { arrayOfDemands : aAssignments,
		 *   arrayOfDemandsToSplit : [],
		 *   splitConfirmation : "NO"
		 * };
		 * @param {object} oConfirmationDialogResponse response from split confirmation dialog
		 * resolves the promise of assignMultipleDemands method
		 * 
		 */
		callRequiredFunctionImportsForMultiAssign: function (oConfirmationDialogResponse) {
			if (oConfirmationDialogResponse) {
				var aAssignmentsParamsForMultiAssignment = [];

				var aDemands = oConfirmationDialogResponse.arrayOfDemands,
					aDemandGuidsToSplit = oConfirmationDialogResponse.arrayOfDemandsToSplit,
					sResourceNodeType = oConfirmationDialogResponse.nodeType,
					aPromises = [];

				if (aDemandGuidsToSplit.length === 0) {
					aPromises = this.createMultiAssignments(aDemands);
				} else {
					for (var iIndex = 0; iIndex < aDemands.length; iIndex++) {
						// if Demand is present in aDemandsForSplitAssignment it means the assignment is of more effort than the resource availability
						// 	thus call the functionImport 'CreateSplitStretchAssignments' 
						// else it means the resource availability is proper for the assignment or user doesnt want to split
						//  thus call the functionImport 'CreateMultiAssignment'
						if (aDemandGuidsToSplit.includes(aDemands[iIndex].DemandGuid)) {
							aDemands[iIndex].ResourceView = sResourceNodeType === "RESOURCE" ? "SIMPLE" : "DAILY";
							aPromises.push(this.executeFunctionImport(this.getModel(), aDemands[iIndex], "CreateSplitStretchAssignments", "POST"));
						} else {
							aAssignmentsParamsForMultiAssignment.push(aDemands[iIndex]);
						}
					}
					if (aAssignmentsParamsForMultiAssignment.length > 1) {
						aPromises = aPromises.concat(this.createMultiAssignments(aAssignmentsParamsForMultiAssignment));
					} else if (aAssignmentsParamsForMultiAssignment.length === 1) {
						aPromises = aPromises.concat(this.executeFunctionImport(this.getModel(), aAssignmentsParamsForMultiAssignment[0],
							"CreateAssignment", "POST"));
					}
				}
				this.resolveMultiAssign(aPromises);
			}
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

			return new Promise(function (resolveAssignment, rejectAssignment) {

				this.resolveAssignment = resolveAssignment;
				this.rejectAssignment = rejectAssignment;

				if (aGanttDemandDragged === "fromGanttSplit" || !oModel.getProperty(aItems[0])) {
					aGanttDemandDragged = {};
					aGanttDemandDragged.bFromGanttSplit = true;
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

					if (this.getModel("user").getProperty("/ENABLE_ASGN_DATE_VALIDATION") && this._mParameters.bFromNewGantt && aGanttDemandDragged
						.IsSelected) {
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

					// if global config enabled for split assignments
					// also call new logic only when drop happens on Respurce NodeType - RESOURCE or TIMEDAY
					// then first check with backend if resource availability is there for the assignment work hours 
					// since release 2301
					var bSplitGlobalConfigEnabled = this.getModel("user").getProperty("/ENABLE_SPLIT_STRETCH_ASSIGN"),
						sResourceNodeType = targetObj.NodeType;
					if (bSplitGlobalConfigEnabled && (sResourceNodeType === "RESOURCE" || sResourceNodeType === "TIMEDAY")) {
						this.checkAndExecuteSplitAssignments([oParams], {}, sResourceNodeType);
					} else {
						aPromises.push(this.executeFunctionImport(oModel, oParams, "CreateAssignment", "POST"));
						this.resolveAssignment(aPromises);
					}
				}
			}.bind(this));

		},

		/**
		 * method checks resourceAvailabilty for the selected demands 
		 * then confirms if the user wants to split the assignments
		 * on confirm/reject then calls the required function imports
		 * 
		 * @param {array} aAssignments array of demands for which resourceAvailabilty checks should happend before split
		 */
		checkAndExecuteSplitAssignments: function (aAssignments, mParameters, sResourceNodeType) {
			this.checkResourceUnavailabilty(aAssignments, mParameters, sResourceNodeType).catch(this.handlePromiseChainCatch.bind(this))
				.then(this.showSplitConfirmationDialog.bind(this)).catch(this.handlePromiseChainCatch.bind(this))
				.then(this.callRequiredFunctionImports.bind(this)).catch(this.handlePromiseChainCatch.bind(this));
		},

		/**
		 * based on the response from split confirmation dialog calls the required function imports
		 * strucuture of oConfirmationDialogResponse :
		 * { arrayOfDemands : aAssignments,
		 *   arrayOfDemandsToSplit : [],
		 *   splitConfirmation : "NO"
		 * };
		 * @param {object} oConfirmationDialogResponse response from split confirmation dialog
		 * resolves the promise of assignedDemands method
		 * 
		 */
		callRequiredFunctionImports: function (oConfirmationDialogResponse) {
			if (oConfirmationDialogResponse) {

				var aDemands = oConfirmationDialogResponse.arrayOfDemands,
					aDemandGuidsToSplit = oConfirmationDialogResponse.arrayOfDemandsToSplit,

					sResourceNodeType = oConfirmationDialogResponse.nodeType,
					aPromises = [],
					oModel = this.getModel();

				for (var iIndex = 0; iIndex < aDemands.length; iIndex++) {
					if (aDemandGuidsToSplit.includes(aDemands[iIndex].DemandGuid)) {
						aDemands[iIndex].ResourceView = sResourceNodeType === "RESOURCE" ? "SIMPLE" : "DAILY";
						aPromises.push(this.executeFunctionImport(oModel, aDemands[iIndex], "CreateSplitStretchAssignments", "POST"));
					} else {
						aPromises.push(this.executeFunctionImport(oModel, aDemands[iIndex], "CreateAssignment", "POST"));
					}
				}
				this.resolveAssignment(aPromises);
			}
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
							return sValue === sAction ? resolve(true) : resolve(false);
						}
					}
				);
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
					if (oAssignData && oAssignData.Demand && oAssignData.Demand.Guid && !bInvalidate) {
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
			var oGanttModel = this.getModel("ganttModel"),
				bSplitGlobalConfigEnabled = this.getModel("user").getProperty("/ENABLE_SPLIT_STRETCH_ASSIGN"),
				isAssignmentPartOfSplit = this.checkIfAssignmentPartOfSplit(oModel, sAssignGuid),
				oResourceBundle = this.getResourceBundle(),
				sConfirmMessage = oResourceBundle.getText("ymsg.confirmDel"),
				sProceedBtnTxt = oResourceBundle.getText("xbut.buttonProceed");

			var fnDeleteAssignment = function () {
				this.deleteAssignment(oModel, sAssignGuid).then(function () {
						oGanttModel.setProperty(sPath + "/busy", false);
						this.getModel("ganttModel").setProperty(sPath, null);
						this.getModel("ganttOriginalData").setProperty(sPath, null);
						this._refreshChangedResources(sPath);
						oEventBus.publish("BaseController", "refreshCapacity", {
							sTargetPath: sPath.split("/AssignmentSet/results/")[0]
						});
						oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
						if (bSplitGlobalConfigEnabled && isAssignmentPartOfSplit) {
							// in case of split unassign, all the splits are unassigned from backend,
							// thus on refresh of the entire gantt the splits are also deleted from the gantt UI
							oEventBus.publish("BaseController", "refreshFullGantt", {});
						}
					}.bind(this),
					function () {
						oGanttModel.setProperty(sPath + "/busy", false);
					});
			}.bind(this);

			this.checkToolExists([{ // check tool exists
				AssignmentGUID: sAssignGuid
			}]).then(function (resolve) {
				if (resolve) { // If user click yes
					oGanttModel.setProperty(sPath + "/busy", true);
					fnDeleteAssignment();
				} else {
					if (bSplitGlobalConfigEnabled && isAssignmentPartOfSplit) {
						sConfirmMessage = oResourceBundle.getText("xmsg.deleteAllGanttSplitAssignments");
						MessageBox.confirm(sConfirmMessage, {
							title: oResourceBundle.getText("xtit.deleteAllSplitAssignments"),
							actions: [sProceedBtnTxt, MessageBox.Action.CANCEL],
							emphasizedAction: sProceedBtnTxt,
							onClose: function (sAction) {
								oGanttModel.setProperty(sPath + "/busy", true);
								if (sAction === sProceedBtnTxt) {
									fnDeleteAssignment();
								} else {
									oGanttModel.setProperty(sPath + "/busy", false);
								}
							}
						});
					} else {
						// If no tool exists
						return this._showConfirmMessageBox.call(this, sConfirmMessage);
					}
				}
			}.bind(this)).then(function (data) {
				oGanttModel.setProperty(sPath + "/busy", true);
				if (data === "YES") {
					fnDeleteAssignment();
				} else {
					oGanttModel.setProperty(sPath + "/busy", false);
				}
			}.bind(this));
		},

		/**
		 * check for unsaved data in Demand table
		 * on click on navigate acion navigate to Demand Detail Page
		 * modified method since 2201, by Rakesh Sahu
		 * @param oEvent
		 */
		onActionPress: function (oEvent) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				oViewModel = this.getModel("viewModel"),
				oModel = this.getModel(),
				bDemandEditMode = oViewModel.getProperty("/bDemandEditMode");

			this.oRow = oEvent.getParameter("row");

			if (bDemandEditMode && oModel.hasPendingChanges()) {
				this.showDemandEditModeWarningMessage().then(function (bResponse) {
					var sDiscard = oResourceBundle.getText("xbut.discard&Nav"),
						sSave = oResourceBundle.getText("xbut.buttonSave");

					if (bResponse === sDiscard) {
						oModel.resetChanges();
						oViewModel.setProperty("/bDemandEditMode", false);
						this._navToDetail(null, this.oRow);
					} else
					if (bResponse === sSave) {
						oViewModel.setProperty("/bDemandEditMode", false);
						this.submitDemandTableChanges();
					}
				}.bind(this));

			} else {
				if (bDemandEditMode) {
					oViewModel.setProperty("/bDemandEditMode", false);
				}
				this._navToDetail(oEvent);
			}
		},

		/**
		 * navigation to demand detail page
		 * added method since 2201, by Rakesh Sahu
		 * @param oEvent
		 * @param oRow
		 */
		_navToDetail: function (oEvent, oRow) {
			var oRouter = this.getRouter();
			if (oEvent.getSource().getId().includes("link")) {
				oRouter.navTo("ganttDemandDetails", {
					guid: oEvent.getSource().getBindingContext().getProperty("DemandGuid")
				});

			} else {
				oRow = oRow ? oRow : oEvent.getParameter("row");
				var oContext = oRow.getBindingContext(),
					sPath = oContext.getPath(),
					oModel = oContext.getModel(),
					oData = oModel.getProperty(sPath),
					oUserDetail = this.getModel("appView");
				this.getModel("viewModel").setProperty("/Disable_Assignment_Status_Button", false);
				if (oUserDetail.getProperty("/currentRoute") === "splitDemands") {
					oRouter.navTo("splitDemandDetails", {
						guid: oData.Guid
					});
				} else {
					oRouter.navTo("ganttDemandDetails", {
						guid: oData.Guid
					});
				}
			}
		},

		/**
		 * handle Order id link press event in Gantt Popover
		 * added method since 2205, by Rakesh Sahu
		 * @param oEvent
		 */
		onPressOrderNumber: function (oEvent) {
			this.sAppName = 'EvoOrder';
			this.handleGanttPopoverNavigation(oEvent);
		},

		/**
		 * handle Notification Number link press event in Gantt Popover
		 * added method since 2205, by Rakesh Sahu
		 * @param oEvent
		 */
		onPressNotficationNumber: function (oEvent) {
			this.sAppName = 'EvoNotify';
			this.handleGanttPopoverNavigation(oEvent);
		},

		/**
		 * handle navigation from Gantt Popover to EvoOrder/EvoNotify
		 * added method since 2205, by Rakesh Sahu
		 * @param oEvent
		 */
		handleGanttPopoverNavigation: function (oEvent) {
			this.oSource = oEvent.getSource();
			var sDemandGuid = this.oSource.getBindingContext().getProperty("DemandGuid"),
				sDemandPath = "/DemandSet('" + sDemandGuid + "')";

			this.getOwnerComponent().readData(sDemandPath).then(function (oDemandData) {
				var oAppInfo = this.getAppInfo(this.oSource.getModel("navLinks").getData(), this.sAppName);
				this.getOwnerComponent().NavigationActionSheet.linkToOtherApps(oAppInfo, this.oSource.getModel("viewModel"), this.oSource.getModel(
					"user"), oDemandData);
			}.bind(this));
		},

		/**
		 * get appInfo to navigate from Gantt Popover to EvoOrder/EvoNotify
		 * added method since 2205, by Rakesh Sahu
		 * @param oEvent
		 */
		getAppInfo: function (aNavData, AppName) {
			for (var i in aNavData) {
				if (aNavData[i].ApplicationName === AppName) {
					return aNavData[i];
				}
			}
		},

		/**
		 * Hiding Relationships for the selected assignment path
		 * @param sPath
		 * since 2205
		 */
		_hideRelationships: function (sPath) {
			var oGanttModel = this.getModel("ganttModel");
			oGanttModel.setProperty(sPath + "/RelationshipSet/results", []);
			oGanttModel.setProperty(sPath + "/busy", false);
			oGanttModel.refresh(true);
		},

		/**
		 * Fetching Relationships and appending the data for the selected assignment path
		 * @param sPath
		 * @param oData
		 * since 2205
		 */
		_showRelationships: function (sPath, oData) {
			var sMsg, oGanttModel = this.getModel("ganttModel"),
				oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				aFilters = [
					new Filter("DemandGuid", FilterOperator.EQ, oData.DemandGuid),
					new Filter("DateFrom", FilterOperator.EQ, this.getView().byId("idDateRangeGantt2").getDateValue()),
					new Filter("DateTo", FilterOperator.EQ, this.getView().byId("idDateRangeGantt2").getSecondDateValue())
				];
			this.getModel("appView").setProperty("/busy", true);
			this._getRelationships(aFilters).then(function (aData, oResponse) {
				this.getModel("appView").setProperty("/busy", false);
				if (aData.results.length === 0) {
					sMsg = oResourceBundle.getText("ymsg.noRelationships", [oData.ORDERID, oData.OPERATIONID]);
					this.showMessageToast(sMsg);
				}
				this.showMessage(oResponse);
				oGanttModel.setProperty(sPath + "/RelationshipSet", aData);
				oGanttModel.setProperty(sPath + "/busy", false);
				oGanttModel.refresh(true);
			}.bind(this));
		},

		/*
		 * Fetching Relationships for selected Assignments
		 * @param aFilters
		 * since 2205
		 */
		_getRelationships: function (aFilters) {
			return new Promise(function (resolve, reject) {
				this.getModel().read("/RelationshipSet", {
					filters: aFilters,
					success: function (aData, oResponse) {
						resolve(aData, oResponse);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Fetching Assignment Status for selected Assignments
		 * @param sUri
		 * since 2205
		 */
		_getAssignmentStatus: function (sUri) {
			return new Promise(function (resolve, reject) {
				this.getModel().read(sUri, {
					success: function (oData, oResponse) {
						resolve(oData);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Updating Assignment Status for Assignmnets after changing
		 * @param sPath
		 * @param sAsgnStsFnctnKey
		 * @since 2205
		 */
		_updateAssignmentStatus: function (sPath, sAsgnStsFnctnKey, aData) {
			var oGanttModel = this.getModel("ganttModel"),
				oGanttOriginDataModel = this.getModel("ganttOriginalData"),
				sParentPath, sChildPath, sChildSplitPath, index;
			if (sPath.length > 60) {
				sParentPath = sPath.split("/AssignmentSet/results/")[0];
				oGanttModel.setProperty(sParentPath + "/STATUS", sAsgnStsFnctnKey);
				oGanttModel.setProperty(sParentPath + "/DEMAND_STATUS_COLOR", aData.DEMAND_STATUS_COLOR);
				oGanttModel.setProperty(sParentPath + "/DEMAND_STATUS", aData.DEMAND_STATUS);
			} else {
				sChildPath = sPath.substring(0, 27);
				sChildSplitPath = sPath.split("/");
				index = sChildSplitPath[sChildSplitPath.length - 1];
				sChildPath = sChildPath + "/children/" + index;
				oGanttModel.setProperty(sChildPath + "/STATUS", sAsgnStsFnctnKey);
				oGanttModel.setProperty(sChildPath + "/DEMAND_STATUS_COLOR", aData.DEMAND_STATUS_COLOR);
				oGanttModel.setProperty(sChildPath + "/DEMAND_STATUS", aData.DEMAND_STATUS);
				oGanttModel.setProperty(sChildPath + "/AssignmentSet/results/0/STATUS", sAsgnStsFnctnKey);
				oGanttModel.setProperty(sChildPath + "/AssignmentSet/results/0/DEMAND_STATUS_COLOR", aData.DEMAND_STATUS_COLOR);
				oGanttModel.setProperty(sChildPath + "/AssignmentSet/results/0/DEMAND_STATUS", aData.DEMAND_STATUS);
			}
			oGanttModel.setProperty(sPath + "/STATUS", sAsgnStsFnctnKey);
			oGanttModel.setProperty(sPath + "/DEMAND_STATUS_COLOR", aData.DEMAND_STATUS_COLOR);
			oGanttModel.setProperty(sPath + "/DEMAND_STATUS", aData.DEMAND_STATUS);
			oGanttOriginDataModel.refresh(true);
			oGanttModel.refresh(true);
		},

		/**
		 * Combining Multiple Assignment Creation Response to a single array
		 * @param [aResults]
		 * @return [aCreatedAssignments]
		 * @since 2205
		 */
		_getCreatedAssignments: function (aResults) {
			var aCreatedAssignments = [];
			for (var a in aResults) {
				var oCreatedAssignment = aResults[a].results;
				if (!oCreatedAssignment) {
					aCreatedAssignments.push(aResults[a]);
				} else {
					for (var a1 in oCreatedAssignment) {
						aCreatedAssignments.push(oCreatedAssignment[a1]);
					}
				}
			}
			return aCreatedAssignments;
		},

	
	});

});