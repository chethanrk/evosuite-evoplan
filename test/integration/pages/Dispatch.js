sap.ui.define([
		"sap/ui/test/Opa5",
		"sap/ui/test/actions/Press",
		"sap/ui/test/actions/EnterText",
		"com/evorait/evoplan/test/integration/pages/Common",
		"sap/ui/test/matchers/PropertyStrictEquals",
		"sap/ui/test/matchers/AggregationLengthEquals",
		"sap/ui/test/matchers/AggregationContainsPropertyEqual",
		"sap/ui/test/matchers/BindingPath",
		"sap/ui/test/matchers/Properties",
		"sap/ui/test/matchers/I18NText"
	], function(Opa5, Press, EnterText, Common, PropertyStrictEquals, AggregationLengthEquals, AggregationContainsPropertyEqual, BindingPath, Properties, I18NText) {
		"use strict";

		var sViewName = "Dispatch",
			sControl = "Dispatch",
			sTableId = "responsiveDispatchTable",
			oI18nResourceBundle = undefined;

		Opa5.createPageObjects({
			onTheDispatchPage : {
				baseClass : Common,

				actions : {
					iPressTheBackButton: function () {
						return this.onNavBack(sViewName);
					},
					iPressTheHomeButton: function () {
						return this.onNavHome(sViewName);
					},
					iPressOnTheTableWithTheTitleText: function (sId, sText) {
						return this.waitFor({
							controlType: "sap.m.ObjectIdentifier",
							viewName: sViewName,
							matchers: new Properties({
								title: sText,
								text: sId,
								titleActive: true
							}),
							actions: function (oItem) {
								oItem.fireTitlePress();
							},
							errorMessage: "No list item with title "+sText+" was found."
						});
					},
					iPressOnAssignNow: function () {
						var sText = oI18nResourceBundle.getText("assignUserPlaceholder");
						var alreadyPressed = false;
						return this.waitFor({
							controlType: "sap.m.ObjectAttribute",
							viewName: sViewName,
							check: function (oAttr) {
								return oAttr[0].getText() === sText
							},
							actions: function (oItem) {
								if(!alreadyPressed){
									oItem.firePress();
									alreadyPressed = true;
								}
							},
							errorMessage: "No list item with ObjectAttribute "+sText+" was found."
						});
					},
					iSelectUserInDialog: function (sId) {
						return this.waitFor({
							searchOpenDialogs : true,
							controlType: "sap.m.StandardListItem",
							viewName: sViewName,
							matchers:  new BindingPath({
								path: "/UsersVH('" + sId + "')"
							}),
							actions: new Press(),
							errorMessage: "Can not select user in open dialog"
						});
					},
					iSearchForValue : function (sId, aActions) {
						return this.waitFor({
							id : sId,
							viewName : sViewName,
							actions: aActions,
							errorMessage : "Failed to find search field in view.'"
						});
					},
					iSearchForSomething : function (sId, sText) {
						return this.iSearchForValue(sId, [new EnterText({text: sText}), new Press()]);
					}

				},

				assertions : {
					iShouldSeeThePage: function () {
						return this.waitFor({
							id: "dispatchPage",
							viewName: sViewName,
							success: function (oPage) {
								oI18nResourceBundle = oPage.getModel("i18n").getResourceBundle();
								Opa5.assert.ok(true, "The Page is visible");
							},
							errorMessage: "The Page is not visible."
						});
					},

					theTableShouldHaveAllRows: function (n) {
						return this.waitFor({
							id: sTableId,
							viewName: sViewName,
							matchers:  new AggregationLengthEquals({
								name: "items",
								length: n
							}),
							success: function (oTable) {
								Opa5.assert.ok(true, "The table has "+n+" rows");
							},
							errorMessage: "Table does not have all rows."
						});
					},

					theTableIsGroupedBy: function () {
						return this.waitFor({
							id: sTableId,
							viewName: sViewName,
							check: function (oTable) {
								var oFirstRow = oTable.getItems()[0];
								return oFirstRow._bGroupHeader;
							},
							success: function () {
								Opa5.assert.ok(true, "The fist table row is a group header");
							},
							errorMessage: "The first table row is no group header"
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
					},

					iShouldSeeUserSidebarWithUsers: function (n) {
						return this.waitFor({
							id: "userList",
							viewName: sViewName,
							matchers:  new AggregationLengthEquals({
								name: "items",
								length: n
							}),
							success: function () {
								Opa5.assert.ok(true, "The user list has "+n+" items");
							},
							errorMessage: "User list does not have all entries."
						});
					},

					iShouldSeeUserSidebarWithCharts: function (n) {
						return this.waitFor({
							controlType: "sap.viz.ui5.controls.VizFrame",
							viewName: sViewName,
							check : function (aVizFrame) {
								return aVizFrame.length === n;
							},
							success: function () {
								Opa5.assert.ok(true, "The user list has "+n+" charts");
							},
							errorMessage: "User list does not have all charts."
						});
					},

					iShouldSeeUserSelectDialog: function () {
						return this.waitFor({
							searchOpenDialogs : true,
							id: "selectUserDialogList",
							viewName: sViewName,
							success: function () {
								Opa5.assert.ok(true, "The select dialog is open");
							},
							errorMessage: "Can not find open select dialog"
						});
					},

					iShouldSeeSelectDialogUserItems: function (n) {
						return this.waitFor({
							searchOpenDialogs : true,
							id: "selectUserDialogList",
							viewName: sViewName,
							matchers:  new AggregationLengthEquals({
								name: "items",
								length: n
							}),
							success: function () {
								Opa5.assert.ok(true, "The select dialog with "+n+" user");
							},
							errorMessage: "Can not find open select dialog with "+n+" user"
						});
					},

					itShouldAssignUserToOperation: function (sExpectedText) {
						return this.waitFor({
							controlType: "sap.m.ObjectAttribute",
							viewName: sViewName,
							matchers: new PropertyStrictEquals({
								name: "text",
								value: sExpectedText
							}),
							success: function () {
								Opa5.assert.ok(true, "User is assigned to operation");
							},
							errorMessage: "Was not able to assign a user to this operation"
						});
					}


				}

			}

		});

	}
);