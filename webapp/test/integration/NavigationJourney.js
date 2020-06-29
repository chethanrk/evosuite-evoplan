/*global QUnit*/

sap.ui.define([
	"sap/ui/test/opaQunit"
], function (opaTest) {
	"use strict";

	QUnit.module("Navigation");

	opaTest("Should see the Demand Table", function (Given, When, Then) {
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
	opaTest("Should react on hashchange", function (Given, When, Then) {
		// Arrangements
		// Given.iStartTheAppWithDelay("",0);

		// Actions
		When.onTheListPage.iLookAtTheScreen();

		Then.onTheListPage.iShouldSeeTheTable().and.theTableHasEntries();

		When.onTheListPage.iRememberTheItemAtPosition(2);
		When.onTheBrowserPage.iChangeTheHashToTheRememberedItem();

		// Assertions
		Then.onOverviewPage.iShouldSeeTheRememberedObject().
		and.theViewIsNotBusyAnymore();
	});

	opaTest("Should go back to the List View", function (Given, When, Then) {
		// Actions
		When.onTheBrowserPage.iPressOnTheBackButton();

		// Assertions
		Then.onTheListPage.iShouldSeeTheTable();
	});

	opaTest("Detail Page shows the correct object Details", function (Given, When, Then) {
		// Actions
		When.onTheListPage.iRememberTheItemAtPosition(1).
		and.iPressATableItemAtPosition(1);

		// Assertions
		Then.onOverviewPage.iShouldSeeTheRememberedObject();
	});

	opaTest("Should be on the Detail page again when browser back is pressed", function (Given, When, Then) {
		// Actions
		When.onTheBrowserPage.iPressOnTheBackButton();

		// Assertions
		Then.onTheListPage.iShouldSeeTheTable();
	});

	opaTest("Should be on the object page again when browser forwards is pressed", function (Given, When, Then) {
		// Actions
		When.onTheBrowserPage.iPressOnTheForwardButton();

		// Assertions
		Then.onOverviewPage.iShouldSeeTheRememberedObject().
		and.iTeardownMyAppFrame();
	});
	// opaTest("Should Navigate to Evo Order App", function (Given, When, Then) {
	// 	// Arrangements
	// 	Given.iStartTheAppWithDelay("",0);

	// 	// Actions
	// 	When.onTheBrowserPage.iChangeTheHashToNavigateToEvoOrder();

	// 	// Assertions
	// 	Then.onOverviewPage.iShouldSeeTheRememberedObject().
	// 	and.theViewIsNotBusyAnymore();
	// });
	/*
		opaTest("Should see a busy indication while loading the metadata", function (Given, When, Then) {
			// Arrangements
			Given.iStartMyApp({
				delay: 10000
			});

			//Actions
			When.onTheWorklistPage.iLookAtTheScreen();

			// Assertions
			Then.onTheAppPage.iShouldSeeTheBusyIndicatorForTheWholeApp().
				and.iTeardownMyAppFrame();
		});


		opaTest("Start the App and simulate metadata error: MessageBox should be shown", function (Given, When, Then) {
			//Arrangement
			Given.iStartMyAppOnADesktopToTestErrorHandler("metadataError=true");

			//Assertions
			Then.onTheAppPage.iShouldSeeTheMessageBox().
				and.iTeardownMyAppFrame();

		});

		opaTest("Start the App and simulate bad request error: MessageBox should be shown", function (Given, When, Then) {
			//Arrangement
			Given.iStartMyAppOnADesktopToTestErrorHandler("errorType=serverError");

			//Assertions
			Then.onTheAppPage.iShouldSeeTheMessageBox().
				and.iTeardownMyAppFrame();

		});*/

});