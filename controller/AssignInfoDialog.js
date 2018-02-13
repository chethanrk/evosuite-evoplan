sap.ui.define([
    "com/evorait/evoplan/controller/BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.AssignInfoDialog", {

        getDialog : function () {
            // create dialog lazily
            if (!this._oDialog) {
                // create dialog via fragment factory
                this._oDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.AssignInfoDialog", this);
            }
            return this._oDialog;
        },

        open : function (oView, sBindPath) {
            var oDialog = this.getDialog();
            // connect dialog to view (models, lifecycle)
            oView.addDependent(oDialog);
            this._oView = oView;

            oDialog.bindElement(sBindPath);
            this._bindingPath = sBindPath;

            // open dialog
            oDialog.open();
        },

        onSaveDialog : function (oEvent) {
            var oForm = sap.ui.getCore().byId("assignmentInfoForm");
            this._getDialogForms(oForm.getContent());
        },

        onCloseDialog : function () {
            this.getDialog().close();
        },


        _getDialogForms: function (aFormContent) {
            var sPathData = this._oView.getModel().getProperty(this._bindingPath);

            for (var i = 0; i < aFormContent.length; i++) {
                var obj = aFormContent[i];
                try{
                    var sName = obj.getName();

                    if(sName && sPathData.hasOwnProperty(sName)){

                    }
                }catch(e){}
            }
        },
    });
});