sap.ui.define([
		"nw/epm/refapps/purchaseorders/approve/controller/BaseController"
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