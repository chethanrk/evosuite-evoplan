sap.ui.require(
	["sap/ui/test/opaQunit"],
	function (opaTest) {
		"use strict";
 
		QUnit.module("MasterPage");

		opaTest("Should see the resource table with different controls", function (Given, When, Then) {
			// Arrangements
			Given.iStartTheApp();
			//Actions
			When.onTheMasterPage.iLookAtTheScreen();
			// Assertions
			Then.onTheMasterPage.iShouldSeeThePage()
				.and.iShouldSeeTheTable()
                .and.iShouldSeeTheFilterButton()
                .and.theButtonTextShouldDisplayFilterNumber("2")
                .and.iShouldSeeTheSearchField()
                .and.iShouldSeeTheCustomVariant()
				.and.iShouldSeeFooterPlanningButton();
		});

		opaTest("Should press on filter button and see the filter dialog", function (Given, When, Then) {
			// Actions
            When.onTheMasterPage.iPressOnFilterButton();
			// Assertions
			Then.onTheMasterPage.iShouldSeeFilterDialog()
                .and.iShouldSeeFilterItemWithTitle("xtit.filterTitleView");
                //.and.iTeardownMyAppFrame();
		});
 
	}
);