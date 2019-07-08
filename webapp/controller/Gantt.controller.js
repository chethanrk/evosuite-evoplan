sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter"
], function (AssignmentsController, JSONModel, formatter) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.Gantt", {

		formatter: formatter,


		/**
		 * controller life cycle on init event
		 */
		onInit: function () {
			this.getRouter().getRoute("gantt").attachPatternMatched(this._onObjectMatched, this);
		},

		onExit: function () {

		},


		/**
		 * ################### Events #########################
		 */




		/**
		 * ################### Internal functions ###################
		 */

		_onObjectMatched: function () {
			this.getModel("viewModel").setProperty("/ganttSettings/active", true);
		}


	});

});