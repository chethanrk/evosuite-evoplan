sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/controller/ErrorHandler",
	"sap/m/MessageToast"
], function(JSONModel, formatter, BaseController,ErrorHandler,MessageToast) {
	"use strict";

    return BaseController.extend("com.evorait.evoplan.block.sections.AssignmentBlockController", {
    	
		onClickRow: function(oEvent){
			this.oParentBlock.fireOnRowClick(oEvent.getParameters());
		}
    });
	
});