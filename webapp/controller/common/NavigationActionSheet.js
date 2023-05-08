sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentActionsController",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/model/Constants"
], function (BaseController, models, formatter, Filter, FilterOperator, Fragment, Constants) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.NavigationActionSheet", {

		formatter: formatter,

		init: function () {},

		open: function (oView, oParent, oSelectedItem) {
			this.selectedDemandData = oSelectedItem;

			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.NavigationActionSheet",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this._oView = oView;
					this._component = this._oView.getController().getOwnerComponent();
					oDialog.addStyleClass(this._component.getContentDensityClass());
					// connect dialog to view (models, lifecycle)
					oView.addDependent(oDialog);
					this.onOpen(oDialog, oView, oParent);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, oParent);
			}
		},
		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 * @param isBulkReAssign - To Identify the action for the dialog is getting opened.
		 */
		onOpen: function (oDialog, oView, oParent) {
			//Navigation Action Button Visibility Function
			this.onNavLinkVisibilty(oView);
			// open dialog
			oDialog.openBy(oParent);

		},
		/**
		 *  on click of navigation items opens the respective application
		 */
		onClickNavAction: function (oEvent) {
			var oSource = oEvent.getSource(),
				oContext = oSource.getBindingContext("navLinks"),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oData = oModel.getProperty(sPath),
				oDemandData = this.selectedDemandData;
			this.linkToOtherApps(oData, oSource.getModel("viewModel"), oSource.getModel("user"), oDemandData);
		},

		/**
		 * Navigation Logic for EvoApps Detail Screen 
		 * based on Launch Mode's
		 * @param oAppInfo
		 * @param oViewModel
		 * @param oUserModel
		 */
		linkToOtherApps: function (oAppInfo, oViewModel, oUserModel, oDemandData) {
			var sUri, sSemanticObject, sAction, sAdditionInfo, sParameter, sParamValue, oKeyChar,
				sServicePath = "https://" + oUserModel.getProperty("/ServerPath"),
				sLaunchMode = oViewModel ? oViewModel.getProperty("/launchMode") : this.getModel("viewModel").getProperty("/launchMode");

			//Logic for Transaction Navigation
			if (oAppInfo.LaunchMode === Constants.LAUNCH_MODE.ITS) {
				sAdditionInfo = oAppInfo.Value1;
				sUri = sAdditionInfo.split("\\")[0];
				sParameter = sAdditionInfo.split("\\")[sAdditionInfo.split("\\").length - 1];
				oKeyChar = oDemandData[sParameter];
				sUri = sUri + oKeyChar;
				if (sAdditionInfo.substring(0, 5) !== "https") {
					sUri = sServicePath + sUri;
				}
				this.navigateToApps(sUri);
			} else {
				//Logic for Navigation in Fiori Launchpad
				if (sLaunchMode === Constants.LAUNCH_MODE.FIORI) {
					sAdditionInfo = oAppInfo.Value1 || "";
					sSemanticObject = sAdditionInfo.split("\\\\_\\\\")[0];
					sAction = sAdditionInfo.split("\\\\_\\\\")[1] || "Display";
					sParameter = sAdditionInfo.split("\\\\_\\\\")[2];
					sParamValue = oDemandData[oAppInfo.Value2];
					if (sSemanticObject && sAction) {
						this.navToApp(sSemanticObject, sAction, sParameter, sParamValue);
					}
				} else {
					//Logic for Navigating to BSP URL
					sAdditionInfo = oAppInfo.Value1;
					sParameter = oDemandData[oAppInfo.Value2];
					sUri = sAdditionInfo.replace("\\\\place_h1\\\\", sParameter);
					sUri = oAppInfo.ISABSOLUTE ? sUri : sServicePath + sUri;
					this.navigateToApps(sUri);
				}
			}
		},

		/*
		 Navigation Action Sheet button dynamic visibilty
			*/
		onNavLinkVisibilty: function (oView) {
			var sEnableField,
				oNavLinksData = oView.getModel("navLinks").getData();
			for (var n = 0; n < oNavLinksData.length; n++) {
				sEnableField = "ENABLE_ROUTE_" + oNavLinksData[n].ApplicationId;
				oNavLinksData[n].btnVisibility = false;
				if (this.selectedDemandData[sEnableField] === true) {
					oNavLinksData[n].btnVisibility = true;
				}
			}
			oView.getModel("navLinks").refresh(true);
		},
	});
});