sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/actions/EnterText",
	"com/evorait/evoplan/test/integration/pages/Common",
	"sap/ui/test/matchers/AggregationFilled"
], function(Opa5, Press, EnterText, Common, AggregationFilled) {
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
		baseClass : Common,
		onTheListPage: {
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
					}
			})
		}
	});
});