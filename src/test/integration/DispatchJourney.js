sap.ui.require(
	["sap/ui/test/opaQunit"],
	function (opaTest) {
		"use strict";
 
		QUnit.module("Dispatching");

		opaTest("Should see the table with unassigned Operations and charts per user", function (Given, When, Then) {
			// Arrangements
			Given.iStartTheApp();
			//Actions
			When.onTheOverviewPage.iPressTheQuickLinkWithId("menuDispatch");
			// Assertions
			Then.onTheDispatchPage.iShouldSeeThePage()
				.and.iShouldSeeTheTable()
				.and.theTableShouldHaveAllRows(9)
				.and.theTableIsGroupedBy()
				.and.iShouldSeeUserSidebarWithUsers(3)
				.and.iShouldSeeUserSidebarWithCharts(3);
		});

		opaTest("Should search for user with no result", function (Given, When, Then) {
			// Actions
			When.onTheDispatchPage.iSearchForSomething("userSearchField", "blub");
			// Assertions
			Then.onTheDispatchPage.iShouldSeeUserSidebarWithUsers(0);
		});

		opaTest("Should search for user with 1 result", function (Given, When, Then) {
			// Actions
			When.onTheDispatchPage.iSearchForSomething("userSearchField", "Krause");
			// Assertions
			Then.onTheDispatchPage.iShouldSeeUserSidebarWithUsers(1)
				.and.iShouldSeeUserSidebarWithCharts(1);
		});

		opaTest("Should reset search and see all users with charts", function (Given, When, Then) {
			// Actions
			When.onTheDispatchPage.iSearchForSomething("userSearchField", "");
			// Assertions
			Then.onTheDispatchPage.iShouldSeeUserSidebarWithUsers(3)
				.and.iShouldSeeUserSidebarWithCharts(3);
		});

		opaTest("Should go to the work order page", function (Given, When, Then) {
			// Actions
			When.onTheDispatchPage.iPressOnTheTableWithTheTitleText("613585", "Replace Water Pump");
			// Assertions
			Then.onTheObjectPage.iShouldSeeThePage()
				.and.theTitleShouldDisplayTheName("Replace Water Pump", "613585");
		});

		opaTest("Should go back to the TablePage", function (Given, When, Then) {
			// Actions
			When.onTheObjectPage.iPressTheBackButton();
			// Assertions
			Then.onTheDispatchPage.iShouldSeeTheTable();
		});

		opaTest("Should open 'Assign Now' dialog on operation table", function (Given, When, Then) {
			// Actions
			When.onTheDispatchPage.iPressOnAssignNow();
			// Assertions
			Then.onTheDispatchPage.iShouldSeeUserSelectDialog()
				.and.iShouldSeeSelectDialogUserItems(3)
		});

		opaTest("Should able to select user in open dialog for assign operation", function (Given, When, Then) {
			When.onTheDispatchPage.iSelectUserInDialog("KRAUSEH");
			Then.onTheDispatchPage.theTableShouldHaveAllRows(7)
				.and.theTableIsGroupedBy();
		});


		/*opaTest("Should go to the operation page", function (Given, When, Then) {
			// Actions
			When.onTheDispatchPage.iPressOnTheTableWithTheTitleText("0020", "OperationDescription");
			// Assertions
			Then.onTheOperationPage.iShouldSeeThePage()
				.and.theTitleShouldDisplayTheName("OperationDescription", "0020");
		});

		opaTest("Should go back to the TablePage", function (Given, When, Then) {
			// Actions
			When.onTheOperationPage.iPressTheBackButton();
			// Assertions
			Then.onTheDispatchPage.iShouldSeeTheTable()
				.and.iTeardownMyAppFrame();
		});*/

	}
);