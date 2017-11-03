sap.ui.require(
	["sap/ui/test/opaQunit"],
	function (opaTest) {
		"use strict";
 
		QUnit.module("Component");

		opaTest("Should see the work order details when click on search table item", function (Given, When, Then) {
			// Arrangements
			Given.iStartTheApp();
			//Actions
			When.onTheOverviewPage.iPressTheQuickLinkWithId("menuSearch");
			When.onTheWorklistPage.iPressOnTheItemWithTheID("613586");
			When.onTheObjectPage.iPressOnTheBlockTableWithTheTitle("components.", "CompTableBlock", "MaintWorkOrderComponent1");

			// Assertions
			Then.onTheComponentPage.iShouldSeeThePage()
				.and.theTitleShouldDisplayTheName("MaintWorkOrderComponentText", "MaintWorkOrderComponent1")
				.and.iShouldSeeTheActionButtonLength(1)
				.and.iShouldSeeTheActionButton("editComponentButton")
				.and.iShouldSeeTheBlock("componentsFormBlock")
				.and.iShouldSeeTheForm(false);
		});

		opaTest("Should show editable form view for the component details", function(Given, When, Then){
			// Actions
			When.onTheComponentPage.iPressTheEditButton();
			//Assertations
			Then.onTheComponentPage.iShouldSeeTheForm(true)
				.and.iShouldSeeTheActionButtonLength(2)
				.and.iShouldSeeTheActionButton("cancelComponentButton")
				.and.iShouldSeeTheActionButton("saveComponentButton");
		});

		opaTest("Should cancel the form and toggle editable view for the component details", function(Given, When, Then){
			// Actions
			When.onTheComponentPage.iPressTheCancelButton();
			//Assertations
			Then.onTheComponentPage.iShouldSeeTheForm(false)
				.and.iShouldSeeTheActionButtonLength(1)
				.and.iShouldSeeTheActionButton("editComponentButton");
		});

		opaTest("Should go back to the WorkOrder Page", function (Given, When, Then) {
			// Actions
			When.onTheComponentPage.iPressTheBackButton();
			// Assertions
			Then.onTheObjectPage.iShouldSeeThePage();
		});

		opaTest("Should be on the notification page again when browser forwards is pressed", function (Given, When, Then) {
			// Actions
			When.onTheBrowserPage.iPressOnTheForwardButton();
			// Assertions
			Then.onTheComponentPage.iShouldSeeThePage()
				.and.theTitleShouldDisplayTheName("MaintWorkOrderComponentText", "MaintWorkOrderComponent1")
				.and.iTeardownMyAppFrame();
		});

	}
);