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
		open: function (oView, mParameters, sPath, oDraggedControl, oDroppedControl, oBrowserEvent) {
			this.oView = oView;
			this._sPath = sPath;
			this.oDraggedControl = oDraggedControl;
			this.oDroppedControl = oDroppedControl;
			this.oBrowserEvent = oBrowserEvent;
			if (!this._oDialog) {
				this.oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.OperationTimeCheck",
					controller: this
				}).then(function (oDialog) {
					this.oView.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(oDialog, mParameters);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, mParameters);
			}
		},

		/**
		 * Open the dialog for Qualification Match results 
		 * @param that
		 * @param oDialog
		 * @param mParameters
		 */
		onOpen: function (oDialog, mParameters) {
			this._mParameters = mParameters;
			this._oController = this.oView.getController();
			this._component = this._oController.getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// connect dialog to view (models, lifecycle)
			this.oView.addDependent(oDialog);
			// open dialog
			oDialog.open();
			this.onOperationTimesRowDisable();
		},

		/**
		 * Select All items in the Qualication match table
		 * @param oEvent
		 */
		onAssignmentDateCheckSelectAll: function (oEvent) {
			//	sap.ui.getCore().byId("idAsgnDateCheckTable").selectAll();
			var oTable = sap.ui.getCore().byId("idAsgnDateCheckTable"),
				oViewModel = oTable.getModel("viewModel"),
				aOperationTimesList = oViewModel.getProperty("/dragSession");

			for (var p in aOperationTimesList) {
				if (aOperationTimesList[p].IsDisplayed) {
					aOperationTimesList[p].IsSelected = true;
				}
			}
			oViewModel.refresh(true);
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
			if (!this._mParameters) {
				this._component.assignTreeDialog.onProceedSaveDialog();
			} else {
				if (this._mParameters.bFromGantt) {
					this._oController.onProceedToGanttDropOnResource(this.oDraggedControl, this.oDroppedControl, this.oBrowserEvent);
				}else  if (this._mParameters.bFromNewGantt){
					this._oController.onProceedNewGanttDemandDrop(this.oDraggedControl, this.oDroppedControl, this.oBrowserEvent);
				} else {
					this._oController.assignedDemands(aAsgnDateCheckList, this._sPath, null);
				}
			}
			this.onCloseDialog();
		},
		/**
		 * Disabling items with no Operation Times in table
		 */
		onOperationTimesRowDisable: function () {
			var oTable = sap.ui.getCore().byId("idAsgnDateCheckTable"),
				oHeader = oTable.$().find('thead'),
				oSelectAll = oHeader.find('.sapMCb');
			oSelectAll.remove();
			oTable.getItems().forEach(function (oEvent) {
				var bIsDisplayed = oEvent.getBindingContext("viewModel").getObject().IsDisplayed,
					oCheckBox = oEvent.$().find('.sapMCb'),
					oSelectedRow = sap.ui.getCore().byId(oCheckBox.attr('id'));
				if (bIsDisplayed) {
					oSelectedRow.setEnabled(true);
					oEvent.getBindingContext("viewModel").getObject().IsSelected = true;
				} else {
					oSelectedRow.setEnabled(false);
					oEvent.getBindingContext("viewModel").getObject().IsSelected = false;
				}
			});

			//	this.onAssignmentDateCheckSelectAll();
		},

	});
});