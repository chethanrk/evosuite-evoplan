sap.ui.require(
	["sap/ui/test/opaQunit"],
	function (opaTest) {
		"use strict";
 
		QUnit.module("Overview");

		opaTest("Should see different cards with loaded data", function (Given, When, Then) {
			// Arrangements
			Given.iStartTheApp();
			//Actions
			When.onTheOverviewPage.iLookAtTheScreen();
			// Assertions
			Then.onTheOverviewPage.iShouldSeeThePage()
				.and.iShouldSeeTheCardWithId("quickLinksCard")
				.and.iShouldSeeTheCardWithId("newestWorkOrdersCard");
		});

		opaTest("Should go to the search view", function (Given, When, Then) {
			//Actions
			When.onTheOverviewPage.iPressTheQuickLinkWithId("menuSearch");
			// Assertions
			Then.onTheWorklistPage.iShouldSeeThePage();
		});

		opaTest("Should go back to the Dashboard", function (Given, When, Then) {
			// Actions
			When.onTheWorklistPage.iPressTheBackButton();
			// Assertions
			Then.onTheOverviewPage.iShouldSeeThePage()
				.and.iTeardownMyAppFrame();
		});

		//Todo test header menu
		/*opaTest("Should navigate through the dropdown menu in the header", function (Given, When, Then) {
			// Actions
			When.onTheOverviewPage.iPressHeaderDropdown();

			// Assertions
			Then.onTheWorklistPage.iShouldSeeThePage()
				.and.iTeardownMyAppFrame();
		});

		opaTest("Should go to the Dashboard by Home button", function (Given, When, Then) {
			// Actions
			When.onTheWorklistPage.iPressTheHomeButton();
			// Assertions
			Then.onTheOverviewPage.iShouldSeeThePage()
				.and.iTeardownMyAppFrame();
		});*/
		

	}
);