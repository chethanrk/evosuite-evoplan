sap.ui.define([
	"sap/ui/test/opaQunit"
], function(opaTest) {
	"use strict";

	QUnit.module("OverviewPage");

	opaTest("Should See the Table", function(Given, When, Then) {
		Given.iStartTheApp();


		When.onTheListPage.iLookAtTheScreen();
		
		Then.onTheListPage.iShouldSeeTheTable().and.theTableHasEntries();
	});
	
	opaTest("Should navigate to demand Overview page", function (Given, When, Then) {
		Given.iStartTheApp();

		// Actions
		When.onTheListPage.iLookAtTheScreen();
		When.onTheListPage.iRememberTheItemAtPosition(2);
		When.onTheBrowserPage.iChangeTheHashToTheRememberedItem();

		// Assertions
		Then.onOverviewPage.iShouldSeeTheRememberedObject().
			and.theViewIsNotBusyAnymore();
	});
	
	opaTest("Should See the Demand Details", function (Given, When, Then) {
		// Actions
		When.onOverviewPage.iLookAtTheScreen();

		// Assertions
		Then.onOverviewPage.iShouldSeeTheAssignButton("i18n>xbut.assign").
			and.iShouldSeeTheChangeStatusButton("i18n>xbut.changeStatus").
			and.iShouldSeeTheDemandTitleAs("Test order for EvoPlan integration (22)").
			and.iShouldSeeTheSections().and.iShouldSeeAssignmentTable().and.iTeardownMyAppFrame();
	});

});