sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/m/MessageBox",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/m/MessageToast"
], function (BaseController, MessageBox, formatter, Constants, Fragment, OverrideExecution, MessageToast) {

	return BaseController.extend("com.evorait.evoplan.controller.PRT.PRTOperations", {

		/**
		 * validations before tools assignment service call
		 * @param aSources Selected tools data and path
		 * @param sTargetPath Target Resource/Demand 
		 * @param mParameters flag of source view 
		 */
		checksBeforeAssignTools: function (aSources, sTargetPath, mParameters) {
			var oDateParams,
				oTargetObj = this.getModel().getProperty(sTargetPath),
				sNodeType = oTargetObj.NodeType,
				bIsDateNode = sNodeType === "TIMEWEEK" || sNodeType === "TIMEDAY" || sNodeType === "TIMEMONTH" || sNodeType === "TIMEQUART" ||
				sNodeType ===
				"TIMEYEAR";

			if (bIsDateNode) {
				oDateParams = {
					DateFrom: oTargetObj.StartDate,
					TimeFrom: oTargetObj.StartTime,
					DateTo: oTargetObj.EndDate,
					TimeTo: oTargetObj.EndTime,
					ResourceGroupGuid: oTargetObj.ResourceGroupGuid,
					ResourceGuid: oTargetObj.ResourceGuid
				}
				this._proceedToAssignTools(aSources, oDateParams, mParameters);

			} else if (sNodeType === "RESOURCE") {
				//todo show Dialog to get the dates for Resource node
				MessageToast.show("Development is in progress");
			} else {
				//todo default condition
			}
		},
		
		/**
		 * method to call assignment service
		 * @param aSources Selected tools data and path
		 * @param oDateParams required common parameters for all the assignments 
		 * @param mParameters flag of source view 
		 */
		_proceedToAssignTools: function (aSources, oDateParams, mParameters) {
			var oParams,
				bIsLast;
			for (var i = 0; i < aSources.length; i++) {
				oParams = {
					DateFrom: oDateParams.DateFrom,
					TimeFrom: oDateParams.TimeFrom,
					DateTo: oDateParams.DateTo,
					TimeTo: oDateParams.TimeTo,
					ResourceGroupGuid: oDateParams.ResourceGroupGuid,
					ResourceGuid: oDateParams.ResourceGuid
				};
				oParams.TOOL_ID = aSources[i].oData.TOOL_ID;
				alert(aSources[i].oData.TOOL_ID);
				if (parseInt(i, 10) === aSources.length - 1) {
					bIsLast = true;
				}
				MessageToast.show("function import call ");
				// this.callFunctionImport(oParams, "CreateAssignment", "POST", mParameters, bIsLast);
			}
		}
	});
});