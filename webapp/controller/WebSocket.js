sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"sap/ui/core/ws/SapPcpWebSocket",
	"sap/m/MessageToast",
	"com/evorait/evoplan/model/Constants"
], function (JSONModel, Device, SapPcpWebSocket, MessageToast, Constants) {
	"use strict";

	return {
		getWsConnection: function (oComponent) {
			var location = window.location,
				host = location.host,
				sWebSocHost;
			this._component = oComponent;
			if (location.protocol === "https:") {
				sWebSocHost = "wss:";
			} else {
				sWebSocHost = "ws:";
			}
			this.oWebSocket = new SapPcpWebSocket(sWebSocHost + "//" + host + "/sap/bc/apc/evora/ep_core_push_apc");

			this.oWebSocket.attachOpen(function (e) {
				MessageToast.show("Websocket connection opened");
			});

			this.oWebSocket.attachClose(function (e) {
				MessageToast.show("Websocket connection closed");
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
				eventBus = sap.ui.getCore().getEventBus();

			if (oEvent.getParameter("pcpFields").errorText) {
				// Message is an error text
				return;
			}
			// Parse Message
			var sMsg = oEvent.getParameter("data");
				MessageToast.show(sMsg);

			if (sCurrentRoute === Constants.GANTT.SPLIT) {
				setTimeout(function () {
					eventBus.publish("BaseController", "refreshGanttChart", {});
					this.clearLocalStorage();
				}.bind(this), 2000);
			}else if(sCurrentRoute === Constants.GANTT.SPLITDMD){
				setTimeout(function () {
					eventBus.publish("BaseController", "refreshDemandGanttTable", {});
					this.clearLocalStorage();
				}.bind(this), 2000);
			}
		}

	};
});