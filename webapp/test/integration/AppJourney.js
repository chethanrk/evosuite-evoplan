sap.ui.define([
	"sap/ui/test/opaQunit"
], function (opaTest) {
	"use strict";

	QUnit.module("Header");

	opaTest("Should See the visible controls on the header", function (Given, When, Then) {
		// Arrangements
		Given.iStartTheApp();

		// Actions
		When.onTheAppPage.iLookAtTheScreen();

		// Assertions
		Then.onTheAppPage.iShouldSeeEvoplanLogo().iShouldSeeTheMenu().iShouldSeeRefreshButton().iShouldSeeAboutButton();
		// Cleanup
		// Then.iTeardownMyAppFrame();
	});
	opaTest("Should See Menu Items", function (Given, When, Then) {
		// Given.iStartTheApp();

		When.onTheAppPage.iLookAtTheScreen();

		When.onTheAppPage.iClickOnTheMenu();

		Then.onTheAppPage.iShouldSeeMenuItems().and.iTeardownMyAppFrame();
	});

	opaTest("Should Display the Information popup", function (Given, When, Then) {
		Given.iStartTheApp();

		When.onTheAppPage.iClickOnTheAboutIcon();

		Then.onTheAppPage.iShouldSeeTheInformationPopupWithTitle("xtit.infoDialogTitle").and.iTeardownMyAppFrame();
	});

});