sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/table/Table",
	"sap/ui/table/Row",
	"sap/m/MessageToast",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem",
	"sap/ui/core/Fragment"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Table, Row, MessageToast,
	RowAction, RowActionItem, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.prt.Tools", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the controller is instantiated.
		 * @public
		 */
		onInit: function () {
			this._eventBus = sap.ui.getCore().getEventBus();
		},

		/* =========================================================== */
		/* Public methods                                              */
		/* =========================================================== */

		/**
		 * trigger event for open select assign tree table dialog
		 * @param oEvent
		 */
		onPressReAssign: function (oEvent) {
			this._eventBus.publish("AssignInfoDialog", "selectAssign", {
				oView: this.oView,
				isToolReAssign: true,
				aSelectedPaths: ["/AssignmentSet('" + this.oView.getModel('assignment').getProperty('/Guid') + "')"]
			});
		},
		
		/*
		*Function is triggered when we change ToolInfoAsgn Dialog Date Fields
		*For validating invalid date formats
		*/
		onAssignmentDateChange: function (oEvent) {
			var oSource = oEvent.getSource(),
				bValidFormat = oEvent.getParameter("valid"),
				oViewModel = this.oView.getModel("viewModel");
			this.onValidateDateFormat(oSource, bValidFormat, oViewModel);
		},
	});
});