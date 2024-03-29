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
			var oCounterModel = this.getModel("messageCounter");
			//Error Tab Count Call
			this._onErrorCountCall(oCounterModel, [new Filter("SyncStatus", FilterOperator.EQ, "E")]);
			//InProcess Tab Count Call
			this._onInProcessCountCall(oCounterModel, [new Filter("SyncStatus", FilterOperator.EQ, "Q")]);
			//Success Tab Count Call
			this._onSuccessCountCall(oCounterModel, [new Filter("SyncStatus", FilterOperator.EQ, "S")]);
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
				oBinding = oDataTable.getBinding("rows"),
				mCounterModel = this.getModel("messageCounter");

			// oBinding.aApplicationFilters = [];
			if (!this._firstTime) {
				aFilters.push(new Filter("SyncStatus", FilterOperator.EQ, "E"));
				this._firstTime = true;
			} else {
				if (oBinding.aFilters.length === 0) {
					if (sSelectedKey === "error") {
						aFilters.push(new Filter("SyncStatus", FilterOperator.EQ, "E"));
						this._onErrorCountCall(mCounterModel, aFilters);
					} else if (sSelectedKey === "success") {
						aFilters.push(new Filter("SyncStatus", FilterOperator.EQ, "S"));
						this._onSuccessCountCall(mCounterModel, aFilters);
					} else {
						aFilters.push(new Filter("SyncStatus", FilterOperator.EQ, "Q"));
						this._onInProcessCountCall(mCounterModel, aFilters);
					}
				} else {
					if (sSelectedKey === "error") {
						this._onErrorCountCall(mCounterModel, aFilters);
					} else if (sSelectedKey === "success") {
						this._onSuccessCountCall(mCounterModel, aFilters);
					} else {
						this._onInProcessCountCall(mCounterModel, aFilters);
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
		},
		/** 
		*Function for Success Tab Count Call
		*@param mCounterModel
		*@param [aFilters]
		*/
		_onSuccessCountCall: function (mCounterModel, aFilters) {
			this.oComponent.readData("/MessageSet/$count", aFilters, {}, "SuccessSyncStatus")
				.then(function (data) {
					mCounterModel.setProperty("/S", parseInt(data));
				});
		},
		/** 
		*Function for InProcess Tab Count Call
		*@param mCounterModel
		*@param [aFilters]
		*/
		_onInProcessCountCall: function (mCounterModel, aFilters) {
			this.oComponent.readData("/MessageSet/$count", aFilters, {}, "InProcessSyncStatus")
				.then(function (data) {
					mCounterModel.setProperty("/I", parseInt(data));
				});
		},
		/** 
		*Function for Error Tab Count Call
		*@param mCounterModel
		*@param [aFilters]
		*/
		_onErrorCountCall: function (mCounterModel, aFilters) {
			this.oComponent.readData("/MessageSet/$count", aFilters, {}, "ErrorSyncStatus")
				.then(function (data) {
					mCounterModel.setProperty("/E", parseInt(data));
				});
		},
	});

});