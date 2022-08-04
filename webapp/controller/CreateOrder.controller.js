sap.ui.define([
	"com/evorait/evoplan/controller/FormController",
	"sap/ui/core/Component",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (FormController, Component, History, Filter, FilterOperator) {
	"use strict";

	return FormController.extend("com.evorait.evoplan.controller.CreateOrder", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.evorait.evoplan.view.Order
		 */
		onInit: function () {
			FormController.prototype.onInit.apply(this, arguments);
			this.oViewModel = this.getModel("viewModel");
			var oRouter = this.getRouter();
			//route for page create new order
			oRouter.getRoute("CreateOrder").attachMatched(function (oEvent) {
				this._onObjectMatched();
			}, this);

			var eventBus = sap.ui.getCore().getEventBus();
			//Binnding has changed in TemplateRenderController.js
			eventBus.subscribe("TemplateRendererEvoPlan", "changedBinding", this._changedBinding, this);

			var iOriginalBusyDelay,
				oViewModel = this.getOwnerComponent().getModel("viewModel");
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this._oMessagePopover = this.getOwnerComponent()._oMessagePopover;
			this.getView().addDependent(this._oMessagePopover);

			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
				// Restore original busy indicator delay for the object view
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});
		},

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
		onExit: function () {
			this.getView().unbindElement();
			var eventBus = sap.ui.getCore().getEventBus();
			eventBus.unsubscribe("TemplateRendererEvoPlan", "changedBinding", this._changedBinding, this);
		},

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
					var data = this.getModel("viewModel").getProperty("/createOrderDefaults");
					this.sPath = this.getView().getBindingContext().getPath();
					this.setDefaultValues(data);
				}
			}
			this.oViewModel.setProperty("/busy", false);
		},

		/**
		 * function called when route is matched
		 */
		_onObjectMatched: function (oEvent) {
			this.aSmartForms = this.getAllSmartForms(this.getView().getControlsByFieldGroupId("smartFormTemplate"));
			this.setFormsEditable(this.aSmartForms, true);
			this.oViewModel.setProperty("/editMode", true);
			this.oViewModel.setProperty("/isNew", true);
		},

		/*
		 * function to set default values from asset
		 */
		setDefaultValues: function (oData) {
			var oSelectedAsset = oData,
				sPath = this.sPath;
			if (oSelectedAsset) {
				this.getModel().setProperty(sPath + "/AssetGuid", oSelectedAsset.AssetGuid);
				this.getModel().setProperty(sPath + "/TechnicalObject", oSelectedAsset.TechnicalObject);
				this.getModel().setProperty(sPath + "/Plant", oSelectedAsset.Plant);
				this.getModel().setProperty(sPath + "/MainWorkCenter", oSelectedAsset.MainWorkCenter);
				this.getModel().setProperty(sPath + "/AssetDescription", oSelectedAsset.Description);
				this.getModel().setProperty(sPath + "/TechnicalObjectType", oSelectedAsset.TechnicalObjectType);
				this.getModel().setProperty(sPath + "/BusinessArea", oSelectedAsset.BusinessArea);
				this.getModel().setProperty(sPath + "/StartTimestamp", new Date());
				this.getModel().setProperty(sPath + "/EndTimestamp", new Date());
				this.getModel().setProperty(sPath + "/OrderType", this.getModel("user").getProperty("/DEFAULT_ORDER_TYPE"));
			} else {
				var sAssetGuid = this.getModel("viewModel").getProperty("/CreateOrderAssetGuid");
				if (sAssetGuid !== "") {
					//
					var oFilter = new Filter("AssetGuid", FilterOperator.EQ, sAssetGuid);
					this.getOwnerComponent()._getData("/AssetSet", [oFilter])
						.then(function (data) {
							this.setDefaultValues(data.results[0]);
						}.bind(this));
				} else {
					this.getRouter().navTo("assetManager", {
						assets: "NA"
					});
				}
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
							//check if key is creatable true and url param value is not bigger then maxLength of property
							if ((!oProperty.hasOwnProperty("sap:creatable") || oProperty["sap:creatable"] === "true") &&
								(urlValue.length <= parseInt(oProperty["maxLength"]))) {
								oModel.setProperty(sPath + "/" + key, urlValue);
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
				if (mErrors.state === "success") {
					this.getModel("appView").setProperty("/busy", true);
					this.getModel().submitChanges({
						success: this.onSuccessCreate.bind(this),
						error: this.onErrorCreate.bind(this)
					});
				}
			}
		},
		/**
		 * success callback after creating order
		 * @param oResponse
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
					} else {
						for (var j in data.__batchResponses[i].__changeResponses) {
							// sOrderId = data.__batchResponses[j].__changeResponses[0].data.OrderId;
							if (data.__batchResponses[j].__changeResponses) {
								oResponse = data.__batchResponses[j].__changeResponses[0];
							}
						}
					}
				}
				if (this.showMessage(oResponse, function () {
						this.getModel().deleteCreatedEntry(oContext);
						this.navBack();
					}.bind(this))) {
					this.getModel().resetChanges();
				} else {
					this.navBack();
				}
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
		}
	});

});