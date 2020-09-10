sap.ui.define([
    "com/evorait/evoplan/controller/common/AssignmentsController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History"
], function (Controller, JSONModel, History) {
    "use strict";

    return Controller.extend("com.evorait.evoplan.controller.assets.OrderCreate", {


        /**
         * Called when a controller is instantiated and its View controls (if available) are already created.
         * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
         * @memberOf com.evorait.evoplan.view.OrderCreate
         */
        onInit: function () {
            var iOriginalBusyDelay,
                oViewModel = this.getOwnerComponent().getModel("viewModel");
            this._oMessagePopover = sap.ui.getCore().byId("idMessagePopover");
            this.getView().addDependent(this._oMessagePopover);

            this.getRouter().getRoute("orderCreate").attachPatternMatched(this._onObjectMatched, this);

            // Store original busy indicator delay, so it can be restored later on
            iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
            this.getOwnerComponent().getModel().metadataLoaded().then(function () {
                // Restore original busy indicator delay for the object view
                oViewModel.setProperty("/delay", iOriginalBusyDelay);
            });
        },

        /**
         * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
         * (NOT before the first rendering! onInit() is used for that one!).
         * @memberOf com.evorait.evoplan.view.OrderCreate
         */
        //	onBeforeRendering: function() {
        //
        //	},

        /**
         * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
         * This hook is the same one that SAPUI5 controls get after being rendered.
         * @memberOf com.evorait.evoplan.view.OrderCreate
         */
        //	onAfterRendering: function() {
        //
        //	},

        /**
         * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
         * @memberOf com.evorait.evoplan.view.OrderCreate
         */
        onExit: function () {
            if (this._oMessagePopover) {
                this._oMessagePopover.destroy();
            }
        },
        /** 
         * Navigation back. If any changes in entity are present confirmation box will shown
         */
        onBack: function () {
            var oModel = this.getModel(),
                bChanges = oModel.hasPendingChanges(),
                oRequestBundle = this.getResourceBundle();

            if (!bChanges) {
                this.navBack();
            } else {
                this.showConfirmMessageBox(oRequestBundle.getText("ymsg.confirmMsg"), this.onClose.bind(this));
            }

        },
        /**
         * Method gets called when user closed the confirmation pop up.
         * Based on the user action the data gets saved or reverted.
         *
         * @Athour Rahul
         * @version 2.1
         */
        onClose: function (oEvent) {
            var oContext = this.getView().getBindingContext();
            if (oEvent === "YES") {
                this.getModel().deleteCreatedEntry(oContext);
                this.navBack();
            }
        },
        /**
         * Navigation back
         */
        navBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) {
                history.go(-1);
            } else {
                this.getRouter().navTo("assetManager", {
                    assets: "NA"
                }, true);
            }
        },
        /**
         * On pattern match creating new entry and binding context to the view
         *
         * @param oEvent
         * @private
         */
        _onObjectMatched: function (oEvent) {
            var oArguments = oEvent.getParameter("arguments"),
            	oSelectedAsset = this.getModel("viewModel").getProperty("/createOrderDefaults"),
                sAsset = oArguments.asset,
                sFloc = oSelectedAsset ? oSelectedAsset.assetFloc : "",
                sDesc = oSelectedAsset ? oSelectedAsset.assetDesc  : "",
                sWc = oSelectedAsset ? oSelectedAsset.wc : "",
                sPlant = oSelectedAsset ? oSelectedAsset.plant : "",
                sAsssetType = oSelectedAsset ? oSelectedAsset.type : "",
                sBusinessarea = oSelectedAsset ? oSelectedAsset.businessArea:"",
                OrderType = this.getModel("user").getProperty("/DEFAULT_ORDER_TYPE");
            this.getModel().metadataLoaded().then(function () {
                if(sFloc && sFloc !== ""){
                    var oContext = this.getModel().createEntry("/EvoPlanOrderSet", {
                        properties: {
                            TechnicalObject: sFloc,
                            Plant: sPlant,
                            MainWorkCenter: sWc,
                            AssetGuid: sAsset,
                            AssetDescription: sDesc,
                            TechnicalObjectType: sAsssetType,
                            BusinessArea :sBusinessarea,
                            StartTimestamp:new Date(),
                            EndTimestamp:new Date(),
                            OrderType : OrderType
                        }
                    });
                    this.getView().setBindingContext(oContext);
                }else{
                    this.getRouter().navTo("assetManager", {
                        assets: sAsset
                    }, true);
                }

            }.bind(this));


        },
        /**
         * Method gets called on save order.
         * Checks the form for the constraints and submits the form
         *
         * @param oEvent
         */
        onSaveOrder: function (oEvent) {
            var oOrderBlock = this.byId("idorderCreateB").getAggregation("_views")[0],
                oForm = oOrderBlock.byId("idOrderCreForm"),
                aErrorFields = oForm.check();
            if (aErrorFields.length === 0) {
                this.clearMessageModel();
                this.getModel("appView").setProperty("/busy", true);
                this.getModel().submitChanges({
                    success: this.onSuccessCreate.bind(this),
                    error: this.onErrorCreate.bind(this)
                });
            } else {
                this.showMessageToast(this.getResourceBundle().getText("formValidateErrorMsg"));
            }
        },
        /**
         * Success handler of create order call
         *
         * @Author Rahul
         * @since 2.1
         * @version 2.1
         */
        onSuccessCreate: function (data, response) {
            var oContext = this.getView().getBindingContext();
            var oResponse;
            this.getModel("appView").setProperty("/busy", false);
            if (data && data.__batchResponses) {
                for (var i in data.__batchResponses) {
                    if (data.__batchResponses[i].response) {
                        if (!data.__batchResponses[i].response.statusCode.startsWith("2")) {
                            this.getModel().deleteCreatedEntry(oContext);
                            return;
                        }
                    }else{
                        for(var j in data.__batchResponses[i].__changeResponses){
                            // sOrderId = data.__batchResponses[j].__changeResponses[0].data.OrderId;
                            oResponse = data.__batchResponses[j].__changeResponses[0];
                        }
                    }
                }
                if(this.showMessage(oResponse,function () {
                		this.getModel().deleteCreatedEntry(oContext);
                        this.navBack();
                    }.bind(this)))
                    this.getModel().resetChanges();
                else
                    this.navBack();
            }
        },
        /**
         * Error handler of Create order call
         * @Author Rahul
         * @version 2.1
         * @since 2.1
         */
        onErrorCreate: function (data, response) {
            var oContext = this.getView().getBindingContext();
            this.getModel("appView").setProperty("/busy", false);
            if (oContext) {
                this.getModel().deleteCreatedEntry(oContext);
                this.navBack();
            }
        },
        /**
         * open's the message popover by it source
         * @param oEvent
         */
        onMessagePopoverPress: function (oEvent) {
            this._oMessagePopover.openBy(oEvent.getSource());
        }
    });

});