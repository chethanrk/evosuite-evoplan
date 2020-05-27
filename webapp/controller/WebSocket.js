sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/ui/core/ws/SapPcpWebSocket",
    "sap/m/MessageToast"
], function (JSONModel, Device, SapPcpWebSocket, MessageToast) {
    "use strict";

    return {
        getWsConnection: function (fnOnMessage) {
            var location = Window.location,
                host = location.host,
                sWebSocHost;
            if (location.protocol === "https:") {
                sWebSocHost = "wss:"
            } else {
                sWebSocHost = "ws:"
            }
            this.oWebSocket = new SapPcpWebSocket(sWebSocHost+"//"+host+"/sap/bc/apc/evora/ep_core_push_apc");

            this.oWebSocket.attachOpen(function (e) {
                MessageToast.show('Websocket connection opened');
            });

            this.oWebSocket.attachClose(function (e) {
                MessageToast.show('Websocket connection closed');
                setTimeout(function () {
                    this.getWsConnection();
                }.bind(this), 1000);
            }.bind(this));

            this.oWebSocket.attachMessage(fnOnMessage);
        },
        init: function () {
            // Check if WebSockets are supported
            if (!sap.ui.Device.support.websocket) {
                sap.m.MessageBox.show("Your SAPUI5 Version does not support WebSockets", {
                    icon: sap.m.MessageBox.Icon.INFORMATION,
                    title: "WebSockets not supported",
                    actions: sap.m.MessageBox.Action.OK
                });
                return;
            }

            this.getWsConnection();
        },

        onPost: function (oData) {
            this.oWebSocket.send(oData);
        }

    };
});