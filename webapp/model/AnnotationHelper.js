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

		var getFieldExtPoint = function (oTarget, oField, oAnnoPath, sAddString) {
			var sExtPointName = "FormExtP";
			if (oAnnoPath.path) {
				sExtPointName += "|" + oAnnoPath.path.split("#")[1];
			}
			if (oTarget.Target) {
				var sTargetPath = oTarget.Target.AnnotationPath.split("#");
				sExtPointName += "|" + sTargetPath[1];
			}
			if (oField.Path) {
				sExtPointName += "|" + oField.Path;
			}
			sExtPointName = sAddString ? sExtPointName + "|" + sAddString : sExtPointName;
			return sExtPointName;
		};

		var getExtPoint = function (sTabName, sEntitySet, sDesc, sLongText, sAddString) {
			var sExtPointName = "TableExtP";

			if (sTabName) {
				sExtPointName += "|" + sTabName;
			}
			var sEntitySetName = getEntitySet(sEntitySet, sDesc, sLongText);
			if (sEntitySetName) {
				sExtPointName += "|" + sEntitySetName;
			}
			sExtPointName = sAddString ? sExtPointName + "|" + sAddString : sExtPointName;
			return sExtPointName;
		};
		var getEntitySet = function (sEntitySet, sDesc, sLongText) {
			return sEntitySet || sDesc || sLongText;
		};

		/**
		 * get Label from the property 
		 * gantt assignment Popover
		 * since 2205
		 */
		var getLabel = function (oInterface) {
			return oInterface ? "{" + oInterface.Path + "/##com.sap.vocabularies.Common.v1.Label/String}" : undefined;
		};

		/**
		 * find label to property by field property key 
		 * and template properties data
		 * @param {*} sFieldName 
		 * @param {*} oTempData 
		 * @returns 
		 */
		var getPropertyLabel = function(sFieldName, oTempData){
			var oMetaModel = oTempData.metaModel,
				oEntitySet = oMetaModel.getODataEntitySet(oTempData.tempData.entitySet),
				oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType),
				oProperty = oMetaModel.getODataProperty(oEntityType, sFieldName);

			if(oProperty["com.sap.vocabularies.Common.v1.Label"]){
				return oProperty["com.sap.vocabularies.Common.v1.Label"]["String"];
			}else{
				return oProperty["sap:label"];
			}
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
			isInNavLinks: isInNavLinks,
			getFieldExtPoint: getFieldExtPoint,
			getExtPoint: getExtPoint,
			getEntitySet: getEntitySet,
			getLabel: getLabel,
			getPropertyLabel: getPropertyLabel
		};

	},
	/* bExport= */
	true);