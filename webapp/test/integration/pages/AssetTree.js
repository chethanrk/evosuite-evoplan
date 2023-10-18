sap.ui.define([
		"sap/ui/test/Opa5",
		"sap/ui/test/actions/Press"
	], function(Opa5, Press) {
		"use strict";

		var sViewName = "assets.Assets";

		Opa5.createPageObjects({
			onMyPageUnderTest: {
				actions: {
					iDoMyAction: function() {
						return this.waitFor({
							id: "controlId",
							viewName: sViewName,
							actions: new Press(),
							errorMessage: "Was not able to find the control with the id controlId"
						});
					}
					
				},
				assertions: {
					iShouldSeeAssetTree: function() {
						return this.waitFor({
							id: "idAssetPage",
							viewName: sViewName,
							autoWait:true,
							success: function() {
								Opa5.assert.ok(false, "Implement me");
							},
							errorMessage: "Was not able to find the control with the id controlId2"
						});
					}
				}
			}
		});
	}
);