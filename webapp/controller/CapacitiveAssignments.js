sap.ui.define([
    "com/evorait/evoplan/controller/AssignmentsController",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], function (BaseController, formatter, Filter, FilterOperator, JSONModel) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.CapacitiveAssignments", {

        formatter: formatter,

        init: function () {
        },
        /**
         * init and get dialog view
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        getDialog: function () {
            // create dialog lazily
            if (!this._oDialog) {
                // create dialog via fragment factory
                this._oDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.CapacitiveAssignments", this);

            }
            return this._oDialog;
        },
        /**
         * Open's the popover
         * @param oView
         * @param oEvent
         */
        open: function (oView, oEvent) {
            var oDialog = this.getDialog();

            this._dateFrom = sap.ui.getCore().byId("dateRange1");
            this._dateTo = sap.ui.getCore().byId("dateRange2");
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
                oStartDate = oNodeData.StartDate || this.formatter.date(this._dateFrom.getValue()),
                oEndDate = oNodeData.EndDate || this.formatter.date(this._dateTo.getValue()),
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
        onCapacitiveRowClick:function (oEvent) {
            var oAssignment = oEvent.getParameter("listItem");
            var oContext = oAssignment.getBindingContext();
            var oModel = oContext.getModel();
            var sPath = oContext.getPath();
            var oAssignmentData = oModel.getProperty(sPath);
            this._component.assignInfoDialog.open(this._oView, null, oAssignmentData);
        }

    });
});