sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/actions/EnterText",
	"com/evorait/evoplan/test/integration/pages/Common",
	"sap/ui/test/matchers/I18NText",
	"sap/ui/test/matchers/PropertyStrictEquals",
	"sap/ui/test/matchers/AggregationFilled"
], function(Opa5, Press, EnterText,Common,I18NText,PropertyStrictEquals,AggregationFilled) {
	"use strict";
    
    var sViewName = "Detail";
    
	Opa5.createPageObjects({
		onOverviewPage: {
			baseClass : Common,
			actions: {	
				iPressTheBackButton : function () {
						return this.waitFor({
							id : "objectPage",
							viewName : sViewName,
							actions: new Press(),
							errorMessage : "Did not find the nav button on object page"
						});
					}
			},
			assertions: {
				iShouldSeeTheRememberedObject : function () {
						return this.waitFor({
							success : function () {
								var sBindingPath = this.getContext().currentItem.bindingPath;
								this.waitFor({
									id : "objectPage",
									viewName : sViewName,
									matchers : function (oPage) {
										return oPage.getBindingContext() && oPage.getBindingContext().getPath() === sBindingPath;
									},
									success : function (oPage) {
										Opa5.assert.strictEqual(oPage.getBindingContext().getPath(), sBindingPath, "was on the remembered detail page");
									},
									errorMessage : "Remembered object " + sBindingPath + " is not shown"
								});
							}
						});
					},
					theViewIsNotBusyAnymore : function () {
						return this.waitFor({
							id : "objectPage",
							viewName : sViewName,
							matchers : function (oPage) {
								return !oPage.getBusy();
							},
							success : function (oPage) {
								Opa5.assert.ok(!oPage.getBusy(), "The object view is not busy.");
							},
							errorMessage : "The object view is busy"
						});
					},
					iShouldSeeTheAssignButton: function(sText){
							return this.waitFor({
							id : "idAssignHeaderAction",
							viewName : sViewName,
							success : function (oButton) {
									Opa5.assert.equal(oButton.getText(),"Assign", "AssignButton Found .");
							},
							errorMessage : "Assign button not found"
					});
					},
					iShouldSeeTheChangeStatusButton:function(sText){
						return this.waitFor({
							id : "idStatusHeaderAction",
							viewName : sViewName,
							success : function (oButton) {
								Opa5.assert.equal(oButton.getText(),"Change Status", "Change status Button Found .");
							},
							errorMessage : "Change status button not found"
					});
					},
					iShouldSeeTheDemandTitleAs:function(sText){
						return this.waitFor({
							id : "ObjectPageLayoutHeaderTitle",
							viewName : sViewName,
							matchers :new PropertyStrictEquals({
								name:"objectTitle",
								value:sText
							}),
							success : function (oPage) {
								Opa5.assert.ok(true, "Object title "+ sText +" Found .");
							},
							errorMessage : "Object title doesn't Found"
						});
					},
					iShouldSeeTheSections: function(){
						return this.waitFor({
							id : "ObjectPageLayout",
							viewName : sViewName,
							matchers :new AggregationFilled({
								name:"sections"
							}),
							success : function (oPage) {
								Opa5.assert.ok(true, "Page has sections.");
							},
							errorMessage : "Page doesn't have any sections"
						});
					},
					iShouldSeeAssignmentTable: function(){
						return this.waitFor({
							id : "assignMentsBlock",
							viewName : sViewName,
							success : function (oPage) {
								var oTable = oPage.getAggregation("_views")[0].getAggregation("content")[0];
								if(oTable){
									Opa5.assert.ok(true, "The assianment table is found.");
								}
							},
							errorMessage : "Page doesn't have any sections"
						});
					}
					
			}
		}
	});
});