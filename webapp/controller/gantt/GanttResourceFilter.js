sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Token",
	"sap/m/Tokenizer",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Filter, FilterOperator, Token, Tokenizer, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.gantt.GanttResourceFilter", {

		formatter: formatter,
		_oView: null,
		_oFilterBar: null,

		/**
		 * Sets the necessary value as global to this controller
		 * handle Opening of the popover
		 * @param oView
		 * @param Tree Table (To Apply filter)
		 */
		open: function (oView, oTreeTable) {
			this._oView = oView;
			this._treeTable = oTreeTable;
			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.gantt.fragments.GanttResourceFilter",
					controller: this
				}).then(function (oDialog) {
					this._oFilterBar = sap.ui.getCore().byId("ganttResourceTreeFilterBar");
					this._oVariantMangement = this._oFilterBar.getSmartVariant();
					this._oFilterBar.attachClear(function (oEvent) {
						this.onClear(oEvent);
					}.bind(this));
					oView.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this._component = this._oView.getController().getOwnerComponent();
					oDialog.addStyleClass(this._component.getContentDensityClass());
					this._viewModel = this._component.getModel("viewModel");
					this._oView.addDependent(oDialog);
					this.onOpen(oDialog, oView);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView);
			}
		},

		/**
		 * Sets the necessary value as global to this controller
		 * Open's the popover
		 * @param oView
		 */
		onOpen: function (oDialog, oView) {
			oDialog.open();
		},

		/**
		 * Clear the filter bar
		 * @returns {null}
		 */
		onClear: function (oEvent) {
			this._oFilterBar.getControlByKey("ResourceGroupGuid").setSelectedItems([]);
		},

		/**
		 * Applying fiter to Tree on any change
		 */
		onGanttResourceFilterChange: function (oEvent) {
			var oFilters = oEvent.getSource().getFilters();
			this._treeTable.getBinding("rows").filter(oFilters, "Application");
		},
		/**
		 * Close the Filter Bar
		 */
		onCloseGanttResourceFilter: function () {
			this._oDialog.close();
		},

	});

});