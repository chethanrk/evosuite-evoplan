sap.ui.define([
		"sap/ui/test/Opa5",
		"com/evorait/evoplan/test/integration/pages/Common"
	], function(Opa5, Common) {
		"use strict";

		Opa5.createPageObjects({
			onTheBrowserPage : {
				baseClass : Common,

				actions : {

					iChangeTheHashToObjectN : function (iObjIndex) {
						return this.waitFor(this.createAWaitForAnEntitySet({
							entitySet : "Objects",
							success : function (aEntitySet) {
								Opa5.getHashChanger().setHash("/WorkOrders/" + aEntitySet[iObjIndex].WorkOrder);
							}
						}));
					},

					iChangeTheHashToTheRememberedItem : function () {
						return this.waitFor({
							success : function () {
								var sObjectId = this.getContext().currentItem.id;
								Opa5.getHashChanger().setHash("/WorkOrders/" + sObjectId);
							}
						});
					},

					iChangeTheHashToSomethingInvalid : function () {
						return this.waitFor({
							success : function () {
								Opa5.getHashChanger().setHash("/somethingInvalid");
							}
						});
					},

					iPressOnTheForwardButton: function () {
						return this.waitFor({
							actions: function () {
								Opa5.getWindow().history.forward();
							}
						});
					},

					iPressOnTheBackButton: function () {
						return this.waitFor({
							actions: function () {
								Opa5.getWindow().history.back();
							}
						});
					}
				},

				assertions : {

					iShouldSeeTheHashForObjectN : function (iObjIndex) {
						return this.waitFor(this.createAWaitForAnEntitySet({
							entitySet : "Objects",
							success : function (aEntitySet) {
								var oHashChanger = Opa5.getHashChanger(),
									sHash = oHashChanger.getHash();
								Opa5.assert.strictEqual(sHash, "WorkOrders/" + aEntitySet[iObjIndex].WorkOrder, "The Hash is not correct");
							}
						}));
					},

					iShouldSeeTheHashForTheRememberedObject : function () {
						return this.waitFor({
							success : function () {
								var sObjectId = this.getContext().currentItem.id,
									oHashChanger = Opa5.getHashChanger(),
									sHash = oHashChanger.getHash();
								Opa5.assert.strictEqual(sHash, "WorkOrders/" + sObjectId, "The Hash is not correct");
							}
						});
					},

					iShouldSeeAnEmptyHash : function () {
						return this.waitFor({
							success : function () {
								var oHashChanger = Opa5.getHashChanger(),
									sHash = oHashChanger.getHash();
								Opa5.assert.strictEqual(sHash, "", "The Hash should be empty");
							},
							errorMessage : "The Hash is not Correct!"
						});
					}

				}

			}

		});

	}
);