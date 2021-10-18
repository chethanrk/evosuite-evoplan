sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast"
], function (BaseController, formatter, Fragment, MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.VendorAssignment", {

		formatter: formatter,

		init: function () {
			// keeping this method empty as this is being used for initialize only
		},

		/**
		 * Initialize the dialog for Qualification Match results 
		 * @param that
		 * @param oView
		 * @param mParameters
		 */
		open: function (that, oView, sPath, mParameters, oDraggedControl, oDroppedControl, oBrowserEvent) {
			this.oThis = that;
			this.oView = oView;
			this._sPath = sPath;
			this.oDraggedControl = oDraggedControl;
			this.oDroppedControl = oDroppedControl;
			this.oBrowserEvent = oBrowserEvent;
			if (!this._oDialog) {
				that.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.VendorAssignment",
					controller: this
				}).then(function (oDialog) {
					that.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(that, oDialog, mParameters);
				}.bind(this));
			} else {
				this.onOpen(that, this._oDialog, mParameters);
			}
		},

		/**
		 * Open the dialog for Qualification Match results 
		 * @param that
		 * @param oDialog
		 * @param mParameters
		 */
		onOpen: function (that, oDialog, mParameters) {
			this._mParameters = mParameters || {
				bFromHome: true
			};
			this._component = that.getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// connect dialog to view (models, lifecycle)
			this.oView.addDependent(oDialog);
			// open dialog
			oDialog.open();
			this.onVendorAssignmentSelectAll();
		},

		/**
		 * Select All items in the Qualication match table
		 * @param oEvent
		 */
		onVendorAssignmentSelectAll: function (oEvent) {
			sap.ui.getCore().byId("idVendorAssignmentTable").selectAll();
		},

		/**
		 * Close the dialog for Qualification Match results 
		 * @param oEvent
		 */
		onCloseDialog: function (oEvent) {
			this._oDialog.close();
		},

		/**
		 * proceed to assgin the selected Vendor Assignment
		 * @param oEvent
		 */
		onVendorAssignmentProceed: function (oEvent) {
			var aVendorAssignmentList = this.getModel("viewModel").getProperty("/dragSession"),
				sNodeType = this.getModel().getProperty(this._sPath + "/NodeType"),
				iOperationTimesLen,
				bValidationCheck = this.onValidateAssignments(aVendorAssignmentList);
			if (bValidationCheck) {
				if (this._mParameters.bFromGantt) {
					if (this.getModel("user").getProperty("/ENABLE_ASGN_DATE_VALIDATION") && aVendorAssignmentList[0].oData.FIXED_ASSGN_START_DATE !==
						null && aVendorAssignmentList[0].oData.FIXED_ASSGN_END_DATE !==
						null) {
						this.getOwnerComponent().OperationTimeCheck.open(this.oThis, this.oView, this._mParameters, this._sPath, this.oDraggedControl,
							this.oDroppedControl, this.oBrowserEvent);
					} else {
						this.oThis.onProceedToGanttDropOnResource(this.oDraggedControl, this.oDroppedControl, this.oBrowserEvent);
					}
				} else {
					iOperationTimesLen = this.onShowOperationTimes();
					if (this.getModel("user").getProperty("/ENABLE_ASGN_DATE_VALIDATION") && iOperationTimesLen !== aVendorAssignmentList.length &&
						sNodeType === "RESOURCE") {
						this.getOwnerComponent().OperationTimeCheck.open(this, this.getView(), this._mParameters, this._sPath, this.oDraggedControl,
							this.oDroppedControl, this.oBrowserEvent);
					} else {
						this.oThis.assignedDemands(aVendorAssignmentList, this._sPath, this._mParameter);
					}
				}
				this.onCloseDialog();
			}
		},
		/**
		 * Method to validate mandatory fields for the selected Vendor Assignment
		 * @param aVendorAssignmentList
		 */
		onValidateAssignments: function (aVendorAssignmentList) {
			var bValidationCheck = true,
				iCount;
			for (var a in aVendorAssignmentList) {
				if (aVendorAssignmentList[a].oData.ALLOW_ASSIGNMENT_DIALOG) {
					iCount = Number(a) + 1;
					if (aVendorAssignmentList[a].oData.CostElement === "" && aVendorAssignmentList[a].oData.Estimate !== "") {
						sap.m.MessageToast.show(this.getResourceBundle().getText("ymsg.validateCostElement") + " " + iCount);
						bValidationCheck = false;
						break;
					} 
					// else if (aVendorAssignmentList[a].oData.CostElement === "" && aVendorAssignmentList[a].oData.Currency !== "") {
					// 	sap.m.MessageToast.show(this.getResourceBundle().getText("ymsg.validateCostElement") + " " + iCount);
					// 	bValidationCheck = false;
					// 	break;
					// } 
					else if (aVendorAssignmentList[a].oData.CostElement !== "" && aVendorAssignmentList[a].oData.Estimate === "") {
						sap.m.MessageToast.show(this.getResourceBundle().getText("ymsg.validateEstimate") + " " + iCount);
						bValidationCheck = false;
						break;
					} else if (aVendorAssignmentList[a].oData.CostElement !== "" && aVendorAssignmentList[a].oData.Estimate === "") {
						sap.m.MessageToast.show(this.getResourceBundle().getText("ymsg.validateEstimate") + " " + iCount);
						bValidationCheck = false;
						break;
					} else if (aVendorAssignmentList[a].oData.Estimate !== "" && aVendorAssignmentList[a].oData.Currency === "") {
						sap.m.MessageToast.show(this.getResourceBundle().getText("ymsg.validateCurrency") + " " + iCount);
						bValidationCheck = false;
						break;
					} else if (aVendorAssignmentList[a].oData.CostElement !== "" &&
						aVendorAssignmentList[a].oData.Currency === "") {
						sap.m.MessageToast.show(this.getResourceBundle().getText("ymsg.validateCurrency") + " " + iCount);
						bValidationCheck = false;
						break;
					}
				}
			}
			return bValidationCheck;
		},

	});
});