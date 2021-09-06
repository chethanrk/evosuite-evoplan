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
		_oDialog: null,
		/**
		 * Initialising the Gantt Resource Filter Dialog
		 * @param Tree Table (To Apply filter)
		 */
		init: function (oView, oTreeTable) {
			this._oView = oView;
			this._treeTable = oTreeTable;
			// create dialog lazily
			Fragment.load({
				name: "com.evorait.evoplan.view.gantt.fragments.GanttResourceFilter",
				id:	this._oView.getId(),
				controller: this
			}).then(function (oDialog) {
				this._oFilterBar = sap.ui.getCore().byId("ganttResourceTreeFilterBar");
				this._oVariantMangement = this._oFilterBar.getSmartVariant();
				this._oFilterBar.attachClear(function (oEvent) {
					this.onClear(oEvent);
				}.bind(this));
				this._oDialog = oDialog;
				this._component = this._oView.getController().getOwnerComponent();
				oDialog.addStyleClass(this._component.getContentDensityClass());
				this._viewModel = this._component.getModel("viewModel");
				this._oView.addDependent(oDialog);
			}.bind(this));
		},

		/**
		 * Sets the necessary value as global to this controller
		 * handle Opening of the popover
		 * @param oView
		 * @param Tree Table (To Apply filter)
		 */
		open: function (oView, oTreeTable) {
			this.onOpen(this._oDialog, oView);
		},
		/**
		 * On Initialization of Gantt Filter
		 */
		onGanttFilterInitialized: function (oEvent) {
			this.onGanttResourceFilterChange();
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
			var oFilters = this._oFilterBar.getFilters(),
				sDateFrom = this.formatter.date(this._oView.byId("idDateRangeGantt2").getDateValue()),
				sDateTo = this.formatter.date(this._oView.byId("idDateRangeGantt2").getSecondDateValue()),
				aDateFilters = [
					new Filter("StartDate", FilterOperator.LE, sDateTo),
					new Filter("EndDate", FilterOperator.GE, sDateFrom)
				],
				sFilterCount = 0;
				if (oFilters && oFilters.length) {
					sFilterCount = oFilters[0].aFilters.length;
				}
			oFilters = oFilters.concat(aDateFilters);
			this._treeTable.getBinding("rows").filter(oFilters, "Application");
			this.setFilterCount(sFilterCount);
		},

		/**
		 * Close the Filter Bar
		 */
		onCloseGanttResourceFilter: function () {
			this._oDialog.close();
		},
		/**
		 * Setting the Total count on filter button
		 */
		setFilterCount: function (sFilterCount) {
			var oResourceBundle = this._oView.getModel("i18n").getResourceBundle(),
				sFilterText = oResourceBundle.getText("xbut.filters");
			if (sFilterCount > 0) {
				this._oView.byId("idBtnGanttResourceFilter").setText(sFilterText + "(" + sFilterCount + ")");
			} else {
				this._oView.byId("idBtnGanttResourceFilter").setText(sFilterText);
			}
		},
			/**
		 * Destroying Duplicate ID's
		 */
		onAfterClose : function(){
				this._oDialog.destroy();
		}

	});

});