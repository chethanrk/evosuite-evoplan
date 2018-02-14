sap.ui.define([
    "com/evorait/evoplan/controller/BaseController",
    "com/evorait/evoplan/model/models"
], function (BaseController, models) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.AssignInfoDialog", {

        /**
         * init and get dialog view
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        getDialog : function () {
            // create dialog lazily
            if (!this._oDialog) {
                // create dialog via fragment factory
                this._oDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.AssignInfoDialog", this);
            }
            return this._oDialog;
        },

        /**
         * open dialog
         * get detail data from resource and resource group
         * @param oView
         * @param sBindPath
         */
        open : function (oView, sBindPath) {
            var oDialog = this.getDialog(),
                oDemand = oView.getModel().getProperty(sBindPath),
                oAssignment = {
                    DemandGuid: oDemand.DemandGuid,
                    DemandDesc: oDemand.Description,
                    StartDate: oDemand.StartDate,
                    EndDate: oDemand.EndDate,
                    Assign: ""
                };

            this._oView = oView;
            oView.setModel(models.createAssignmentModel(oAssignment), "assignment");

            if(oDemand.ResourceGroupGuid && oDemand.ResourceGroupGuid !== ""){
                this._getAssignResourceGroup(oDemand.ResourceGroupGuid);
            }
            if(oDemand.ResourceGuid && oDemand.ResourceGuid !== ""){
                this._getAssignResouce(oDemand.ResourceGuid);
            }

            // connect dialog to view (models, lifecycle)
            oView.addDependent(oDialog);
            oDialog.bindElement(sBindPath);
            this._bindingPath = sBindPath;

            // open dialog
            oDialog.open();
        },

        /**
         * save form data
         * @param oEvent
         */
        onSaveDialog : function (oEvent) {
            var oForm = sap.ui.getCore().byId("assignmentInfoForm");
            this._getDialogForms(oForm.getContent());
        },

        /**
         *
         * @param oEvent
         */
        onChangeAssignment: function (oEvent) {
            var oParams = oEvent.getParameters();
            if(oParams.value === "Reassign"){

            }
        },

        /**
         * close dialog
         */
        onCloseDialog : function () {
            this.getDialog().close();
        },

        /**
         * get assignment resource details
         * @param resId
         * @private
         */
        _getAssignResouce: function (resId) {
            var oData = this._getResourceInfo(resId),
                oAssignModel = this._oView.getModel("assignment");

            oAssignModel.setProperty("/ResourceGuid", resId);
            oAssignModel.setProperty("/ResourceDesc", oData.Description);
        },

        /**
         * get assignment resource group details
         * @param groupId
         * @private
         */
        _getAssignResourceGroup: function (groupId) {
            var oData = this._getResourceInfo(groupId),
                oAssignModel = this._oView.getModel("assignment");

            oAssignModel.setProperty("/ResourceGroupGuid", groupId);
            oAssignModel.setProperty("/ResourceGroupDesc", oData.Description);
        },

        /**
         * get resouce info based on id
         * @param sId
         * @private
         */
        _getResourceInfo: function (sId) {
            var sPath = "/ResourceHierarchySet('"+sId+"')";
            return this._oView.getModel().getProperty(sPath);
        },

        /**
         * get all form data
         * @param aFormContent
         * @private
         */
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