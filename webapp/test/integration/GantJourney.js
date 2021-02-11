sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/actions/EnterText",
	"com/evorait/evoplan/test/integration/pages/Common",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/PropertyStrictEquals",
	"sap/ui/test/matchers/BindingPath",
	"sap/ui/test/matchers/I18NText",
	"sap/ui/test/matchers/Properties"
], function (Opa5, Press, EnterText, Common, AggregationFilled, PropertyStrictEquals, BindingPath, I18NText, Properties) {
	"use strict";

	QUnit.module("Gantt");
		var sDescription = "Test order for EvoPlan integration",
		sStatusCode = "INIT",
		sDescriptionFalseCase = "11122",
		sOrderId =	"827645";

	opaTest("Gant Menu Selection", function (Given, When, Then) {
        	Given.iStartTheApp();
		//On Click of Gantt Page
			When.onGantt.iClickOnTheMenu().and.iClickOnTheMenuItem();
			Then.onGantt.iShouldSeeGantt();
	});
	
		opaTest("Availability of Gantt Demand table", function (Given, When, Then) {
		//On Click of Gantt Page
			When.onGantt.isGanttDemandTableLoaded();
			Then.onGantt.iShouldSeeDemandTable();
	});
		opaTest("Gantt Header Button Check: Today Button", function (Given, When, Then) {
		//On Click of Gantt Page
			When.onGantt.iClickOnTheTodayButton();
			Then.onGantt.iShouldSeeTheTodayButtonAs();
	});
	
	
	
	
	
		opaTest("Demand Gantt Filter Option", function (Given, When, Then) {
	//	 Given.iStartTheApp();

		// Actions
		When.onGantt.iLookAtTheScreen();
		When.onGantt.iHaveDemandFilterButton().and.iGanttDemandFilterButtonIsClicked();

		// Assertions
		Then.onGantt.iGanttDemandFilterPopUpOpen();//.and.iTeardownMyAppFrame();
	});

		opaTest("Should filter entries based on the Status", function (Given, When, Then) {
		// Given.iStartTheApp();

		When.onGantt.iSearchWithGanttDemandStatusValue(sStatusCode);

		Then.onGantt.iShouldSeeTheGanttDemandTableEntriesWithStatus(sStatusCode);//.and.iTeardownMyAppFrame();
	});
	
		opaTest("Should filter entries based on the OrderId", function (Given, When, Then) {
		// Given.iStartTheApp();

		When.onGantt.iSearchWithGanttDemandOrderIdValue(sOrderId);

		Then.onGantt.iShouldSeeTheGanttDemandTableEntriesWithOrderId(sOrderId);//.and.iTeardownMyAppFrame();
	});


		opaTest("Should navigate to demand Overview page", function (Given, When, Then) {
		// Given.iStartTheApp();

		// Actions
		When.onGantt.iLookAtTheScreen();
		When.onGantt.iRememberTheItemAtPosition(0);
		When.onTheBrowserPage.iChangeTheHashToTheRememberedItem();

		// Assertions
		Then.onGantt.theViewIsNotBusyAnymore().and.iTeardownMyAppFrame();
	});
	
	

	

});