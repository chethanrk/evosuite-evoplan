sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, formatter, RowAction, RowActionItem, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.messageCockpit.MessageCockpit", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.MessageCockpit
		 */
		onInit: function () {
			this.getRouter().getRoute("messageCockpit").attachPatternMatched(this._refreshCounts, this);
			var oDataTable = this.getView().byId("idProcessTable").getTable();
			oDataTable.setVisibleRowCountMode("Auto");
			this.oComponent = this.getOwnerComponent();
			this._oMessagePopover = this.oComponent._oMessagePopover;
			var oTemplate = oDataTable.getRowActionTemplate();
			if (oTemplate) {
				oTemplate.destroy();
				oTemplate = null;
			}
			oTemplate = new RowAction({
				items: [
					new RowActionItem({
						icon: "sap-icon://detail-view",
						press: this.onClickDetail.bind(this)
					})
				]
			});
			oDataTable.setRowActionTemplate(oTemplate);
			oDataTable.setRowActionCount(1);
		},
		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf com.evorait.evoplan.view.MessageCockpit
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf com.evorait.evoplan.view.MessageCockpit
		 */
		// onAfterRendering: function() {
		// 	var oIconBar = this.getView().byId("idIconTabBar");

		// 	oIconBar.fireSelect({key:"error"});
		// },

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf com.evorait.evoplan.view.MessageCockpit
		 */
		//	onExit: function() {
		//
		//	}

		/** 
		 * Fire the read request to fetch the count of error, success and inprocess messages
		 * @constructor 
		 */
		/**
		 * open's the message popover by it source
		 * @param oEvent
		 */
		onMessagePopoverPress: function (oEvent) {
			this._oMessagePopover.openBy(oEvent.getSource());
		},
		_refreshCounts: function (oEvent) {
			var aFilters = [],
				sRequestUri,
				oModel = this.getModel(),
				oCounterModel = this.getModel("messageCounter");

			aFilters.push(new Filter("SyncStatus", FilterOperator.EQ, "E"));
			aFilters.push(new Filter("SyncStatus", FilterOperator.EQ, "S"));
			aFilters.push(new Filter("SyncStatus", FilterOperator.EQ, "Q"));

			oModel.setUseBatch(false);
			// aPromises.push(this.oComponent.readData("/MessageSet/$count", [aFilters[0]], undefined));
			// aPromises.push(this.oComponent.readData("/MessageSet/$count", [aFilters[1]], undefined));
			// aPromises.push(this.oComponent.readData("/MessageSet/$count", [aFilters[2]], undefined));
			// Promise.all(aPromises).then(function(data) {
			// 	debugger
			// 	oModel.setUseBatch(true);	
			// });

			var callBackFn = function (oResponse) {
				sRequestUri = oResponse.requestUri.split('eq')[1];
				if (_.includes(sRequestUri, 'S')) {
					oCounterModel.setProperty("/S", parseInt(oResponse.data));
				} else if (_.includes(sRequestUri, 'E')) {
					oCounterModel.setProperty("/E", parseInt(oResponse.data));
				} else if (_.includes(sRequestUri, 'Q')) {
					oCounterModel.setProperty("/I", parseInt(oResponse.data));
				}
			};

			aFilters.forEach(function (item) {
				// this._onFilterCount(item);
				this.oComponent.readData("/MessageSet/$count", [item], undefined, callBackFn);
			}.bind(this));

		},

		/** 
		 * Get the cout of error, success and inprocess messages
		 * @param oFilter - one by one filter is passed to this function
		 */
		_onFilterCount: function (oFilter) {
			var oCounterModel = this.getModel("messageCounter"),
				oModel = this.getModel(),
				sRequestUri;

			oModel.setUseBatch(false);

			this.oComponent.readData("/MessageSet/$count", )

			oModel.read("/MessageSet/$count", {
				filters: [
					oFilter
				],
				success: function (oData, oResponse) {
					sRequestUri = oResponse.requestUri.split('eq')[1];
					if (_.includes(sRequestUri, 'S')) {
						oCounterModel.setProperty("/S", parseInt(oData));
					} else if (_.includes(sRequestUri, 'E')) {
						oCounterModel.setProperty("/E", parseInt(oData));
					} else if (_.includes(sRequestUri, 'Q')) {
						oCounterModel.setProperty("/I", parseInt(oData));
					}
					oModel.setUseBatch(true);
				}
			});
		},

		/** 
		 * On select of tab, filter the table by seleted key
		 * @param oEvent
		 * @param sKey
		 */
		onSelect: function (oEvent) {
			var oDataTable = this.getView().byId("idProcessTable").getTable(),
				oBinding = oDataTable.getBinding("rows"),
				sSelectedKey = oEvent.getParameter("selectedKey"),
				oSyncButton = this.getView().byId("idSyncButton");

			oBinding.aApplicationFilters = [];

			if (sSelectedKey === "error") {
				oBinding.filter(new Filter("SyncStatus", FilterOperator.EQ, "E"));
				oSyncButton.setVisible(true);
			} else if (sSelectedKey === "success") {
				oBinding.filter(new Filter("SyncStatus", FilterOperator.EQ, "S"));
				oSyncButton.setVisible(false);
			} else {
				oBinding.filter(new Filter("SyncStatus", FilterOperator.EQ, "Q"));
				oSyncButton.setVisible(true);
			}
			// Refresh message count
			this._refreshCounts();
		},
		/** 
		 * Initially filtered by the error messages
		 * @param oEvent
		 */
		onBeforeRebindTable: function (oEvent) {
			var aFilters = oEvent.getParameter("bindingParams").filters;
			var oIconTab = this.getView().byId("idIconTabBar"),
				sSelectedKey = oIconTab.getSelectedKey(),
				oDataTable = this.getView().byId("idProcessTable").getTable(),
				oBinding = oDataTable.getBinding("rows");

			// oBinding.aApplicationFilters = [];
			if (!this._firstTime) {
				aFilters.push(new Filter("SyncStatus", FilterOperator.EQ, "E"));
				this._firstTime = true;
			} else {
				if (oBinding.aFilters.length === 0) {
					if (sSelectedKey === "error") {
						aFilters.push(new Filter("SyncStatus", FilterOperator.EQ, "E"));
					} else if (sSelectedKey === "success") {
						aFilters.push(new Filter("SyncStatus", FilterOperator.EQ, "S"));
					} else {
						aFilters.push(new Filter("SyncStatus", FilterOperator.EQ, "Q"));
					}
				}
			}
		},

		/** 
		 * Shows the popover the contain table of messages
		 * @param oEvent
		 */
		onClickDetail: function (oEvent) {
			var oRow = oEvent.getParameter("row"),
				oContext = oRow.getBindingContext(),
				sPath = oContext.getPath(),
				oSource = oEvent.getSource();

			if (!this._oDialog) {
				// create dialog via fragment factory
				var sFragmentPath = "com.evorait.evoplan.view.messageCockpit.fragments.MessageInfos";
				this.loadFragment(sFragmentPath, this).then(function (oFragment) {
					this._oDialog = oFragment;
					this.getView().addDependent(this._oDialog);
					this._oDialog.bindElement(sPath);
					if (this._oDialog.getElementBinding()) {
						this._oDialog.getElementBinding().refresh();
					}
					this._oDialog.openBy(oSource.getParent());
				}.bind(this));
			} else {
				this._oDialog.bindElement(sPath);
				if (this._oDialog.getElementBinding()) {
					this._oDialog.getElementBinding().refresh();
				}
				this._oDialog.openBy(oSource.getParent());
			}
		},

		/** 
		 * Enables the reprocess button based the selected indices
		 * @param oEvent
		 */
		onRowSelectionChange: function (oEvent) {
			var aSelectedIndices = oEvent.getSource().getSelectedIndices(),
				oViewModel = this.getModel("viewModel");
			if (aSelectedIndices.length === 0) {
				oViewModel.setProperty("/enableReprocess", false);
			} else {
				oViewModel.setProperty("/enableReprocess", true);
			}
		},
		/** 
		 * Fetch the selected entry and call the function import to reprocess those items
		 * @param oEvent
		 */
		onClickReprocess: function (oEvent) {
			var oDataTable = this.getView().byId("idProcessTable").getTable(),
				aSelectedIndices = oDataTable.getSelectedIndices(),
				oModel = this.getModel(),
				oRowContext, oRowData, aPromises = [];

			for (var i in aSelectedIndices) {
				oRowContext = oDataTable.getContextByIndex(aSelectedIndices[i]);
				oRowData = oModel.getProperty(oRowContext.getPath());
				// returns the promise
				aPromises.push(this.executeFunctionImport(oModel, {
					SyncGuid: oRowData.SyncGuid
				}, "ReprocessFailedItems", "POST"));
			}
			Promise.all(aPromises).then(this._onReprocessed.bind(this));
		},

		/** 
		 * 
		 * @constructor 
		 * @param data The response data from the function import
		 * @param response response from the function import
		 */
		_onReprocessed: function (data, response) {
			var oIconTab = this.getView().byId("idIconTabBar"),
				oUserModel = this.getModel("user");
			if (data.length !== 0) {
				oUserModel.setProperty("/LastSyncTimestamp", data[0].LAST_SYNC_TIME);
			}
			this._refreshCounts();
			oIconTab.setSelectedKey("success");
			oIconTab.fireSelect({
				selectedKey: "success"
			});
		}

	});

});