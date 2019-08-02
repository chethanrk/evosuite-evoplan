sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter"
], function (BaseController, JSONModel, formatter) {
		"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.Split2ViewsNavi", {
		/**
		 * Registering the event when resized the splitter
		 */
		onResize: function () {
			var eventBus = sap.ui.getCore().getEventBus();
			eventBus.publish("App", "RegisterDrop", {});
			eventBus.publish("App", "RegisterDrag", {});
		}
	});

});
