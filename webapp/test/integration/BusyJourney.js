sap.ui.define([
		"sap/ui/test/opaQunit"
	], function (opaTest) {
		"use strict";
		
		QUnit.module("Desktop busy indication");

		opaTest("Should see a global busy indication while loading the metadata", function (Given, When, Then) {
			// Arrangements
			Given.iStartTheAppWithDelay("", 50000);

			// Actions
			When.onTheAppPage.iLookAtTheScreen();

			// Assertions
			Then.onTheAppPage.iShouldSeeTheBusyIndicator().and.iTeardownMyAppFrame();
		});

		// opaTest("Should see a busy indication after loading for resource table", function (Given, When, Then) {
		// 	// Arrangements
		// 	Given.iStartTheAppWithDelay("", 2000);

		// 	// Actions
		// 	When.onTheAppPage.iWaitUntilTheBusyIndicatorIsGone();

		// 	// Assertions
		// 	Then.onTheMasterPage.iShouldSeeTableBusyIndicatorWithId("droppableTable").
		// 		and.iTeardownMyAppFrame();
		// });

	}
);