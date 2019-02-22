sap.ui.define([
		"sap/ui/core/util/MockServer"
	], function (MockServer) {
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

			init : function () {
				var oUriParameters = jQuery.sap.getUriParameters(),
					sJsonFilesUrl = jQuery.sap.getModulePath(_sJsonFilesModulePath),
					sManifestUrl = jQuery.sap.getModulePath(_sAppModulePath + "manifest", ".json"),
					sEntity = "ResourceHierarchySet",
					sErrorParam = oUriParameters.get("errorType"),
					iErrorCode = sErrorParam === "badRequest" ? 400 : 500,
					oManifest = jQuery.sap.syncGetJSON(sManifestUrl).data,
					oMainDataSource = oManifest["sap.app"].dataSources.mainService,
					sMetadataUrl = jQuery.sap.getModulePath(_sAppModulePath + oMainDataSource.settings.localUri.replace(".xml", ""), ".xml"),
					// ensure there is a trailing slash
					sMockServerUrl = /.*\/$/.test(oMainDataSource.uri) ? oMainDataSource.uri : oMainDataSource.uri + "/";

				oMockServer = new MockServer({
					rootUri : sMockServerUrl
				});

				// configure mock server with a delay of .3s
				MockServer.config({
					autoRespond : true,
					autoRespondAfter : (oUriParameters.get("serverDelay") || 300)
				});

				oMockServer.simulate(sMetadataUrl, {
					sMockdataBaseUrl : sJsonFilesUrl,
					bGenerateMissingMockData : true
				});

                var aRequests = oMockServer.getRequests();
                aRequests.push({
                    method: "GET",
                    path: new RegExp("GetSystemInformation(.*)"),
                    response: function(oXhr, sUrlParams) {
                        jQuery.sap.log.debug("Incoming request for GetSystemInformation");
                        var oResponse = jQuery.sap.sjax({
                            url: sJsonFilesUrl+"/GetSystemInformation.json"
                        });
                        oXhr.respondJSON(200, {}, JSON.stringify(oResponse.data));
                        return true;
                    }
                });
                
                /* aRequests.push({
                    method: "GET",
                    path: new RegExp("AssetSet(.*)"),
                    response: function(oXhr, sUrlParams) {
                        jQuery.sap.log.debug("Incoming request for AssetPlanningDataSet");
                        var oResponse = jQuery.sap.sjax({
                            url: sJsonFilesUrl+"/AssetPlanningDataSet.json"
                        });
                        oXhr.respondJSON(200, {}, JSON.stringify(oResponse.data));
                        return true;
                    }
                });*/
                
                aRequests.push({
                    method: "POST",
                    path: new RegExp("CreateAssignment(.*)"),
                    response: function(oXhr, sUrlParams) {
                        jQuery.sap.log.debug("Incoming request for CreateAssignment");
                        var oResponse = jQuery.sap.sjax({
                            url: sJsonFilesUrl+"/Assignment.json"
                        });
                        var header = {
								"code": "/EVORA/EP_MSG_CLS/038",
								"message": "Assignment dates have been adjusted to match the dates of the resource ",
								"severity": "warning",
								"target": "",
								"details": [{
									"code": " / EVORA / EP_MSG_CLS / 018 ",
									"message": "Assignment end date is later than demand end date ",
									"target": "",
									"severity": "warning"
								}, {
									"code": " / EVORA / EP_MSG_CLS / 012 ",
									"message": "Assignment of demand Travelling to location to resource Rahul Inamdar of resource group Product cluster is successful ",
									"target": "",
									"severity": "info"
								}, {
									"code": "/EVORA/EP_MSG_CLS/018",
									"message": "Assignment end date is later than demand end date",
									"target": "",
									"severity": "warning"
								}]
							};
                        
                        var oHeaders = {
							"Content-Type":"application/json",
							"DataServiceVersion":"2.0",
							"location":"https://ed1cloud.evorait.net:50103/sap/opu/odata/EVORA/EP_MAIN_SRV/AssignmentSet('0A51491BD5A01ED890A79BFB8D42B65E')",
							"sap-message":JSON.stringify(header)

                        };
                        oXhr.respondJSON(201, oHeaders, JSON.stringify(oResponse.data));
                        return true;
                    }
                });
                oMockServer.setRequests(aRequests);


                var aRequests = oMockServer.getRequests(),
					fnResponse = function (iErrCode, sMessage, aRequest) {
						aRequest.response = function(oXhr){
							oXhr.respond(iErrCode, {"Content-Type": "text/plain;charset=utf-8"}, sMessage);
						};
					};

				// handling the metadata error test
				if (oUriParameters.get("metadataError")) {
					aRequests.forEach( function ( aEntry ) {
						if (aEntry.path.toString().indexOf("$metadata") > -1) {
							fnResponse(500, "metadata Error", aEntry);
						}
					});
				}

				// Handling request errors
				if (sErrorParam) {
					aRequests.forEach( function ( aEntry ) {
						if (aEntry.path.toString().indexOf(sEntity) > -1) {
							fnResponse(iErrorCode, sErrorParam, aEntry);
						}
					});
				}
				oMockServer.start();

				jQuery.sap.log.info("Running the app with mock data");
			},

			/**
			 * @public returns the mockserver of the app, should be used in integration tests
			 * @returns {sap.ui.core.util.MockServer} the mockserver instance
			 */
			getMockServer : function () {
				return oMockServer;
			}
		};

	}
);