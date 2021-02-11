sap.ui.define([
	"sap/ui/test/opaQunit"
], function (opaTest) {
	"use strict";

	QUnit.module("Navigation");

	opaTest("Should see the Demand Table", function (Given, When, Then) {
		// Given.iTeardownMyAppFrame();
		// Arrangements
		Given.iStartTheApp();

		//Actions
		When.onTheListPage.iLookAtTheScreen();

		// Assertions
		Then.onTheListPage.iShouldSeeTheTable();
	});

	opaTest("Should see the table entries", function (Given, When, Then) {
		// Arrangements
		// Given.iStartTheAppWithDelay("",0);

		// Actions
		When.onTheListPage.iLookAtTheScreen();

		Then.onTheListPage.theTableHasEntries();

	});
	

	opaTest("Should go back to the List View", function (Given, When, Then) {
		// Actions
		When.onTheBrowserPage.iPressOnTheBackButton();

		// Assertions
		Then.onTheListPage.iShouldSeeTheTable();
	});


	opaTest("Should be on the Detail page again when browser back is pressed", function (Given, When, Then) {
		// Actions
		When.onTheBrowserPage.iPressOnTheBackButton();

		// Assertions
		Then.onTheListPage.iShouldSeeTheTable().and.iTeardownMyAppFrame();
	});



});