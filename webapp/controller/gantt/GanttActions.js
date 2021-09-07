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

		_oView: null,

		_oModel: null,

		_oComponent: null,

		_oAssignementModel: null,

		init: function (oView, oModel, oComponent, _oAssignementModel) {
			this._oView = oView;
			this._oModel = oModel;
			this._oComponent = oComponent;
			this._oAssignementModel = _oAssignementModel;
		},

		/**
		 * get prepared assignment object for reassign, update requests
		 * @param oData
		 * @returns {*|{DemandGuid, Description, Effort, OperationNumber, AllowUnassign, ResourceGuid, NewAssignId, OrderId, isNewAssignment, SubOperationNumber, AllowReassign, NewAssignPath, showError, AllowChange, DateFrom, ResourceGroupGuid, AssignmentGuid, NewAssignDesc, DemandStatus, EffortUnit, DateTo}}
		 * @private
		 */
		_getAssignmentModelObject: function (oData) {
			//	var oDefaultObject = this.getOwnerComponent().assignInfoDialog.getDefaultAssignmentModelObject(),
			var oDefaultObject = this._oComponent.assignInfoDialog.getDefaultAssignmentModelObject(),
				sPath;

			oDefaultObject.AssignmentGuid = oData.Guid;

			for (var key in oDefaultObject) {
				if (oData.hasOwnProperty(key)) {
					oDefaultObject[key] = oData[key];
				}
			}
			if (!oData.Demand.Status) {
				sPath = this._oModel.createKey("DemandSet", {
					Guid: oData.DemandGuid
				});
				oData.Demand = this._oModel.getProperty("/" + sPath);
			}
			if (oData.Demand) {
				oDefaultObject.AllowChange = oData.Demand.ASGNMNT_CHANGE_ALLOWED;
				oDefaultObject.AllowReassign = oData.Demand.ALLOW_REASSIGN;
				oDefaultObject.AllowUnassign = oData.Demand.ALLOW_UNASSIGN;
				oDefaultObject.OrderId = oData.Demand.ORDERID;
				oDefaultObject.OperationNumber = oData.Demand.OPERATIONID;
				oDefaultObject.SubOperationNumber = oData.Demand.SUBOPERATIONID;
				oDefaultObject.DemandStatus = oData.Demand.Status;
				oDefaultObject.AllowAppoint = oData.Demand.ALLOW_APPOINTMNT;
				oDefaultObject.AlloDispatch = oData.Demand.ALLOW_DISPATCHED;
				oDefaultObject.AllowDemMobile = oData.Demand.ALLOW_DEM_MOBILE;
				oDefaultObject.AllowAcknowledge = oData.Demand.ALLOW_ACKNOWLDGE;
				oDefaultObject.AllowReject = oData.Demand.ALLOW_REJECT;
				oDefaultObject.AllowEnroute = oData.Demand.ALLOW_ENROUTE;
				oDefaultObject.AllowStarted = oData.Demand.ALLOW_STARTED;
				oDefaultObject.AllowHold = oData.Demand.ALLOW_ONHOLD;
				oDefaultObject.AllowComplete = oData.Demand.ALLOW_COMPLETE;
				oDefaultObject.AllowIncomplete = oData.Demand.ALLOW_INCOMPLETE;
				oDefaultObject.AllowClosed = oData.Demand.ALLOW_CLOSED;
			}
			return oDefaultObject;
		},
		/**
		 * 
		 * 
		 * 
		 */
		getTimeDifference: function (oDateFrom, oDateTo) {
			var oTimeStampFrom = oDateFrom.getTime(),
				oTimeStampTo = oDateTo.getTime(),
				iDifference = oTimeStampTo - oTimeStampFrom,
				iEffort = (((iDifference / 1000) / 60) / 60);
			return iEffort;
		},
		/**
		 * Promise for fetching details about asignment demand
		 * coming from backend or alsready loaded data
		 * @param sAssignmentGuid
		 * @param isReassign
		 * @private
		 */
		_updateAssignmentModel: function (sAssignmentGuid, isReassign) {
			return new Promise(function (resolve, reject) {
				var obj,
					//	sPath = this.getModel().createKey("AssignmentSet", {
					sPath = this._oModel.createKey("AssignmentSet", {
						Guid: sAssignmentGuid
					}),
					oAssignmentData = this._oModel.getProperty("/" + sPath);
				// Demnad data or assignment data will be missing some time
				if (!oAssignmentData || !oAssignmentData.Demand || !oAssignmentData.Demand.Guid) {
					//	this.getModel().read("/" + sPath, {
					this._oModel.read("/" + sPath, {
						urlParameters: {
							$expand: "Demand"
						},
						success: function (result) {
							obj = this._getAssignmentModelObject(result);
							this._oAssignementModel.setData(obj);
							resolve(obj);
						}.bind(this),
						error: function (error) {
							reject(error);
						}
					});
				} else {
					obj = this._getAssignmentModelObject(oAssignmentData);
					this._oAssignementModel.setData(obj);
					resolve(obj);
				}
			}.bind(this));
		},
		/**
		 * Check Strech in case of assignment Update
		 * Proceed to assignment with Stretch, check if Date Time is not valid
		 * @param {Object} aSources Demand paths
		 * @param {Object} oTarget Resource Path
		 * @private
		 */
		checkUpdateAssignmentForStretch: function (oResourceData, aSources, oTarget, oTargetObject, aGuids, fnCheckValidation) {
			var oViewModel = this.getModel("viewModel"),
				oResourceModel = this.getResourceBundle();
			if (oResourceData.NodeType !== "RES_GROUP" && (oResourceData.NodeType === "RESOURCE" && oResourceData.ResourceGuid &&
					oResourceData.ResourceGuid !== "")) {

				this._checkAvailability(aSources, oTarget, oTargetObject.DateFrom, aGuids).then(function (availabilityData) {
					if (availabilityData.PastFail) {
						oViewModel.setProperty("/ganttSettings/busy", false);
						return;
					}
					if (!availabilityData.Unavailable) {
						if (fnCheckValidation) {
							fnCheckValidation.call(this, aSources, oTarget, oTargetObject.DateFrom, availabilityData.Endtimestamp, aGuids, {
								bUpdate: true
							});
							// MessageToast.show("Check Qualification Available");
						} else {
							//Updtae call
						}
					} else {
						this._showConfirmMessageBox(oResourceModel.getText("ymsg.extendMsg")).then(function (value) {
							if (value === "NO" && fnCheckValidation) {
								// fnCheckValidation.call(this, aSources, oTarget, oTargetDate, availabilityData.EndtimestampWithstretch, aGuids, this._mParameters);
								MessageToast.show("Check Qualification");
							} else if (value === "YES" && fnCheckValidation) {
								// fnCheckValidation.call(this, aSources, oTarget, oTargetDate, availabilityData.Endtimestamp, aGuids, this._mParameters);
								MessageToast.show("Check Qualification");
							} else if (value === "YES") {
								MessageToast.show("Update Call");
								// Promise.all(this.assignedDemands(aSources, oTarget, oTargetDate, availabilityData.Endtimestamp, aGuids))
								// 	.then(this._refreshAreas.bind(this)).catch(function (error) {});
							} else {
								MessageToast.show("Update Call");
								// Promise.all(this.assignedDemands(aSources, oTarget, oTargetDate, availabilityData.EndtimestampWithstretch, aGuids))
								// 	.then(this._refreshAreas.bind(this)).catch(function (error) {});
							}
						}.bind(this));
					}
				}.bind(this));
			} else {
				MessageToast.show("Check Qualification Else");
				fnCheckValidation.call(this, this.getDemandPathFromAssignment(aSources), oTarget, oTargetObject, aGuids, {
					bUpdate: true
				});
			}
		},
		/**
		 *
		 * @param aSources
		 * @param oTarget
		 * @param oTargetDate
		 * Checking Availability
		 * @private
		 */
		_checkAvailability: function (aSources, oTarget, oTargetDate, aGuids) {
			var oModel = this.getModel(),
				sGuid = aSources ? oModel.getProperty(aSources[0] + "/Guid") : aGuids[0].split("'")[1];
			return new Promise(function (resolve, reject) {
				this.executeFunctionImport(oModel, {
					ResourceGuid: oModel.getProperty(oTarget + "/ResourceGuid"),
					StartTimestamp: oTargetDate || new Date(),
					DemandGuid: sGuid
				}, "ResourceAvailabilityCheck", "GET").then(function (data) {
					resolve(data);
				});
			}.bind(this));
		},
		getDemandPathFromAssignment: function (sAssignmentPath) {
			return this.oView.getModel().createKey("DemandSet", {
				Guid: this.oView.getModel().getProperty("/" + sAssignmentPath + "/Demand/Guid")
			});
		},
		/**
		 * get shape binding path
		 * from dragged data object
		 * @param sShapeUid
		 * @private
		 */
		_getShapeBindingContextPath: function (sShapeUid) {
			var oParsedUid = Utility.parseUid(sShapeUid);
			return oParsedUid.shapeDataName;
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