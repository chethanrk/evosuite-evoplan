jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;
// We cannot provide stable mock data out of the template.
// If you introduce mock data, by adding .json files in your webapp/localService/mockdata folder you have to provide the following minimum data:
// * At least 3 WorkOrders in the list

sap.ui.require([
	"sap/ui/test/Opa5",
	"com/evorait/evoplan/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"com/evorait/evoplan/test/integration/pages/App",
	"com/evorait/evoplan/test/integration/pages/Browser",
	"com/evorait/evoplan/test/integration/pages/MasterPage",
	"com/evorait/evoplan/test/integration/pages/NotFound",
	"com/evorait/evoplan/test/integration/pages/OverviewPage",
	"com/evorait/evoplan/test/integration/pages/List",
	"com/evorait/evoplan/test/integration/pages/AssetTree",
	"com/evorait/evoplan/test/integration/pages/Gantt"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com.evorait.evoplan.view."
	});


	//"com/evorait/evoplan/test/integration/NotFoundJourney",

	sap.ui.require([
		"com/evorait/evoplan/test/integration/BusyJourney",//App Loading
		"com/evorait/evoplan/test/integration/AppJourney",//App Header
		"com/evorait/evoplan/test/integration/MasterPageJourney",//Demand Page:Resource List
		"com/evorait/evoplan/test/integration/ListJourney",//Demand Page:Demand List
		"com/evorait/evoplan/test/integration/OverviewPageJourney",// Navigation to Detail Page from Demands
		"com/evorait/evoplan/test/integration/NavigationJourney",
        "com/evorait/evoplan/test/integration/GantJourney"
	], function () {
		QUnit.start();
	});
});