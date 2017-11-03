sap.ui.require(
	["sap/ui/test/opaQunit"],
	function (opaTest) {
		"use strict";
 
		QUnit.module("WorkOrders");

		opaTest("Should see the table with all WorkOrders", function (Given, When, Then) {
			// Arrangements
			Given.iStartTheApp();
			//Actions
			When.onTheOverviewPage.iPressTheQuickLinkWithId("menuSearch");
			// Assertions
			Then.onTheWorklistPage.iShouldSeeThePage()
				.and.theTableShouldHaveAllEntries(5);
		});

		opaTest("Should go to the object page", function (Given, When, Then) {
			// Actions
			When.onTheWorklistPage.iPressOnTheItemWithTheID("613586");
			// Assertions
			Then.onTheObjectPage.iShouldSeeThePage()
				.and.theTitleShouldDisplayTheName("Fix Vending Machine", "613586");
		});
		
		opaTest("Should go back to the TablePage", function (Given, When, Then) {
			// Actions
			When.onTheObjectPage.iPressTheBackButton();
			// Assertions
			Then.onTheWorklistPage.iShouldSeeTheTable()
				.and.iTeardownMyAppFrame();
		});

		/*opaTest("Should see the not found text for no search results", function (Given, When, Then) {

			//Actions
			When.onTheWorklistPage.iSearchForSomethingWithNoResults();

			// Assertions
			Then.onTheWorklistPage.iShouldSeeTheNoDataTextForNoSearchResults().
			and.iTeardownMyAppFrame();
		});*/
		
		/*opaTest("Should be able to load more items", function (Given, When, Then) {
			//Actions
			When.onTheWorklistPage.iPressOnMoreData();
 
			// Assertions
			Then.onTheWorklistPage.theTableShouldHaveAllEntries().
				and.iTeardownMyAppFrame();
		});*/
 
	}
);