sap.ui.define([
	"sap/ui/test/opaQunit"
], function(opaTest) {
	"use strict";

	QUnit.module("List page");

	opaTest("Should See the Demand Table", function(Given, When, Then) {
		Given.iStartTheApp();
		
		//Actions
		// When.onTheListPage.iLookAtTheScreen();
		
		//Assersions
		Then.onTheListPage.iShouldSeeTheTable().
		and.theTableHasEntries()
		.and.iShouldSeetheAboutDialogIcon()
		.and.iShouldSeeTheFilterBar()
		.and.iShouldSeeTheAssignButtonAsDisabled().
		and.theTableShouldHaveAllEntries();
	});
	
	/*opaTest("Should Navigate to Demand Overview page", function(Given, When, Then) {
		Given.iStartTheApp();

		When.onTheListPage.iLookAtTheScreen();

		Then.onTheListPage.iShouldSeeTheTable().
		and.theTableHasEntries();
	});*/

});