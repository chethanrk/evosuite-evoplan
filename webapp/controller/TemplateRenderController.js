sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/View",
	"sap/ui/core/mvc/ViewType",
	"com/evorait/evoplan/model/AnnotationHelper",
	"sap/ui/core/XMLTemplateProcessor",
	"sap/ui/core/util/XMLPreprocessor",
], function (BaseController, Controller, CoreView, ViewType, AnnotationHelper, XMLTemplateProcessor, XMLPreprocessor) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.TemplateRenderController", {

		mTemplates: {},

		_oTemplateModel: null,

		_oOwnerComponent: null,

		/**
		 * for rendering xml view templates with controllers
		 * where ownerComponent is not known for example dialogs
		 */
		setOwnerComponent: function (oComponent) {
			this._oOwnerComponent = oComponent;
		},

		/**
		 * get global helper model for generating template xml views
		 */
		getTemplateModel: function () {
			if (!this._oTemplateModel) {
				if (this._oOwnerComponent) {
					this._oTemplateModel = this._oOwnerComponent.getModel("templateProperties");
				} else {
					this._oTemplateModel = this.getOwnerComponent().getModel("templateProperties");
				}
			}
			return this._oTemplateModel;
		},

		/**
		 * set parameters to Json model templateProperties
		 */
		setTemplateProperties: function (mParams) {
			var oTempModel = this.getTemplateModel();
			oTempModel.setData(mParams);
		},

		/**
		 * get path for create or edit binding from entitySet
		 * @param sEntitySet
		 * @param mParams
		 * @param oView
		 */
		getEntityPath: function (sEntitySet, mParams, oView, sPath) {
			var oModel = oView ? oView.getModel() : this.getModel();
			if (sPath) {
				return sPath;
			}
			if (mParams) {
				return "/" + oModel.createKey(sEntitySet, mParams);
			} else {
				var oContext = oModel.createEntry("/" + sEntitySet);
				return oContext.getPath();
			}
		},

		/**
		 * Get template page or fragment for generic pages or dialogs by annotations
		 * Only create new view from template when wrapper content is empty
		 * Will prevent too much loading time 
		 * in template controller onAfterrendering is still called after navigations also when content is already in page
		 */
		insertTemplateFragment: function (sPath, oView, sContainerId, callbackFn, mParams, that) {
			var oController = oView.getControllerName(),
				oViewContainer = oView.byId(sContainerId) || sap.ui.getCore().byId(sContainerId),
				oModel = oView.getModel(),
				sViewName = oView.getViewName().split(".").pop();
			var aContent = oViewContainer.getContent();
			// if (aContent.length > 0) {
			// 	var sContentViewName = this._joinTemplateViewNameId(aContent[0].getId(), aContent[0].getViewName());
			// 	if (sContentViewName !== sViewName) {
			// 		oViewContainer.removeAllContent();
			// 		aContent = oViewContainer.getContent();
			// 	}
			// }

			if (aContent.length === 0 && sPath) {
				if (this.mTemplates[sViewName]) {
					//when template was already in use then just integrate in viewContainer and bind new path
					//will improve performance
					// oViewContainer.insertContent(this.mTemplates[sViewName]);
					// this.bindView(this.mTemplates[sViewName], sPath, callbackFn);
				} else {
					//load template view ansync and interpret annotations based on metadata model
					//and bind view path and save interpreted template global for reload
					var oMetaModel = oModel.getMetaModel();
					oMetaModel.loaded().then(function () {

						//insert rendered template in content and bind path
						var setTemplateAndBind = function (oTemplateView) {
							this.mTemplates[sViewName] = oTemplateView;
							oViewContainer.insertContent(oTemplateView);
							this.bindView(oTemplateView, sPath, callbackFn);
						}.bind(this);
						this.createView(oModel, oMetaModel, sPath, sViewName, oController, oViewContainer, that);
						// this.createView(oModel, oMetaModel, sPath, sViewName, oController).then(setTemplateAndBind);
						// if (sControllerName) {
						// 	Controller.create({
						// 		name: "com.evorait.evoplan.controller." + sControllerName
						// 	}).then(function (controller) {
						// 		this.createView(oModel, oMetaModel, sPath, sViewName, controller).then(setTemplateAndBind);
						// 	}.bind(this));
						// } else {
						// 	this.createView(oModel, oMetaModel, sPath, sViewName, null).then(setTemplateAndBind);
						// }

					}.bind(this));
				}
			} else {
				this.bindView(aContent[0], sPath, callbackFn);
			}
		},

		/**
		 * create view and set owner component for routing
		 * and calls for getOwnerComponent() in nested views and blocks
		 * @param oMetaModel
		 * @param sPath
		 * @param sViewName
		 */
		createView: function (oModel, oMetaModel, sPath, oView, oController,oViewContainer, that) {
			var oFragment = XMLTemplateProcessor.loadTemplate("com.evorait.evoplan.ui.templates.DetailPage", "fragment");
			oMetaModel.loaded().then(function () {
				var oProcessedFragment = XMLPreprocessor.process(oFragment, {
					caller: "XML-Fragment-templating"
				}, {
					bindingContexts: {
						meta: oMetaModel.getMetaContext(sPath)
					},
					models: {
						meta: oMetaModel
					}
				});
				var oContent = sap.ui.xmlfragment({
					fragmentContent: oProcessedFragment
				}, that);
				oViewContainer.addContent(oContent);
			});
			// var sViewId = this._getTemplateViewId(sViewNameId, true),
			// 	sViewName = this._getTemplateViewId(sViewNameId, false),
			// 	oTemlateModel = this.getTemplateModel();

			// if (oTemlateModel.getProperty("/annotationPath")) {
			// 	//add metaModel to JsonModel for custom AnnotationHelper
			// 	oTemlateModel.setProperty("/metaModel", oMetaModel);
			// }

			// var fnCreateView = function () {
			// 	return CoreView.create({
			// 		id: sViewId,
			// 		async: true,
			// 		models: oModel,
			// 		preprocessors: {
			// 			xml: {
			// 				bindingContexts: {
			// 					meta: oMetaModel.getMetaContext(sPath)
			// 				},
			// 				models: {
			// 					meta: oMetaModel,
			// 					templateProperties: oTemlateModel
			// 				}
			// 			}
			// 		},
			// 		type: ViewType.XML,
			// 		viewName: sViewName,
			// 		controller: oController
			// 	});
			// }.bind(this);

			// //run as owner so views knows ownerComponent
			// var oOwnerComponent = this._oOwnerComponent || this.getOwnerComponent();
			// if (oOwnerComponent) {
			// 	return oOwnerComponent.runAsOwner(fnCreateView);
			// } else {
			// 	return fnCreateView();
			// }
		},

		/**
		 * bind special view control with new path
		 * @param oView
		 * @param sPath
		 */
		bindView: function (oView, sPath, callbackFn) {
			oView.unbindElement();
			oView.bindElement({
				path: sPath,
				events: {
					change: function () {
						var sViewName = this._joinTemplateViewNameId(oView.getId(), oView.getViewName()),
							eventBus = sap.ui.getCore().getEventBus();

						eventBus.publish("TemplateRenderer", "changedBinding", {
							viewNameId: sViewName
						});

						if (callbackFn) {
							callbackFn();
						}
					}.bind(this),
					dataRequested: function () {}.bind(this),
					dataReceived: function () {}.bind(this)
				}
			});
		},

		/**
		 * get view name or view id
		 * input example: com.evorait.evoplan.view.templates.SmartFormWrapper#addOperation
		 * @param sViewName
		 * @param getId
		 */
		_getTemplateViewId: function (sViewName, getId) {
			if (sViewName.indexOf("#") >= 0) {
				sViewName = sViewName.split("#");
				return getId ? sViewName[1] : sViewName[0];
			}
			return getId ? null : sViewName;
		},

		/**
		 * join fragment name and Id together again
		 * input example: "addOperation", "com.evorait.evoplan.view.templates.SmartFormWrapper"
		 * @param sViewId
		 * @param sViewName
		 */
		_joinTemplateViewNameId: function (sViewId, sViewName) {
			if (sViewId) {
				return sViewName + "#" + sViewId;
			}
			return sViewName;
		}
	});
});