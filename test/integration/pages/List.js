sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/actions/EnterText",
	"com/evorait/evoplan/test/integration/pages/Common",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/PropertyStrictEquals"
], function(Opa5, Press, EnterText, Common, AggregationFilled, PropertyStrictEquals) {
	"use strict";
	
	var sViewName = "List",
		sTableId = "draggableList",
		sFilter = "listReportFilter";
		
		function allItemsInTheListContainTheSearchTerm (aControls) {
			var oTable = aControls[0],
				oSearchField = aControls[1],
				aItems = oTable.getItems();

			// table needs items
			if (aItems.length === 0) {
				return false;
			}

			return aItems.every(function (oItem) {
				return oItem.getCells()[0].getTitle().indexOf(oSearchField.getValue()) !== -1;
			});
		}
		
		function createWaitForItemAtPosition (oOptions) {
			var iPosition = oOptions.position;
			return {
				id : sTableId,
				viewName : sViewName,
				matchers : function (oTable) {
					return oTable.getTable().getAggregation("rows")[iPosition].getAggregation("rowActionTemplate").getAggregation("items")[0];
				},
				actions : oOptions.actions,
				success : oOptions.success,
				errorMessage : "Table in view '" + sViewName + "' does not contain an Item at position '" + iPosition + "'"
			};
		}
		
	Opa5.createPageObjects({
		
		onTheListPage: {
			baseClass : Common,
			actions: jQuery.extend({
				iPressATableItemAtPosition :  function (iPosition) {
						return this.waitFor(createWaitForItemAtPosition({
							position : iPosition,
							actions : new Press()
						}));
				}
			}),
			assertions: jQuery.extend({
				iShouldSeeTheTable : function () {
						return this.waitFor({
							id : sTableId,
							viewName : sViewName,
							success : function (oTable) {
								Opa5.assert.ok(oTable, "Found the Demand Table");
							},
							errorMessage : "Can't see the Demand Table."
						});
					},
				theTableHasEntries : function () {
						return this.waitFor({
							viewName : sViewName,
							id : sTableId,
							matchers : function(oTable){
								return oTable.getTable().getAggregation("rows");
							},
							success : function () {
								Opa5.assert.ok(true, "The table has entries");
							},
							errorMessage : "The table had no entries"
						});
					},
				iShouldSeetheAboutDialogIcon : function () {
						return this.waitFor({
							viewName : sViewName,
							id : "idButtonAboutDialog",
							matchers : new PropertyStrictEquals({
								name:"icon",
								value:"sap-icon://sys-help"
							}),
							success : function () {
								Opa5.assert.ok(true, "I can see the button icon");
							},
							errorMessage : "There is no Button icon available for information pop up"
						});
					},
				iShouldSeeTheFilterBar : function () {
						return this.waitFor({
							viewName : sViewName,
							id : sFilter,
							success : function () {
								Opa5.assert.ok(true, "Filter Bar is visible");
							},
							errorMessage : "was not able see the Filter bar"
						});
					},
				iShouldSeeTheAssignButtonAsDisabled : function () {
						return this.waitFor({
							viewName : sViewName,
							id : "assignButton",
							matchers : new PropertyStrictEquals({
								name:"enabled",
								value:false
							}),
							success : function () {
								Opa5.assert.ok(true, "Assign button is visible and it is disabled");
							},
							errorMessage : "Was not able see the Assign button or Assign button is enabled"
						});
					},

					theTableShouldHaveAllEntries : function () {
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
							id : sTableId,
							viewName : sViewName,
							matchers : function (oTable) {
								// If there are less items in the list than the growingThreshold, only check for this number.
								iExpectedNumberOfItems = aAllEntities.length;
								return oTable.getTable().getBinding().getLength() === iExpectedNumberOfItems;
							},
							success : function (oTable) {
								Opa5.assert.strictEqual(oTable.getTable().getBinding().getLength(), iExpectedNumberOfItems, "The Demand Table has " + iExpectedNumberOfItems + " entries");
							},
							errorMessage : "Table does not have all entries."
						});
					}
			})
		}
	});
});