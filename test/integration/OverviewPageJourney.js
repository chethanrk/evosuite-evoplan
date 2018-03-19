sap.ui.define([
	"sap/ui/test/opaQunit"
], function(opaTest) {
	"use strict";

	QUnit.module("OverviewPage");

	opaTest("Should TestDesctiption", function(Given, When, Then) {
		Given.iStartTheApp();

		When.onMyPageUnderTest.iNavigateToTheOverviewPage();

		Then.onMyPageUnderTest.iDoMyAssertion();
	});

});