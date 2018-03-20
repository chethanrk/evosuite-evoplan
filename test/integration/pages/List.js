sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/actions/EnterText",
	"com/evorait/evoplan/test/integration/pages/Common",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/PropertyStrictEquals",
	"sap/ui/test/matchers/BindingPath"
], function(Opa5, Press, EnterText, Common, AggregationFilled, PropertyStrictEquals, BindingPath) {
	"use strict";
	
	var sViewName = "List",
		sTableId = "draggableList",
		sFilter = "listReportFilter";
		
		function allItemsInTheListContainTheSearchTerm (aControls) {
			var oTable = aControls[0],
				oSearchField = aControls[1],
				oTableBinding  = oTable.getTable().getBinding("rows"),
				oModel = oTableBinding.getModel(),
				aKeys = oTableBinding.aKeys, 
				bFlag  = false,
				sStatus = oSearchField.getTokens()[0].getKey();
				
				for(var i in aKeys){
					var sStatusCode = oModel.getProperty("/"+aKeys[i]+"/UserStatusShortText");
					if(sStatusCode === sStatus){
						bFlag = true;
					}else{
						bFlag = false;
						break;
					}
				}
			return bFlag;
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
		
		function createIdFor(sFilterBarId, sEntityPropertyName) {
			return sFilterBarId + "-filterItemControl_BASIC-" + sEntityPropertyName;
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
				},
				iSearchWithDemandDecriptionValue :  function (sText) {
						this.waitFor({
							id : createIdFor(sFilter, "DemandDesc"),
							viewName : sViewName,
							actions: new EnterText({
								text: sText
							})
						});
						
						return this.waitFor({
							id : sFilter+"-btnGo",
							viewName : sViewName,
							actions: new Press()
						});
				},
				iSearchWithDemandStatusValue:function(sStatus){
						this.waitFor({
							id : createIdFor(sFilter, "UserStatusShortText"),
							viewName : sViewName,
							actions: new EnterText({
								text: sStatus
							})
						});
							return this.waitFor({
							id : sFilter+"-btnGo",
							viewName : sViewName,
							actions: new Press()
						});
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
					iShouldSeeTheTableWithDemandDescription : function (sDescription) {
						return this.waitFor({
							controlType: "sap.ui.table.Row",
							viewName : sViewName,
							matchers: new BindingPath({
								path: "/DemandSet('0A51491BD5A01ED88AAE865216887184')"
							}),
							success : function (aRows) {
								var oContext = aRows[0].getBindingContext(),
								    oModel = oContext.getModel(),
								    sPath = oContext.getPath();
								    
								    var Description = oModel.getProperty(sPath+"/DemandDesc");
								
								Opa5.assert.equal(Description, sDescription,"The table filtered with respective demand");
							},
							errorMessage : "The is not filtered correctly"
						});
					},
					iShouldSeeTheTableEntriesWithStatus:function(){
						return this.waitFor({
							id : [sTableId, createIdFor(sFilter, "UserStatusShortText")],
							viewName : sViewName,
							check:  allItemsInTheListContainTheSearchTerm,
							success : function () {
								Opa5.assert.ok(true, "Every item did contain the Status");
							},
							errorMessage : "The table did not have items"
						});
					},
					iShouldSeeTheEmptyTable:function(){
						return this.waitFor({
							id: sTableId,
							viewName : sViewName,
							matchers: function(oTable) {
								var oBinding = oTable.getTable().getBinding("rows");
								return oBinding && oBinding.getLength() === 0;
							},
							success: function() {
								Opa5.assert.ok(true, "Table has no rows!");
							}
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