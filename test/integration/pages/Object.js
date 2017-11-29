sap.ui.define([
		"sap/ui/test/Opa5",
		"sap/ui/test/actions/Press",
		"sap/ui/test/actions/EnterText",
		"com/evorait/evoplan/test/integration/pages/Common",
		"sap/ui/test/matchers/PropertyStrictEquals",
		"sap/ui/test/matchers/AggregationLengthEquals",
		"sap/ui/test/matchers/AggregationFilled",
		"sap/ui/test/matchers/Properties"
	], function(Opa5, Press, Enter, Common, PropertyStrictEquals, AggregationLengthEquals, AggregationFilled, Properties) {
		"use strict";

		var sViewName = "Detail",
			sControl = "Detail",
			oI18nResourceBundle = undefined;

		Opa5.createPageObjects({
			onTheObjectPage : {
				baseClass : Common,

				actions : {
					iPressTheBackButton: function () {
						return this.onNavBack(sViewName);
					},
					iPressTheHomeButton: function () {
						return this.onNavHome(sViewName);
					},
					iPressTheEditButton: function(){
						return this.waitFor({
							id: "editWorkOrderButton",
							viewName: sViewName,
							actions: new Press(),
							errorMessage: "Did not find the edit workorder button on object page"
						});
					},
					iPressTheCancelButton: function(){
						return this.waitFor({
							id: "cancelWorkOrderButton",
							viewName: sViewName,
							actions: new Press(),
							errorMessage: "Did not find the cancel workorder button on object page"
						});
					},
					iPressTheSaveButton: function(){
						return this.waitFor({
							id: "saveWorkOrderButton",
							viewName: sViewName,
							actions: new Press(),
							errorMessage: "Did not find the save workorder button on object page"
						});
					}
				},

				assertions : {
					iShouldSeeThePage: function () {
						return this.waitFor({
							id: "objectPage",
							viewName: sViewName,
							success: function (oPage) {
								oI18nResourceBundle = oPage.getModel("i18n").getResourceBundle();
								Opa5.assert.ok(true, "The Page is visible");
							},
							errorMessage: "The Page is not visible."
						});
					},

					theTitleShouldDisplayTheName: function (sName, sSubName) {
						return this.waitFor({
							success: function () {
								return this.waitFor({
									id: "objectPageHeader",
									viewName: sViewName,
									matchers: new Properties({
										objectTitle: sName,
										objectSubtitle: sSubName
									}),
									success: function () {
										Opa5.assert.ok(true, "was on the remembered detail page");
									},
									errorMessage: "The Title "+sName+" ("+sSubName+") is not shown"
								});
							}
						});
					},

					iShouldSeeTheActionButtonLength: function(n){
						return this.waitFor({
							controlType : "sap.uxap.ObjectPageHeaderActionButton",
							viewName: sViewName,
							check : function (aButtons) {
								return aButtons.length === n;
							},
							success : function () {
								Opa5.assert.ok(true, "There are visible "+n+" Actionbuttons");
							},
							errorMessage: "Was not able to see the '"+n+"' Actionbuttons"
						});
					},
					iShouldSeeTheActionButton: function(sButtonId){
						return this.waitFor({
							id: sButtonId,
							viewName: sViewName,
							matchers: new Properties({
								visible: true
							}),
							success: function () {
								Opa5.assert.ok(true, "The Actionbutton '"+sButtonId+"' should be visible");
							},
							errorMessage: "Was not able to see the '"+sButtonId+"' button"
						});
					},
					iShouldSeeTheBlock: function (sBlockId) {
						return this.waitFor({
							id: sBlockId,
							viewName: sViewName,
							success: function () {
								Opa5.assert.ok(true, "The block '"+sBlockId+"' is visible");
							},
							errorMessage: "Was not able to see the block "+sBlockId
						});
					},
					iShouldSeeTheForm: function (isEditable) {
						return this.waitFor({
							id: "SmartWorkorderForm",
							viewName: "DetailsFormBlock",
							viewNamespace : "com.evorait.evoplan.block.details.",
							matchers: new Properties({
								editable: isEditable
							}),
							success: function () {
								Opa5.assert.ok(true, "The smartform is visible and editable: "+isEditable);
							},
							errorMessage: "Was not able to see the smartform."
						});
					},
					theBlockTableShouldHaveAllEntries: function (sBlockNamespace, sBlockName, sTableId, nLength) {
						return this.waitFor({
							id: sTableId,
							viewName: sBlockName,
							viewNamespace : "com.evorait.evoplan.block."+sBlockNamespace,
							matchers:  new AggregationLengthEquals({
								name: "items",
								length: nLength
							}),
							success: function () {
								Opa5.assert.ok(true, "The table '"+sTableId+"' has "+nLength+" items");
							},
							errorMessage: "Table '"+sTableId+"' does not have all entries."
						});
					}
				}

			}

		});

	}
);