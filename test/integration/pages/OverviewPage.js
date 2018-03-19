sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/actions/EnterText",
		"com/evorait/evoplan/test/integration/pages/Common"
], function(Opa5, Press, EnterText,Common) {
	"use strict";

	Opa5.createPageObjects({
		onMyPageUnderTest: {
			baseClass : Common,
			actions: {
				iNavigateToTheOverviewPage: function() {
					return this.waitFor({
						id:"draggableList",
						viewName: "List",
						controlType:"sap.ui.table.RowAction",
        				success: function (oRowActions) {
        					this.waitFor({
        						viewName: "List",
								controlType:"sap.ui.table.RowAction",
        						success: function (oRowActions) {
        						// var oFirstRowAction = oRowActions[0].getAggregation("items")[0];
        						// console.log(oFirstRowAction);
        						// oFirstRowAction.firePress({row:});
        						},
        						actions:new Press()
        					});
    					 },
						errorMessage: "Was not able to find the control with the id objectPage"
					});
				}
			},
			assertions: {
				iDoMyAssertion: function() {
					return this.waitFor({
						id: "ControlId",
						viewName: "Detail",
						success: function() {
							Opa5.assert.ok(false, "Implement me");
						},
						errorMessage: "Was not able to find the control with the id ControlId"
					});
				}
			}
		}
	});
});