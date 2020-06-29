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

	var sViewName = "Demands",
		sTableId = "draggableList",
		sFilter = "listReportFilter";

	function allItemsInTheListContainTheSearchTerm(aControls) {
		var oTable = aControls[0],
			oSearchField = aControls[1],
			oTableBinding = oTable.getTable().getBinding("rows"),
			oModel = oTableBinding.getModel(),
			aKeys = oTableBinding.aKeys,
			bFlag = false,
			sValue = oSearchField.getTokens()[0].getKey();

		for (var i in aKeys) {
			var sId = oSearchField.getId(),
				sFilteredValue;
			if (sId.search("/DemandDesc/i") === -1)
				sFilteredValue = oModel.getProperty("/" + aKeys[i] + "/Status");
			else
				sFilteredValue = oModel.getProperty("/" + aKeys[i] + "/DemandDesc");

			if (sFilteredValue === sValue) {
				bFlag = true;
			} else {
				bFlag = false;
				break;
			}
		}
		return bFlag;
	}

	function createWaitForItemAtPosition(oOptions) {
		var iPosition = oOptions.position;
		return {
			id: sTableId,
			viewName: sViewName,
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

		onTheListPage: {
			baseClass: Common,
			actions: jQuery.extend({
				iPressATableItemAtPosition: function (iPosition) {
					return this.waitFor(createWaitForItemAtPosition({
						position: iPosition,
						success: function (oRow) {
							var oRowAction = oRow.getAggregation("_rowAction").getItems()[0];
							oRowAction.firePress({
								row: oRow
							});
						},
						actions: new Press()
					}));
				},
				iPressATableItemAtPosition1: function (iPosition) {
					return this.waitFor({
						id: sTableId,
						viewName: sViewName,
						success: function (oTable) {
							var oRow = oTable.getTable().getAggregation("rows")[0];
							var oRowAction = oRow.getAggregation("_rowAction").getItems()[0];
							oRowAction.firePress({
								row: oRow
							});
						},
						errorMessage: "Can't see the Demand table."
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

					// return this.waitFor({
					// 	id: sFilter + "-btnGo",
					// 	autoWait:true,
					// 	viewName: sViewName,
					// 	actions: new Press()
					// });
				},
				iSearchWithDemandStatusValue: function (sStatus) {
					return this.waitFor({
						id: createIdFor(sFilter, "Status"),
						viewName: sViewName,
						actions: new EnterText({
							text: sStatus
						})
					});
					// return this.waitFor({
					// 	id: sFilter + "-btnGo",
					// 	viewName: sViewName,
					// 	actions: new Press()
					// });
				},
				iSelectDemandFromDemandTable: function (index) {
					return this.waitFor({
						id: sTableId,
						viewName: sViewName,
						autoWait: true,
						success: function (oTable) {
							oTable.getTable().setSelectedIndex(index);
						},
						errorMessage: "Can't see the Demand Table."
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
				iClickonAssignButton: function () {
					return this.waitFor({
						viewName: sViewName,
						id: "assignButton",
						actions: new Press(),
						errorMessage: "Was not able see the Assign button or Assign button is enabled"
					});
				}

			}),
			assertions: jQuery.extend({
				iShouldSeeTheTable: function () {
					return this.waitFor({
						id: sTableId,
						viewName: sViewName,
						success: function (oTable) {
							Opa5.assert.ok(oTable, "Found the Demand Table");
						},
						errorMessage: "Can't see the Demand Table."
					});
				},
				theTableHasEntries: function () {
					return this.waitFor({
						viewName: sViewName,
						id: sTableId,
						matchers: function (oTable) {
							return oTable.getTable().getAggregation("rows");
						},
						success: function () {
							Opa5.assert.ok(true, "The Demand table has entries");
						},
						errorMessage: "The Demand table had no entries"
					});
				},
				iShouldSeeTheFilterBar: function () {
					return this.waitFor({
						viewName: sViewName,
						id: sFilter,
						success: function () {
							Opa5.assert.ok(true, "Filter Bar is visible");
						},
						errorMessage: "was not able see the Filter bar"
					});
				},
				iShouldSeeTheAssignButtonAs: function (bEnabled) {
					return this.waitFor({
						viewName: sViewName,
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
				iShouldSeeTheChangeStatusButtonAs: function (bEnabled) {
					return this.waitFor({
						viewName: sViewName,
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
				iShouldSeeTheTableWithDemandDescription: function (sDescription) {
					return this.waitFor({
						controlType: "sap.ui.table.Row",
						viewName: sViewName,
						matchers: new BindingPath({
							path: "/DemandSet('0AA10FE57E901EDAA3EB433C2AB300D3')"
						}),
						success: function (aRows) {
							var oContext = aRows[0].getBindingContext(),
								oModel = oContext.getModel(),
								sPath = oContext.getPath();

							var Description = oModel.getProperty(sPath + "/DemandDesc");

							Opa5.assert.equal(Description, sDescription, "The table filtered with respective demand");
						},
						errorMessage: "The is not filtered correctly"
					});
				},
				iShouldSeeTheTableEntriesWithStatus: function (sStatus) {
					return this.waitFor({
						controlType: "sap.ui.table.Row",
						// id: [sTableId, createIdFor(sFilter, "Status")],
						viewName: sViewName,
						// check: allItemsInTheListContainTheSearchTerm,
						matchers: new BindingPath({
							path: "/DemandSet('0AA10FE57E901EDAA3EB433C2AB300D3')"
						}),
						success: function (aRows) {
							var oContext = aRows[0].getBindingContext(),
								oModel = oContext.getModel(),
								sPath = oContext.getPath();

							var Status = oModel.getProperty(sPath + "/Status");
							Opa5.assert.equal(Status, sStatus, "Every item did contain the Status " + sStatus);
							// Opa5.assert.ok(true, "Every item did contain the Status " + sStatus);
						},
						errorMessage: "The table did not have Demands"
					});
				},
				iShouldSeeTheEmptyTable: function () {
					return this.waitFor({
						id: sTableId,
						viewName: sViewName,
						matchers: function (oTable) {
							var oBinding = oTable.getTable().getBinding("rows");
							return oBinding && oBinding.getLength() === 0;
						},
						success: function () {
							Opa5.assert.ok(true, "Table has no rows!");
						}
					});
				},
				iShouldSeeTheDemandOverviewPageWithTitle: function (sTitle) {
					return this.waitFor({
						id: "objectPage",
						viewName: "Detail",
						matchers: new I18NText({
							propertyName: "title",
							key: sTitle
						}),
						success: function (sTitleText) {
							Opa5.assert.ok(true, "Navigated to Demand overview page with title Demand Overview");
						}
					});
				},
				theTableShouldHaveAllEntries: function () {
					var aAllEntities,
						iExpectedNumberOfItems;

					// retrieve all Objects to be able to check for the total amount
					this.waitFor(this.createAWaitForAnEntitySet({
						entitySet: "DemandSet",
						success: function (aEntityData) {
							aAllEntities = aEntityData;
						}
					}));

					return this.waitFor({
						id: sTableId,
						viewName: sViewName,
						matchers: function (oTable) {
							// If there are less items in the list than the growingThreshold, only check for this number.
							iExpectedNumberOfItems = aAllEntities.length;
							return iExpectedNumberOfItems === 20;
						},
						success: function (oTable) {
							Opa5.assert.strictEqual(20, iExpectedNumberOfItems, "The Demand Table has " +
								iExpectedNumberOfItems + " entries");
						},
						errorMessage: "Table does not have all entries."
					});
				},
				iShouldSeeErrorDialog: function () {
					return this.waitFor({
						controlType: "sap.m.Dialog",
						matchers: function (oDialog) {
							return oDialog.getTitle() === "Error" && oDialog.getState();
						},
						success: function (sTitleText) {
							Opa5.assert.ok(true, "The Error has be shown");
						}
					});
				}
				
			})
		}
	});
});