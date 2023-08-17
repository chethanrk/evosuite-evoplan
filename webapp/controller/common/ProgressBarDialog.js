sap.ui.define([
    "com/evorait/evoplan/controller/BaseController",
    "sap/ui/core/Fragment"
], function (BaseController, Fragment) {
    return BaseController.extend("com.evorait.evoplan.controller.common.ProgressBarDialog", {

        /**
		 * Constructor for ProgressBarDialog
		 */
		constructor: function (oComponent) {
			this._component = oComponent;
		},

        /**
		 * Method used for the initialization process.
         * Creating model variable 
		 */
        init: function () {
            this._progressBarDialogModel = this._component.getModel("progressBarModel");
            this._resourceBundle = this._component.getModel("i18n").getResourceBundle();
            this.resetProgressData();
        },
        /**
         * Method used to to open the progress bar dialog
         * @param {object} oView 
         */
        open: function (oView) {
            if (!this._oProgressBarDialog) {
                Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.ProgressBarDialog",
					controller: this
				}).then(function (oDialog) {
                    oDialog.setEscapeHandler(function(){});
					this._oProgressBarDialog = oDialog;
					this.onOpen(this._oProgressBarDialog, oView);
				}.bind(this));
            }else{
                this.onOpen(this._oProgressBarDialog, oView);
            }
        },
        /**
         * Method will add dialog to the view, reset the dialog data and open 
         * @param {object} oDialog 
         * @param {object} oView 
         */
        onOpen: function (oDialog, oView) {
            oView.addDependent(oDialog);
            this.resetProgressData();
            oDialog.open();
        },
        /**
         * Method used to change the dialog data.
         * Data like dialog description, progress data
         * @param {object} oData 
         */
        setProgressData: function (oData){
            var oProgressBarData = this._progressBarDialogModel.getData();
            oProgressBarData = Object.assign(oProgressBarData, oData);
            oProgressBarData.progressDescription = oProgressBarData.progress ? oProgressBarData.progress + "%" : "0%";
            this._progressBarDialogModel.setData(oProgressBarData);
        },
        /**
         * Method used to reset the dialog data to initial data
         */
        resetProgressData: function () {
            var oData = {
				description:this._resourceBundle.getText("ymsg.loading"),
				progress:"0",
				progressDescription:"0%"
            };
            this._progressBarDialogModel.setData(oData);
        },
        /**
         * Method used to close the dialog
         */
        close: function () {
            this.resetProgressData();
            this._oProgressBarDialog.close();
        }

    });
});