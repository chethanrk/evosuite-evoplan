sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function(JSONModel, Device) {
	"use strict";

	return {
		createDeviceModel: function() {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		createUserModel: function(User) {
			var oModel = new JSONModel(User);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		createAssignmentModel: function(Assignment) {
			var oModel = new JSONModel(Assignment);
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},

		createInformationModel: function(oComponent) {
			var oMetadata = oComponent.getMetadata();
			var oManifest = oMetadata._oManifest;
			var oModel = new JSONModel();

			var oInformation = {
				appVersion: oManifest._oManifest["sap.app"].applicationVersion.version,
				ui5Version: sap.ui.getVersionInfo().version,
				language : sap.ui.getCore().getConfiguration().getLocale().getSAPLogonLanguage()
			};
			oModel.setData(oInformation);
			return oModel;
		},
		
		createMessageCounterModel : function (oCounter){
			var oModel = new JSONModel(oCounter);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		
		createNavLinksModel : function(NavLinks){
			var oModel = new JSONModel(NavLinks);
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		}
	};

});