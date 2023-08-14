sap.ui.define([
    "com/evorait/evoplan/controller/BaseController",
    "sap/ui/core/Fragment"
], function (BaseController, Fragment) {
    return BaseController.extend("com.evorait.evoplan.controller.common.ProgressBarDialog", {

        init: function () {
            this.resetProgressData();
        },

        open: function () {
            if (!this._oProgressBarDialog) {
                Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.ProgressBarDialog",
					controller: this
				}).then(function (oDialog) {
					this._oProgressBarDialog = oDialog;
                    this.resetProgressData();
					this._oProgressBarDialog.open();
				}.bind(this));
            }else{
                this.resetProgressData();
                this._oProgressBarDialog.open();
            }
        },

        onOpen: function () {

        },

        setProgressData: function (){

        },

        resetProgressData: function () {
            var oData = {
				description:"Loading data...",
				progress:"0",
				progressDescription:"0%"
            };
            this.setModel(oData,"progressBarData");
        },

        close: function () {
            this.resetProgressData();
            this._oProgressBarDialog.close();
        }

    });
});