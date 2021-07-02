sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (Controller, formatter, History, Filter, FilterOperator) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.assets.Assets", {

		formatter: formatter,

		_selectedAssets: [],
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.Assets
		 */
		onInit: function () {
			var oAssetTree = this.byId("idAssetTree");
			this._configureDataTable(oAssetTree);
			// this._initCustomVariant();
			var iOriginalBusyDelay,
				oViewModel = this.getOwnerComponent().getModel("viewModel");
			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("BaseController", "refreshAssets",this._triggerRefreshAssets, this);
			this.getRouter().getRoute("assetManager").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
				// Restore original busy indicator delay for the object view
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});
		},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf com.evorait.evoplan.view.Assets
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf com.evorait.evoplan.view.Assets
		 */
		onAfterRendering: function () {
			// var oDataTable = this.byId("idAssetTree");
			// oDataTable.setVisibleRowCountMode(sap.ui.table.VisibleRowCountMode.Auto);
		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf com.evorait.evoplan.view.Assets
		 */
			onExit: function() {
				this._eventBus.unsubscribe("BaseController", "refreshAssets",this._triggerRefreshAssets, this);
			},
		/**
		 * The Method gets call when the pattern matched for registered route.
		 * Clears selected if any selected row persisted of table
		 *
		 * @Author Rahul
		 * @since 2.1
		 * @param oEvent
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var oDataTable = this.byId("idAssetTree"),
				oArguments = oEvent.getParameter("arguments"),
				aAssets = oArguments.assets.split(",");

			if (aAssets[0] === "NA") {
				oDataTable.clearSelection();
			}

		},
		/**
		 * Configure the tree table with basic configuration
		 * 
		 * @Author Rahul
		 * @since 2.1
		 * @param {oAssetTree : TreeTable} 
		 */
		_configureDataTable: function (oAssetTree) {
			oAssetTree.setEnableBusyIndicator(true);
			oAssetTree.setColumnHeaderVisible(false);
			oAssetTree.setEnableCellFilter(false);
			oAssetTree.setEnableColumnReordering(false);
			oAssetTree.setEditable(false);
			oAssetTree.setVisibleRowCountMode(sap.ui.table.VisibleRowCountMode.Auto);
		},
		/**
		 * Clears selected entries
		 * 
		 * @Author Rahul
		 * @since 2.1
		 * */
		onClearSelection: function () {
			var oAssetTree = this.byId("idAssetTree"),
				oBindings = oAssetTree.getBinding("rows"),
				oModel = oBindings.getModel(),
				oRouter = this.getRouter();

			oModel.resetChanges();
			this._selectedAssets = [];
			this.checkButtons();

			oRouter.navTo("assetManager", {
				assets: "NA"
			});

		},
		/**
		 * Navigates the Asset orders view with selected demands
		 * 
		 * @Author Rahul
		 * @since 2.1
		 * 
		 */
		onShowDemands: function (oEvent) {
			this.getRouter().navTo("assetManager", {
				assets: this._selectedAssets.join(",")
			});
		},
		/**
		 * filters the asset which contains the searched string in it
		 * 
		 * @Author Rahul
		 * @since 2.1
		 * 
		 */
		onSearchAsset: function () {
			var sValue = this.byId("searchFieldAsset").getValue(),
				oAssetTree = this.byId("idAssetTree"),
				aAllFilters = [],
				oBinding = oAssetTree.getBinding();
			if(sValue !== ""){
				aAllFilters.push(new Filter("Description", FilterOperator.Contains, sValue));
				oBinding.filter(aAllFilters, "Application");
			}else{
				oBinding.filter(aAllFilters, "Application");
			}
		},
		/**
		 * On Select of any asset that asset is added to global array of controller
		 * 
		 * @Author Rahul
		 * @since 2.1
		 * 
		 */
		onChangeAsset: function (oEvent) {
			var oSource = oEvent.getSource(),
				parent = oSource.getParent(),
				sPath = parent.getBindingContext().getPath(),
				oParams = oEvent.getParameters();

			//Sets the property IsSelected manually 
			this.getModel().setProperty(sPath + "/IsSelected", oParams.selected);

			if (oParams.selected) {
				this._selectedAssets.push(this.getModel().getProperty(sPath + "/NodeId"));

			} else if (this._selectedAssets.indexOf(this.getModel().getProperty(sPath + "/NodeId")) >= 0) {
				//removing the path from this._selectedAssets when user unselect the checkbox
				this._selectedAssets.splice(this._selectedAssets.indexOf(this.getModel().getProperty(sPath + "/NodeId")), 1);
			}
			// To enable or desable the footer buttons
			this.checkButtons();
		},
		/**
		 * When any row is selected on tree table then navigating to assetManager
		 * with nodeId which is AssetId
		 *
		 * @Author Rahul
		 * @since 2.1
		 * @param oEvent
		 */
		onSelectionChange: function (oEvent) {
			var oContext = oEvent.getParameter("rowContext"),
				oModel, sPath, oData;

			if (oContext) {
				oModel = oContext.getModel();
				sPath = oContext.getPath();
				oData = oModel.getProperty(sPath);
				this.getRouter().navTo("assetManager", {
					assets: oData.NodeId
				});
			}

		},
		/**
		 * Enable or disable footer buttons on selection of rows in tree table
		 */
		checkButtons: function () {
			if (this._selectedAssets.length > 0) {
				this.byId("idButtonShoWD").setEnabled(true);
				this.byId("idClr").setEnabled(true);
			} else {
				this.byId("idButtonShoWD").setEnabled(false);
				this.byId("idClr").setEnabled(false);
			}
		},
		/**
		 * Navigating to asset planning view with route parameter "Children"
		 * @param oEvent
		 */
		onShowWithChildren: function (oEvent) {
			var oSource = oEvent.getSource(),
				oParent = oSource.getParent(),
				sPath = oParent.getBindingContext().getPath(),
				oData = this.getModel().getProperty(sPath);

			this.getRouter().navTo("assetManager", {
				assets: oData.NodeId,
				withChildren: "Children"
			});
		},

		/**
		 * Init custom smart variant management and add filter controls to it
		 * @private
		 */
		_initCustomVariant: function () {
			var oVariant = this.byId("customAssetVariant");
			this._setVariant(oVariant);
		},
		/**
		 * set depend variant
		 * @param oVariant
		 */
		_setVariant: function (oVariant) {
			this._oVariant = oVariant;
			this._updateFiltersDependencies(true);
		},
		/**
		 * set filter to variant which should be tracked
		 * @private
		 */
		_updateFiltersDependencies: function (force) {
			var oSearchField = this.byId("searchFieldAsset");
			if (force) {
				this._oVariant.addFilter(oSearchField);
			}
		},
		/**
		 * Trigger on select variant. Refreshing the asset tree with selected variant.
		 */
		onSelectVariant: function () {
			this.onSearchAsset();
		},
		/**
		 * Setting default variant flag on initializing the custom varuant.
		 * @param oEvent
		 */
		onInitialiseVariant: function (oEvent) {
			var oParameters = oEvent.getParameters();
			if (oParameters.defaultContent && !oParameters.isStandard) {
				this.hasCustomDefaultVariant = true;
			}
		},
		/**
		 * refreshes the assets tree 
		 */
		_triggerRefreshAssets : function(oEvent){
			var oAssetTree = this.byId("idAssetTree");
			oAssetTree.getBinding("rows").refresh();
		}

	});

});