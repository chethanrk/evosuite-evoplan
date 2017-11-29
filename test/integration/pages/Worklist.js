sap.ui.define([
		"sap/ui/test/Opa5",
		"sap/ui/test/actions/Press",
		"sap/ui/test/actions/EnterText",
		"com/evorait/evoplan/test/integration/pages/Common",
		"sap/ui/test/matchers/PropertyStrictEquals",
		"sap/ui/test/matchers/AggregationLengthEquals",
		"sap/ui/test/matchers/BindingPath"
	], function(Opa5, Press, Enter, Common, PropertyStrictEquals, AggregationLengthEquals, BindingPath) {
		"use strict";

		var sViewName = "Worklist",
			sControl = "Worklist",
			sTableId = "responsiveWorkOrderTable",
			oI18nResourceBundle = undefined;

		Opa5.createPageObjects({
			onTheWorklistPage : {
				baseClass : Common,

				actions : {
					iPressTheBackButton: function () {
						return this.onNavBack(sViewName);
					},
					iPressTheHomeButton: function () {
						return this.onNavHome(sViewName);
					},
					iPressOnTheItemWithTheID: function (sId) {
						return this.waitFor({
							controlType: "sap.m.ColumnListItem",
							viewName: sViewName,
							matchers:  new BindingPath({
								path: "/WorkOrders('" + sId + "')"
							}),
							actions: new Press(),
							errorMessage: "No list item with the id " + sId + " was found."
						});
					},
					iSearchForValue : function (aActions) {
						return this.waitFor({
							id : "searchField",
							viewName : sViewName,
							actions: aActions,
							errorMessage : "Failed to find search field in view.'"
						});
					},
					iSearchForSomethingWithNoResults : function () {
						return this.iSearchForValue([new EnterText({text: sSomethingThatCannotBeFound}), new Press()]);
					}

				},

				assertions : {
					iShouldSeeThePage: function () {
						return this.waitFor({
							id: "worklistPage",
							viewName: sViewName,
							success: function (oPage) {
								oI18nResourceBundle = oPage.getModel("i18n").getResourceBundle();
								Opa5.assert.ok(true, "The Page is visible");
							},
							errorMessage: "The Page is not visible."
						});
					},

					theTableShouldHaveAllEntries: function (n) {
						return this.waitFor({
							id: sTableId,
							viewName: sViewName,
							matchers:  new AggregationLengthEquals({
								name: "items",
								length: n
							}),
							success: function () {
								Opa5.assert.ok(true, "The table has "+n+" items");
							},
							errorMessage: "Table does not have all entries."
						});
					},

					theTitleShouldDisplayTheTotalAmountOfItems: function () {
						return this.waitFor({
							id: "listReportTable",
							viewName: sViewName,
							matchers: function (oPage) {
								var sExpectedText = oPage.getModel("i18n").getResourceBundle().getText("worklistTableTitleCount", [5]);
								return new PropertyStrictEquals({
									name: "text",
									value: sExpectedText
								}).isMatching(oPage);
							},
							success: function () {
								Opa5.assert.ok(true, "The table header has 5 items");
							},
							errorMessage: "The Table's header does not container the number of items: 5"
						});
					},
					iShouldSeeTheTable: function () {
						return this.waitFor({
							id: sTableId,
							viewName: sViewName,
							success: function () {
								Opa5.assert.ok(true, "The table is visible");
							},
							errorMessage: "Was not able to see the table."
						});
					}

				}

			}

		});

	}
);