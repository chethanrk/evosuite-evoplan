sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/actions/EnterText",
	"com/evorait/evoplan/test/integration/pages/Common",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/PropertyStrictEquals",
	"sap/ui/test/matchers/BindingPath",
	"sap/ui/test/matchers/I18NText"
], function(Opa5, Press, EnterText, Common, AggregationFilled, PropertyStrictEquals, BindingPath, I18NText) {
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
				sValue = oSearchField.getTokens()[0].getKey();
				
				for(var i in aKeys){
					var sId = oSearchField.getId(),
						sFilteredValue;
					if(sId.search("/DemandDesc/i") === -1)
						sFilteredValue = oModel.getProperty("/"+aKeys[i]+"/UserStatusShortText");
					else
						sFilteredValue = oModel.getProperty("/"+aKeys[i]+"/DemandDesc");
						
					if(sFilteredValue === sValue){
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
					return oTable.getTable().getAggregation("rows")[iPosition];
				},
				actions : oOptions.actions,
				success : oOptions.success,
				errorMessage : "Table in view '" + sViewName + "' does not contain an Item at position '" + iPosition + "'"
			};
		}
		
		function createIdFor(sFilterBarId, sEntityPropertyName) {
			return sFilterBarId + "-filterItemControl_BASIC-" + sEntityPropertyName;
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
							success:function(oRow){
								var oRowAction = oRow.getAggregation("_rowAction").getItems()[0];
								oRowAction.firePress({
									row:oRow
								});
							},
							actions : new Press()
						}));
				},
				iPressATableItemAtPosition1 :  function (iPosition) {
						return this.waitFor({
							id : sTableId,
							viewName : sViewName,
							success:function(oTable){
								var oRow = oTable.getTable().getAggregation("rows")[0];
								var oRowAction = oRow.getAggregation("_rowAction").getItems()[0];
								oRowAction.firePress({
									row:oRow
								});
							},
							errorMessage : "Can't see the Demand table."
						});
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
				},
				iSelectDemandFromDemandTable:function(){
					return this.waitFor({
							id : sTableId,
							viewName : sViewName,
							success : function (oTable) {
								oTable.getTable().setSelectedIndex(1);
							},
							errorMessage : "Can't see the Demand Table."
						});
				},
				iClickOnTheAboutIcon:function(){
					return this.waitFor({
							id : "idButtonAboutDialog",
							viewName : sViewName,
							actions: new Press(),
							errorMessage : "Can't see the About Button."
						});
				},
				iRememberTheItemAtPosition : function (iPosition){
						return this.waitFor(createWaitForItemAtPosition({
							position : iPosition,
							success : function (oTableItem) {
								var oBindingContext = oTableItem.getBindingContext();

								// Don't remember objects just strings since IE will not allow accessing objects of destroyed frames
								this.getContext().currentItem = {
									bindingPath: oBindingContext.getPath(),
									id: oBindingContext.getProperty("ObjectID"),
									name: oBindingContext.getProperty("Name")
								};
							}
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
				iShouldSeeTheAssignButtonAs : function (bEnabled) {
						return this.waitFor({
							viewName : sViewName,
							id : "assignButton",
							matchers : new PropertyStrictEquals({
								name:"enabled",
								value:bEnabled
							}),
							success : function () {
								Opa5.assert.ok(true, "Assign button is visible and it is disabled");
							},
							errorMessage : "Was not able see the Assign button or Assign button is enabled"
						});
					},
					iShouldSeeTheChangeStatusButtonAs:function(bEnabled){
						return this.waitFor({
							viewName : sViewName,
							id : "changeStatusButton",
							matchers : new PropertyStrictEquals({
								name:"enabled",
								value:bEnabled
							}),
							success : function () {
								Opa5.assert.ok(true, "Change Status button is visible and it is disabled");
							},
							errorMessage : "Was not able see the Assign button or Assign button is enabled"
						});
					},
					iShouldSeeTheTableWithDemandDescription : function (sDescription) {
						return this.waitFor({
							controlType: "sap.ui.table.Row",
							viewName : sViewName,
							matchers: new BindingPath({
								path: "/DemandSet('0A51491BD5A01ED88AEE3E1FEF5FF9F3')"
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
					iShouldSeeTheTableEntriesWithStatus:function(sStatus){
						return this.waitFor({
							id : [sTableId, createIdFor(sFilter, "UserStatusShortText")],
							viewName : sViewName,
							check:  allItemsInTheListContainTheSearchTerm,
							success : function () {
								Opa5.assert.ok(true, "Every item did contain the Status "+sStatus);
							},
							errorMessage : "The table did not have Demands"
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
					iShouldSeeTheDemandOverviewPageWithTitle:function(sTitle){
						return this.waitFor({
							id:"objectPage",
							viewName:"Detail",
							matchers: new I18NText({
								propertyName:"title",
                                key: sTitle
                            }),
							success: function(sTitleText) {
								Opa5.assert.ok(true, "Navigated to Demand overview page with title Demand Overview");
							}
						});
					},
					iShouldSeeTheInformationPopupWithTitle:function(sTitle){
						return this.waitFor({
							controlType: "sap.m.Dialog",
							matchers: new I18NText({
								propertyName:"title",
                                key: sTitle
                            }),
							success: function(sTitleText) {
								Opa5.assert.ok(true, "The infomation pop up with title About");
							}
						});
					},
					iShouldSeeTheDemandOverviewPageWithTitle:function(sTitle){
						return this.waitFor({
							id:"objectPage",
							viewName:"Detail",
							matchers: new I18NText({
								propertyName:"title",
                                key: sTitle
                            }),
							success: function(sTitleText) {
								Opa5.assert.ok(true, "Navigated to Demand overview page with title Demand Overview");
							}
						});
					},
					iShouldSeeTheInformationPopupWithTitle:function(sTitle){
						return this.waitFor({
							controlType: "sap.m.Dialog",
							matchers: new I18NText({
								propertyName:"title",
                                key: sTitle
                            }),
							success: function(sTitleText) {
								Opa5.assert.ok(true, "The infomation pop up with title About");
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
