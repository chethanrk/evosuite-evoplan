sap.ui.define(["sap/ui/model/odata/AnnotationHelper", "sap/base/Log"],
	function (oDataAnnotationHelper, Log) {
		"use strict";

		/**
		 * resolve annotation path saved in JsonModel
		 * @public
		 */
		var resolveModelPath = function (oAnnotationPathContext) {
			var sAnnotationPath = oAnnotationPathContext.getObject();
			var oModel = oAnnotationPathContext.getModel();
			var oMetaModel = oModel.getProperty("/metaModel");
			var oEntitySet = oMetaModel.getODataEntitySet(oModel.getProperty("/entitySet"));
			var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
			var oMetaContext = oMetaModel.createBindingContext(oEntityType.$path + "/" + sAnnotationPath);
			return oMetaContext;
		};

		/**
		 * get property name from path
		 * @public
		 */
		var getPathName = function (oInterface) {
			return oInterface ? oInterface.Path : undefined;
		};

		/**
		 * get entityType name from path
		 * for setting smartField property name
		 * @public
		 */
		var getSmartFieldName = function (oInterface) {
			var sPathName = getPathName(oInterface);
			return sPathName ? "id" + sPathName : undefined;
		};

		return {
			resolveModelPath: resolveModelPath,
			getPathName: getPathName,
			getSmartFieldName: getSmartFieldName
		};

	},
	/* bExport= */
	true);