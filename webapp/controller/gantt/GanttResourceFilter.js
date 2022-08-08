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
		_resourceMaster: null,
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
				id: this._oView.getId(),
				controller: this
			}).then(function (oDialog) {
				this._oFilterBar = this._oView.byId("ganttResourceTreeFilterBar");
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
		 * event fired when the FilterBar is initialized to indicate that metadata are available
		 * during navigation from Map to Ganntt for showing assignments of a resource
		 * apply the navigation filters
		 */
		onBeforeInitialise: function () {
			this.applyNavigationFilters();
		},
		/**
		 * when navigating from Maps to Gantt
		 * onShowAssignments button click from the Resource Pin popover
		 * apply the selected resource filter in the gantt view
		 */
		applyNavigationFilters: function () {
			if (this._oFilterBar) { // check if the filterbar is already initialised
				var aNavigationFilters = this._viewModel.getProperty("/ganttResourceFiltersFromPin");
				if (aNavigationFilters.length > 0) {
					var oFilter = aNavigationFilters[0];
					this._oFilterBar.setFilterData(oFilter);
				}
			}
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
			this._oDialog.open();
		},

		/**
		 * Clear the filter bar
		 * @returns {null}
		 */
		onClear: function (oEvent) {
			// this._oFilterBar.getControlByKey("ResourceGroupGuid").setSelectedItems([]);
		},

		/**
		 * Applying fiter to Tree on any change
		 */
		onGanttResourceFilterChange: function (oEvent) {
			var oFilters = this._oFilterBar.getFilters(),
				sFilterCount = 0,
				aResGroups = [],
				aResources = [],
				aAllResources = [],
				aFilters = [],
				oFilter,
				oFinalFilter;
			if (oFilters.length > 0 && oFilters[0].aFilters.length) {
				var aAppliedFilters = oFilters[0].aFilters;
				for (var k in aAppliedFilters) {
					aAllResources.push(aAppliedFilters[k].oValue1);
				}
			}

			this._getResources().then(function (data) {
				for (var j in aAllResources) {
					for (var i in data.results) {
						if (aAllResources[j] === data.results[i].Description && data.results[i].ObjectType === "RES_GROUP") {
							aResGroups.push(data.results[i].ResourceGroupGuid);
						} else if (aAllResources[j] === data.results[i].Description) {
							aResources.push(data.results[i].ObjectId);
						}
					}
				}
				if (aResGroups.length > 0) {
					for (var m in aResGroups) {
						aFilters.push(new Filter("ResourceGroupGuid", FilterOperator.EQ, aResGroups[m]));
					}
					oFilter = new Filter(aFilters, false);
					sFilterCount = aFilters.length;
				}
				if (aResources.length > 0) {
					for (var n in aResources) {
						aFilters.push(new Filter("NodeId", FilterOperator.EQ, aResources[n]));
						aFilters.push(new Filter("ObjectId", FilterOperator.EQ, aResources[n]));
					}
					oFilter = new Filter(aFilters, false);
					sFilterCount = aFilters.length / 2;
				}
				oFinalFilter = oFilter ? [oFilter] : [];
				this._treeTable.getBinding("rows").filter(oFinalFilter, "Application");
				this.setFilterCount(sFilterCount);
			}.bind(this));

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
		 * Get All the resources
		 * */
		_getResources: function () {
			return new Promise(function (resolve, reject) {
				if (!this._resourceMaster) {
					this._component.readData("/ResourceSet").then(function (data) {
						this._resourceMaster = data;
						resolve(this._resourceMaster);
					}.bind(this));
				} else {
					resolve(this._resourceMaster);
				}
			}.bind(this));

		}

	});

});