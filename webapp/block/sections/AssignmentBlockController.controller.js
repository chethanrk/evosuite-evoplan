sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/controller/ErrorHandler",
	"sap/m/MessageToast"
], function (JSONModel, formatter, BaseController, ErrorHandler, MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.block.sections.AssignmentBlockController", {

		onClickRow: function (oEvent) {
			this.oParentBlock.fireOnRowClick(oEvent.getParameters());
		},
		
		/**
		 * For enabling Assignment Status Button based on Assignmnets Selection
		 * @param oEvent
		 * Since 2205
		 * @Author Chethan RK
		 */
		handleSelectionChange: function (oEvent) {
			var oSource = oEvent.getSource(),
				aSelectedItems = oSource.getSelectedItems(),
				bEnableAssignmentStatusButton = true;
			if (aSelectedItems.length === 0) {
				bEnableAssignmentStatusButton = false;
			}
			this.getView().getModel("viewModel").setProperty("/Disable_Assignment_Status_Button", bEnableAssignmentStatusButton);
		},
		
		/**
		 * Opening Assignment Status PopUp
		 * @param oEvent
		 * Since 2205
		 * @Author Chethan RK
		 */
		openAssignmentStatus: function (oEvent) {
			var oSource = oEvent.getSource(),
				oAssignmentTable = this.getView().byId("idAssignmentTable").getTable(),
				aSelectedItems = oAssignmentTable.getSelectedItems(),
				aAssignmentStatus = this._getAssignmentStatus(aSelectedItems);
			this.getView().getController().getOwnerComponent().AssignmentStatus.open(this.getView(), oSource, aAssignmentStatus, {
				bFromDetail: true
			}, oAssignmentTable);
		}
	});

});