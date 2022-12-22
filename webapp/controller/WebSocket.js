sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"sap/ui/core/ws/SapPcpWebSocket",
	"sap/m/MessageToast",
	"sap/base/Log",
	"com/evorait/evoplan/model/utilities"
], function (JSONModel, Device, SapPcpWebSocket, MessageToast, Log, Utilities) {
	"use strict";

	return {
		getWsConnection: function (oComponent) {
			var host = Utilities.sanitizeUrl(window.location.host),
				sWebSocHost;
			this._component = oComponent;
			if (Utilities.sanitizeUrl(window.location.protocol) === "https:") {
				sWebSocHost = "wss:";
			} else {
				sWebSocHost = "ws:";
			}
			if (host.search("hana.ondemand.com") !== -1) {
				return;
			}
			this.oWebSocket = new SapPcpWebSocket(sWebSocHost + "//" + host + "/sap/bc/apc/evora/ep_core_push_apc");
			this.oWebSocket.attachOpen(function (e) {
				Log.info("Websocket connection opened");
			});

			this.oWebSocket.attachClose(function (e) {
				Log.info("Websocket connection closed");
				setTimeout(function () {
					this.getWsConnection(oComponent);
				}.bind(this), 1000);
			}.bind(this));

			this.oWebSocket.attachMessage(this._onMessage.bind(this));
		},
		init: function (oComponent) {
			// Check if WebSockets are supported
			if (!sap.ui.Device.support.websocket) {
				sap.m.MessageBox.show("Your SAPUI5 Version does not support WebSockets", {
					icon: sap.m.MessageBox.Icon.INFORMATION,
					title: "WebSockets not supported",
					actions: sap.m.MessageBox.Action.OK
				});
				return;
			}

			this.getWsConnection(oComponent);
		},

		onPost: function (oData) {
			this.oWebSocket.send(oData);
		},

		_onMessage: function (oEvent) {
			var oAppViewModel = this._component.getModel("appView"),
				sCurrentRoute = oAppViewModel.getProperty("/currentRoute"),
				eventBus = sap.ui.getCore().getEventBus(),
				sActionPage = localStorage.getItem("Evo-Action-page");

			if (oEvent.getParameter("pcpFields").errorText) {
				// Message is an error text
				return;
			}
			// Parse Message
			if (sCurrentRoute === "splitDemands" || sCurrentRoute === "ganttSplit" || sCurrentRoute === "newGanttSplit" || sCurrentRoute ===
				"splitDemandDetails" || sCurrentRoute === "splitGanttDetails") {
				setTimeout(function () {
					if (sActionPage === "ganttSplit" || sCurrentRoute === "splitDemands") {
						eventBus.publish("BaseController", "refreshDemandGanttTable", {});
					} else if (sActionPage === "ganttSplit" && sCurrentRoute === "splitDemandDetails") {
						// refresh demand detail page
						eventBus.publish("BaseController", "refreshDemandOverview", {});
					} else if (sActionPage === "splitDemands" && (sCurrentRoute === "ganttSplit" || sCurrentRoute === "newGanttSplit")) {
						//MessageToast.show(sMsg);
						eventBus.publish("BaseController", "refreshGanttChart", {});
					} else if (sActionPage === "splitDemands" && sCurrentRoute === "splitGanttDetails") {
						// refresh demand detail page
						eventBus.publish("BaseController", "refreshDemandOverview", {});
					} else if (sActionPage === "DemandDetails" && sCurrentRoute === "splitDemands") {
						eventBus.publish("BaseController", "refreshDemandGanttTable", {});
					} else if (sActionPage === "DemandDetails" && (sCurrentRoute === "ganttSplit" || sCurrentRoute === "newGanttSplit")) {
						//MessageToast.show(sMsg);
						eventBus.publish("BaseController", "refreshGanttChart", {});
					} else if (sActionPage === "DemandDetails" && (sCurrentRoute === "splitDemandDetails" || sCurrentRoute === "splitGanttDetails")) {
						eventBus.publish("BaseController", "refreshDemandOverview", {});
					}

					this.clearLocalStorage();
				}.bind(this), 2000);
			}
		},
		clearLocalStorage: function () {
			localStorage.removeItem("Evo-Dmnd-pageRefresh");
			localStorage.removeItem("Evo-Dmnd-guid");
			localStorage.removeItem("Evo-Action-page");
		}

	};
});