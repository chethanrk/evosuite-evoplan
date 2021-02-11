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
                // .and.theButtonTextShouldDisplayFilterNumber("2")
                // .and.iShouldSeeTheSearchField()
                // .and.iShouldSeeTheCustomVariant();
				.and.iShouldSeeFooterManageAbsenceButtonAs(false)
				.and.iShouldSeeFooterUnassignButtonAs(false)
				.and.iShouldSeeFooterAssignNewButtonAs(false).and.iTeardownMyAppFrame();
				// .and.iShouldSeeFooterPlanningButtonAs(false);
		});
	
		
		
		
		
 
	}
);