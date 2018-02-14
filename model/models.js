sap.ui.define([
		"sap/ui/model/json/JSONModel",
		"sap/ui/Device"
	], function (JSONModel, Device) {
		"use strict";

		return {
			createDeviceModel : function () {
				var oModel = new JSONModel(Device);
				oModel.setDefaultBindingMode("OneWay");
				return oModel;
			},

			createUserModel : function (User) {
				var oModel = new JSONModel(User);
				oModel.setDefaultBindingMode("OneWay");
				return oModel;
			},

			createAssignmentModel : function (Assignment) {
                var oModel = new JSONModel(Assignment);
                oModel.setDefaultBindingMode("OneWay");
                return oModel;
            }
		};

	}
);