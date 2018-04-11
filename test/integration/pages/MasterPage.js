sap.ui.define([
		"sap/ui/test/Opa5",
		"sap/ui/test/actions/Press",
		"sap/ui/test/actions/EnterText",
		"com/evorait/evoplan/test/integration/pages/Common",
		"sap/ui/test/matchers/PropertyStrictEquals",
		"sap/ui/test/matchers/AggregationLengthEquals",
		"sap/ui/test/matchers/BindingPath",
    	"sap/ui/test/matchers/Properties",
        "sap/ui/test/matchers/I18NText",
        "sap/ui/test/matchers/AggregationContainsPropertyEqual"
	], function(Opa5, Press, EnterText, Common, PropertyStrictEquals, AggregationLengthEquals, BindingPath, Properties, I18NText, AggregationContainsPropertyEqual) {
		"use strict";

		var sViewName = "MasterPage",
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
						return this.iSearchForValue([
						    new EnterText({
                                text: ""
						    }), new Press()]);
					},
                    iPressOnFilterButton: function () {
                        var alreadyPressed = false;
                        return this.waitFor({
                            id : "filterResourceButton",
                            viewName: sViewName,
                            actions: function (oItem) {
                                if(!alreadyPressed){
                                    oItem.firePress();
                                    alreadyPressed = true;
                                }
                            },
                            errorMessage: "Could not press filter button."
                        });
                    }

				},

				assertions : {
                    iShouldSeeTableBusyIndicatorWithId: function (id) {
                        return this.waitFor({
                            id: id,
                            viewName: sViewName,
                            success: function (oRootView) {
                                console.log(oRootView);
                                Opa5.assert.ok(oRootView.getBusy(), "The table with ID "+id+" is busy");
                            },
                            errorMessage: "The busy indicator for table with ID "+id+" is not visible."
                        });
                    },
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
					},
                    iShouldSeeTheFilterButton: function () {
					    return this.waitFor({
                            id: "filterResourceButton",
                            viewName: sViewName,
                            success: function () {
                                Opa5.assert.ok(true, "The filter button is visible");
                            },
                            errorMessage: "Was not able to see filter button."
                        })
                    },
                    iShouldSeeTheSearchField: function () {
                        return this.waitFor({
                            id: "searchField",
                            viewName: sViewName,
                            success: function () {
                                Opa5.assert.ok(true, "Search field is visible");
                            },
                            errorMessage: "Was not able to see search field."
                        })
                    },
                    iShouldSeeTheCustomVariant: function () {
                        return this.waitFor({
                            id: "customResourceVariant",
                            viewName: sViewName,
                            success: function () {
                                Opa5.assert.ok(true, "Custom variant is visible");
                            },
                            errorMessage: "Was not able to see custom variant."
                        })
                    },
                    iShouldSeeFooterPlanningButton: function () {
                        return this.waitFor({
                            id: "showPlanCalendar",
                            viewName: sViewName,
                            success: function () {
                                Opa5.assert.ok(true, "Footer button Planning Calendar is visible");
                            },
                            errorMessage: "Was not able to see Button Planning Calendar."
                        })
                    },
                    theButtonTextShouldDisplayFilterNumber: function (sExpectedNumber) {
                        return this.waitFor({
                            id: "filterResourceButton",
                            viewName: sViewName,
                            matchers: new Properties({
                                text: sExpectedNumber
                            }),
                            success: function () {
                                Opa5.assert.ok(true, "The filter button number is " + sExpectedNumber);
                            },
                            errorMessage: "The filter button does not container the number " + sExpectedNumber
                        });
                    },
                    iShouldSeeFilterDialog: function () {
                        return this.waitFor({
                            searchOpenDialogs : true,
                            id: "filterViewDialog",
                            viewName: sViewName,
                            success: function () {
                                Opa5.assert.ok(true, "The filter dialog is open");
                            },
                            errorMessage: "Can not find open filter dialog"
                        });
                    },
                    iShouldSeeFilterItemWithTitle: function (sExpectedText) {
                        sExpectedText = oI18nResourceBundle.getText(sExpectedText);
                        return this.waitFor({
                        	searchOpenDialogs : true,
                        	id: "filterViewDialog",
                        	viewName: sViewName,
                            matchers:function(oDialog){
                            	console.log(oDialog);
                            },
                            success: function (oItems) {
                                Opa5.assert.ok(true, "The filter dialog has filter settings for " + sExpectedText);
                            },
                            errorMessage: "Can not find in filter dialog setting for " + sExpectedText
                        });
                    }

				}

			}

		});

	}
);