sap.ui.define([
	"com/evorait/evoplan/controller/TemplateRenderController"
], function (TemplateRenderController) {
	"use strict";

	return TemplateRenderController.extend("com.evorait.evoplan.controller.ObjectPage", {

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Object page on init
		 */
		onInit: function () {
			this.oViewModel = this.getModel("viewModel");
			this.oRouter = this.getRouter();
			this.oResourceBundle = this.getResourceBundle();
			this.onRouteMapping();

		},

		onRouteMapping: function () {
			if (!this.oViewModel.getProperty("/bObjectPageRouteMatchAttached")) {
				this.oRouter.attachRouteMatched(function (oEvent) {
					this.oViewModel.setProperty("/bObjectPageRouteMatchAttached", true);

					var sRouteName = oEvent.getParameter("name"),
						oArgs = oEvent.getParameter("arguments"),
						sViewName = null;

					this.getOwnerComponent().oTemplatePropsProm.then(function () {
						//create Order view
						if (sRouteName === "DemandDetail") {
							//Order detail view
							sViewName = "com.evorait.evoplan.view.templates.DemandDetails#DemandDetailTabs";
							var mParams = {
								Guid: window.decodeURIComponent(oArgs.guid)
							};
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageDemands"));
							this._onRouteMatched(oEvent, sViewName, "DemandSet", mParams);
						}
						// setting the bread crum value xtit.itemListTitle
						if (sRouteName === "object") {
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageDemands"));
						} else if (sRouteName === "ganttDemandDetails") {
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageGanttChart"));
						} else if (sRouteName === "splitDemandDetails" || sRouteName === "splitGanttDetails") {
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageGanttChartSplit"));
						} else if (sRouteName === "mapDemandDetails") {
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageMap"));
						} else {
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageAssetManager"));
						}
					}.bind(this));
				}.bind(this));
			}
		},
		
		/**
		 * Object after rendering
		 */
		onAfterRendering: function () {
			this.getModel("viewModel").setProperty("/busy", false);
		},

		onExit: function () {
			TemplateRenderController.prototype.onExit.apply(this, arguments);
		},

		/**
		 * Demand deatils
		 * @param oEvent
		 * @private
		 */
		_onRouteMatched: function (oEvent, sViewName, sEntitySet, mParams) {
			this.oViewModel.setProperty("/busy", true);
			this.getModel().metadataLoaded().then(function () {
				var sPath = this.getEntityPath(sEntitySet, mParams);
				//get template and create views
				this.insertTemplateFragment(sPath, sViewName, "ObjectPageWrapper", this._afterBindSuccess.bind(this));
			}.bind(this));
		},
		/**
		 *
		 * @private
		 */
		_afterBindSuccess: function () {
			this.oViewModel.setProperty("/busy", false);
		}

	});
});