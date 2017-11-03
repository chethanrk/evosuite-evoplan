sap.ui.require(
	["sap/ui/test/opaQunit"],
	function (opaTest) {
		"use strict";
 
		QUnit.module("Operation");
		
		var operationId = "0010", operationText = "Turn off energy for equipment";

		opaTest("Should see the operation details when click on operation table item", function (Given, When, Then) {
			// Arrangements
			Given.iStartTheApp();
			//Actions
			When.onTheOverviewPage.iPressTheQuickLinkWithId("menuSearch");
			When.onTheWorklistPage.iPressOnTheItemWithTheID("613586");
			When.onTheObjectPage.iPressOnTheBlockTableWithTheTitle("operations.", "OpTableBlock", operationId);

			// Assertions
			Then.onTheOperationPage.iShouldSeeThePage()
				.and.theTitleShouldDisplayTheName(operationText, operationId)
				.and.iShouldSeeTheActionButtonLength(1)
				.and.iShouldSeeTheActionButton("editOperationButton")
				.and.iShouldSeeTheBlock("operationsFormBlock")
				.and.iShouldSeeTheForm(false);
		});

		opaTest("Should show editable form view for the operation details", function(Given, When, Then){
			// Actions
			When.onTheOperationPage.iPressTheEditButton();
			//Assertations
			Then.onTheOperationPage.iShouldSeeTheForm(true)
				.and.iShouldSeeTheActionButtonLength(2)
				.and.iShouldSeeTheActionButton("cancelOperationButton")
				.and.iShouldSeeTheActionButton("saveOperationButton");
		});

		opaTest("Should cancel the form and toggle editable view for the operation details", function(Given, When, Then){
			// Actions
			When.onTheOperationPage.iPressTheCancelButton();
			//Assertations
			Then.onTheOperationPage.iShouldSeeTheForm(false)
				.and.iShouldSeeTheActionButtonLength(1)
				.and.iShouldSeeTheActionButton("editOperationButton");
		});

		opaTest("Should go back to the WorkOrder Page", function (Given, When, Then) {
			// Actions
			When.onTheOperationPage.iPressTheBackButton();
			// Assertions
			Then.onTheObjectPage.iShouldSeeThePage();
		});

		opaTest("Should be on the operation page again when browser forwards is pressed", function (Given, When, Then) {
			// Actions
			When.onTheBrowserPage.iPressOnTheForwardButton();
			// Assertions
			Then.onTheOperationPage.iShouldSeeThePage()
				.and.theTitleShouldDisplayTheName(operationText, operationId)
				.and.iTeardownMyAppFrame();
		});

	}
);