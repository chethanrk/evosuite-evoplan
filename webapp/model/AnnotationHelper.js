sap.ui.define(["sap/ui/model/odata/AnnotationHelper", "sap/base/Log"],
	function (oDataAnnotationHelper, Log) {
		"use strict";

		/**
		 * exclude annotationPath and entitySet
		 * for further functionality
		 * @private
		 */
		var _getAnnotationPath = function (oAnnotationPathContext) {
			var oAnnotationObj = oAnnotationPathContext.getObject(),
				sAnnotationPath, sEntitySet, sAnnotationHeadPath;

			if (typeof oAnnotationObj === "string") {
				sAnnotationPath = oAnnotationObj;
			} else {
				sAnnotationPath = oAnnotationObj.path;
				sEntitySet = oAnnotationObj.entitySet;
				sAnnotationHeadPath = oAnnotationObj.headerPath;
			}
			return {
				entitySet: sEntitySet,
				path: sAnnotationPath,
				headerPath: sAnnotationHeadPath
			};
		};

		/**
		 * get annotation binding context for object page
		 * content OR header
		 * @private
		 */
		var _resolveObjectPagePath = function (oAnnotationPathContext, sPathPropertyName) {
			var oModel = oAnnotationPathContext.getModel(),
				oData = _getAnnotationPath(oAnnotationPathContext),
				oAnnotationByPath = getAnnotationByPath(oData[sPathPropertyName], oData.entitySet, oModel),
				oBindingPath = _createBindingContext(oAnnotationPathContext, sPathPropertyName);

			if (!oAnnotationByPath) {
				var splittedAnno = oData[sPathPropertyName].split("#"),
					sQualifier = splittedAnno[1],
					sNewAnnoPath = splittedAnno[0];

				sQualifier = sQualifier.slice(0, sQualifier.lastIndexOf("_"));
				oAnnotationPathContext.getObject()[sPathPropertyName] = sNewAnnoPath + "#" + sQualifier;
				oBindingPath = _createBindingContext(oAnnotationPathContext, sPathPropertyName);
			}
			return oBindingPath;
		};

		/**
		 * create context binding based on annotation path
		 * context from metadata model
		 * @private
		 */
		var _createBindingContext = function (oAnnotationPathContext, sPathPropertyName) {
			var oAnnotationObj = oAnnotationPathContext.getObject(),
				oData = _getAnnotationPath(oAnnotationPathContext);

			var oModel = oAnnotationPathContext.getModel();
			var oMetaModel = oModel.getProperty("/metaModel");
			var oEntitySet = oMetaModel.getODataEntitySet(oData.entitySet ? oData.entitySet : oModel.getProperty("/tempData/entitySet"));
			var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
			return oMetaModel.createBindingContext(oEntityType.$path + "/" + oData[sPathPropertyName]);
		};

		/**
		 * resolve annotation path saved in JsonModel
		 * @public
		 */
		var resolveModelPath = function (oAnnotationPathContext) {
			//var sAnnotationPath = oAnnotationPathContext.getObject();
			//var oModel = oAnnotationPathContext.getModel();
			//var oMetaModel = oModel.getProperty("/metaModel");
			//var oEntitySet = oMetaModel.getODataEntitySet(oModel.getProperty("/entitySet"));
			//var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
			//var oMetaContext = oMetaModel.createBindingContext(oEntityType.$path + "/" + sAnnotationPath);
			//return oMetaContext;


			return _createBindingContext(oAnnotationPathContext, "path");
		};

		/**
		 * get annotation context by qualifier with splitter "_"
		 * for object page header content
		 * checks if there are annoations available or not
		 * @public
		 */
		var resolveObjectHeaderPath = function (oAnnotationPathContext) {
			return _resolveObjectPagePath(oAnnotationPathContext, "headerPath");
		};

		/**
		 * get annotation context by qualifier with splitter "_"
		 * for object page content
		 * checks if there are annoations available or not
		 * @public
		 */
		var resolveObjectContentPath = function (oAnnotationPathContext) {
			return _resolveObjectPagePath(oAnnotationPathContext, "path");
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

		/**
		 * get SmartTable parameter from Json Model "templateProperties" 
		 * @param oParams - path /Configs/Tables
		 * @param sId - ID of annotation qualifier/longdescription
		 * @param sKey - prameter name of SmartTable
		 * @public
		 */
		var getSectionsTableParam = function (sKey, oParams, sId) {
			if (oParams[sId]) {
				var sRefrenze = oParams[sId].REFERENCE;
				if (oParams[sId][sKey]) {
					return oParams[sId][sKey];
				} else if (sRefrenze) {
					return getSectionsTableParam(sKey, oParams, sRefrenze);
				}
			}
			return "";
		};

		var getAnnotationByPath = function (sAnnotationPath, sEntitySet, oModel) {
			var oMetaModel = oModel.getMetaModel() || oModel.getProperty("/metaModel"),
				oEntitySet = oMetaModel.getODataEntitySet(sEntitySet),
				oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
			return oEntityType[sAnnotationPath];
		};

		/**
		 * get from SmartTable annotations SortOrder 
		 * Only for responsive tables
		 */
		var getDefaultTableSorter = function (oSource, oModel) {
			var sEntitiySet = oSource.getEntitySet(),
				oMetaModel = oModel.getMetaModel(),
				oEntitySet = oMetaModel.getODataEntitySet(sEntitiySet),
				oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType),
				aPresentVariant = oEntityType["com.sap.vocabularies.UI.v1.PresentationVariant"],
				aSorter = [];

			if (!aPresentVariant) {
				aPresentVariant = oEntityType["UI.PresentationVariant"];
			}
			if (!aPresentVariant) {
				return aSorter;
			}

			if (aPresentVariant.SortOrder) {
				var aSortOrder = aPresentVariant.SortOrder;
				aSortOrder.forEach(function (item) {
					if (item.RecordType === "com.sap.vocabularies.Common.v1.SortOrderType" || item.RecordType === "Common.SortOrderType") {
						var bSortDesc = false;
						if (item.Descending) {
							bSortDesc = item.Descending.Bool === "true";
						}
						if (item.Property) {
							aSorter.push(new sap.ui.model.Sorter(item.Property.PropertyPath || item.Property.Path, bSortDesc));
						}
					}
				});
			}
			return aSorter;
		};

		var isInNavLinks = function (sValue, mNavLinks) {
			if (mNavLinks.hasOwnProperty(sValue)) {
				return true;
			}
			return null;
		};

		return {
			resolveModelPath: resolveModelPath,
			resolveObjectHeaderPath: resolveObjectHeaderPath,
			resolveObjectContentPath: resolveObjectContentPath,
			getPathName: getPathName,
			getSmartFieldName: getSmartFieldName,
			getSectionsTableParam: getSectionsTableParam,
			getAnnotationByPath: getAnnotationByPath,
			getDefaultTableSorter: getDefaultTableSorter,
			isInNavLinks: isInNavLinks
		};

	},
	/* bExport= */
	true);