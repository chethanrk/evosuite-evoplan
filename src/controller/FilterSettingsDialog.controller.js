sap.ui.define([
		"com/evorait/evoplan/controller/BaseController",
		"com/evorait/evoplan/model/formatter",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator"
	], function (BaseController, formatter, Filter, FilterOperator) {
		"use strict";

		return BaseController.extend("com.evorait.evoplan.controller.FilterSettingsDialog", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			/**
			 * Called when the worklist controller is instantiated.
			 * @public
			 */
			onInit : function () {
				var oViewModel;

			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */

			/**
			 * Triggered by the table's 'updateFinished' event: after new table
			 * data is available, this handler method updates the table counter.
			 * This should only happen if the update was successful, which is
			 * why this handler is attached to 'updateFinished' and not to the
			 * table's list binding's 'dataReceived' method.
			 * @param {sap.ui.base.Event} oEvent the update finished event
			 * @public
			 */

            /**
			 * after rendering of view
             * @param oEvent
             */
            onAfterRendering: function (oEvent) {},

            onExit: function() {
            },

            onFilterSettingsConfirm : function (oEvent) {
                console.log(oEvent);
            }

			/* =========================================================== */
			/* internal methods                                            */
			/* =========================================================== */

		});
	}
);