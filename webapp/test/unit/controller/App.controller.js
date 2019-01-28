sap.ui.define([
		"com/evorait/evoplan/controller/App.controller",
		"sap/m/SplitApp",
		"sap/ui/core/Control",
		"sap/ui/model/json/JSONModel",
		"sap/ui/thirdparty/sinon",
		"sap/ui/thirdparty/sinon-qunit"
	], function(AppController, SplitApp, Control, JSONModel) {
		"use strict";

		QUnit.module("AppController");

		// QUnit.test("Should hide the master of a SplitApp when selection in the list changes", function (assert) {
		// 	// Arrange
		// 	var oViewStub = new Control(),
		// 		oODataModelStub = new JSONModel(),
		// 		oComponentStub = new Control();
		//
		// 	oComponentStub.getContentDensityClass = jQuery.noop;
		//
		// 	oODataModelStub.metadataLoaded = function () {
		// 		return {
		// 			then : jQuery.noop
		// 		};
		// 	};
		// 	oComponentStub.setModel(oODataModelStub);
		//
		// 	// System under Test
		// 	var oAppController = new AppController();
		//
		// 	this.stub(oAppController, "getView").returns(oViewStub);
		// 	this.stub(oAppController, "getOwnerComponent").returns(oComponentStub);
		//
		// 	// Act
		// 	oAppController.onInit();
		//
		// 	// Assert
		// });

	}
);