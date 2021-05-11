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
		formatter: formatter,
		selectedDemands: [],
		_isDemandDraggable: false,
		onInit: function () {
			this.oEvoplanResourceTable = this.getView().byId("idTableEvoplanResources").getTable();
			this.oHrResourceTable = this.getView().byId("idTableHrResources");
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("ManageResourcesController", "refreshManageResourcesView", this._refreshManageResourcesView, this);
			this.getRouter().getRoute("manageResources").attachPatternMatched(function () {
				this._mParameters = {
					bFromManageResource: true
				};
			}.bind(this));
		},
		/**
		 * bind resource tree table only when filterbar was initalized
		 * @param oEvent
		 */
		onBeforeRebindTable: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oBinding = oParams.bindingParams,
				oUserModel = this.getModel("user");

			if (!this.isLoaded) {
				this.isLoaded = true;
			}
			// Bug fix for some time tree getting collapsed
			oBinding.parameters.numberOfExpandedLevels = 0; //oUserModel.getProperty("/RESOURCE_TREE_EXPAND") ? 1 : 0;

		},
		onAfterRendering: function () {
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
						icon: "sap-icon://edit",
						text: oResourceBundle.getText("xtol.editBtn"),
						press: this._onPressEditButton.bind(this)
					})
				]
			});
			oTemplate.addItem(new RowActionItem({
				icon: "sap-icon://delete",
				text: oResourceBundle.getText("xtol.deleteBtn"),
				press: this._onPressDeleteButton.bind(this),
				visible: {
					path: "NodeType",
					formatter: formatter.setVisibilityDeleteButton
				}
			}));
			this.oEvoplanResourceTable.setRowActionTemplate(oTemplate);
			this.oEvoplanResourceTable.setRowActionCount(oTemplate.getItems().length);
		},
		/**
		 * Dragging from Evoplan Resources Table
		 */
		onStartDragEvoplanGroups: function () {
			MessageToast.show("Drag Started from Evoplan Groups Table");
		},
		/**
		 * Dragging from Evoplan Resources Table
		 */
		onDropIntoEvoplanGroups: function () {
			MessageToast.show("Dropped Into Evoplan Groups Table");
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
			var oEvoplanTable = this.getView().byId("idTableEvoplanResources");
			var oHrResourcesTable = this.getView().byId("idTableHrResources");
			oEvoplanTable.rebindTable();
			oHrResourcesTable.rebindTable();
		},

		/**
		 * Handle Delete Resource on press of "Delete" Action button from Tree table.
		 */
		_onPressDeleteButton: function (oEvent) {
			this._showConfirmMessageBox(this.getResourceBundle().getText("ymsg.warningDeleteResource")).then(function (value) {
				if (value === "YES") {
					MessageToast.show("Proceed to Delete Resource");
				}
			}.bind(this));
		},
		/**
		 * Handle Edit Geoup/Resource on press of "Edit" Action button from Tree table.
		 */
		_onPressEditButton: function (oEvent) {
			var sNodeType = oEvent.getSource().getBindingContext().getProperty("NodeType");
			if (sNodeType === "RES_GROUP") {
				MessageToast.show("Rename Group");
			} else {
				MessageToast.show("Change Date Range for Resource");
			}
		},
		onExit: function () {
			this._oEventBus.unsubscribe("ManageResourcesController", "refreshManageResourcesView", this._refreshManageResourcesView, this);
		}
	});

});