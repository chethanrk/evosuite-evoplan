sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function(Controller,formatter,History,Filter,FilterOperator) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.Assets", {
		
		formatter : formatter,
		
		_selectedAssets:[],
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.Assets
		 */
			onInit: function() {
				var oAssetTree = this.byId("idAssetTree");
            	this._configureDataTable(oAssetTree);

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
			onAfterRendering: function() {
				var oDataTable = this.byId("idAssetTree");
				oDataTable.setVisibleRowCountMode(sap.ui.table.VisibleRowCountMode.Auto);
			},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf com.evorait.evoplan.view.Assets
		 */
		//	onExit: function() {
		//
		//	}

        _onObjectMatched : function (oEvent) {
            var oDataTable = this.byId("idAssetTree"),
				oArguments =  oEvent.getParameter("arguments"),
				aAssets = oArguments.assets.split(",");

            if(aAssets[0] === "NA"){
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
		_configureDataTable:function(oAssetTree){
			oAssetTree.setEnableBusyIndicator(true);
            oAssetTree.setColumnHeaderVisible(false);
            oAssetTree.setEnableCellFilter(false);
            oAssetTree.setEnableColumnReordering(false);
            oAssetTree.setEditable(false);
            oAssetTree.setVisibleRowCountMode(sap.ui.table.VisibleRowCountMode.Fixed);
		},
		/**
		 * Navigates to demand view
		 * @Author Rahul
		 * @since 2.1
		 * */
		navBack: function() {
			this.getRouter().navTo("demands", {}, true);
		},
		/**
		 * Clears selected entries
		 * 
		 * @Author Rahul
		 * @since 2.1
		 * */
		onClearSelection : function(){
			var oAssetTree = this.byId("idAssetTree"),
				oBindings = oAssetTree.getBinding("rows"),
				oModel = oBindings.getModel();
				
			oModel.resetChanges();
            this._selectedAssets =[];
            this.checkButtons();
				
		},
		/**
		 * Navigates the Asset orders view with selected demands
		 * 
		 * @Author Rahul
		 * @since 2.1
		 * 
		 */
		onShowDemands: function(oEvent){
			this.getRouter().navTo("assetManager", {
				assets:this._selectedAssets.join(",")
			});
		},
		/**
		 * filters the asset which contains the searched string in it
		 * 
		 * @Author Rahul
		 * @since 2.1
		 * 
		 */
		onSearchOfAsset: function(oEvent){
			var sValue = oEvent.getSource().getValue(),
				oAssetTree =  this.byId("idAssetTree"),
				aAllFilters =[],
				oBinding = oAssetTree.getBinding();	
				
			aAllFilters.push(new Filter("Description", FilterOperator.Contains,sValue));
			oBinding.filter(aAllFilters, "Application");
		},
		/**
		 * On Select of any asset that asset is added to global array of controller
		 * 
		 * @Author Rahul
		 * @since 2.1
		 * 
		 */
		onChangeAsset:function(oEvent){
			var oSource = oEvent.getSource(),
				parent = oSource.getParent(),
				sPath = parent.getBindingContext().getPath(),
				oParams = oEvent.getParameters();
			
			//Sets the property IsSelected manually 
			this.getModel().setProperty(sPath+"/IsSelected",oParams.selected);
			
			if (oParams.selected) {
				this._selectedAssets.push(this.getModel().getProperty(sPath+"/NodeId"));

			} else if (this._selectedAssets.indexOf(this.getModel().getProperty(sPath+"/NodeId")) >= 0) {
				//removing the path from this._selectedAssets when user unselect the checkbox
				this._selectedAssets.splice(this._selectedAssets.indexOf(this.getModel().getProperty(sPath+"/NodeId")), 1);
			}

            this.checkButtons();
		},
		
		onSelectionChange:function(oEvent){
			var oContext = oEvent.getParameter("rowContext"),
				oModel, sPath, oData;

			if(oContext){
                oModel = oContext.getModel();
                sPath = oContext.getPath();
                oData = oModel.getProperty(sPath);
                this.getRouter().navTo("assetManager", {
                    assets:oData.NodeId
                });
			}

		},

		checkButtons : function () {
            if (this._selectedAssets.length > 0) {
                this.byId("idButtonShoWD").setEnabled(true);
                this.byId("idClr").setEnabled(true);
            } else {
                this.byId("idButtonShoWD").setEnabled(false);
                this.byId("idClr").setEnabled(false);
            }
        },
        onShowWithChildren : function (oEvent) {
            // oEvent.cancelBubble();
            var oSource = oEvent.getSource(),
                oParent = oSource.getParent(),
                sPath = oParent.getBindingContext().getPath(),
				oData = this.getModel().getProperty(sPath);

            this.getRouter().navTo("assetManager", {
                assets:oData.NodeId,
                withChildren:"Children"
            });
        }

	});

});