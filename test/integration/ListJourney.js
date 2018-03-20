sap.ui.define([
	"sap/ui/test/opaQunit"
], function(opaTest) {
	"use strict";

	QUnit.module("List page");
	 var sDescription = "Test order for EvoPlan integration",
		 sStatusCode = "INIT",
		 sDescriptionFalseCase = "11122"
	 
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
	
	opaTest("Should filter entries based on the demand description", function(Given, When, Then) {
		Given.iStartTheApp();

		When.onTheListPage.iSearchWithDemandDecriptionValue(sDescription);

		Then.onTheListPage.iShouldSeeTheTableWithDemandDescription(sDescription).and.iTeardownMyAppFrame();
	});
	
	opaTest("Should filter entries based on the Status", function(Given, When, Then) {
		Given.iStartTheApp();

		When.onTheListPage.iSearchWithDemandStatusValue(sStatusCode);

		Then.onTheListPage.iShouldSeeTheTableEntriesWithStatus();
	});
	opaTest("Should Display the empty table when we search for wrong value", function(Given, When, Then) {
		Given.iStartTheApp();

		When.onTheListPage.iSearchWithDemandDecriptionValue(sDescriptionFalseCase);

		Then.onTheListPage.iShouldSeeTheEmptyTable();
	});

});