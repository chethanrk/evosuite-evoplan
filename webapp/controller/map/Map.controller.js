sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentActionsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/evorait/evoplan/controller/map/MapConfig",
	"sap/ui/core/Fragment",
	"sap/m/Dialog"
], function (AssignmentActionsController, JSONModel, formatter, Filter, FilterOperator, MapConfig, Fragment,Dialog) {
	"use strict";

	return AssignmentActionsController.extend("com.evorait.evoplan.controller.map.Map", {

		onInit: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oMapModel = this.getModel("mapConfig");
			oGeoMap.setMapConfiguration(MapConfig.getMapConfiguration(oMapModel));
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("BaseController", "refreshMapView", this._refreshMapView, this);
			var onClickNavigation = this._onActionPress.bind(this);
			var openActionSheet = this.openActionSheet.bind(this);
			this._oDraggableTable = this.byId("draggableList");
			this._oDataTable = this._oDraggableTable.getTable();
			this._setRowActionTemplate(this._oDataTable, onClickNavigation, openActionSheet);
			this.getModel("appView").setProperty("/isMapView", true);
			this._mParameters = {
				bFromMap: true
			};
		},
		onAfterRendering: function () {
			var oToolbar = this.getView().byId("idMapContainer").getAggregation("toolbar");
			var oSettingButton = oToolbar.getContent()[2];
			oSettingButton.setIcon("sap-icon://filter");
			oSettingButton.setTooltip("Filters");
			this.getView().byId("listReportFilter").setFilterBarExpanded(false);
		},
		/**
		 * 
		 * On click on demand actions to navigate to demand detail page 
		 */
		_onActionPress: function (oEvent) {
			var oRouter = this.getRouter();
			var oRow = oEvent.getParameter("row");
			var oContext = oRow.getBindingContext();
			var sPath = oContext.getPath();
			var oModel = oContext.getModel();
			var oData = oModel.getProperty(sPath);
			oRouter.navTo("mapDemandDetails", {
				guid: oData.Guid
			});
		},
		/**
		 *  opens the action sheet
		 */
		openActionSheet: function (oEvent) {
			var oContext = oEvent.getSource().getParent().getParent().getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath();
			if (!this._oNavActionSheet) {
				this._oNavActionSheet = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.NavigationActionSheet", this);
				this.getView().addDependent(this._oNavActionSheet);
			}
			this.selectedDemandData = oModel.getProperty(sPath);

			this._oNavActionSheet.openBy(oEvent.getSource().getParent());
		},
		onDrop: function (oEvent) {
			console.log(oEvent);
		},
		_refreshMapView: function (oEvent) {
			// Code to refresh Map Demand Table
			if (this._bLoaded) {
				this._oDraggableTable.rebindTable();
			}
			this._bLoaded = true;
			var oGeoMap = this.getView().byId("idGeoMap");
		},
		/**
		 * To Open SmartFilter dialoge for Map View 
		 * 
		 */
		onClickMapDemandFilter: function (oEvent) {
			if (!this.oFilterDialog) {
				this.oFilterDialog = new Dialog({
					title: "Demand Filter",
					draggable: true,
					content: this.getView().byId("listReportFilter"),
					// beginButton: new Button({
					// 	type: ButtonType.Emphasized,
					// 	text: "OK",
					// 	press: function () {
					// 		this.oDefaultDialog.close();
					// 	}.bind(this)
					// }),
					endButton: new sap.m.Button({
						text: "Close",
						press: function () {
							this.oFilterDialog.close();
						}.bind(this)
					}),
					afterClose: function () {
						this.getView().byId("idMapDynamicPage").getHeader().addContent(this.oFilterDialog.getContent()[0]);
					}.bind(this)
				});
				// to get access to the controller's model
				this.getView().addDependent(this.oFilterDialog);
			}
			if (this.oFilterDialog.getContent().length < 1) {
				this.oFilterDialog.addContent(this.getView().byId("listReportFilter"));
			}
			this.oFilterDialog.open();
		},
		/**
		 * open change status dialog
		 * @param oEvent
		 */
		onChangeStatusButtonPress: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);

			if (this._aSelectedRowsIdx.length > 0) {
				// TODO comment
				localStorage.setItem("Evo-Action-page", "splitDemands");
				this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedPaths.aPathsData, this._mParameters);
			} else {
				var msg = this.getResourceBundle().getText("ymsg.selectMinItem");
				sap.m.MessageToast.show(msg);
			}
		},
		/**
		 * enable/disable buttons on footer when there is some/no selected rows
		 * @since 3.0
		 */
		onRowSelectionChange: function () {
			var selected = this._oDataTable.getSelectedIndices();
			if (selected.length > 0) {
				this.byId("assignButton").setEnabled(true);
				this.byId("changeStatusButton").setEnabled(true);
			} else {
				this.byId("assignButton").setEnabled(false);
				this.byId("changeStatusButton").setEnabled(false);
			}
		},
		/**
		 *  on click of navigation items opens the respective application
		 */
		onClickNavAction: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext("navLinks"),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oData = oModel.getProperty(sPath);

			this.openEvoOrder(this.selectedDemandData.ORDERID, oData);
		},
		/**
		 * on press assign button in footer
		 * show modal with user for select
		 * @param oEvent
		 */
		onAssignButtonPress: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			if (this._aSelectedRowsIdx.length > 100) {
				this._aSelectedRowsIdx.length = 100;
			}
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, true);

			if (oSelectedPaths.aPathsData.length > 0) {
				// TODO comment
				localStorage.setItem("Evo-Action-page", "splitDemands");
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedPaths.aPathsData, false, this._mParameters);
			}
			if (oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
			}
		},
		/**
		 *	Navigates to evoOrder detail page with static url. 
		 */
		OnClickOrderId: function (oEvent) {
			var sOrderId = oEvent.getSource().getText();
			this.openEvoOrder(sOrderId);
		},
		/**
		 *	Get Filters from smartfilter dialog to apply on Map. 
		 */
		onDemandFilterChange: function (oEvent) {
			if (this.getView().getControllerName().split(".").pop() === "Map") {
				var oFilter = oEvent.getSource();
				var aSelectedFilters = oFilter.getAllFiltersWithValues();
				var aFilter = [];
				for (var vProperty in aSelectedFilters) {
					var aTokens = aSelectedFilters[vProperty].getControl().getTokens();
					// var oControl = 
					// for (var vTokenProperty in aTokens) {
					// 	// alert(aTokens[vTokenProperty].getText());
					// 	aFilter.push(new Filter(aSelectedFilters[vProperty].getName(), FilterOperator.EQ, aTokens[vTokenProperty].getText()));
					// }
				}
			}
		},

		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshMapView", this._refreshMapView, this);
		}

	});

});