sap.ui.define([
	"com/evorait/evoplan/controller/gantt/GanttActions",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/model/Constants"
], function (BaseController, formatter, Fragment, Constants) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.AssignInfoDialog", {

		formatter: formatter,

		init: function () {},

		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 */
		open: function (oView, oSource, oShapeContext, mParameters) {
			var sQualifier = Constants.ANNOTATION_CONSTANTS.GANTT_POP_OVER_QUALIFIER,
				oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: "dd MMM, hh:mm a",
					interval: true
				}),
				mParams;

			this._mParameters = mParameters;
			this._component = oView.getController().getOwnerComponent();
			this._oView = oView;
			this._oShapeContext = oShapeContext;
			this._oSource = oSource;

			mParams = {
				viewName: "com.evorait.evoplan.view.gantt.GanttAssignmentPopOver#" + sQualifier,
				annotationPath: "com.sap.vocabularies.UI.v1.Facets#" + sQualifier,
				entitySet: "AssignmentSet",
				controllerName: "gantt.GanttActions",
				title: oDateFormat.format([oShapeContext.getProperty("DateFrom"), oShapeContext.getProperty("DateTo")]),
				type: "add",
				smartTable: null,
				sPath: "/AssignmentSet('" + oShapeContext.getObject().Guid + "')",
				sDeepPath: "",
				parentContext: oShapeContext,
				oDialogController: this._component.GanttAssignmentPopOver,
				refreshParameters: this._mParameters,
				isResponsivePopOver: true,
				ResponsivePopOverSource: this._oSource
			};
			this._component.DialogTemplateRenderer.open(this._oView, mParams, this._openPopOver.bind(this));
		},

		_openPopOver: function (oDialog, oView, sPath, sEvent, data, mParams) {
			this._setPopOverData(this._oShapeContext.getObject());
			// oDialog.openBy(this._oSource);
		},

		_setPopOverData: function (oData) {
			var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: "dd MMM, hh:mm a",
					interval: true
				}),
				aDetails = {
					title: oDateFormat.format([this._oShapeContext.getProperty("DateFrom"), this._oShapeContext.getProperty("DateTo")]),
					status: oData.DEMAND_STATUS,
					data: []
				};
			// aDetails.data.push({
			// 	icon: "sap-icon://employee-pane",
			// 	label: "Demand",
			// 	text: oData.DemandDesc
			// });
			// aDetails.data.push({
			// 	icon: "sap-icon://time-entry-request",
			// 	label: "Effort",
			// 	text: oData.Effort + " " + oData.EffortUnit
			// });
			// aDetails.data.push({
			// 	icon: "sap-icon://employee",
			// 	label: "Resource",
			// 	text: oData.RESOURCE_DESCRIPTION
			// });
			// aDetails.data.push({
			// 	icon: "sap-icon://account",
			// 	label: "Demand",
			// 	text: oData.GROUP_DESCRIPTION
			// });
			this._oView.getModel("viewModel").setProperty("/ganttSettings/GanttPopOverData", aDetails);

		},
		/**
		 * on Close on pop over
		 */
		onCloseAssigmentsPopover: function (oEvent) {
			this._component.DialogTemplateRenderer.closeResponsivePopOver();
		}

	});
});