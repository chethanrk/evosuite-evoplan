sap.ui.define([
		"sap/ui/test/Opa5",
		"sap/ui/test/actions/Press",
		"com/evorait/evoplan/test/integration/pages/Common",
		"sap/ui/test/matchers/PropertyStrictEquals",
		"sap/ui/test/matchers/AggregationFilled",
		"sap/ui/test/matchers/Properties"
	], function(Opa5, Press, Common, PropertyStrictEquals, AggregationFilled, Properties) {
		"use strict";

	var sViewName = "Overview",
		sControl = "Overview",
		oI18nResourceBundle = undefined;

		Opa5.createPageObjects({
			onTheOverviewPage : {
				baseClass : Common,

				actions : {
					iPressTheQuickLinkWithId : function (sId) {
						return this.waitFor({
                            id: sId,
							viewName : sViewName,
							actions: new Press(),
							errorMessage: "No list item with ID '"+sId+"' was not found."
						});
					},
					iWaitUntilTheListIsLoaded : function () {
						return this.waitFor({
							id : "workOrderCardList",
							viewName : sViewName,
							matchers : new AggregationFilled({name : "items"}),
							errorMessage : "The card WorkOrder list has not been loaded"
						});
					},
					iPressHeaderDropdown: function () {
						return this.waitFor({
							id: "headerMenuBtn",
							viewName: sViewName,
							actions: new Press(),
							errorMessage: "Did not find header dropdown menu"
						});
					},
					iPressHeaderMenuItem : function (sId) {
						return this.waitFor({
							id: sId,
							visible: false,
							viewName: sViewName,
							actions: new Press(),
							errorMessage : "Did not find header dropdown menu item with ID '"+sId+"'"
						})
					}
				},

				assertions : {
					iShouldSeeThePage: function () {
						return this.waitFor({
							id: "overviewPage",
							viewName: sViewName,
							success: function (oPage) {
								oI18nResourceBundle = oPage.getModel("i18n").getResourceBundle();
								Opa5.assert.ok(true, "The Page "+sViewName+" is visible");
							},
							errorMessage: "The Page is not visible."
						});
					},

					iShouldSeeTheCardWithId: function (sId) {
						return this.waitFor({
							id: sId,
							viewName: sViewName,
							success: function () {
								Opa5.assert.ok(true, "The card '"+sId+"' is visible");
							},
							errorMessage: "Was not able to see the card '"+sId+"'."
						});
					},
					iShouldSeeTheCardBusyIndicatorWithId : function (sId) {
						return this.waitFor({
							id : sId,
							viewName : sViewName,
							success : function (oList) {
								// we set the list busy, so we need to query the parent of the app
								Opa5.assert.ok(oList.getBusy(), "The card "+sId+" is busy");
							},
							errorMessage : "The card "+sId+" is not busy."
						});
					}
				}

			}

		});

	}
);