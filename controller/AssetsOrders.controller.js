sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function(Controller,formatter,History,JSONModel,Filter,FilterOperator) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.AssetsOrders", {
		formatter:formatter,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.AssetsOrders
		 */
		onInit: function() {
			// Model used to manipulate control states. The chosen values make sure,
				// detail page is busy indication immediately so there is no break in
				// between the busy indication for loading the view's meta data
				var iOriginalBusyDelay,
				oViewModel = this.getOwnerComponent().getModel("viewModel");

                this.getRouter().getRoute("assetManager").attachPatternMatched(this._onObjectMatched, this);
				
				// Store original busy indicator delay, so it can be restored later on
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
				this.getOwnerComponent().getModel().metadataLoaded().then(function () {
						// Restore original busy indicator delay for the object view
						oViewModel.setProperty("/delay", iOriginalBusyDelay);
					}
				);
		},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf com.evorait.evoplan.view.AssetsOrders
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf com.evorait.evoplan.view.AssetsOrders
		 */
			onAfterRendering: function() {
				
			},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf com.evorait.evoplan.view.AssetsOrders
		 */
		//	onExit: function() {
		//
		//	}
		
		/**
			 * Binds the view to the object path.
			 * @function
			 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
			 * @private
		*/
		_onObjectMatched : function (oEvent) {
			var oArguments =  oEvent.getParameter("arguments");
			var aAssets = oArguments.assets.split(","),
				oPlanCal = this.byId("PC1"),
				oBinding = oPlanCal.getBinding("rows");
			var aFilters = [];
			for(var i in aAssets){
				aFilters.push(new Filter("AssetGuid",FilterOperator.EQ,aAssets[i]));
			}
			this.getModel("viewModel").setProperty("/assetsFilter",aFilters);
			oBinding.filter(aFilters);
		},

			
			
		createOrder: function(oEvent) {
			var oRouter = this.getRouter();

			oRouter.navTo("orderCreate", {});
		},
		showDetails: function(oEvent) {
			var oRouter = this.getRouter();
			oRouter.navTo("assetDemandDetail", {
				guid: "0A51491BD5A01EE8A592953F93E5F246"
			});
		},
		/**
		 * close dialog
		 */
		onCloseDialog: function() {
			this._infoDialog.close();
		},
		createTimeAlloc: function() {
			// create popover
			if (!this._infoDialog) {
				this._infoDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.CreateTimeAllocation", this);
				this._infoDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
				this.getView().addDependent(this._infoDialog);
			}
			this._infoDialog.open();
		},
		/**
		 * on change of date range the filter on assets has to be changed
		 * 
		 * @since 2.1
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent change event
		*/
		onChangeDateRange:function(oEvent){
			var oFrom = oEvent.getParameter("from"),
				oTo = oEvent.getParameter("to"),
				oPlanCal = this.byId("PC1"),
				oBinding = oPlanCal.getBinding("rows"),
				aFilters = [];
				
			aFilters.push(new Filter("DateFrom",FilterOperator.GE,oFrom));
			aFilters.push(new Filter("DateTo",FilterOperator.GE,oTo));
			
			var oAssetFilter = new Filter({
                filters: aFilters,
                and: true
            });
            this.getModel("viewModel").setProperty("/assetsRangeFilter",oAssetFilter);
			oBinding.filter(oAssetFilter);	
			
		}
	});

});