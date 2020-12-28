sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentActionsController",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment"
], function (BaseController, models, formatter, Filter, FilterOperator, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.NavigationActionSheet", {

		formatter: formatter,

		init: function () {
			// alert("Nav Action Initiated..");
		},

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
			var oContext = oEvent.getSource().getBindingContext("navLinks"),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oData = oModel.getProperty(sPath);

			this.openEvoOrder(this.selectedDemandData.ORDERID, oData, oEvent.getSource().getModel("viewModel"));
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