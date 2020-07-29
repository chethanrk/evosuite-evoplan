sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/View",
	"sap/ui/core/mvc/ViewType",
	"com/evorait/evoplan/model/AnnotationHelper",
	"sap/ui/core/XMLTemplateProcessor",
	"sap/ui/core/util/XMLPreprocessor"
], function (BaseController, Controller, CoreView, ViewType, AnnotationHelper, XMLTemplateProcessor, XMLPreprocessor) {
	"use strict";
	return BaseController.extend("com.evorait.evoplan.controller.TemplateRenderController", {
		mTemplates: {},
		/**
		 * get path for create or edit binding from entitySet
		 * @param sEntitySet
		 * @param mParams
		 * @param oView
		 * Keeping it for Further use
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
				sViewName = oView.getViewName().split(".").pop(),
				aContent = oViewContainer.getContent();
			// if (aContent.length > 0) {
			// 	var sContentViewName = this._joinTemplateViewNameId(aContent[0].getId(), aContent[0].getViewName());
			// 	if (sContentViewName !== sViewName) {
			// 		oViewContainer.removeAllContent();
			// 		aContent = oViewContainer.getContent();
			// 	}
			// }
			if (aContent.length === 0 && sPath) {
				if (this.mTemplates[sViewName]) {
					// when template was already in use then just integrate in viewContainer and bind new path
					// will improve performance
					// oViewContainer.insertContent(this.mTemplates[sViewName]);
					this.bindView(this.mTemplates[sViewName], sPath, callbackFn, sViewName);
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
						this.GenerateForms(oModel, oMetaModel, sPath, sViewName, oController, oViewContainer, that);
					}.bind(this));
				}
			} else {
				this.bindView(aContent[0], sPath, callbackFn, sViewName);
			}
		},

		/**
		 * create view and set owner component for routing
		 * and calls for getOwnerComponent() in nested views and blocks
		 * @param oMetaModel
		 * @param sPath
		 * @param sViewName
		 */
		GenerateForms: function (oModel, oMetaModel, sPath, oView, oController, oViewContainer, that) {
			var oFragment = XMLTemplateProcessor.loadTemplate("com.evorait.evoplan.ui.templates.DetailPage", "fragment");
			oMetaModel.loaded().then(function () {
				// var oProcessedFragment = 
				XMLPreprocessor.process(oFragment, {
					caller: "XML-Fragment-templating"
				}, {
					bindingContexts: {
						meta: oMetaModel.getMetaContext(sPath)
					},
					models: {
						meta: oMetaModel
					}
				}).then(function (oProcessedFragment) {
					var oContent = sap.ui.xmlfragment({
						fragmentContent: oProcessedFragment
					}, that);
					oViewContainer.addContent(oContent);
				}.bind(this));
			});
		},

		/**
		 * bind special view control with new path
		 * @param oView
		 * @param sPath
		 */
		bindView: function (oView, sPath, callbackFn , sViewName) {
			oView.unbindElement();
			oView.bindElement({
				path: sPath,
				events: {
					change: function () {
						var eventBus = sap.ui.getCore().getEventBus();

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
		}
	});
});