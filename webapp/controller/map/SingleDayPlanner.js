sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/base/Log",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/model/models",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (Controller, OverrideExecution, Log, Fragment, models, Filter, FilterOperator) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.map.SingleDayPlanner", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {
				open: {

				}
			}
		},

		oSinglePlanningModel: null,

		/**
		 * when new single planner is initialized then fragment of dialog are loaded
		 * create new json model for Single planning calendar
		 */
		constructor: function (oController) {
			this.oParentController = oController;
			this.oModel = oController.getView().getModel();
			this.oSinglePlanningModel = models.createHelperModel({});
			this.oSinglePlanningModel.setDefaultBindingMode("TwoWay");
			oController.getView().setModel(this.oSinglePlanningModel, "mapSinglePlanning");

			if (!this.oPlannerDialog) {
				Fragment.load({
					name: "com.evorait.evoplan.view.map.fragments.SingleDayPlanner",
					controller: this
				}).then(function (content) {
					this.oPlannerDialog = content;
					oController.getView().addDependent(this.oPlannerDialog);
				}.bind(this));
			}
		},

		/**
		 * open single planning calendar dialog
		 */
		open: function (sPath, oTreeData, sNodeType, oParentData) {
			this.oSinglePlanner = sap.ui.getCore().byId("idSinglePlanningCalendar");
			this.oSelectedData = oTreeData;
			this.sSelectedPath = sPath;
			//set view for this calendar base on NodeType
			this._setCalenderViews(sNodeType);
			this.oSinglePlanningModel.setProperty("/startDate", oTreeData.StartDate);
			this.oSinglePlanningModel.setProperty("/parentData", oParentData);

			if (oTreeData.ChildCount > 0) {
				//load assignments for this day, resource and resource group
				this._loadAssignmentsForDay(oTreeData.StartDate);
			}
			this.oPlannerDialog.open();
		},

		/**
		 * close single planning calendar dialog
		 * @param {object} oEvent - button close press in dialog toolbar
		 */
		onPressClose: function (oEvent) {
			//todo when there are some unsaved changes show warning when user wants close dialog
			this.oPlannerDialog.close();
		},

		/**
		 * @param {string} sType
		 */
		_setCalenderViews: function (sType) {
			if (sType === "TIMEDAY") {
				var oDayView = new sap.m.SinglePlanningCalendarDayView({
					title: "Day",
					key: sType
				});
				this.oSinglePlanner.addView(oDayView);
			}
		},

		/**
		 * Load assignments of a special resource and resource group for a special date
		 * @param {obejct} oDate - date for what day assignments should be loaded
		 */
		_loadAssignmentsForDay: function (oDate) {
			if (this.oParentController._getResourceFilters) {
				var oFilter = new Filter(this.oParentController._getResourceFilters([this.sSelectedPath], oDate), true);
				this.oParentController.getOwnerComponent()._getData("/AssignmentSet", [oFilter]).then(function (oResults) {
					this.oSinglePlanningModel.setProperty("/appointments", oResults.results);
				}.bind(this));
			}
		}
	});
});