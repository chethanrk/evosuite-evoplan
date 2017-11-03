sap.ui.define([
		"com/evorait/evoplan/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"com/evorait/evoplan/model/formatter",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
    	"sap/ui/table/Table",
    	"sap/ui/table/Row",
    	"sap/ui/table/RowSettings"
	], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Table, Row, RowSettings) {
		"use strict";

		return BaseController.extend("com.evorait.evoplan.controller.List", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			/**
			 * Called when the worklist controller is instantiated.
			 * @public
			 */
			onInit : function () {
				var oViewModel;
                this._oDraggableTable = this.byId("draggableList");

				// Model used to manipulate control states
				var tableTitle = this.getResourceBundle().getText("worklistTableTitle");
				oViewModel = new JSONModel({
					viewTitle : this.getResourceBundle().getText("worklistViewTitle"),
					filterEntity: "WorkOrderHeader",
					tableEntity : "WorkOrderHeaderSet",
					tableTitle : this.getResourceBundle().getText("worklistTableTitle"),
					tableNoDataText : this.getResourceBundle().getText("tableNoDataText", [tableTitle]),
					tableBusyDelay : 0
				});
				this.setModel(oViewModel, "viewModel");
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */

			/**
			 * Triggered by the table's 'updateFinished' event: after new table
			 * data is available, this handler method updates the table counter.
			 * This should only happen if the update was successful, which is
			 * why this handler is attached to 'updateFinished' and not to the
			 * table's list binding's 'dataReceived' method.
			 * @param {sap.ui.base.Event} oEvent the update finished event
			 * @public
			 */

            onAfterRendering: function (oEvent) {
                if(this._oDraggableTable){
                    this._jDraggable(this);
                }
            },

            /**
			 * initial draggable after every refresh of table
			 * for example after go to next page
             * @param oEvent
             */
            onBusyStateChanged : function (oEvent) {
				var parameters = oEvent.getParameters();
				if(parameters.busy === false){
                    this._jDraggable(this);
				}
			},

			/**
			 * Event handler when a table item gets pressed
			 * @param {sap.ui.base.Event} oEvent the table selectionChange event
			 * @public
			 */
			onPress : function (oEvent) {
				// The source is the list item that got pressed
				this._showObject(oEvent.getSource());
			},

			/* =========================================================== */
			/* internal methods                                            */
			/* =========================================================== */

			/**
			 * Shows the selected item on the object page
			 * On phones a additional history entry is created
			 * @param {sap.m.ObjectListItem} oItem selected Item
			 * @private
			 */
			_showObject : function (oItem) {
				this.getRouter().navTo("detail", {
					objectId: oItem.getBindingContext().getProperty("WorkOrder")
				});
			},

            /**
			 * destroy already initial draggable and build again
             * @param elem
             * @private
             */
			_jDraggable : function (_this) {
                var oTable = _this.getView().byId("dataTable");
                oTable.setRowSettingsTemplate(new RowSettings({
                    highlight: "Information"
                }));

				setTimeout(function() {
                    var draggableTableId = _this._oDraggableTable.getId();
                    var jDragElement = $("#"+draggableTableId+" tbody tr").not(".sapUiTableColHdrTr");

                    try{
                        if(jDragElement.hasClass("ui-draggable")){
                            jDragElement.draggable( "destroy" );
                        }
                    }catch(error){
                        console.log(error);
                    }

                    jDragElement.draggable({
						helper: function (event) {
							var col = event.currentTarget.id;
							var draggedElement = sap.ui.getCore().byId(col),
								oContext = draggedElement.getBindingContext(),
								sPath = oContext.getPath();
							var data = _this.getModel().getProperty(sPath);
							return $('<div id="'+sPath+'" class="ui-draggable-dragging">'+data.WorkOrder+' '+data.WorkOrderDescription+'</div>');
						},
                        cursor: "move",
						cursorAt: { top: -3, left: -3 },
						zIndex: 10000,
						containment: "document",
						appendTo: "body"
					});
				}, 1000);
            }

		});
	}
);