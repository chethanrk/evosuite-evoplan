sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/Constants"
], function (BaseController, formatter, Constants) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.gantt.GanttAssignmentPopOver", {

		formatter: formatter,

		/* =========================================================== */
		/* Event & Public methods                                      */
		/* =========================================================== */

		init: function () { },

		/**
		 * open Gantt Assignment Popover
		 * trigger the Dialog renderer for Responsive popover
		 * @param {Object} oView - contains the view it is called from
		 * @param {Object} oSource - contains the source
		 * @param {Object} oShapeContext - has the shape context
		 * @param {Object} mParameters - contains some additional parameters required for dialog
		 * since 2205
		 */
		open: function (oView, oSource, oShapeContext, mParameters) {
			var sQualifier = Constants.ANNOTATION_CONSTANTS.GANTT_POP_OVER_QUALIFIER,
				sDateTimePattern = oView.getModel("viewModel").getProperty("/sDateTimePattern"),
				oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: sDateTimePattern,
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

		/**
		 * on Close of pop over
		 */
		onCloseAssigmentsPopover: function () {
			if (this._component) {
				this._component.DialogTemplateRenderer.closeResponsivePopOver();
			}
		},

		/* =========================================================== */
		/* Private methods                                             */
		/* =========================================================== */

		/**
		 * event triggered after opening the Responsive Popover
		 * setting the Title and Status
		 */

		_openPopOver: function () {
			this._setPopOverData(this._oShapeContext.getObject());
		},

		/**
		 * Setting up the Title and Status for responsive popover
		 * @param {Object} oData - contains the object of the shape data
		 */
		_setPopOverData: function (oData) {
			var sDateTimePattern = this._oView.getModel("viewModel").getProperty("/sDateTimePattern"),
				oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: sDateTimePattern,
				interval: true
			}),
				aDetails = {
					title: oDateFormat.format([this._oShapeContext.getProperty("DateFrom"), this._oShapeContext.getProperty("DateTo")]),
					status: oData.DEMAND_STATUS
				};
			this._oView.getModel("viewModel").setProperty("/ganttSettings/GanttPopOverData", aDetails);
		}
	});
});