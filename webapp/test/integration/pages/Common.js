sap.ui.define([
		"sap/ui/test/Opa5",
		"sap/ui/test/actions/Press",
		"sap/ui/test/matchers/Properties"
	], function(Opa5, Press, Properties) {
		"use strict";

		function getFrameUrl (sHash, sUrlParameters) {
			var sUrl = jQuery.sap.getResourcePath("com/evorait/evoplan/app", ".html");
			sHash = sHash || "";
			sUrlParameters = sUrlParameters ? "?" + sUrlParameters : "";

			if (sHash) {
				sHash = "#" + (sHash.indexOf("/") === 0 ? sHash.substring(1) : sHash);
			} else {
				sHash = "";
			}

			return sUrl + sUrlParameters + sHash;
		}

		return Opa5.extend("com.evorait.evoplan.test.integration.pages.Common", {

			iStartTheApp : function (oOptions) {
				oOptions = oOptions || {};
				// Start the app with a minimal delay to make tests run fast but still async to discover basic timing issues
				this.iStartMyAppInAFrame(getFrameUrl(oOptions.hash, "serverDelay=50"));
			},

			iStartTheAppWithDelay : function (sHash, iDelay) {
				this.iStartMyAppInAFrame(getFrameUrl(sHash, "serverDelay=" + iDelay));
			},

			iLookAtTheScreen : function () {
				return this;
			},

			iStartMyAppOnADesktopToTestErrorHandler : function (sParam) {
				this.iStartMyAppInAFrame(getFrameUrl("", sParam));
			},

			createAWaitForAnEntitySet : function  (oOptions) {
				return {
					success: function () {
						var bMockServerAvailable = false,
							aEntitySet;

						this.getMockServer().then(function (oMockServer) {
							aEntitySet = oMockServer.getEntitySetData(oOptions.entitySet);
							bMockServerAvailable = true;
						});

						return this.waitFor({
							check: function () {
								return bMockServerAvailable;
							},
							success : function () {
								oOptions.success.call(this, aEntitySet);
							}
						});
					}
				};
			},

			onNavBack: function (sViewName) {
				return this.waitFor({
					id: "navBackBtn",
					viewName: sViewName,
					actions: new Press(),
					errorMessage: "Did not find the nav back button on the page '"+sViewName+"'"
				});
			},

			iPressOnTheBlockTableWithTheTitle: function (sBlockNamespace, sBlockName, sTitle) {
				return this.waitFor({
					controlType: "sap.m.ObjectIdentifier",
					viewName: sBlockName,
					viewNamespace : "com.evorait.evoplan.block."+sBlockNamespace,
					matchers: new Properties({
						title: sTitle
					}),
					actions: new Press(),
					errorMessage: "No list item with title "+sTitle+" was found."
				});
			},

			getMockServer : function () {
				return new Promise(function (success) {
					Opa5.getWindow().sap.ui.require(["com/evorait/evoplan/localService/mockserver"], function (mockserver) {
						success(mockserver.getMockServer());
					});
				});
			},

			theUnitNumbersShouldHaveTwoDecimals : function (sControlType, sViewName, sSuccessMsg, sErrMsg) {
				var rTwoDecimalPlaces =  /^-?\d+\.\d{2}$/;

				return this.waitFor({
					controlType : sControlType,
					viewName : sViewName,
					success : function (aNumberControls) {
						Opa5.assert.ok(aNumberControls.every(function(oNumberControl){
								return rTwoDecimalPlaces.test(oNumberControl.getNumber());
							}),
							sSuccessMsg);
					},
					errorMessage : sErrMsg
				});
			}

		});

	}
);