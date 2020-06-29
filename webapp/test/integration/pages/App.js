sap.ui.define([
	"sap/ui/test/Opa5",
	"com/evorait/evoplan/test/integration/pages/Common",
	"sap/ui/test/matchers/PropertyStrictEquals",
	"sap/ui/test/matchers/I18NText",
	"sap/ui/test/actions/Press"
], function (Opa5, Common, PropertyStrictEquals, I18NText, Press) {
	"use strict";

	var sViewName = "App",
		sAppControl = "idAppControl";

	Opa5.createPageObjects({
		onTheAppPage: {
			baseClass: Common,

			actions: {

				iWaitUntilTheBusyIndicatorIsGone: function () {
					return this.waitFor({
						id: sAppControl,
						viewName: sViewName,
						// inline-matcher directly as function
						matchers: function (oRootView) {
							// we set the view busy, so we need to query the parent of the app
							return oRootView.getParent().getBusy() === false;
						},
						errorMessage: "The app is still busy."
					});
				},
				iClickOnTheAboutIcon: function () {
					return this.waitFor({
						id: "idButtonAboutDialog",
						viewName: sViewName,
						actions: new Press(),
						errorMessage: "Can't see the About Button."
					});
				},
				iClickOnTheMenu: function () {
					return this.waitFor({
						viewName: sViewName,
						id: "idHeaderMenu",
						autoWait: true,
						actions: new Press(),
						errorMessage: "Can't see the Menu Button."
					});
				},
				iClickOnTheMenuItem: function () {
					return this.waitFor({
						viewName: sViewName,
						id: "idHeaderMenu",
						autoWait: true,
						success: function(oButton){
							var oItems = oButton.getAggregation("menu").getAggregation("items");
								var menu = oButton.getAggregation("menu");
								menu.fireItemSelected({item: oItems[1]});
						},
						errorMessage: "Can't see the Menu Button."
					});
				}

			},

			assertions: {

				iShouldSeeTheBusyIndicator: function () {
					return this.waitFor({
						id: sAppControl,
						viewName: sViewName,
						success: function (oRootView) {
							// we set the view busy, so we need to query the parent of the app
							Opa5.assert.ok(oRootView.getParent().getBusy(), "The app is busy");
						},
						errorMessage: "The app is not busy."
					});
				},
				iShouldSeeTheInformationPopupWithTitle: function (sTitle) {
					return this.waitFor({
						controlType: "sap.m.Dialog",
						matchers: new I18NText({
							propertyName: "title",
							key: sTitle
						}),
						success: function (sTitleText) {
							Opa5.assert.ok(true, "The infomation pop up with title About");
						}
					});
				},

				iShouldSeetheAboutDialogIcon: function () {
					return this.waitFor({
						viewName: sViewName,
						id: "idButtonAboutDialog",
						matchers: new PropertyStrictEquals({
							name: "icon",
							value: "sap-icon://sys-help"
						}),
						success: function () {
							Opa5.assert.ok(true, "I can see the button icon");
						},
						errorMessage: "There is no Button icon available for information pop up"
					});
				},
				iShouldSeeEvoplanLogo: function () {
					return this.waitFor({
						viewName: sViewName,
						id: "imageLogo",
						success: function () {
							Opa5.assert.ok(true, "I can see the Logo");
						},
						errorMessage: "There is no Logo Available"
					});
				},
				iShouldSeeRefreshButton: function () {
					return this.waitFor({
						viewName: sViewName,
						id: "idButtonRefresh",
						matchers: new PropertyStrictEquals({
							name: "icon",
							value: "sap-icon://refresh"
						}),
						success: function () {
							Opa5.assert.ok(true, "I can see the Refresh button icon");
						},
						errorMessage: "There is no Button available for refresh"
					});
				},
				iShouldSeeAboutButton: function () {
					return this.waitFor({
						viewName: sViewName,
						id: "idButtonAboutDialog",
						matchers: new PropertyStrictEquals({
							name: "icon",
							value: "sap-icon://sys-help"
						}),
						success: function () {
							Opa5.assert.ok(true, "I can see the About button icon");
						},
						errorMessage: "There is no Button icon available for information pop up"
					});
				},
				iShouldSeeTheMenu: function () {
					return this.waitFor({
						viewName: sViewName,
						id: "idHeaderMenu",
						success: function () {
							Opa5.assert.ok(true, "I can see the Menu Button");
						},
						errorMessage: "There is no Button Available"
					});
				},
				iShouldSeeMenuItems: function () {
					return this.waitFor({
						viewName: sViewName,
						id: "idHeaderMenu",
						autoWait: true,
						success: function (oButton) {
							var oItems = oButton.getAggregation("menu").getAggregation("items");
							Opa5.assert.equal(5, oItems.length, "I can see the Menu Items");
						},
						errorMessage: "There is no Button Available"
					});
				}
			}

		}

	});

});