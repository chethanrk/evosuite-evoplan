sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Token",
	"sap/m/Tokenizer",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Filter, FilterOperator, Token, Tokenizer, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.gantt.GanttActions", {

		_oView: null,

		_oModel: null,
		
		_oComponent : null,
		
		_oAssignementModel : null,

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
			var oDefaultObject = 	this._oComponent.assignInfoDialog.getDefaultAssignmentModelObject(),
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
		 * get shape binding path
		 * from dragged data object
		 * @param sShapeUid
		 * @private
		 */
		_getShapeBindingContextPath: function (sShapeUid) {
			var oParsedUid = Utility.parseUid(sShapeUid);
			return oParsedUid.shapeDataName;
		}
	});

});