sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Filter, FilterOperator, JSONModel, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.CapacitiveAssignments", {

		formatter: formatter,

		init: function () {},

		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 */
		open: function (oView, oEvent) {
			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					id: "CapacitiveAssignments",
					name: "com.evorait.evoplan.view.fragments.CapacitiveAssignments",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(oDialog, oView, oEvent);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, oEvent);
			}
		},

		/**
		 * Open's the popover
		 * @param oView
		 * @param oEvent
		 */
		onOpen: function (oDialog, oView, oEvent) {
			var oViewFilterSettings = oView.getController().oFilterConfigsController || null;
			oDialog.setModel(new JSONModel({
				count: 0
			}), "local");

			this._dateFrom = oViewFilterSettings.getDateRange()[0];
			this._dateTo = oViewFilterSettings.getDateRange()[1];
			this._oView = oView;
			this._component = oView.getController().getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// connect dialog to view (models, lifecycle)
			oView.addDependent(oDialog);
			this._bindPopover(oDialog, oEvent);
			oDialog.openBy(oEvent.getSource());
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
		_bindPopover: function (oDialog, oEvent) {
			var oTable = oDialog.getContent()[0],
				oBinding = oTable.getBinding("items"),
				oRow = oEvent.getSource().getParent(),
				oContext = oRow.getBindingContext(),
				oNodeData = oContext.getModel().getProperty(oContext.getPath());

			// To show busy indicator when filter getting applied
			oBinding.attachDataReceived(function (e) {
				var aResults = e.getParameter("data").results;
				oDialog.getModel("local").setProperty("/count", aResults.length);
			});
			this._filterAssignments(oBinding, oNodeData);
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
			aFilters.push(new Filter("DateFrom", FilterOperator.LE, oEndDate));
			aFilters.push(new Filter("DateTo", FilterOperator.GE, oStartDate));
			oBinding.filter(aFilters);
		},
		/**
		 * On Click on capacitive assignment link open's the assign info dialog
		 */
		onCapacitiveRowClick: function (oEvent) {
			var oAssignment = oEvent.getParameter("listItem");
			var oContext = oAssignment.getBindingContext();
			var oModel = oContext.getModel();
			var sPath = oContext.getPath();
			var oAssignmentData = oModel.getProperty(sPath);
			this._component.assignInfoDialog.open(this._oView, null, oAssignmentData);
		}

	});
});