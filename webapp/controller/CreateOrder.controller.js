sap.ui.define([
	"com/evorait/evoplan/controller/FormController",
	"sap/ui/core/Component",
	"sap/ui/core/routing/History"
], function (FormController, Component, History) {
	"use strict";

	return FormController.extend("com.evorait.evoplan.controller.CreateOrder", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.Order
		 */
		onInit: function () {
			// this.oViewModel = this.getModel("viewModel");
			// var oRouter = this.getRouter();
			// //route for page create new order
			// oRouter.getRoute("CreateOrder").attachPatternMatched(this._onObjectMatched, this);
			// oRouter.getRoute("CreateOrder").attachMatched(function (oEvent) {
			// 	this._initializeView(oEvent);
			// }, this);

			FormController.prototype.onInit.apply(this, arguments);
			var eventBus = sap.ui.getCore().getEventBus();
			//Binnding has changed in TemplateRenderController.js
			//eventBus.subscribe("TemplateRendererEvoPlan", "changedBinding", this._changedBinding, this);

			var iOriginalBusyDelay,
				oViewModel = this.getOwnerComponent().getModel("viewModel");
			this._oMessagePopover = sap.ui.getCore().byId("idMessagePopover");
			this.getView().addDependent(this._oMessagePopover);
			this.getRouter().getRoute("CreateOrder").attachPatternMatched(this._onObjectMatched, this);
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
		 * @memberOf com.evorait.evoplan.view.Order
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * life cycle event after view rendering
		 */
		onAfterRendering: function () {
			this._onObjectMatched();
		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf com.evorait.evoplan.view.Order
		 */
		//	onExit: function() {
		//
		//	}

		/**
		 * Binding has changed in TemplateRenderController
		 * Set new controller context and path
		 * @param sChannel
		 * @param sEvent
		 * @param oData
		 */
		_changedBinding: function (sChannel, sEvent, oData) {
			if (sChannel === "TemplateRendererEvoPlan" && sEvent === "changedBinding") {
				var sViewId = this.getView().getId(),
					sViewName = this.getView().getViewName(),
					_sViewNameId = sViewName + "#" + sViewId;

				if (oData.viewNameId === _sViewNameId) {
					this._checkForUrlParameters();
				}
			}
		},

		/**
		 * 
		 */
		_onObjectMatched: function (oEvent) {
			this.aSmartForms = this.getAllSmartForms(this.getView().getControlsByFieldGroupId("smartFormTemplate"));
			this.setFormsEditable(this.aSmartForms, true);
			this.oViewModel.setProperty("/editMode", true);
			this.oViewModel.setProperty("/isNew", true);
			this._checkForUrlParameters();
			this.setDefaultValues();
		},

		setDefaultValues: function () {
			var oSelectedAsset = this.getModel("viewModel").getProperty("/createOrderDefaults"),
				sPath = this.getView().getBindingContext().getPath();
			if (oSelectedAsset) {
				this.getModel().setProperty(sPath + "/AssetGuid", oSelectedAsset.asset);
				this.getModel().setProperty(sPath + "/TechnicalObject", oSelectedAsset.assetFloc);
				this.getModel().setProperty(sPath + "/Plant", oSelectedAsset.plant);
				this.getModel().setProperty(sPath + "/MainWorkCenter", oSelectedAsset.wc);
				this.getModel().setProperty(sPath + "/AssetDescription", oSelectedAsset.assetDesc);
				this.getModel().setProperty(sPath + "/TechnicalObjectType", oSelectedAsset.type);
				this.getModel().setProperty(sPath + "/BusinessArea", oSelectedAsset.businessArea);
				this.getModel().setProperty(sPath + "/StartTimestamp", new Date());
				this.getModel().setProperty(sPath + "/EndTimestamp", new Date());
				this.getModel().setProperty(sPath + "/OrderType", this.getModel("user").getProperty("/DEFAULT_ORDER_TYPE"));
			} else {
				this.getRouter().navTo("assetManager", {
					assets: "NA"
				});
			}
		},

		/**
		 * check for GET paramters in url
		 * when there are parameters check if its a property name
		 * and is this property is creatable true
		 */
		_checkForUrlParameters: function () {
			var oContext = this.getView().getBindingContext();
			if (oContext) {
				var oData = oContext.getObject(),
					sPath = oContext.getPath(),
					oModel = this.getModel();
				if (oData) {
					delete oData.__metadata;
				}
				//check if GET parameter is allowed prefill field
				//only when property is creatable true then prefill property
				oModel.getMetaModel().loaded().then(function () {
					var oMetaModel = oModel.getMetaModel() || oModel.getProperty("/metaModel"),
						oEntitySet = oMetaModel.getODataEntitySet("EvoPlanOrderSet"),
						oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);

					for (var key in oData) {
						var urlValue = this.getOwnerComponent().getLinkParameterByName(key);
						var oProperty = oMetaModel.getODataProperty(oEntityType, key);
						if (oProperty !== null) {
							if (urlValue && urlValue !== Constants.STANDALONE_PAGES.NEW.param) {
								//check if key is creatable true and url param value is not bigger then maxLength of property
								if ((!oProperty.hasOwnProperty("sap:creatable") || oProperty["sap:creatable"] === "true") &&
									(urlValue.length <= parseInt(oProperty["maxLength"]))) {
									oModel.setProperty(sPath + "/" + key, urlValue);
								}
							}
						}
					}
				}.bind(this));
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
		 * On press save button
		 */
		onSaveOrder: function () {
			if (this.aSmartForms.length > 0) {
				var mErrors = this.validateForm(this.aSmartForms);
				//if form is valid save created entry
				this.saveChanges(mErrors, this._saveCreateSuccessFn.bind(this));
			}
		},/**
		 * success callback after creating order
		 * @param oResponse
		 */
		_saveCreateSuccessFn: function (oResponse) {
			var sKey = null,
				oChangeData = this.getBatchChangeResponse(oResponse);

			if (oChangeData) {
				sKey = oChangeData.ObjectKey;

				if (this.isStandalonePage) {
					var msg = this.getResourceBundle().getText("msg.orderCreateSuccess", sKey);
					this.showSuccessMessage(msg);
				} else if (sKey && sKey !== "" && this.sOrderType && this.sOrderType !== null) {
					// this.oViewModel.setProperty("/newCreatedOrder", true);
					// this.getRouter().navTo("OrderDetail", {
					// 	ObjectKey: sKey,
					// 	OrderType: this.sOrderType
					// });
				} else {
					var msg = this.getResourceBundle().getText("msg.saveSuccess");
					this.showSuccessMessage(msg);
					this.navBack();
				}
			}
		},

		
		 /**
         * Method gets called on save order.
         * Checks the form for the constraints and submits the form
         *
         * @param oEvent
         */
      /*  onSaveOrder: function (oEvent) {
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
        },*/
	});

});