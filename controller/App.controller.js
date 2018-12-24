sap.ui.define([
        "com/evorait/evoplan/controller/BaseController",
        "sap/ui/model/json/JSONModel"
    ], function (BaseController, JSONModel) {
        "use strict";

        return BaseController.extend("com.evorait.evoplan.controller.App", {

            onInit: function () {
                var eventBus = sap.ui.getCore().getEventBus();
                //Event are subscription Demand assignment and change status of demand
                eventBus.subscribe("AssignTreeDialog", "assignSelectedDemand", this._triggerSaveAssignment, this);
                eventBus.subscribe("StatusSelectDialog", "changeStatusDemand", this._triggerSaveDemandStatus, this);
                eventBus.subscribe("AssignInfoDialog", "updateAssignment", this._triggerUpdateAssign, this);
                eventBus.subscribe("AssignTreeDialog", "bulkReAssignment", this._triggerUpdateAssign, this);
                eventBus.subscribe("AssignInfoDialog", "deleteAssignment", this._triggerDeleteAssign, this);
                eventBus.subscribe("AssignActionsDialog", "bulkDeleteAssignment", this._triggerDeleteAssign, this);

                var oViewModel,
                    fnSetAppNotBusy,
                    iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

                oViewModel = new JSONModel({
                    busy: true,
                    delay: 0
                });
                this.getOwnerComponent().setModel(oViewModel, "appView");

                fnSetAppNotBusy = function () {
                    oViewModel.setProperty("/busy", false);
                    oViewModel.setProperty("/delay", iOriginalBusyDelay);
                };

                this.getOwnerComponent().getModel().metadataLoaded()
                    .then(fnSetAppNotBusy);

                // apply content density mode to root view
                this._oAppControl = this.byId("approvalApp");
                this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
            },
            /**
             * catch event from dialog for save demand assignment
             * @param sChanel
             * @param sEvent
             * @param oData
             * @private
             */
            _triggerSaveAssignment: function (sChanel, sEvent, oData) {
                if (sEvent === "assignSelectedDemand") {
                    if (!this.isAssignable({sPath: oData.assignPath})) {
                        return;
                    }
                    if (this.isAvailable(oData.assignPath)) {
                        this.assignedDemands(oData.selectedPaths, oData.assignPath);
                    } else {
                        this.showMessageToProceed(oData.selectedPaths, oData.assignPath);
                    }
                }
            },

            /**
             * catch event from dialog for saving demand status change
             *
             * @param sChanel
             * @param sEvent
             * @param oData
             * @private
             */
            _triggerSaveDemandStatus: function (sChanel, sEvent, oData) {
                if (sEvent === "changeStatusDemand") {
                    this.updateFunctionDemand(oData.selectedPaths, oData.functionKey);
                }
            },
            /**
             * Registering the event when resized the splitter
             */
            onResize: function () {
                var eventBus = sap.ui.getCore().getEventBus();
                eventBus.publish("App", "RegisterDrop", {});
                eventBus.publish("App", "RegisterDrag", {});
            },
            /**
             * Event to trigger Update Assignment
             *
             * @param sChanel
             * @param sEvent
             * @param oData
             * @private
             */
            _triggerUpdateAssign: function (sChanel, sEvent, oData) {
                if (sEvent === "updateAssignment") {
                    this.updateAssignment(oData.isReassign);
                } else if (sEvent === "bulkReAssignment") {
                    if (!this.isAssignable({sPath: oData.sPath})) {
                        return;
                    }
                    if (this.isAvailable(oData.sPath)) {
                        this.bulkReAssignment(oData.sPath, oData.aContexts);
                    } else {
                        this.showMessageToProceed(null, oData.sPath, true, oData.aContexts);
                    }
                }
            },
            /**
             * Event which triggers delete assignment
             *
             * @param sChanel
             * @param sEvent
             * @param oData
             * @private
             */
            _triggerDeleteAssign: function (sChanel, sEvent, oData) {
                if (sEvent === "deleteAssignment") {
                    this.deleteAssignment(oData.sId);
                } else if (sEvent === "bulkDeleteAssignment") {
                    this.bulkDeleteAssignment(oData.aContexts);
                }
            }

        });

    }
);