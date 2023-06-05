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
		 * validations before tools assignment service call
		 * @param aSources Selected tools data and path
		 * @param sTargetPath Target Resource/Demand 
		 * @param mParameters flag of source view 
		 */
		samplPublicMehtods: function (aSources, oTargetObj, mParameters, sTargetPath) {
            console.log('method called sample public method');
		},



		/* =========================================================== */
		/* Private methods                                              */
		/* =========================================================== */

		/**
		 * method to call assignment service
		 * @param aSources Selected tools data and path
		 * @param oDateParams required common parameters for all the assignments 
		 * @param mParameters flag of source view 
		 */
		_samplePrivateFunction: function (aSources, oDateParams, mParameters) {
            

		}


	});
});