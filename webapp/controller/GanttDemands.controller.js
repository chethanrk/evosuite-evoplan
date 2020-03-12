sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/model/ganttFormatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
    "sap/ui/table/RowAction",
    "sap/ui/table/RowActionItem"

], function (AssignmentsController, JSONModel, formatter, ganttFormatter, Filter, FilterOperator, MessageToast, RowAction, RowActionItem) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.GanttDemands", {
		
		formatter: formatter,

		_bLoaded : false,
		
		onInit : function(){
			this._oEventBus = sap.ui.getCore().getEventBus(); 
			
			this._oEventBus.subscribe("BaseController", "refreshDemandGanttTable", this._refreshDemandTable, this);
			
			this._oDraggableTable = this.byId("draggableList");
			this._oDataTable = this._oDraggableTable.getTable();
            // Row Action template to navigate to Detail page
            var onClickNavigation = this._onActionPress.bind(this);
            var oTemplate = this._oDataTable.getRowActionTemplate();
            if (oTemplate) {
                oTemplate.destroy();
                oTemplate = null;
            }
            oTemplate = new RowAction({
                items: [
                    new RowActionItem({
                        type: "Navigation",
                        press: onClickNavigation
                    })
                ]
            });
            this._oDataTable.setRowActionTemplate(oTemplate);
            this._oDataTable.setRowActionCount(1);

		},
        _onActionPress : function (oEvent) {
            var oRouter = this.getRouter();
            var oRow = oEvent.getParameter("row");
            var oContext = oRow.getBindingContext();
            var sPath = oContext.getPath();
            var oModel = oContext.getModel();
            var oData = oModel.getProperty(sPath);

            oRouter.navTo("ganttDemandDetails", {
                guid: oData.Guid
            });
        },
		/** 
		 * On Drag start restrict demand having status other init
		 * @param oEvent
		 */
		onDragStart : function (oEvent){
			var oDragSession = oEvent.getParameter("dragSession"),
				oDraggedControl = oDragSession.getDragControl(),
				oContext = oDraggedControl.getBindingContext(),
				sPath = oContext.getPath(),
				oDemand = oContext.getModel().getProperty(sPath);
				
			if(!this.isDemandAssignable(sPath)){
				this._showAssignErrorDialog([oDemand.DemandDesc]);
				oEvent.preventDefault();
			}
		},
		/**
		 * on press assign button in footer
		 * show modal with user for select
		 * @param oEvent
		 */
		onAssignButtonPress: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			if (this._aSelectedRowsIdx.length > 100) {
				this._aSelectedRowsIdx.length = 100;
			}
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, true);

			if (oSelectedPaths.aPathsData.length > 0) {
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedPaths.aPathsData, false, {bFromGantt:true});
			}
			if (oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
			}
		},

		/**
		 * open change status dialog
		 * @param oEvent
		 */
		onChangeStatusButtonPress: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);

			if (this._aSelectedRowsIdx.length > 0) {
				this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedPaths.aPathsData, {
					bFromGantt: true
				});
			} else {
				var msg = this.getResourceBundle().getText("ymsg.selectMinItem");
				MessageToast.show(msg);
			}
		},
		
		/**
		 * enable/disable buttons on footer when there is some/no selected rows
		 * @since 3.0
		 */
		onRowSelectionChange : function(){
				var selected = this._oDataTable.getSelectedIndices();
				if (selected.length > 0) {
					this.byId("assignButton").setEnabled(true);
					this.byId("changeStatusButton").setEnabled(true);
				} else {
					this.byId("assignButton").setEnabled(false);
					this.byId("changeStatusButton").setEnabled(false);
				}
		},
		/**
		 * Refresh the demand the 
		 * 
		 */
		_refreshDemandTable : function() {
			if(this._bLoaded){
                this._oDraggableTable.rebindTable();
			}
            this._bLoaded = true;
		},
		/**
		 *	Navigates to evoOrder detail page with static url. 
		 */
		OnClickOrderId : function(oEvent){
			var sOrderId = oEvent.getSource().getText();
			this.openEvoOrder(sOrderId);
		},
		onExit : function(){
			this._oEventBus.unsubscribe("BaseController", "refreshDemandGanttTable", this._refreshDemandTable, this);
		}
	});
	
});