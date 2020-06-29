/*global QUnit*/

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

		opaTest("Should navigate to demand Overview page", function (Given, When, Then) {
		// Given.iStartTheApp();

		// Actions
		When.onGantt.iLookAtTheScreen();
		When.onGantt.iRememberTheItemAtPosition(0);
		When.onTheBrowserPage.iChangeTheHashToTheRememberedItem();

		// Assertions
		Then.onGantt.theViewIsNotBusyAnymore().and.iTeardownMyAppFrame();
	});
/*	opaTest("Gantt Demand Header Button Check: ", function (Given, When, Then) {

			When.onGantt.iClickOnTheChangeStatusButton();
			Then.onGantt.iShouldSeeTheChangeStatusButtonAs();
	});
		opaTest("Gantt Demand Header Button Check", function (Given, When, Then) {
		
			When.onGantt.iClickOnTheAssignButton();
			Then.onGantt.iShouldSeeTheAssignuttonAs();
	});*/
	

});