sap.ui.define([
		"com/evorait/evoplan/controller/BaseController"
	], function (BaseController) {
		"use strict";

		return BaseController.extend("com.evorait.evoplan.controller.NotFound", {

			/**
			 * Navigates to the worklist when the link is pressed
			 * @public
			 */
			onLinkPressed : function () {
				this.getRouter().navTo("worklist");
			}

		});

	}
);