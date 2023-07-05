sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter"
], function (BaseController, formatter) {

	
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

				if(oScheduling.selectedResources && (oScheduling.selectedResources.length > 0)) {
					this.oViewModel.setProperty("/Scheduling/bEnableReschedule", !!oSelectedDemandItem.ALLOW_REASSIGN);
					this.oViewModel.setProperty("/Scheduling/bEnableAutoschedule", !!oSelectedDemandItem.ALLOW_ASSIGN);
				} else {
					this.oViewModel.setProperty("/Scheduling/bEnableReschedule", false);
					this.oViewModel.setProperty("/Scheduling/bEnableAutoschedule", false);
				}
			} else {
				this.oViewModel.setProperty("/Scheduling/bEnableReschedule", false);
				this.oViewModel.setProperty("/Scheduling/bEnableAutoschedule", false);
			}
		},
		
		/**
		 * Function to handle Plan Demands Operation
		 */
		handlePlanDemands: function(){
			
		}

		
	
		/* =========================================================== */
		/* Private methods                                              */
		/* =========================================================== */

	

	});
});