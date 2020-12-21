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

	var sViewName = "map.Map",
		sTableId = "draggableList",
		sFilter = "listReportFilter",
		sMap = "idGeoMap",
		sMapLegends = "idMapLegendsList";

	function createWaitForItemAtPosition(oOptions) {
		var iPosition = oOptions.position;
		return {
			id: sTableId,
			viewName: "GanttDemands",
			matchers: function (oTable) {
				return oTable.getTable().getAggregation("rows")[iPosition];
			},
			actions: oOptions.actions,
			success: oOptions.success,
			errorMessage: "Table in view '" + sViewName + "' does not contain an Item at position '" + iPosition + "'"
		};
	}

	function createWaitForObjectWithoutDefaults() {
		return {
			// make sure no controls are searched by the defaults
			viewName: null,
			controlType: null,
			id: null,
			searchOpenDialogs: false,
			autoWait: false
		}
	}

	function createIdFor(sFilterBarId, sEntityPropertyName) {
		return sFilterBarId + "-filterItemControl_BASIC-" + sEntityPropertyName;
	}

	Opa5.createPageObjects({
		onTheMapView: {
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
						viewName: "App",
						id: "idHeaderMenu",
						autoWait: true,
						actions: new Press(),
						errorMessage: "Can't see the Menu Button."
					});
				},
				iClickOnTheMenuItem: function () {
					return this.waitFor({
						viewName: "App",
						id: "idHeaderMenu",
						autoWait: true,
						success: function (oButton) {
							var oItems = oButton.getAggregation("menu").getAggregation("items");
							var menu = oButton.getAggregation("menu");
							menu.fireItemSelected({
								item: oItems[5]
							});
						},
						errorMessage: "Can't see the Menu Button."
					});
				},
				isMapDemandTableLoaded: function () {
					return this.waitFor({
						viewName: sViewName,
						id: sTableId,
						autoWait: true,
						errorMessage: "Can't see the Demand Table in Map View "
					});
				},
				iExpandFilter: function () {
					return this.waitFor({
						viewName: sViewName,
						id: sFilter,
						autoWait: true,
						success: function (oFilter) {
							oFilter.setFilterBarExpanded(true)
						},
						errorMessage: "Can't see the Filters."
					});
				},
				iExpandMapLegends: function () {
					return this.waitFor({
						viewName: sViewName,
						id: sMapLegends,
						autoWait: true,
						success: function (oMapLegends) {
							oMapLegends.setExpanded(true)
						},
						errorMessage: "Can't see the Map Legends."
					});
				},
				iSearchWithDemandDecriptionValue: function (sText) {
					return this.waitFor({
						id: createIdFor(sFilter, "DemandDesc"),
						viewName: sViewName,
						actions: new EnterText({
							text: sText
						})
					});
				},

				iSearchWithDemandStatusValue: function (sStatus) {
					return this.waitFor({
						id: createIdFor(sFilter, "Status"),
						viewName: sViewName,
						actions: new EnterText({
							text: sStatus
						})
					});
				},
				iSelectFirstItemFromMapLegendsList: function () {
					return this.waitFor({
						viewName: sViewName,
						id: sMapLegends,
						autoWait: true,
						success: function (oMapLegends) {
							var oItems = oMapLegends.getItems();
							oMapLegends.setSelectedItem(oItems[0], true, true);
						},
						errorMessage: "Can't see the Map Legends List."
					});
				},
				iClickOnTheTodayButton: function () {
					return this.waitFor({
						id: "idToday",
						viewName: "Gantt",
						actions: new Press(),
						errorMessage: "Was not able to see Button Today  new."
					});
				},
				iClickOnTheManageAbsennceButton: function () {
					return this.waitFor({
						id: "idButtonCreUA",
						viewName: "Gantt",
						actions: new Press(),
						errorMessage: "Was not able to see Button Manage Absence."
					});
				},
				iClickOnTheChangeStatusButton: function () {
					return this.waitFor({
						id: "changeStatusButton",
						viewName: "GanttDemands",
						actions: new Press(),
						errorMessage: "Was not able to see Button Change Satus."
					});
				},
				iClickOnTheAssignButton: function () {
					return this.waitFor({
						id: "assignButton",
						viewName: "GanttDemands",
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
				iShouldSeeTheMapView: function () {
					return this.waitFor({
						viewName: sViewName,
						id: "idMapDynamicPage",
						success: function () {
							Opa5.assert.ok(true, "Map View is Loaded");
						},
						errorMessage: "Map view is not loaded"
					});
				},
				iShouldSeeTheMap: function () {
					return this.waitFor({
						viewName: sViewName,
						id: sMap,
						success: function () {
							Opa5.assert.ok(true, "I can see the Map");
						},
						errorMessage: "Can't see the Map"
					});
				},
				iShouldSeeTheMapFilter: function () {
					return this.waitFor({
						id: sFilter,
						viewName: sViewName,
						success: function (oFilter) {
							var bExpanded = oFilter.getProperty("filterBarExpanded");
							if (bExpanded) {
								Opa5.assert.ok(true, "Filters available and its Expanded");
							} else {
								Opa5.assert.ok(true, "Filters available and its collapsed");
							}

						},
						errorMessage: "Unable to see Filters"
					});
				},
				iShouldSeeTheDemandTable: function () {
					return this.waitFor({
						id: sTableId,
						viewName: sViewName,
						success: function (oTable) {
							var bPressed = oTable.getToolbar().getContent()[2].getPressed();
							if (bPressed) {
								Opa5.assert.ok(true, "Demand Table is available and it is Collapsed");
							} else {
								Opa5.assert.ok(true, "Demand Table is available and it is Expanded");
							}
						},
						errorMessage: "Demand Table is not available for Map View"
					});
				},
				iShouldSeeTheMapLegends: function () {
					return this.waitFor({
						id: sMapLegends,
						viewName: sViewName,
						success: function (oMapLegends) {
							var vTotalItems = oMapLegends.getItems().length;
							if (vTotalItems) {
								Opa5.assert.ok(true, "Map Legends List is visible and has Items");
							} else {
								Opa5.assert.ok(true, "Map Legends List is visible but doesn't have Items");
							}
						},
						errorMessage: "Map Legends List is not visible"
					});
				},
				iShouldSeeTheTableWithDemandDescription: function (sDescription) {
					return this.waitFor({
						controlType: "sap.ui.table.Row",
						viewName: sViewName,
						matchers: new BindingPath({
							path: "/DemandSet('0AA10FE57E901EDAA5B923B327196450')"
						}),
						success: function (aRows) {
							var oContext = aRows[0].getBindingContext(),
								oModel = oContext.getModel(),
								sPath = oContext.getPath(),
								Description = oModel.getProperty(sPath + "/DemandDesc");

							Opa5.assert.equal(Description, sDescription, "The Table is filtered with respective demand Description");
						},
						errorMessage: "The table did not have Demands"
					});
				},
				iShouldSeeTheMapWithDemandDescription: function (sDescription) {
					return this.waitFor({
						viewName: sViewName,
						id: sMap,
						success: function (oMap) {
							// var oContext = aRows[0].getBindingContext(),
							// 	oModel = oContext.getModel(),
							// 	sPath = oContext.getPath(),
							// 	Description = oModel.getProperty(sPath + "/DemandDesc");

							// Opa5.assert.equal(Description, sDescription, "The Map is filtered with respective demand Description");
						},
						errorMessage: "The Map Did not have any Spot"
					});
				},
				iShouldSeeTheTableEntriesWithStatus: function (sStatus) {
					return this.waitFor({
						controlType: "sap.ui.table.Row",
						viewName: sViewName,
						matchers: new BindingPath({
							path: "/DemandSet('0AA10FE57E901EDAA5B923B327196450')"
						}),
						success: function (aRows) {
							var oContext = aRows[0].getBindingContext(),
								oModel = oContext.getModel(),
								sPath = oContext.getPath(),
								Status = oModel.getProperty(sPath + "/Status");

							Opa5.assert.equal(Status, sStatus, "Every item did contain the Status " + sStatus);
						},
						errorMessage: "The table did not have Demands"
					});
				},
				EntriesShouldBeFilteredWithMapLegendsSelectedItem: function () {
					return this.waitFor({
						viewName: sViewName,
						id: sTableId,
						success: function (oDemandsTable) {
							var oContext = oDemandsTable.getTable().getRows()[0].getBindingContext(),
								oModel = oContext.getModel(),
								sPath = oContext.getPath(),
								Status = oModel.getProperty(sPath + "/Status"),
								sStatus = "COMP";

							Opa5.assert.equal(Status, sStatus, "Every item did contain the Status " + sStatus);
						},
						errorMessage: "The table did not have Demands"
					});
				},
				iShouldSeeTheChangeStatusButtonAs: function (bEnabled) {
					return this.waitFor({
						viewName: "map.Map",
						id: "changeStatusButton",
						matchers: new PropertyStrictEquals({
							name: "enabled",
							value: bEnabled
						}),
						success: function () {
							if (bEnabled) {
								Opa5.assert.ok(true, "Change Status button is visible and it is enabled");
							} else {
								Opa5.assert.ok(true, "Change Status button is visible and it is disabled");
							}
						},
						errorMessage: "Was not able see the Assign button or Assign button is enabled"
					});
				},
				iShouldSeeTheAssignButtonAs: function (bEnabled) {
					return this.waitFor({
						viewName: "map.Map",
						id: "assignButton",
						matchers: new PropertyStrictEquals({
							name: "enabled",
							value: bEnabled
						}),
						success: function () {
							if (bEnabled) {
								Opa5.assert.ok(true, "Assign button is visible and it is enabled");
							} else {
								Opa5.assert.ok(true, "Assign button is visible and it is disabled");
							}
						},
						errorMessage: "Was not able see the Assign button or Assign button is enabled"
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
							Opa5.assert.ok(true, "Navigated to Detail View");
						}

					});
				}

			}
		}
	});
});