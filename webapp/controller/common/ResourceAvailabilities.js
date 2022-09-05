sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.ResourceAvailabilities", {

		formatter: formatter,

		init: function () {},

		/**
		 * open dialog
		 * get availabilities of resource for selected WEEK/MONTH
		 * @param oView
		 * @param aSourcePaths 
		 * @param targetObj
		 * @param mParameters
		 */
		open: function (oView, aSourcePaths, targetObj, mParameters) {
			// create dialog lazily
			this._mParameters = mParameters;
			this._component = oView.getController().getOwnerComponent();
			this._oView = oView;
			this._aSourcePaths = aSourcePaths;
			this._targetObj = targetObj;

			if (!this._oAvailabilitiesDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					id: "ResourceAvailabilities",
					name: "com.evorait.evoplan.view.common.fragments.ResourceAvailabilities",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					this._oAvailabilitiesDialog = oDialog;
					oView.addDependent(oDialog);
					this._oAvailabilitiesDialog.open();
				}.bind(this));
			} else {
				this._oAvailabilitiesDialog.open();
			}
		},
		/**
		 * close the Dialog
		 */
		onPressCloseButton: function () {
			this._oAvailabilitiesDialog.close();
		},
		/**
		 * handle Assign operation for selected date
		 */
		onPressAssignButton: function (oEvent) {
			var oTable = sap.ui.getCore().byId("ResourceAvailabilities--idResourceAvailabilitiesTable"),
				oSelectedItem = oTable.getSelectedItem() ? oTable.getSelectedItem().getBindingContext("viewModel").getObject() : null,
				oParams;

			// validation for no date selection
			if (!oSelectedItem) {
				var sMsg = this._component.getModel("i18n").getResourceBundle().getText("ymsg.selectDate");
				this.showMessageToast(sMsg);
				return;
			}

			oParams = {
				DateFrom: oSelectedItem.StartTimestamp,
				TimeFrom: {
					ms: oSelectedItem.StartTimestamp.getTime()
				},
				DateTo: oSelectedItem.EndTimestamp,
				TimeTo: {
					ms: oSelectedItem.EndTimestamp.getTime()
				}
			};
			this.onPressCloseButton();

			// proceeding to assignment operation with new dateTime selected 
			this._oView.getController().checkQualificationAssignment(this._aSourcePaths, this._targetObj, oParams, this._mParameters);
		}

	});
});