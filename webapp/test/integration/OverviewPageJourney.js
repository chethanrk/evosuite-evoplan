sap.ui.define([
	"sap/ui/test/opaQunit"
], function (opaTest) {
	"use strict";

	QUnit.module("OverviewPage");

	opaTest("Should See the Demands Table", function (Given, When, Then) {
		Given.iStartTheApp();

		When.onTheListPage.iLookAtTheScreen();

		Then.onTheListPage.iShouldSeeTheTable();
	});

	opaTest("Should see the Demands table entries", function (Given, When, Then) {
		// Arrangements
		// Given.iStartTheAppWithDelay("",0);

		// Actions
		When.onTheListPage.iLookAtTheScreen();

		Then.onTheListPage.theTableHasEntries().and.iTeardownMyAppFrame();

	});

	//Today
	opaTest("Should navigate to demand Overview page", function (Given, When, Then) {
		Given.iStartTheApp();

		// Actions
		When.onTheListPage.iLookAtTheScreen();
		When.onTheListPage.iRememberTheItemAtPosition(0);
		When.onTheBrowserPage.iChangeTheHashToTheRememberedItem();

		// Assertions
		Then.onOverviewPage.iShouldSeeTheRememberedObject().
		and.theViewIsNotBusyAnymore().and.iTeardownMyAppFrame();
	});

	opaTest("Should see the Assignment Details", function (Given, When, Then) {
		Given.iStartTheApp();

		// Actions
		When.onTheListPage.iLookAtTheScreen();
		When.onTheListPage.iRememberTheItemAtPosition(0);
		When.onTheBrowserPage.iChangeTheHashToTheRememberedItem();

		// Assertions
		Then.onOverviewPage.iShouldSeeTheAssignmentObject();

		When.onOverviewPage.iHaveAssignmentTable().and.iPressAssignmentTable(); 

		Then.onOverviewPage.iAssignmentTablePopUpOpen().and.iTeardownMyAppFrame();
	});



});