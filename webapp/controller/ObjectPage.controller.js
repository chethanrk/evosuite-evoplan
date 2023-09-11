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
						sViewName = null,
						mParams = "";
					this.getOwnerComponent().oTemplatePropsProm.then(function () {
						//create Demand detail view
						if (sRouteName === "DemandDetail") {
							//Demand detail view
							sViewName = "com.evorait.evoplan.view.templates.DemandDetails#DemandDetailTabs";
							mParams = {
								Guid: window.decodeURIComponent(oArgs.guid),
								sDeepPath: "DemandToQualification,DemandToComponents,DemandToAssignment"
							};
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageDemands"));
							this._onRouteMatched(oEvent, sViewName, "DemandSet", mParams, this.callBackFn2);
						} else if (sRouteName === "CreateOrder") {
							//Create Order view
							sViewName = "com.evorait.evoplan.view.templates.CreateOrder#Create";
							mParams = {
								AssetGuid: window.decodeURIComponent(oArgs.asset),
								isNew: true
							};
							this.getModel("viewModel").setProperty("/CreateOrderAssetGuid", mParams.AssetGuid);
							this._onRouteMatched(oEvent, sViewName, "EvoPlanOrderSet", mParams);
						}
						// setting the bread crum value xtit.itemListTitle
						else if (sRouteName === "object") {
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageDemands"));
						} else if (sRouteName === "ganttDemandDetails") {
							sViewName = "com.evorait.evoplan.view.templates.DemandDetails#DemandDetailTabs";
							mParams = {
								Guid: window.decodeURIComponent(oArgs.guid),
								sDeepPath: "DemandToQualification,DemandToComponents,DemandToAssignment"
							};
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageGanttChart"));
							if (this.getModel("appView").getProperty("/pageTitle") === this.oResourceBundle.getText("xbut.pageNewGantt")) {
								this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageNewGantt"));
							}
							this._onRouteMatched(oEvent, sViewName, "DemandSet", mParams, this.callBackFn2);
						} else if (sRouteName === "assetDemandDetail") {
							sViewName = "com.evorait.evoplan.view.templates.DemandDetails#DemandDetailTabs";
							mParams = {
								Guid: window.decodeURIComponent(oArgs.guid),
								AssetId: window.decodeURIComponent(oArgs.asset),
								sDeepPath: "DemandToQualification,DemandToComponents,DemandToAssignment"
							};
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageAssetManager"));
							this._onRouteMatched(oEvent, sViewName, "DemandSet", mParams, this.callBackFn2);
						} else if (sRouteName === "splitDemandDetails" || sRouteName === "splitGanttDetails") {
							//Demand detail view
							sViewName = "com.evorait.evoplan.view.templates.DemandDetails#DemandDetailTabs";
							mParams = {
								Guid: window.decodeURIComponent(oArgs.guid),
								sDeepPath: "DemandToQualification,DemandToComponents,DemandToAssignment",
								bCallBackInChange:true //Refresh Detail Page when we open same demand for second time
							};
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageNewGanttChartSplit"));
							this._onRouteMatched(oEvent, sViewName, "DemandSet", mParams, this.callBackFn2s);
						} else if (sRouteName === "mapDemandDetails") {
							//Demand detail view
							sViewName = "com.evorait.evoplan.view.templates.DemandDetails#DemandDetailTabs";
							mParams = {
								Guid: window.decodeURIComponent(oArgs.guid),
								sDeepPath: "DemandToQualification,DemandToComponents,DemandToAssignment"
							};
							this.getModel("viewModel").setProperty("/detailPageBreadCrum", this.oResourceBundle.getText("xbut.pageMap"));
							this._onRouteMatched(oEvent, sViewName, "DemandSet", mParams, this.callBackFn2);
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
		_onRouteMatched: function (oEvent, sViewName, sEntitySet, mParams, callBackFn2) {
			this.oViewModel.setProperty("/busy", true);
			this.getModel().metadataLoaded().then(function () {
				var sPath = this.getEntityPath(sEntitySet, mParams);
				//get template and create views
				this.insertTemplateFragment(sPath, sViewName, "ObjectPageWrapper", this._afterBindSuccess.bind(this), mParams, callBackFn2);
			}.bind(this));
		},
		/**
		 *
		 * @private
		 */
		_afterBindSuccess: function () {
			this.oViewModel.setProperty("/busy", false);
		},
		/**
		 *  method to pass to achieve refresh of assignment Table in Demand Detail Page
		 */
		callBackFn2: function () {
			// for refreshing the Assignment Table
			// Do Not Remove
		}

	});
});