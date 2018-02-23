sap.ui.define([
    "com/evorait/evoplan/controller/BaseController",
    "com/evorait/evoplan/model/models",
    "sap/ui/core/ListItem",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, models, ListItem, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.AssignInfoDialog", {


        init: function () {
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("AssignTreeDialog", "selectedAssignment", this._showNewAssignment, this);
        },

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
         * Initialize Effort units select dialog
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        getEfforUnitSelectDialog: function(){
        	 // create dialog lazily
        	if (!this._oEffortUnitDialog) {
                // create dialog via fragment factory
                this._oEffortUnitDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.EffortUnitsSelectDialog", this);
            }
            return this._oEffortUnitDialog;
        },

        /**
         * open dialog
         * get detail data from resource and resource group
         * @param oView
         * @param sBindPath
         */
        open : function (oView, sBindPath, oAssignmentData) {
            var oDialog = this.getDialog(),
                oAssignment={
                    showError: false,
                    AssignmentGuid: "",
                    Description: "",
                    AllowReassign: false,
                    AllowUnassign: false,
                    NewAssignPath: null,
                    NewAssignId: null,
                    NewAssignDesc: null,
                    isNewAssignment: false
                 },
                oResource,
                sResourceGroupGuid,
                sResourceGuid;
          
          if(sBindPath && sBindPath !==""){
        		oResource = oView.getModel().getProperty(sBindPath);	
        		
        		oAssignment.AssignmentGuid = oResource.AssignmentGuid;
                oAssignment.Description = oResource.Description;
                sResourceGroupGuid = oResource.ResourceGroupGuid;
                sResourceGuid = oResource.ResourceGuid;
                
                this._bindingPath = sBindPath;
          }else{
        		oAssignment.AssignmentGuid = oAssignmentData.Guid;
                oAssignment.Description = oAssignmentData.Demand.DemandDesc;
                sResourceGroupGuid = oAssignmentData.ResourceGroupGuid;
                sResourceGuid = oAssignmentData.ResourceGuid;
          }

            this._oView = oView;
            oView.setModel(models.createAssignmentModel(oAssignment), "assignment");
            this.oAssignmentModel = oView.getModel("assignment");

            if(sResourceGroupGuid && sResourceGroupGuid !== ""){
                this._getAssignResourceGroup(sResourceGroupGuid);
            }
            if(sResourceGuid && sResourceGuid !== ""){
                this._getAssignResource(sResourceGuid+"%2F%2F"+sResourceGroupGuid);
            }

            // connect dialog to view (models, lifecycle)
            oView.addDependent(oDialog);
            this._getAssignedDemand(oAssignment.AssignmentGuid);
            //oDialog.bindElement(sBindPath);
            

            // open dialog
            oDialog.open();
        },
        /**
         * open dialog
         * get detail data from resource and resource group
         * @param oView
         * @param sBindPath
         */
        openEffortUnitsDialog : function(){
        	var oDialog = this.getEfforUnitSelectDialog();
        	this._oView.addDependent(oDialog);
        	oDialog.open();
        	oDialog.getBinding("items").filter([],"Application");
        },
        /**
         * Method get triggers when user selects any perticular unit from value help
         * and outputs the same in input
         * @param oEvent Select oEvent
         */
        _onSelectUnit:function(oEvent){
        	var oSelected = oEvent.getParameter("selectedItem"),
        		oModel = this._oView.getModel("assignment");
        	if(oSelected){
        		oModel.setProperty("/EffortUnit",oSelected.getTitle());
        	}
        },
        /**
         * Filters the units data on search
         * get detail data from resource and resource group
         * @param oEvent
         */
        _onSearchUnits:function(oEvent){
        	var sValue = oEvent.getParameter("value"),
        		oFilter = [];
        		if(sValue){
					oFilter = [
						new Filter("Msehi",FilterOperator.Contains, sValue)
					];
        		}
			oEvent.getSource().getBinding("items").filter(oFilter,"Application");
        },
        /**
         * open EffortUnit dialog
         */
		onPressValuePress:function(){
			this.openEffortUnitsDialog();
		},
        /**
         * save form data
         * @param oEvent
         */
        onSaveDialog : function (oEvent) {
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.publish("AssignInfoDialog", "updateAssignment", {
                isReassign: this.reAssign
            });
            this.onCloseDialog();
        },

        onDeleteAssignment : function (oEvent) {
            var sId = this.oAssignmentModel.getProperty("/AssignmentGuid");
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.publish("AssignInfoDialog", "deleteAssignment", {
                sId: sId
            });
            this.onCloseDialog();
        },

        /**
         *
         * @param oEvent
         */
        onChangeAssignType: function (oEvent) {
            var oParams = oEvent.getParameters(),
                reassignBtn = sap.ui.getCore().byId("reassignDialogButton");

            this.reAssign = oParams.selected;
            reassignBtn.setEnabled(this.reAssign);

            if(!this.reAssign){
                this.oAssignmentModel.setProperty("/NewAssignPath", null);
                this.oAssignmentModel.setProperty("/NewAssignId", null);
                this.oAssignmentModel.setProperty("/NewAssignDesc", null);
            }
        },

        /**
         * trigger event for open select assign tree table dialog
         * @param oEvent
         */
        onPressReAssign: function (oEvent) {
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.publish("AssignInfoDialog", "selectAssign", {
                oView: this._oView,
                isReassign: this.reAssign
            });
        },

        /**
         * close dialog
         */
        onCloseDialog : function () {
            this.getDialog().close();
        },

        /**
         *
         * @param sId
         * @private
         */
        _getAssignedDemand: function (sId) {
            var sPath = "/AssignmentSet('"+sId+"')",
                oDialog = this.getDialog(),
                oModel = this.oAssignmentModel;

            oDialog.bindElement({
                path: sPath,
                parameters: {
                    expand: "Demand"
                },
                events: {
                    change: function () {
                        var oElementBinding = oDialog.getElementBinding(),
                            oContext = oElementBinding.getBoundContext();

                        if(!oContext){
                            oModel.setProperty("/showError", true);
                            return;
                        }

                        oModel.setProperty("/showError", false);
                        oModel.setProperty("/DateFrom", oContext.getProperty("DateFrom"));
                        oModel.setProperty("/DateTo", oContext.getProperty("DateTo"));
                        oModel.setProperty("/Effort", oContext.getProperty("Effort"));
                        oModel.setProperty("/EffortUnit", oContext.getProperty("EffortUnit"));

                        var oDemandData = oContext.getProperty("Demand");
                        console.log(oDemandData);
                        oModel.setProperty("/AllowReassign", oDemandData.ALLOW_REASSIGN);
                        oModel.setProperty("/AllowUnassign", oDemandData.ALLOW_UNASSIGN);
                    },
                    dataRequested: function () {
                        oDialog.setBusy(true);
                    },
                    dataReceived: function () {
                        oDialog.setBusy(false);
                    }
                }
            });

        },

        /**
         * get assignment resource details
         * @param resId
         * @private
         */
        _getAssignResource: function (resId) {
            var oData = this._getResourceInfo(resId);
            if(oData){
                this.oAssignmentModel.setProperty("/ResourceGuid", resId);
                this.oAssignmentModel.setProperty("/ResourceDesc", oData.Description);
            }
        },

        /**
         * get assignment resource group details
         * @param groupId
         * @private
         */
        _getAssignResourceGroup: function (groupId) {
            var oData = this._getResourceInfo(groupId);
            if(oData){
                this.oAssignmentModel.setProperty("/ResourceGroupGuid", groupId);
                this.oAssignmentModel.setProperty("/ResourceGroupDesc", oData.Description);
            }
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

        _showNewAssignment: function (sChanel, sEvent, oData) {
            if(sEvent === "selectedAssignment"){
                var oNewAssign = this._oView.getModel().getProperty(oData.sPath);
                this.oAssignmentModel.setProperty("/NewAssignPath", oData.sPath);
                this.oAssignmentModel.setProperty("/NewAssignId", oNewAssign.Guid);
                this.oAssignmentModel.setProperty("/NewAssignDesc", oNewAssign.Description);
            }
        }
    });
});