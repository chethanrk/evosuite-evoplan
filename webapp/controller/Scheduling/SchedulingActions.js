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

		/* =========================================================== */
		/* Public methods                                              */
		/* =========================================================== */
		/**
		 * Function to validate rescheduling button
		 */
		validateReschedule: function(){
			var oSelectedDemandItem, oScheduling, oViewModel;
			oViewModel = this.getModel("viewModel");
			oScheduling = oViewModel.getProperty("/Scheduling");

			if(oScheduling.selectedDemandPath){
				oSelectedDemandItem = this.getModel().getProperty(oScheduling.selectedDemandPath);
			
				if(oScheduling.selectedResources && oSelectedDemandItem.ALLOW_REASSIGN && oScheduling.selectedResources.length > 0){
					oViewModel.setProperty("/Scheduling/bEnableReschedule", true);
				} else {
					oViewModel.setProperty("/Scheduling/bEnableReschedule", false);
				}
			} else {
				oViewModel.setProperty("/Scheduling/bEnableReschedule", false);
			}
		}

		
	
		/* =========================================================== */
		/* Private methods                                              */
		/* =========================================================== */

	

	});
});