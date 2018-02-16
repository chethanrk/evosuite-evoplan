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

		var sViewName = "MasterPage",
			sControl = "MasterPage",
			oI18nResourceBundle = undefined;

		Opa5.createPageObjects({
			onTheMasterPage : {
				baseClass : Common,

				actions : {
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
							id: "masterPage",
							viewName: sViewName,
							success: function (oPage) {
								oI18nResourceBundle = oPage.getModel("i18n").getResourceBundle();
								Opa5.assert.ok(true, "The Page is visible");
							},
							errorMessage: "The Page is not visible."
						});
					},
					iShouldSeeTheTable: function () {
						return this.waitFor({
							id: "droppableTable",
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