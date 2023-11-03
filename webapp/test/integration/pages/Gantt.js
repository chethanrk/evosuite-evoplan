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

	var sViewName = "App",	
		sFilter = "listReportFilter";
		

	function createWaitForItemAtPosition(oOptions) {
		var iPosition = oOptions.position;
		return {
			id: "draggableList",
			viewName: "gantt.GanttDemands",
			matchers: function (oTable) {
				return oTable.getTable().getAggregation("rows")[iPosition];
			},
			actions: oOptions.actions,
			success: oOptions.success,
			errorMessage: "Table in view '" + sViewName + "' does not contain an Item at position '" + iPosition + "'"
		};
	}
	
		function createIdFor(sFilterBarId, sEntityPropertyName) {
		return sFilterBarId + "-filterItemControl_BASIC-" + sEntityPropertyName;
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
						viewName: "gantt.GanttDemands",
						id: "draggableList",
						autoWait: true,
						errorMessage: "Can't see the Gantt Demand Table "
					});
				},
				iClickOnTheTodayButton: function () {
					return this.waitFor({
						id: "idToday",
						viewName: "gantt.Gantt",
						actions: new Press(),
						errorMessage: "Was not able to see Button Today  new."
					});
				},
				iClickOnTheManageAbsennceButton: function () {
					return this.waitFor({
						id: "idButtonCreUA",
						viewName: "gantt.Gantt",
						actions: new Press(),
						errorMessage: "Was not able to see Button Manage Absence."
					});
				},
				iClickOnTheChangeStatusButton: function () {
					return this.waitFor({
						id: "changeStatusButton",
						viewName: "gantt.GanttDemands",
						actions: new Press(),
						errorMessage: "Was not able to see Button Change Satus."
					});
				},
				iClickOnTheAssignButton: function () {
					return this.waitFor({
						id: "assignButton",
						viewName: "gantt.GanttDemands",
						actions: new Press(),
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
				},
				iHaveDemandFilterButton: function () {
					return this.waitFor({
						id: "idBtnGanttFilter",
						viewName: "gantt.GanttDemands",
						//	autoWait: true,
						//	actions:new Press(),
						success: function () {
							Opa5.assert.ok(true, "Demand Gantt Filter Button is visible");
						},
						errorMessage: "Was not able to see Demand Filter Button."
					});
				},
				iGanttDemandFilterButtonIsClicked: function () {
					return this.waitFor({
						viewName: "gantt.GanttDemands",
						id: "idBtnGanttFilter",
						autoWait: true,
						actions: new Press(),
						// success: function () {
						// 	Opa5.assert.ok(true, "Demand Gantt Filter Button is clicked and Filter Pop-Up opens");
						// },
						errorMessage: "Demand Gantt Filter Button is not visible"
					});
				},
			
					iSearchWithGanttDemandStatusValue: function (sStatus) {
					return this.waitFor({
						id: createIdFor(sFilter, "Status"),
						viewName: "gantt.GanttDemands",
						actions: new EnterText({
							text: sStatus
						})
					});
				},
				
					iSearchWithGanttDemandOrderIdValue: function (sORDERID) {
					return this.waitFor({
						id: createIdFor(sFilter, "ORDERID"),
						viewName: "gantt.GanttDemands",
						actions: new EnterText({
							text: sORDERID
						})
					});
				}

			},
			assertions: {
				 
				iShouldSeeTheGanttDemandTableEntriesWithOrderId : function (sORDERID) {
					return this.waitFor({
						controlType: "sap.ui.table.Row",
						viewName: "gantt.GanttDemands",
						matchers: new BindingPath({
							path: "/DemandSet('0AA10FE57E901EDAA5B923B327196450')"
						}),
						success: function (aRows) {
							var oContext = aRows[0].getBindingContext(),
								oModel = oContext.getModel(),
								sPath = oContext.getPath();

							var oOrderId = oModel.getProperty(sPath + "/ORDERID");
							Opa5.assert.equal(oOrderId, sORDERID, "Gantt Demand Order Field search is working " + sORDERID);
						},
						errorMessage: "Gantt Demand Order Field search is not working"
					});
				},
				
				
					iShouldSeeTheGanttDemandTableEntriesWithStatus: function (sStatus) {
					return this.waitFor({
						controlType: "sap.ui.table.Row",
						viewName: "gantt.GanttDemands",
						matchers: new BindingPath({
							path: "/DemandSet('0AA10FE57E901EDAA5B923B327196450')"
						}),
						success: function (aRows) {
							var oContext = aRows[0].getBindingContext(),
								oModel = oContext.getModel(),
								sPath = oContext.getPath();

							var Status = oModel.getProperty(sPath + "/Status");
							Opa5.assert.equal(Status, sStatus, "Gantt Demand Status Field search is working " + sStatus);
						},
						errorMessage: "Gantt Demand Status Field search is not working"
					});
				},
				
				iGanttDemandFilterPopUpOpen: function () {
					return this.waitFor({
						viewName: "gantt.GanttDemands",
						id: "idGanttDemandFilterDialog",
						success: function (oDialog) {
							if (oDialog.isOpen()) {
								Opa5.assert.ok(true, "Gantt Demand Filter Dialog is opened");
							}
						},
						errorMessage: "There is no Button Available"
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
				},
				iShouldSeeGantt: function () {
					return this.waitFor({
						id: "ganttPage",
						viewName: "gantt.Gantt",

						success: function () {
							Opa5.assert.ok(true, "Navigated to Gantt overview page");
						},
						errorMessage: "Loading Failed"
					});
				},
				iShouldSeeDemandTable: function () {
					return this.waitFor({
						id: "draggableList",
						viewName: "gantt.GanttDemands",

						success: function () {
							Opa5.assert.ok(true, "Demand Table is available");
						},
						errorMessage: "Demand Table is not available"
					});
				},
				iShouldSeeTheTodayButtonAs: function () {
					return this.waitFor({
						viewName: "gantt.Gantt",
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
						viewName: "gantt.GanttDemands",
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
								viewName: "gantt.GanttDemands",
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
							Opa5.assert.ok(true, "Navigated to Detail View");
						}

					});
				}

			}
		}
	});
});