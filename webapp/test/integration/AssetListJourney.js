sap.ui.define([
	"sap/ui/test/opaQunit"
], function (opaTest) {
	"use strict";

	QUnit.module("Asset Tree");

	opaTest("Should Test Description", function (Given, When, Then) {
		// Arrangements
		Given.iStartTheApp();

		// Actions
		When.onTheAppPage.iLookAtTheScreen();

		// Assertions
		Then.onTheAppPage.iShouldSeeTheMenu();


	When.onTheAppPage.iClickOnTheMenu();
		// Cleanup
			When.onTheAppPage.iClickOnTheMenuItem();
			
			// Then.onTheAppPage.iShouldSeeTheMenu();
	});

});