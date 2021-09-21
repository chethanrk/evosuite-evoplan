sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast"
], function (BaseController, formatter, Fragment, MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.OperationTimeCheck", {

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
		open: function (that, oView, mParameters, sPath, oDraggedControl, oDroppedControl, oBrowserEvent) {
			this.oThis = that;
			this.oView = oView;
			this._sPath = sPath;
			this.oDraggedControl = oDraggedControl;
			this.oDroppedControl = oDroppedControl;
			this.oBrowserEvent = oBrowserEvent;
			if (!this._oDialog) {
				that.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.OperationTimeCheck",
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
			if (mParameters && mParameters.bFromGantt) {
				this._component.getModel("viewModel").setProperty("/ganttSettings/busy", false);
			}
		},

		/**
		 * Select All items in the Qualication match table
		 * @param oEvent
		 */
		onAssignmentDateCheckSelectAll: function (oEvent) {
			sap.ui.getCore().byId("idAsgnDateCheckTable").selectAll();
		},

		/**
		 * Close the dialog for Qualification Match results 
		 * @param oEvent
		 */
		onCloseDialog: function (oEvent) {
			this._oDialog.close();
		},

		/**
		 * proceed to assgin the selected Operation Times to Assignment
		 * @param oEvent
		 */
		onAssignmentDateCheckProceed: function (oEvent) {
			var oTable = sap.ui.getCore().byId("idAsgnDateCheckTable"),
				oViewModel = oTable.getModel("viewModel"),
				aAsgnDateCheckList = oViewModel.getProperty("/dragSession");
			if (this._mParameters.bFromGantt) {
				this.oThis.onProceedToGanttDropOnResource(this.oDraggedControl, this.oDroppedControl, this.oBrowserEvent);
			} else {
				this.oThis.assignedDemands(aAsgnDateCheckList, this._sPath, null);
			}
			this.onCloseDialog();
		}

	});
});