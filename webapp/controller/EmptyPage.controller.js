sap.ui.define([
		"com/evorait/evoplan/controller/AssignmentsController"
	], function(BaseController) {
	"use strict";

	/*
        Common base class for the controllers of this app containing some convenience methods
    */
	return BaseController.extend("com.evorait.evoplan.controller.EmptyPage", {

		onNavButtonPressed  : function(){
			this.getApplication().navBack(true, true);
		}
	});
});