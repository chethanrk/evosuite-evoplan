sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/actions/EnterText",
	"com/evorait/evoplan/test/integration/pages/Common",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/PropertyStrictEquals",
	"sap/ui/test/matchers/BindingPath",
	"sap/ui/test/matchers/I18NText",
	"sap/ui/test/matchers/Properties"
], function (Opa5, Press, EnterText, Common, AggregationFilled, PropertyStrictEquals, BindingPath, I18NText, Properties) {
	"use strict";

	var sViewName = "App";
		
		function createWaitForItemAtPosition(oOptions) {
		var iPosition = oOptions.position;
		return {
			id: "draggableList",
			viewName: "GanttDemands",
			matchers: function (oTable) {
				return oTable.getTable().getAggregation("rows")[iPosition];
			},
			actions: oOptions.actions,
			success: oOptions.success,
			errorMessage: "Table in view '" + sViewName + "' does not contain an Item at position '" + iPosition + "'"
		};
	}

	Opa5.createPageObjects({
		onGantt: {
			baseClass: Common,
			actions: {
				iDoMyAction: function () {
					return this.waitFor({
						id: "controlId",
						viewName: sViewName,
						actions: new Press(),
						errorMessage: "Was not able to find the control with the id controlId"
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
						success: function (oButton) {
							var oItems = oButton.getAggregation("menu").getAggregation("items");
							var menu = oButton.getAggregation("menu");
							menu.fireItemSelected({
								item: oItems[3]
							});
						},
						errorMessage: "Can't see the Menu Button."
					});
				},
					isGanttDemandTableLoaded: function () {
					return this.waitFor({
						viewName: "GanttDemands",
						id: "draggableList",
						autoWait: true,
						errorMessage: "Can't see the Gantt Demand Table "
					});
				},
				 iClickOnTheTodayButton:function(){
                    	return this.waitFor({
                            id: "idToday",
                            viewName: "Gantt",
                        	actions:new Press(),
                            errorMessage: "Was not able to see Button Today  new."
                        });
                    },
                     iClickOnTheManageAbsennceButton:function(){
                    	return this.waitFor({
                            id: "idButtonCreUA",
                            viewName: "Gantt",
                        	actions:new Press(),
                            errorMessage: "Was not able to see Button Manage Absence."
                        });
                    },
                    iClickOnTheChangeStatusButton:function(){
                    	return this.waitFor({
                            id: "changeStatusButton",
                            viewName: "GanttDemands",
                        	actions:new Press(),
                            errorMessage: "Was not able to see Button Change Satus."
                        });
                    },
                    iClickOnTheAssignButton:function(){
                    	return this.waitFor({
                            id: "assignButton",
                            viewName: "GanttDemands",
                        	actions:new Press(),
                            errorMessage: "Was not able to see Assign Button."
                        });
                    },
                    iRememberTheItemAtPosition: function (iPosition) {
					return this.waitFor(createWaitForItemAtPosition({
						position: iPosition,
						success: function (oTableItem) {
							var oBindingContext = oTableItem.getBindingContext();

							// Don't remember objects just strings since IE will not allow accessing objects of destroyed frames
							this.getContext().currentItem = {
								bindingPath: oBindingContext.getPath(),
								id: oBindingContext.getProperty(oBindingContext.getPath() + "/Guid"),
								name: oBindingContext.getProperty(oBindingContext.getPath() + "/DemandDesc")
							};
						}
					}));
				}
			
			},
			assertions: {
			
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
				},
				iShouldSeeGantt: function () {
				return this.waitFor({
						id: "ganttPage",
						viewName: "Gantt",
		
						success: function () {
							Opa5.assert.ok(true, "Navigated to Gantt overview page");
						},
							errorMessage: "Loading Failed"
					});
				},
				iShouldSeeDemandTable: function () {
				return this.waitFor({
						id: "draggableList",
						viewName: "GanttDemands",
		
						success: function () {
							Opa5.assert.ok(true, "Demand Table is available");
						},
							errorMessage: "Demand Table is not available"
					});
				},
					iShouldSeeTheTodayButtonAs: function () {
					return this.waitFor({
						viewName: "Gantt",
						id: "idToday",
						matchers: new PropertyStrictEquals({
							name: "enabled",
							value: true
						}),
						success: function () {
							Opa5.assert.ok(true, "Manage Absence button is visible and it is disabled");
						},
						errorMessage: "Was not able see the Manage Absence button or Assign button is enabled"
					});
				},
					iShouldSeeTheAssignuttonAs: function () {
					return this.waitFor({
						viewName: "GanttDemands",
						id: "assignButton",
						matchers: new PropertyStrictEquals({
							name: "enabled",
							value: false
						}),
						success: function () {
							Opa5.assert.ok(true, "Manage Absence button is visible and it is disabled");
						},
						errorMessage: "Was not able see the Manage Absence button or Assign button is enabled"
					});
				},
					iShouldSeeTheChangeStatusButtonAs: function () {
					return this.waitFor({
						viewName: "fragments.DemandToolbar",
						id: "changeStatusButton",
						matchers: new PropertyStrictEquals({
							name: "enabled",
							value: false
						}),
						success: function () {
							Opa5.assert.ok(true, "Manage Absence button is visible and it is disabled");
						},
						errorMessage: "Was not able see the Manage Absence button or Assign button is enabled"
					});
				},
					iShouldSeeTheRememberedObject: function () {
					return this.waitFor({
						success: function () {
							var sBindingPath = this.getContext().currentItem.bindingPath;
							this.waitFor({
								id: "ObjectPageLayout",
								viewName: "GanttDemands",
								autoWait: true,
								success: function (oPage) {
									Opa5.assert.strictEqual(oPage.getBindingContext().getPath(), sBindingPath, "was on the remembered detail page");
								},
								errorMessage: "Remembered object " + sBindingPath + " is not shown"
							});
						}
					});
			},
			theViewIsNotBusyAnymore: function () {
					return this.waitFor({
		
						success: function (oPage) {
							Opa5.assert.ok(true,"Navigated to Detail View");
						}
					
					});
				}
		
			}
		}
	});
});