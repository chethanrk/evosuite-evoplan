sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/m/MessageToast",
	'sap/ui/model/Filter'
], function (BaseController, MessageBox, formatter, Constants, Fragment, OverrideExecution, MessageToast, Filter) {

	
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
			this.oAppViewModel = controller.getModel("appView");
			this.oDataModel = controller.getModel();
			this.oResourceBundleModel = controller.getModel("i18n");
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
		
		/**
		 * Function to handle Plan Demands Operation
		 */
		handlePlanDemands: function(){
			
		},		

		/**
		 * This method will validate the selected data (demands and resources) and display the error message
		 * @return {boolean} - 'true' if no duplicate found | 'false' if duplicate found
		 */
		checkDuplicateResource: function(){
			var oResourceBundle = this.oResourceBundleModel.getResourceBundle(),
				oViewModel = this.oViewModel,
				oAppViewModel = this.oAppViewModel,
				oDataModel = this.oDataModel,
				aResourcePath = oViewModel.getProperty("/Scheduling/selectedResources"),
				aTableFilters = oViewModel.getProperty("/Scheduling/resourceTreeData/filter"),
				mParameters={
					$select:oViewModel.getProperty("/Scheduling/resourceTreeData/select")
				},
				aResourceData = [],
				oResourceObj={},
				oUniqueResourceList={},
				aResourceGroupPromise = [],				
				aFilters=[];
				
			
			var checkDuplicate = function(aResourceList){
				var bValidateState = true,
					aResourceNameList = [];
				aResourceList.forEach(function(oResource){
					if(oResource.ResourceGuid){
						if(oUniqueResourceList[oResource.ResourceGuid]){
							bValidateState = false;
							aResourceNameList.push(oResource.Description);
						}else{
							oUniqueResourceList[oResource.ResourceGuid] = true;
						}
					}
				});
				return {
					validateState: bValidateState,
					resourceNames: aResourceNameList.join(", ")
				};
			};
			//Check for resource duplicate
			aResourcePath.forEach(function(sPath){
				oResourceObj = _.clone(oDataModel.getProperty(sPath));
				aFilters=[];
				if(oResourceObj.ResourceGuid){
					aResourceData.push(oResourceObj);
				}else{
					if(oResourceObj.ResourceGroupGuid){
						aFilters=_.clone(aTableFilters);
						aFilters.push(new Filter("ParentNodeId", "EQ", oResourceObj.NodeId));
						aResourceGroupPromise.push(this._controller.getOwnerComponent()._getData("/ResourceHierarchySet", aFilters, mParameters));
					}
				}
			}.bind(this));
			//Check for resource duplicate
			//Read all Resource from Resource group
			oAppViewModel.setProperty("/busy",true);
			return Promise.all(aResourceGroupPromise).then(function(aResult){
						oAppViewModel.setProperty("/busy",false);
						aResult.forEach(function(oResult){
							aResourceData = aResourceData.concat(oResult.results);
						});						
						return checkDuplicate(aResourceData);
					}.bind(this));
			//Read all Resource from Resource group

		},

		/* =========================================================== */
		/* Private methods                                              */
		/* =========================================================== */
	});
});