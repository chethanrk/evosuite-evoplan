sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/actions/EnterText",
	"com/evorait/evoplan/test/integration/pages/Common",
	"sap/ui/test/matchers/I18NText",
	"sap/ui/test/matchers/PropertyStrictEquals",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/Properties"
], function (Opa5, Press, EnterText, Common, I18NText, PropertyStrictEquals, AggregationFilled, Properties) {
	"use strict";

	var sViewName = "Detail";

	Opa5.createPageObjects({
		onOverviewPage: {
			baseClass: Common,
			actions: {
				iPressTheBackButton: function () {
					return this.waitFor({
						id: "ObjectPageLayout",
						viewName: sViewName,
						actions: new Press(),
						errorMessage: "Did not find the nav button on object page"
					});
				},
				iClickOnTheChangeStatus: function () {
					return this.waitFor({
						id: "idStatusHeaderAction",
						viewName: sViewName,
						actions: new Press(),
						errorMessage: "Did not see the change status button"
					});
				},
				iClickOnTheAssignment: function () {
					return this.waitFor({
						id: "assignMentsBlock",
						viewName: sViewName,
						success: function (oPage) {
							var oTable = oPage.getAggregation("_views")[0].getAggregation("content")[0];
							if (oTable) {
								var oItem = oTable.getAggregation("items")[0];
								oTable.fireItemPress({
									listItem: oItem
								});
							}
						},
						actions: new Press(),
						errorMessage: "Page doesn't have Assignment Table"
					});
				},
				iCloseAssignInfoDialog: function () {
					return this.waitFor({
						controlType: "sap.m.Button",
						viewName: sViewName,
						searchOpenDialogs: true,
						success: function (aButton) {
							for (var i in aButton) {
								if (aButton[i].getId() === "idCloseAssignInfD") {
									aButton[i].firePress();
									Opa5.assert.ok(true, "Close button pressed.");
								}
							}
						},
						errorMessage: "AssignInfo Dialog doesn't have Close Button"
					});
				}
			},
			assertions: {
				iShouldSeeTheRememberedObject: function () {
					return this.waitFor({
						success: function () {
							var sBindingPath = this.getContext().currentItem.bindingPath;
							this.waitFor({
								id: "ObjectPageLayout",
								viewName: sViewName,
								autoWait: true,
								success: function (oPage) {
									Opa5.assert.strictEqual(oPage.getBindingContext().getPath(), sBindingPath, "was on the remembered detail page");
								},
								errorMessage: "Remembered object " + sBindingPath + " is not shown"
							});
						}
					});
				},
				iShouldSeeRespectiveStatus: function () {
					return this.waitFor({
						id: "idStatusActionSheet",
						viewName: sViewName,
						matchers: new AggregationFilled({
							name: "buttons"
						}),
						success: function (aButtons) {
							Opa5.assert.ok(true, "We can see only one status transition.");
						},
						errorMessage: "Action sheet is not visible"
					});
				},
				iShouldSeeStatus: function (sStatus) {
					return this.waitFor({
						viewName: sViewName,
						searchOpenDialogs: true,
						controlType: "sap.m.Button",
						matchers: function (oButton) {
							return oButton.getText() === sStatus && oButton.getVisible();
						},
						success: function (oButton) {
							Opa5.assert.ok(true, "We can see " + sStatus + " Status button.");
						},
						errorMessage: "Action sheet is not visible"
					});
				},
				theViewIsNotBusyAnymore: function () {
					return this.waitFor({
						id: "ObjectPageLayout",
						viewName: sViewName,
						matchers: function (oPage) {
							return !oPage.getBusy();
						},
						success: function (oPage) {
							Opa5.assert.ok(!oPage.getBusy(), "The object view is not busy.");
						},
						errorMessage: "The object view is busy"
					});
				},
				iShouldSeeTheAssignButton: function (sText) {
					return this.waitFor({
						id: "idAssignHeaderAction",
						viewName: sViewName,
						success: function (oButton) {
							Opa5.assert.equal(oButton.getText(), "Assign", "AssignButton Found .");
						},
						errorMessage: "Assign button not found"
					});
				},
				iShouldSeeTheChangeStatusButton: function (sText) {
					return this.waitFor({
						id: "idStatusHeaderAction",
						viewName: sViewName,
						success: function (oButton) {
							Opa5.assert.equal(oButton.getText(), "Change Status", "Change status Button Found .");
						},
						errorMessage: "Change status button not found"
					});
				},
				iShouldSeeTheCancelButton:function (sText) {
					return this.waitFor({
						id: "idBtnCancel",
						viewName: sViewName,
						success: function (oButton) {
							Opa5.assert.equal(oButton.getText(), "Cancel", "Cancel Button Found .");
						},
						errorMessage: "Cancel button not found"
					});
				},
				iShouldSeeBreadcrumbsLink:function () {
					return this.waitFor({
						id: "idbreadcrumbLink",
						viewName: sViewName,
						success: function (oButton) {
							Opa5.assert.ok(true, "Breadcrumb link is Visible.");
						},
						errorMessage: "Breadcrumb link"
					});
				},
				iShouldSeeTheDemandTitleAs: function (sText) {
					return this.waitFor({
						id: "ObjectPageLayoutHeaderTitle",
						viewName: sViewName,
						matchers: new PropertyStrictEquals({
							name: "objectTitle",
							value: sText
						}),
						success: function (oPage) {
							Opa5.assert.ok(true, "Object title " + sText + " Found .");
						},
						errorMessage: "Object title doesn't Found"
					});
				},
				iShouldSeeTheSections: function () {
					return this.waitFor({
						id: "ObjectPageLayout",
						viewName: sViewName,
						matchers: new AggregationFilled({
							name: "sections"
						}),
						success: function (oPage) {
							Opa5.assert.ok(true, "Page has sections.");
						},
						errorMessage: "Page doesn't have any sections"
					});
				},
				iShouldSeeAssignmentTable: function () {
					return this.waitFor({
						id: "assignMentsBlock",
						viewName: sViewName,
						success: function (oPage) {
							var oTable = oPage.getAggregation("_views")[0].getAggregation("content")[0];
							if (oTable) {
								Opa5.assert.ok(true, "The assianment table is found.");
							}
						},
						errorMessage: "Page doesn't have Assignment Table"
					});
				},
				iShouldSeeAssignInfoDialog: function (sTitle) {
					return this.waitFor({
						controlType: "sap.m.Dialog",
						viewName: sViewName,
						searchOpenDialogs: true,
						success: function (oDialog) {
							Opa5.assert.ok(oDialog[0].getTitle() === "Assignment", "AssignInfo Dialog is opened.");
						},
						errorMessage: "Page doesn't have AssignInfo Dialog"
					});
				}

			}
		}
	});
});