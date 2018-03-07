sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/controller/ErrorHandler",
	"sap/m/MessageToast"
], function(JSONModel, formatter, BaseController,ErrorHandler,MessageToast) {
	"use strict";

    return BaseController.extend('com.evorait.evoplan.block.sections.AssignmentBlockController', {
    	
		onClickRow: function(oEvent){
			// var oAppointment = oEvent.getParameter("listItem");
			// var oContext = oAppointment.getBindingContext();
			// var oModel = oContext.getModel();
			// var sPath = oContext.getPath();
			// var oAppointmentData = oModel.getProperty(sPath);
			// this.getOwnerComponent().assignInfoDialog.open(this.getView(), null, oAppointmentData);
			this.oParentBlock.fireDummy(oEvent.getParameters());
		}
    });
	
});