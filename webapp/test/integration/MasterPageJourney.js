sap.ui.require(
	["sap/ui/test/opaQunit"],
	function (opaTest) {
		"use strict";
 
		QUnit.module("Resource Tree");

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
				.and.iShouldSeeFooterPlanningButtonAs(false)
				.and.iShouldSeeFooterUnassignButtonAs(false)
				.and.iShouldSeeFooterAssignNewButtonAs(false);
		});
		opaTest("Should See footer buttons as enabled", function (Given, When, Then) {
			// Actions
			When.onTheMasterPage.iLookAtTheScreen();
				
            When.onTheMasterPage.iCheckOneResource();
			// Assertions
			Then.onTheMasterPage.and.iShouldSeeFooterPlanningButtonAs(true)
				.and.iShouldSeeFooterUnassignButtonAs(true)
				.and.iShouldSeeFooterAssignNewButtonAs(true);
                
		});
		opaTest("Should See The Dialog", function (Given, When, Then) {
			// Actions
            When.onTheMasterPage.iClickOnThePlanningCal();
			// Assertions
			Then.onTheMasterPage.iShouldSeePlanningCalendar("xtit.calendarModalTitle")
			.and.iCloseTheDialog();
			
			// When.onTheMasterPage.iClickOnTheUnassign();
			
			// Then.onTheMasterPage.iShouldSeeTheDialog().and
			// // .iShouldSeeAssignUnassignDialog("Select Demands for unassignment").and
			// .iCloseTheDialog();
			
			// When.onTheMasterPage.iClickOnTheAssignNew();
			
			// Then.onTheMasterPage.iShouldSeeTheDialog().and
			// // .iShouldSeeAssignUnassignDialog("Select Demands for reassignment").and
			// .iCloseTheDialog();
                
		});

		opaTest("Should press on filter button and see the filter dialog", function (Given, When, Then) {
			// Actions
            When.onTheMasterPage.iPressOnFilterButton();
			// Assertions
			Then.onTheMasterPage.iShouldSeeFilterDialog()
                .and.iShouldSeeFilterItems().and.iTeardownMyAppFrame();
                
		});
		
		
		
		
 
	}
);