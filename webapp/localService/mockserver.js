sap.ui.define([
	"sap/ui/core/util/MockServer",
	"sap/ui/model/json/JSONModel",
	"sap/base/util/UriParameters",
	"sap/base/Log",
	"sap/ui/thirdparty/jquery"
], function (MockServer, JSONModel, UriParameters, Log, jQuery) {
	"use strict";

	var oMockServer,
		_sAppModulePath = "com/evorait/evoplan/",
		_sLocalPath = "localService/",
		_sJsonFilesModulePath = _sAppModulePath + _sLocalPath + "mockdata";

	return {
		/**
		 * Initializes the mock server.
		 * You can configure the delay with the URL parameter "serverDelay".
		 * The local mock data in this folder is returned instead of the real data for testing.
		 * @public
		 */

		init: function () {
			var oOptions = oOptionsParameter || {};

			return new Promise(function (fnResolve, fnReject) {
				var sManifestUrl = sap.ui.require.toUrl(_sAppModulePath + "manifest.json"),
					oManifestModel = new JSONModel(sManifestUrl);

				oManifestModel.attachRequestCompleted(function () {
					var oUriParameters = UriParameters.fromQuery(window.location.search),
						// parse manifest for local metadata URI
						sJsonFilesUrl = sap.ui.require.toUrl(_sJsonFilesPath),
						oMainDataSource = oManifestModel.getProperty("/sap.app/dataSources/mainService"),
						sMetadataUrl = sap.ui.require.toUrl(_sAppModulePath + oMainDataSource.settings.localUri),
						// ensure there is a trailing slash
						sMockServerUrl = /.*\/$/.test(oMainDataSource.uri) ? oMainDataSource.uri : oMainDataSource.uri + "/",
						sEntity = "ResourceHierarchySet",
						sErrorParam = oUriParameters.get("errorType"),
						iErrorCode = sErrorParam === "badRequest" ? 400 : 500;

					// create a mock server instance or stop the existing one to reinitialize
					if (!oMockServer) {
						oMockServer = new MockServer({
							rootUri: sMockServerUrl
						});
					} else {
						oMockServer.stop();
					}

					// configure mock server with the given options or a default delay of 0.5s
					MockServer.config({
						autoRespond: true,
						autoRespondAfter: (oOptions.delay || oUriParameters.get("serverDelay") || 500)
					});

					// simulate all requests using mock data
					oMockServer.simulate(sMetadataUrl, {
						sMockdataBaseUrl: sJsonFilesUrl,
						bGenerateMissingMockData: true
					});

					var aRequests = oMockServer.getRequests();
					aRequests.push({
						method: "GET",
						path: new RegExp("GetSystemInformation(.*)"),
						response: function (oXhr, sUrlParams) {
							Log.debug("Incoming request for GetSystemInformation");
							jQuery.ajax({
								url: sJsonFilesUrl + "/GetSystemInformation.json",
								dataType: 'json',
								async: false,
								success: function (oResponse) {
									oXhr.respondJSON(200, {}, JSON.stringify(oResponse.data));
								}
							});
							return true;
						}
					});

					/* aRequests.push({
					    method: "GET",
					    path: new RegExp("AssetSet(.*)"),
					    response: function(oXhr, sUrlParams) {
					        Log.debug("Incoming request for AssetPlanningDataSet");
					        jQuery.ajax({
								url: sJsonFilesUrl+"/AssetPlanningDataSet.json",
								dataType: 'json',
								async: false,
								success: function (oResponse) {
									oXhr.respondJSON(200, {}, JSON.stringify(oResponse.data));
								}
							});
					        return true;
					    }
					});*/

					aRequests.push({
						method: "POST",
						path: new RegExp("CreateAssignment(.*)"),
						response: function (oXhr, sUrlParams) {
							Log.debug("Incoming request for CreateAssignment");

							jQuery.ajax({
								url: sJsonFilesUrl + "/Assignment.json",
								dataType: 'json',
								async: false,
								success: function (oResponse) {
									var header = {
										code: "/EVORA/EP_MSG_CLS/038",
										message: "Assignment dates have been adjusted to match the dates of the resource ",
										severity: "warning",
										target: "",
										details: [{
											code: " / EVORA / EP_MSG_CLS / 018 ",
											message: "Assignment end date is later than demand end date ",
											target: "",
											severity: "warning"
										}, {
											code: " / EVORA / EP_MSG_CLS / 012 ",
											message: "Assignment of demand Travelling to location to resource Rahul Inamdar of resource group Product cluster is successful ",
											target: "",
											severity: "info"
										}, {
											code: "/EVORA/EP_MSG_CLS/018",
											message: "Assignment end date is later than demand end date",
											target: "",
											severity: "warning"
										}]
									};
									var oHeaders = {
										"Content-Type": "application/json",
										DataServiceVersion: "2.0",
										location: "https://ed1cloud.evorait.net:50103/sap/opu/odata/EVORA/EP_MAIN_SRV/AssignmentSet('0A51491BD5A01ED890A79BFB8D42B65E')",
										"sap-message": JSON.stringify(header)

									};
									oXhr.respondJSON(201, oHeaders, JSON.stringify(oResponse.data));
								}
							});
							return true;
						}
					});

					var fnResponse = function (iErrCode, sMessage, aRequest) {
						aRequest.response = function (oXhr) {
							oXhr.respond(iErrCode, {
								"Content-Type": "text/plain;charset=utf-8"
							}, sMessage);
						};
					};

					// handling the metadata error test
					if (oUriParameters.get("metadataError")) {
						aRequests.forEach(function (aEntry) {
							if (aEntry.path.toString().indexOf("$metadata") > -1) {
								fnResponse(500, "metadata Error", aEntry);
							}
						});
					}

					// Handling request errors
					if (sErrorParam) {
						aRequests.forEach(function (aEntry) {
							if (aEntry.path.toString().indexOf(sEntity) > -1) {
								fnResponse(iErrorCode, sErrorParam, aEntry);
							}
						});
					}

					// set requests and start the server
					oMockServer.setRequests(aRequests);
					oMockServer.start();

					Log.info("Running the app with mock data");
					fnResolve();
				});

				oManifestModel.attachRequestFailed(function () {
					var sError = "Failed to load application manifest";

					Log.error(sError);
					fnReject(new Error(sError));
				});
			});
		},

		/**
		 * @public returns the mockserver of the app, should be used in integration tests
		 * @returns {sap.ui.core.util.MockServer} the mockserver instance
		 */
		getMockServer: function () {
			return oMockServer;
		}
	};

});