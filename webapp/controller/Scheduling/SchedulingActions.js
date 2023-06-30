sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/m/MessageToast"
], function (BaseController, MessageBox, formatter, Constants, Fragment, OverrideExecution, MessageToast) {

	
	return BaseController.extend("com.evorait.evoplan.controller.Scheduling.SchedulingActions", {

		_controller: undefined, //controller from where this class was initialized
		oViewModel: undefined,
		oDataModel: undefined,

		/**
		 * Set here all global properties you need from other controller
		 * @param {*} controller 
		 */
		constructor: function(controller) {
			this._controller = controller;
			this.oViewModel = controller.getModel("viewModel");
			this.oDataModel = controller.getModel();
		},

		/* =========================================================== */
		/* Public methods                                              */
		/* =========================================================== */

		/**
		 * Function to validate rescheduling button
		 */
		validateReschedule: function(){
			var oSelectedDemandItem, oScheduling;
			oScheduling = this.oViewModel.getProperty("/Scheduling");

			//TODO - check if global config is enabled for multiple demands

			if(oScheduling.selectedDemandPath){
				oSelectedDemandItem = this.oDataModel.getProperty(oScheduling.selectedDemandPath);
			
				if(oScheduling.selectedResources && oScheduling.selectedResources.length > 0 && 
					(oSelectedDemandItem.ALLOW_REASSIGN || oSelectedDemandItem.ALLOW_ASSIGN)){
					this.oViewModel.setProperty("/Scheduling/bEnableReschedule", true);
				} else {
					this.oViewModel.setProperty("/Scheduling/bEnableReschedule", false);
				}
			} else {
				this.oViewModel.setProperty("/Scheduling/bEnableReschedule", false);
			}
		},

		
	
		/* =========================================================== */
		/* Private methods                                              */
		/* =========================================================== */

		/**
		 * This method will validate the selected data (demands and resources) and display the error message
		 * @return {boolean}
		 */
		_validateRescheduleProcess: function(){
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				oViewModel = this.getModel("viewModel"),
				oDatModel = this.getModel(),
				aResourceData = [],
				aResourceGroupData = [],
				aResourcePath = [],
				oResourceObj={},
				oUniqueResourceList={},
				bValidateState=true,
				oResourceTable = sap.ui.getCore().byId('__xmlview2--droppableTable'),
				aAllResourceNodes = oResourceTable.getTable().getBinding("rows").getNodes(),
				aResourceFromGroup = [];

			aResourcePath = oViewModel.getProperty("/Scheduling/selectedResources");
			//Check for resource duplicate
			aResourcePath.forEach(function(sPath){
				oResourceObj = deepClone(oDatModel.getProperty(sPath));
				if(oResourceObj.ResourceGuid){
					if(oUniqueResourceList[oResourceObj.ResourceGuid]){
						this._showErrorMessage(oResourceBundle.getText("ymsg.DuplicateResource"));
						bValidateState = false;
					}else{
						oUniqueResourceList[oResourceObj.ResourceGuid] = true;
					}
					aResourceData.push(oResourceObj);
				}else{
					if(oResourceObj.ResourceGroupGuid){
						aAllResourceNodes.forEach(function(oNode){
							var oNodeObject = oNode.context.getObject();
							if(oNodeObject.ResourceGuid && oResourceObj.ResourceGroupGuid === oNodeObject.ResourceGroupGuid){
								aResourceFromGroup.push(oNodeObject);
							}
						})
					}
					aResourceGroupData.push(oResourceObj);
				}
			}.bind(this));
			//Check for resource duplicate
			//Read all Resource from Resource group
			aResourceFromGroup.forEach(function(oNodeObject){
				if(oUniqueResourceList[oNodeObject.ResourceGuid]){
					this._showErrorMessage(oResourceBundle.getText("ymsg.DuplicateResource"));
					bValidateState = false;
				}else{
					oUniqueResourceList[oNodeObject.ResourceGuid] = true;
				}

			}.bind(this));

			//Read all Resource from Resource group

			return bValidateState;
		},

	

	});
});