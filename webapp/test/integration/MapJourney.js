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

	QUnit.module("Map");
	var sDescription = "Test order for EvoPlan integration",
		sStatusCode = "INIT",
		sDescriptionFalseCase = "11122";

	opaTest("Map Menu Selection", function (Given, When, Then) {
		Given.iStartTheApp();

		//Actions //On Click of Map Page
		When.onTheMapView.iClickOnTheMenu().
		and.iClickOnTheMenuItem(); //.and.isMapDemandTableLoaded();

		//Assersions
		Then.onTheMapView.iShouldSeeTheMapView();
	});

	opaTest("Should See the Map View", function (Given, When, Then) {
		When.onTheMapView.isMapDemandTableLoaded();

		Then.onTheMapView.iShouldSeeTheMap().
		and.iShouldSeeTheMapFilter().
		and.iShouldSeeTheDemandTable();
	});
	opaTest("Should See the Map Legends", function (Given, When, Then) {
		When.onTheMapView.iExpandMapLegends();

		Then.onTheMapView.iShouldSeeTheMapLegends();
	});
	opaTest("Map Demand Button Check: Change Status", function (Given, When, Then) {
		//On Click of Map Page
		When.onTheMapView.isMapDemandTableLoaded();
		Then.onTheMapView.iShouldSeeTheChangeStatusButtonAs(false);
	});
	opaTest("Map Demand Button Check: Assign", function (Given, When, Then) {
		//On Click of Map Page
		When.onTheMapView.isMapDemandTableLoaded();
		Then.onTheMapView.iShouldSeeTheAssignButtonAs(false);
	});
	opaTest("Should filter entries based on the demand description", function (Given, When, Then) {
		When.onTheMapView.iLookAtTheScreen().
		and.iExpandFilter().
		and.iSearchWithDemandDecriptionValue(sDescription);

		Then.onTheMapView.iShouldSeeTheTableWithDemandDescription(sDescription).
		and.iTeardownMyAppFrame();
	});
	opaTest("Should filter entries based on the Status", function (Given, When, Then) {
		Given.iStartTheApp();

		When.onTheMapView.iClickOnTheMenu().
		and.iClickOnTheMenuItem().
		and.isMapDemandTableLoaded().
		and.iLookAtTheScreen().
		and.iExpandFilter().
		and.iSearchWithDemandStatusValue(sStatusCode);

		Then.onTheMapView.iShouldSeeTheTableEntriesWithStatus(sStatusCode).
		and.iTeardownMyAppFrame();
	});
	opaTest("Should filter entries based on the Map Legend Selection (First Item)", function (Given, When, Then) {
		Given.iStartTheApp();

		When.onTheMapView.iClickOnTheMenu().
		and.iClickOnTheMenuItem().
		and.isMapDemandTableLoaded().
		and.iLookAtTheScreen().
		and.iExpandMapLegends().
		and.iSelectFirstItemFromMapLegendsList().
		and.isMapDemandTableLoaded();

		Then.onTheMapView.EntriesShouldBeFilteredWithMapLegendsSelectedItem().
		and.iTeardownMyAppFrame();
	});
});