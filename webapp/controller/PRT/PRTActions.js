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
				"TIMEYEAR",
				oUserModel = this.getModel("user");

			if (!this._oViewModel) {
				this._oViewModel = this.getModel("viewModel");
			}

			oDateParams = {
				DateFrom: "",
				TimeFrom: {},
				DateTo: "",
				TimeTo: {},
				ResourceGroupGuid: oTargetObj.ResourceGroupGuid,
				ResourceGuid: oTargetObj.ResourceGuid
			}

			if (bIsDateNode) {
				oDateParams.DateFrom = oTargetObj.StartDate;
				oDateParams.TimeFrom.ms = oTargetObj.StartTime;
				oDateParams.DateTo = oTargetObj.EndDate;
				oDateParams.TimeTo.ms = oTargetObj.EndTime;
				this._proceedToAssignTools(aSources, oDateParams, mParameters);

			} else if (sNodeType === "RESOURCE") {
				var endDate = new Date(),
					iDefNum = oUserModel.getProperty("/DEFAULT_TOOL_ASGN_DAYS");
				endDate.setDate(endDate.getDate() + parseInt(iDefNum));
				this._oViewModel.setProperty("/toolAsgnDefaultDates/startDate", new Date());
				this._oViewModel.setProperty("/toolAsgnDefaultDates/endDate", new Date(endDate));
				if (oUserModel.getProperty("/ENABLE_TOOL_ASGN_DIALOG")) {
					this.open(this.getView(), oDateParams, aSources, mParameters);
				} else {
					this._proceedToAssignTools(aSources, oDateParams, mParameters);
				}
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
				oParams.ToolId = aSources[i].oData.TOOL_ID;
				if (parseInt(i, 10) === aSources.length - 1) {
					bIsLast = true;
				}
				this.callFunctionImport(oParams, "CreateToolAssignment", "POST", mParameters, bIsLast)
			}
		},

		/**
		 * method to open dates fragment for tool assignment
		 * @param oView source view
		 * @param oDateParams required common parameters for all the assignments 
		 * @param aSources Selected tools data and path
		 * @param mParameters flag of source view 
		 */
		open: function (oView, oDateParams, aSources, mParameters) {
			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.PRT.ToolAssignDates",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(oDialog, oView, oDateParams, aSources, mParameters);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, oDateParams, aSources, mParameters);
			}
		},

		/**
		 * method to store parameters to be passed for function import call
		 * @param oView source view
		 * @param oDateParams required common parameters for all the assignments 
		 * @param aSources Selected tools data and path
		 * @param mParameters flag of source view 
		 */
		onOpen: function (oDialog, oView, oDateParams, aSources, mParameters) {
			this._oDateParams = oDateParams;
			this._aSources = aSources;
			this._mParameters = mParameters;
			oView.addDependent(oDialog);
			oDialog.open();
		},

		/**
		 * close dialog from XML view
		 */
		onCloseDialog: function () {
			this._oDialog.close();
		},

		/**
		 * method to trigger function import for tool assignment
		 */
		onSaveDialog: function () {
			this._oDateParams.DateFrom = this._oViewModel.getProperty("/toolAsgnDefaultDates/startDate");
			this._oDateParams.TimeFrom.ms = this._oViewModel.getProperty("/toolAsgnDefaultDates/startDate").getTime();
			this._oDateParams.DateTo = this._oViewModel.getProperty("/toolAsgnDefaultDates/endDate");
			this._oDateParams.TimeTo.ms = this._oViewModel.getProperty("/toolAsgnDefaultDates/endDate").getTime();
			this._proceedToAssignTools(this._aSources, this._oDateParams, this._mParameters);
			this.onCloseDialog();
		},
	});
});