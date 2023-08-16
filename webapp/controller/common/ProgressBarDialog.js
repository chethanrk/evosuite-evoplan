sap.ui.define([
    "com/evorait/evoplan/controller/BaseController",
    "sap/ui/core/Fragment"
], function (BaseController, Fragment) {
    return BaseController.extend("com.evorait.evoplan.controller.common.ProgressBarDialog", {

        /**
		 * overwrite constructor
		 * set manuel owner component for nested xml views
		 */
		constructor: function (oComponent) {
			this._component = oComponent;
		},

        init: function () {
            this._progressBarDialogModel = this._component.getModel("progressBarModel");
            this.resetProgressData();
        },

        open: function (oView) {
            if (!this._oProgressBarDialog) {
                Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.ProgressBarDialog",
					controller: this
				}).then(function (oDialog) {
					this._oProgressBarDialog = oDialog;
					this.onOpen(this._oProgressBarDialog, oView);
				}.bind(this));
            }else{
                this.onOpen(this._oProgressBarDialog, oView);
            }
        },

        onOpen: function (oDialog, oView) {
            oView.addDependent(oDialog);
            this.resetProgressData();
            oDialog.open();
        },

        setProgressData: function (oData){
            debugger;
            var oProgressBarData = this._progressBarDialogModel.getData();
            oProgressBarData = Object.assign(oProgressBarData, oData);
            oProgressBarData.progressDescription = oProgressBarData.progress ? oProgressBarData.progress + "%" : "0%";
            this._progressBarDialogModel.setData(oProgressBarData);
        },

        resetProgressData: function () {
            var oData = {
				description:"Loading data...",
				progress:"0",
				progressDescription:"0%"
            };
            this._progressBarDialogModel.setData(oData);
        },

        close: function () {
            this.resetProgressData();
            this._oProgressBarDialog.close();
        }

    });
});