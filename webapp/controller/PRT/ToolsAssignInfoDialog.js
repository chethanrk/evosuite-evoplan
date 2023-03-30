sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast"
], function (BaseController, formatter, Fragment, MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.AssignInfoDialog", {

		formatter: formatter,
		onOpen: function (oDialog, oView) {
			var oPrtToolsAssignment = this.getDefaultPRTToolsAssignmentModelObject();
			oView.getModel("assignment").setData(oPrtToolsAssignment);
			this._oDialog = oDialog;
			this._oView = oView;
			this._component = this._oView.getController().getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			oView.addDependent(oDialog);
		},
		getDefaultPRTToolsAssignmentModelObject: function () {
			return {
				AllowChange: false,
				AllowReassign: false,
				AllowUnassign: false,
				AssignmentGuid: "",
				DateFrom: "",
				DateTo: "",
				DemandGuid: "",
				DemandStatus: "",
				Description: "",
				Effort: null,
				EffortUnit: null,
				NewAssignPath: null,
				NewAssignId: null,
				NewAssignDesc: null,
				OperationNumber: "",
				OrderId: "",
				ResourceGroupGuid: "",
				ResourceGuid: "",
				SubOperationNumber: "",
				objSourceType: "",
				Notification: "",
				isNewAssignment: false,
				showError: false,
				ShowGoToDetailBtn: false
			};
		},

		/**
		 * when dialog closed inside controller
		 */
		_closeDialog: function () {
			this._oDialog.close();
		},

		/**
		 * close dialog
		 * Cancel progress
		 */
		onCloseDialog: function () {
			this._closeDialog();

		},

	});
});