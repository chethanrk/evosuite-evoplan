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

		var sViewName = "ResourceTree",
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
                    },
                    iCheckOneResource:function(){
                    	return this.waitFor({
							id: "droppableTable",
							viewName: sViewName,
							success: function (oTable) {
								var oCheckBox = oTable.getAggregation("rows")[0].getAggregation("cells")[2]; 
								oCheckBox.fireSelect({selected:true});
								
							},
							errorMessage: "Was not able to see the table."
						});
                    },
                     iClickOnThePlanningCal:function(){
                    	return this.waitFor({
                            id: "showPlanCalendar",
                            viewName: sViewName,
                        	actions:new Press(),
                            errorMessage: "Was not able to see Button Planning Calendar."
                        });
                    },
                     iClickOnTheUnassign:function(){
                    	return this.waitFor({
                            id: "idButtonunassign",
                            viewName: sViewName,
                            actions:new Press(),
                            errorMessage: "Was not able to see Button Unassign."
                        });
                    },
                     iClickOnTheAssignNew:function(){
                    	return this.waitFor({
                            id: "idButtonreassign",
                            viewName: sViewName,
                        	actions:new Press(),
                            errorMessage: "Was not able to see Button Reassign new."
                        });
                    }

				},

				assertions : {
                    iShouldSeeTableBusyIndicatorWithId: function (id) {
                        return this.waitFor({
                            id: id,
                            viewName: sViewName,
                            success: function (oRootView) {
                                Opa5.assert.ok(oRootView.getBusy(), "The table with ID "+id+" is busy");
                            },
                            errorMessage: "The busy indicator for table with ID "+id+" is not visible."
                        });
                    },
					iShouldSeeThePage: function () {
						return this.waitFor({
							id: "idResourcePage",
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
                            id: "resourceTreeFilterBarFragment",
                            viewName: sViewName,
                            success: function () {
                                Opa5.assert.ok(true, "The filter is visible");
                            },
                            errorMessage: "Was not able to see filter."
                        });
                    },
                    iShouldSeeTheSearchField: function () {
                        return this.waitFor({
                            id: "searchField",
                            viewName: sViewName,
                            success: function () {
                                Opa5.assert.ok(true, "Search field is visible");
                            },
                            errorMessage: "Was not able to see search field."
                        });
                    },
                    iShouldSeeTheCustomVariant: function () {
                        return this.waitFor({
                            id: "customResourceVariant",
                            viewName: sViewName,
                            success: function () {
                                Opa5.assert.ok(true, "Custom variant is visible");
                            },
                            errorMessage: "Was not able to see custom variant."
                        });
                    },
                    iShouldSeeFooterPlanningButtonAs: function (bEnabled) {
                        return this.waitFor({
                            id: "showPlanCalendar",
                            viewName: sViewName,
                            matchers:new PropertyStrictEquals({
                            	name:"enabled",
                            	value:bEnabled
                            }),
                            success: function () {
                                Opa5.assert.ok(true, "Footer button Planning Calendar is visible and it is enabled("+bEnabled+")");
                            },
                            errorMessage: "Was not able to see Button Planning Calendar."
                        });
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
                    iShouldSeeFilterItems: function () {
                        return this.waitFor({
                        	controlType:"sap.m.ViewSettingsDialog",
                            success: function (aDialogs) {
                            	var oDialog = aDialogs[0];
                            	var aItems = oDialog.getAggregation("filterItems");
                                Opa5.assert.ok(aItems.length === 3, "The filter dialog has "+aItems.length+" filter Settings");
                            },
                            errorMessage: "Can not find open filter settings"
                        });
                    },
                    iShouldSeeFooterManageAbsenceButtonAs:function(bEnabled){
                    	 return this.waitFor({
                            id: "idButtonCreUA",
                            viewName: sViewName,
                            matchers:new PropertyStrictEquals({
                            	name:"enabled",
                            	value:bEnabled
                            }),
                            success: function () {
                                Opa5.assert.ok(true, "Footer button Manage Absence is visible and it is enabled("+bEnabled+")");
                            },
                            errorMessage: "Was not able to see Manage Absence."
                        });
                    },
                    iShouldSeeFooterUnassignButtonAs:function(bEnabled){
                    	 return this.waitFor({
                            id: "idButtonunassign",
                            viewName: sViewName,
                            matchers:new PropertyStrictEquals({
                            	name:"enabled",
                            	value:bEnabled
                            }),
                            success: function () {
                                Opa5.assert.ok(true, "Footer button Unassign is visible and it is enabled("+bEnabled+")");
                            },
                            errorMessage: "Was not able to see Button Unassign."
                        });
                    },
                    iShouldSeeFooterAssignNewButtonAs:function(bEnabled){
                    	 return this.waitFor({
                            id: "idButtonreassign",
                            viewName: sViewName,
                            matchers:new PropertyStrictEquals({
                            	name:"enabled",
                            	value:bEnabled
                            }),
                            success: function () {
                                Opa5.assert.ok(true, "Footer button Reassign new is visible and it is enabled("+bEnabled+")");
                            },
                            errorMessage: "Was not able to see Button Reassign new."
                        });
                    },
                    iShouldSeePlanningCalendar:function(key){
                    	 return this.waitFor({
                            controlType:"sap.m.Dialog",
                            viewName: sViewName,
                            success: function (oDialog) {
                            	Opa5.assert.ok(oDialog[0].getTitle() === "Resource Planning Calendar", "Planning calendar is visible");
                            },
                            errorMessage: "Was not able to see Button Reassign new."
                        });
                    },
                    iShouldSeeAssignUnassignDialog:function(key){
                    	 return this.waitFor({
                        	controlType:"sap.m.Dialog",
                            viewName: sViewName,
                            success: function (oDialog) {
                            	setTimeout(function(){
                            		return this.waitFor({
			                        	controlType:"sap.m.Dialog",
			                            viewName: sViewName,
			                            success: function (oDialog) {
			                            	Opa5.assert.ok(oDialog[0].getTitle() === key, "Dialog has the title "+key);
			                            },
			                            errorMessage: "Was not able to see Button Reassign new."
			                        });
                            		
                            	}, 500);
			                       
                            },
                            errorMessage: "Was not able to see Button Reassign new."
                        });
                    },
                    iCloseTheDialog:function(){
                    	return this.waitFor({
							controlType:"sap.m.Button",
							searchOpenDialogs : true,
							success:function(aButton){
								for(var i in aButton){
									if(aButton[i].getText() === "Close"){
										aButton[i].firePress();
										 Opa5.assert.ok(true, "Dialog is Closed");
									}
								}
							},
							errorMessage : "Dialog doesn't have Close Button"
						});
                    },
                    iShouldSeeTheDialog: function(){
                    	 return this.waitFor({
                        	controlType:"sap.m.Dialog",
                            viewName: sViewName,
                            success: function (oDialog) {
			                      Opa5.assert.ok(true, "Dialog is visible");
                            },
                            errorMessage: "Was not able to see the dialog."
                        });
                    }

				}

			}

		});

	}
);