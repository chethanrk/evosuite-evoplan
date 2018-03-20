sap.ui.define([
	"sap/ui/test/opaQunit"
], function(opaTest) {
	"use strict";

	QUnit.module("List page");
	 var sDescription = "Test order for EvoPlan integration",
		 sStatusCode = "INIT",
<<<<<<< Upstream, based on 0ac0511dd014e38d9529f5e334de6b9f774fc397
		 sDescriptionFalseCase = "11122";
		 
=======
		 sDescriptionFalseCase = "11122"
	 
>>>>>>> 6b6a97a Opa Test Continued.
	opaTest("Should See the Demand Table", function(Given, When, Then) {
		Given.iStartTheApp();
		
		//Actions
		// When.onTheListPage.iLookAtTheScreen();
		
		//Assersions
		Then.onTheListPage.iShouldSeeTheTable().
		and.theTableHasEntries()
		.and.iShouldSeetheAboutDialogIcon()
		.and.iShouldSeeTheFilterBar()
<<<<<<< Upstream, based on 0ac0511dd014e38d9529f5e334de6b9f774fc397
		.and.iShouldSeeTheAssignButtonAs(false)
		.and.iShouldSeeTheChangeStatusButtonAs(false).
=======
		.and.iShouldSeeTheAssignButtonAsDisabled().
>>>>>>> 42773ba Opa tests continued.
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

		Then.onTheListPage.iShouldSeeTheTableEntriesWithStatus(sStatusCode);
	});
	opaTest("Should Display the empty table when we search for wrong value", function(Given, When, Then) {
		Given.iStartTheApp();

		When.onTheListPage.iSearchWithDemandDecriptionValue(sDescriptionFalseCase);

		Then.onTheListPage.iShouldSeeTheEmptyTable().and.iTeardownMyAppFrame();
	});
	opaTest("Should Display the empty table when we search for wrong value", function(Given, When, Then) {
		Given.iStartTheApp();

		When.onTheListPage.iSelectDemandFromDemandTable();

		Then.onTheListPage.iShouldSeeTheAssignButtonAs(true)
		.and.iShouldSeeTheChangeStatusButtonAs(true);
	});
	
	opaTest("Should Display the Information popup", function(Given, When, Then) {
		Given.iStartTheApp();

		When.onTheListPage.iClickOnTheAboutIcon();

		Then.onTheListPage.iShouldSeeTheInformationPopupWithTitle("xtit.infoDialogTitle").and.iTeardownMyAppFrame();
	});
	
	/*opaTest("Should Navigate to the Demand overview page", function(Given, When, Then) {
		Given.iStartTheApp();

		When.onTheListPage.iPressATableItemAtPosition(1);

		Then.onTheListPage.iShouldSeeTheDemandOverviewPage("i18n>xtit.demandOverview");

	});*/



});