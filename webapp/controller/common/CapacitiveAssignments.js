sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Filter, FilterOperator, JSONModel, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.CapacitiveAssignments", {

		formatter: formatter,

		init: function () {},

		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 */
		open: function (oView, oSource, mParameters) {
			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					id: "CapacitiveAssignments",
					name: "com.evorait.evoplan.view.common.fragments.CapacitiveAssignments",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(oDialog, oView, oSource, mParameters);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, oSource, mParameters);
			}
		},

		/**
		 * Open's the popover
		 * @param oView
		 * @param oEvent
		 */
		onOpen: function (oDialog, oView, oSource, mParameters) {
			var oViewFilterSettings = oView.getController().oFilterConfigsController || null;
			oDialog.setModel(new JSONModel({
				count: 0
			}), "local");
			this._mParameters = mParameters || {
				bFromHome: true
			};
			this._dateFrom = oViewFilterSettings.getDateRange()[0];
			this._dateTo = oViewFilterSettings.getDateRange()[1];
			this._oView = oView;
			this._component = oView.getController().getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// connect dialog to view (models, lifecycle)
			oView.addDependent(oDialog);
			this._bindPopover(oDialog, oSource);
			oDialog.openBy(oSource);
		},
		/**
		 * Closes the capacitive popover
		 * @author Rahul
		 *
		 */
		handleCloseButton: function () {
			this._oDialog.close();
		},
		/**
		 * Filters the capacitive assignments for the node
		 * @param oDialog
		 * @param oEvent
		 * @private
		 */
		_bindPopover: function (oDialog, oSource) {
			var oTable = oDialog.getContent()[0],
				oBinding = oTable.getBinding("items")
			if (oSource) {
				var oRow = oSource.getParent(),
					oContext = oRow.getBindingContext(),
					oNodeData = oContext.getModel().getProperty(oContext.getPath());

				// To show busy indicator when filter getting applied
				oBinding.attachDataReceived(function (e) {
					var aResults = e.getParameter("data").results;
					oDialog.getModel("local").setProperty("/count", aResults.length);
				});
				this._filterAssignments(oBinding, oNodeData);
			}
		},
		/**
		 *
		 * @param oBinding Table binding
		 * @param oNodeData Resource Heirarchy node data
		 * @private
		 */

		_filterAssignments: function (oBinding, oNodeData) {
			var sResource = oNodeData.ResourceGuid,
				sResourceGroup = oNodeData.ResourceGroupGuid,
				oStartDate = oNodeData.StartDate || this._dateFrom,
				oEndDate = oNodeData.EndDate || this._dateTo,
				oStartTime = oNodeData.StartTime,
				oEndTime = oNodeData.EndTime,
				aFilters = [],
				sSelectedView = this._component.getModel("viewModel").getProperty("/selectedHierarchyView");

			if (oNodeData.NodeType === "RESOURCE") {
				aFilters.push(new Filter("ObjectId", FilterOperator.EQ, sResource + "//" + sResourceGroup));
			} else if (oNodeData.NodeType === "RES_GROUP") {
				aFilters.push(new Filter("ObjectId", FilterOperator.EQ, sResourceGroup));
			} else {
				aFilters.push(new Filter("ObjectId", FilterOperator.EQ, sResource + "//" + sResourceGroup));
			}

			aFilters.push(new Filter("AssignmentType", FilterOperator.EQ, "CAP"));
			aFilters.push(new Filter("NODE_TYPE", FilterOperator.EQ, sSelectedView));
			// Setting end time to end of day to fetch assignments; from 2209
			aFilters.push(new Filter("DateFrom", FilterOperator.LE, formatter.mergeDateTime(oEndDate, oEndTime).setHours(23, 59, 59)));
			aFilters.push(new Filter("DateTo", FilterOperator.GE, new Date(formatter.mergeDateTime(oStartDate, oStartTime))));
			aFilters.push(new Filter("TimeFrom", FilterOperator.LE, oStartTime));
			aFilters.push(new Filter("TimeTo", FilterOperator.GE, oEndTime));
			oBinding.filter(aFilters);
		},
		/**
		 * On Click on capacitive assignment link open's the assign info dialog
		 */
		onCapacitiveRowClick: function (oEvent) {
			var oAssignment = oEvent.getParameter("listItem"),
				oContext = oAssignment.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oAssignmentData = oModel.getProperty(sPath);
			//	Calling AssignInfo Dialog Template
			this.openAssignInfoDialog(this._oView, sPath, oContext);
		}

	});
});