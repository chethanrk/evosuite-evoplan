sap.ui.define([
	"com/evorait/evoplan/controller/common/NavigationActionSheet",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/evorait/evoplan/controller/map/MapConfig",
	"sap/ui/core/Fragment",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/MessageToast",
	"sap/ui/core/Popup",
	"sap/m/GroupHeaderListItem",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem",
], function (AssignmentActionsController, JSONModel, formatter, Filter, FilterOperator, MapConfig, Fragment, Dialog, Button, MessageToast,

	Popup, GroupHeaderListItem, RowAction, RowActionItem) {
	"use strict";

	return AssignmentActionsController.extend("com.evorait.evoplan.controller.manageResources.ManageResources", {
		selectedDemands: [],
		_isDemandDraggable: false,
		onInit: function () {
			this.oEvoplanResourceTable = this.getView().byId("idTableEvoplanResources");
			this.oHrResourceTable = this.getView().byId("idTableHrResources");
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("ManageResourcesController", "refreshManageResourcesView", this._refreshManageResourcesView, this);
			this.getRouter().getRoute("manageResources").attachPatternMatched(function () {
				this._mParameters = {
					bFromManageResource: true
				};
			}.bind(this));
		},

		onAfterRendering: function () {
			var oEvoplanResourceBinding = this.oEvoplanResourceTable.getBinding(),
				oHrResourceBinding = this.oHrResourceTable.getBinding();

			// enabling Busy indicator while fetchind data from tree
			oEvoplanResourceBinding.attachDataRequested(function () {
				this.oEvoplanResourceTable.setBusyIndicatorDelay(0);
				this.oEvoplanResourceTable.setBusy(true);
			}.bind(this));

			// desabling the Busy indicator while fetchind data from tree and setting the Row count on Table Title
			oEvoplanResourceBinding.attachDataReceived(function (oResponse) {
				this.oEvoplanResourceTable.setBusy(false);
				var sTitle = this.getResourceBundle().getText("xtit.EvoplanResourceTable"),
					nCount = this.oEvoplanResourceTable.getBinding() ? this.oEvoplanResourceTable.getBinding().getLength() : 0;
				sTitle = sTitle + " (" + nCount + ")";
				this.getView().byId("idTitleEvoplanResources").setText(sTitle);
			}.bind(this));

			// enabling Busy indicator while fetchind data from tree
			oHrResourceBinding.attachDataRequested(function () {
				this.oHrResourceTable.setBusyIndicatorDelay(0);
				this.oHrResourceTable.setBusy(true);
			}.bind(this));

			// desabling the Busy indicator while fetchind data from tree and setting the Row count on Table Title
			oHrResourceBinding.attachDataReceived(function (oResponse) {
				this.oHrResourceTable.setBusy(false);
				var sTitle = this.getResourceBundle().getText("xtit.HrResourceTable"),
					nCount = this.oHrResourceTable.getBinding() ? this.oHrResourceTable.getBinding().getLength() : 0;
				sTitle = sTitle + " (" + nCount + ")";
				this.getView().byId("idTitleHrResources").setText(sTitle);
			}.bind(this));
			this._setRowActionTemplate();
		},

		/**
		 * Setting row Action buttons for Deleting/Editing the row (Group/Resource)
		 */
		_setRowActionTemplate: function () {
			var oTemplate = this.oEvoplanResourceTable.getRowActionTemplate(),
				oResourceBundle = this.getModel("i18n").getResourceBundle();
			if (oTemplate) {
				oTemplate.destroy();
				oTemplate = null;
			}
			oTemplate = new RowAction({
				items: [
					new RowActionItem({
						icon: {
							path: "NodeType",
							formatter: formatter.setIconforResourceAction
						},
						tooltip: {
							path: "NodeType",
							formatter: formatter.setToolTipforResourceAction
						},
						press: this._onDeleteEditResource.bind(this)
					})
				]
			});
			this.oEvoplanResourceTable.setRowActionTemplate(oTemplate);
			this.oEvoplanResourceTable.setRowActionCount(oTemplate.getItems().length);
		},
		/**
		 * Dragging from Evoplan Resources Table
		 */
		onStartDragEvoplanResources: function () {
			MessageToast.show("Drag Started from Evoplan Resources Table");
		},
		/**
		 * Dragging from Evoplan Resources Table
		 */
		onDropIntoEvoplanResources: function () {
			MessageToast.show("Dropped Into Evoplan Resources Table");
		},
		/**
		 * Dragging from Evoplan Resources Table
		 */
		onStartDragHrResources: function () {
			MessageToast.show("Drag Started from HR Resources Table");
		},

		/**
		 * Refresh Manage Resource Page.
		 */
		_refreshManageResourcesView: function () {
			MessageToast.show("Refresh Page and Bindings");
		},

		/**
		 * Delete/Edit on press of Action buttons from Tree table.
		 */
		_onDeleteEditResource: function (oEvent) {
			var sNodeType = oEvent.getSource().getBindingContext().getProperty("NodeType");
			if (sNodeType === "RES_GROUP") {
				MessageToast.show("Rename Group");
			} else {
				// MessageToast.show("Delete Resource");
				this._handleDeleteResource();
			}
		},

		/**
		 * Handle Delete operation on press of Action buttons from Tree table.
		 */
		_handleDeleteResource: function () {
			this._showConfirmMessageBox(this.getResourceBundle().getText("ymsg.warningDeleteResource")).then(function (value) {
				if (value === "YES") {
					MessageToast.show("Proceed to Delete Resource");
				}
				// if (value === "NO") {
					// 	Reseet required changes
				// }
			}.bind(this));
		},
		onExit: function () {
			this._oEventBus.unsubscribe("ManageResourcesController", "refreshManageResourcesView", this._refreshManageResourcesView, this);
		}
	});

});