sap.ui.require(
	["sap/ui/test/opaQunit"],
	function (opaTest) {
		"use strict";
 
		QUnit.module("WorkOrder");

		opaTest("Should see the work order details when click on search table item", function (Given, When, Then) {
			// Arrangements
			Given.iStartTheApp();
			//Actions
			When.onTheOverviewPage.iPressTheQuickLinkWithId("menuSearch");
			When.onTheWorklistPage.iPressOnTheItemWithTheID("613586");

			// Assertions
			Then.onTheObjectPage.iShouldSeeThePage()
				.and.theTitleShouldDisplayTheName("Fix Vending Machine", "613586")
				.and.iShouldSeeTheActionButtonLength(1)
				.and.iShouldSeeTheActionButton("editWorkOrderButton")
				.and.iShouldSeeTheBlock("detailsFormBlock")
				.and.iShouldSeeTheForm(false)
				.and.iShouldSeeTheBlock("operationsTableBlock")
				.and.theBlockTableShouldHaveAllEntries("operations.", "OpTableBlock", "operationItemsTable", 3)
				.and.iShouldSeeTheBlock("componentsTableBlock")
				.and.theBlockTableShouldHaveAllEntries("components.", "CompTableBlock", "componentItemsTable", 1);
		});

		opaTest("Should show editable form view for the work order details", function(Given, When, Then){
			// Actions
			When.onTheObjectPage.iPressTheEditButton();
			//Assertations
			Then.onTheObjectPage.iShouldSeeTheForm(true)
				.and.iShouldSeeTheActionButtonLength(2)
				.and.iShouldSeeTheActionButton("cancelWorkOrderButton")
				.and.iShouldSeeTheActionButton("saveWorkOrderButton");
		});

		opaTest("Should cancel the form and toggle editable view for the workorder details", function(Given, When, Then){
			// Actions
			When.onTheObjectPage.iPressTheCancelButton();
			//Assertations
			Then.onTheObjectPage.iShouldSeeTheForm(false)
				.and.iShouldSeeTheActionButtonLength(1)
				.and.iShouldSeeTheActionButton("editWorkOrderButton");
		});

		opaTest("Should go back to the TablePage", function (Given, When, Then) {
			// Actions
			When.onTheObjectPage.iPressTheHomeButton();
			// Assertions
			Then.onTheOverviewPage.iShouldSeeThePage();
		});

		opaTest("Should be on the notification page again when browser forwards is pressed", function (Given, When, Then) {
			// Actions
			When.onTheBrowserPage.iPressOnTheForwardButton();
			// Assertions
			Then.onTheObjectPage.iShouldSeeThePage()
				.and.theTitleShouldDisplayTheName("Fix Vending Machine", "613586")
				.and.iTeardownMyAppFrame();
		});

	}
);