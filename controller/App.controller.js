sap.ui.define([
		"com/evorait/evoplan/controller/BaseController",
		"sap/ui/model/json/JSONModel"
	], function (BaseController, JSONModel) {
		"use strict";

		return BaseController.extend("com.evorait.evoplan.controller.App", {

			onInit : function () {
                var eventBus = sap.ui.getCore().getEventBus();
                //Event are subscription Demand assignment and change status of demand
                eventBus.subscribe("AssignTreeDialog", "assignSelectedDemand", this._triggerSaveAssignment, this);
                eventBus.subscribe("StatusSelectDialog", "changeStatusDemand", this._triggerSaveDemandStatus, this);

                var oViewModel,
					fnSetAppNotBusy,
					iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

				oViewModel = new JSONModel({
					busy : true,
					delay : 0
				});
				this.setModel(oViewModel, "appView");

				fnSetAppNotBusy = function() {
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
                if(sEvent === "assignSelectedDemand"){
                    this.assignedDemands(oData.selectedPaths, oData.assignPath);
                }
            },

            /**
             * catch event from dialog for saving demand status change
             * @param sChanel
             * @param sEvent
             * @param oData
             * @private
             */
            _triggerSaveDemandStatus: function (sChanel, sEvent, oData) {
                if(sEvent === "changeStatusDemand"){
                    this.updateFunctionDemand(oData.selectedPaths, oData.functionKey);
                }
            },
            /**
			 * Registering the event when resized the splitter
             */
            onResize:function(){
                var eventBus = sap.ui.getCore().getEventBus();
                eventBus.publish("App","RegisterDrop",{})
                eventBus.publish("App","RegisterDrag",{})
			}

		});

	}
);