sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.AssignInfoDialog", {

		formatter: formatter,

		init: function () {},

		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 */
		open: function (oView, oEvent, mParameters) {
			var oSource = oEvent.getSource(),
				oContext = oSource.getBindingContext(),
				oModel = oContext.getModel();
			// create dialog lazily
			this._mParameters = mParameters;
			this._component = oView.getController().getOwnerComponent();
			this._oView = oView;
			if (!this._olistDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					id: "AssignList",
					name: "com.evorait.evoplan.view.common.fragments.Assignments",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					this._olistDialog = oDialog;
					oView.addDependent(oDialog);
					this._openPopOver(oSource, oDialog, oModel, oContext);
				}.bind(this));
			} else {
				this._openPopOver(oSource, this._olistDialog, oModel, oContext);
			}
		},
		_openPopOver: function (oSource, oDialog, oModel, oContext) {
			oDialog.setBusy(true);
			oDialog.bindElement({
				path: oContext.getPath(),
				parameters: {
					expand: "DemandToAssignment"
				},
				events:{
					dataReceived:function(){
						oDialog.setBusy(false);
					}
				}
			});
			oDialog.openBy(oSource);
			oDialog.getElementBinding().refresh();
		},
		/**
		 * on Close on pop over
		 */
		onCloseAssigmentsPopover: function (oEvent) {
			this._olistDialog.close();
		},
		/**
		 * Opens the AssignInfo dialog to update the assignment
		 * @Author Rahul
		 * @return
		 * @param oEvent
		 */
		onClickRow: function (oEvent) {
			var oAssignment = oEvent.getParameter("listItem"),
				oContext = oAssignment.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oAssignmentData = oModel.getProperty(sPath);
			this.openAssignInfoDialog(this._oView, sPath, oAssignmentData, this._mParameters);
		},
		/**
		 * unbind after closing
		 */
		onAfterCloseAssigments: function(oEvent){
			this._olistDialog.unbindElement();
		}
	});
});