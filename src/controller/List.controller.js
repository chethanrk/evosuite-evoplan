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
                this._oDataTable = this.byId("dataTable");

                //this highlight is only to show that rows can be dragged - nice to see
                this._oDataTable.setRowSettingsTemplate(new RowSettings({
                    highlight: "Information"
                }));

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

            /**
			 * after rendering of view
             * @param oEvent
             */
            onAfterRendering: function (oEvent) {
                if(this._oDraggableTable){
                    //this._jDraggable(this);
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

            /**
			 * Event handler to set multiple selection for drag or assignment
             * @param oEvent
             */
            onRowSelectionChange: function (oEvent) {
                console.log(oEvent.getParameters());
                //this.multiSelect = true;
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
			 * get all selected rows from table and return to draggable helper function
             * @param aSelectedRowsIdx
             * @private
             */
            _getSelectedRowPaths : function (aSelectedRowsIdx) {
            	var aPathsData = [];
                this.multiSelect = false;

                for (var i=0; i<aSelectedRowsIdx.length; i++) {
					var oContext = this._oDataTable.getContextByIndex(aSelectedRowsIdx[i]);
					var sPath = oContext.getPath();
                    aPathsData.push({
						sPath: sPath,
						oData: this.getModel().getProperty(sPath)
					});
                }
                if(aPathsData.length > 0){
                    this.multiSelect = true;
				}
				return aPathsData;
            },

            /**
			 * deselect all checkboxes in table
             * @private
             */
            _deselectAll : function () {
                this._oDataTable.clearSelection();
            },

            /**
			 * destroy already initial draggable and build again
			 * timeout to make sure draggable is really after loading finish added
             * @param elem
             * @private
             */
			_jDraggable : function (_this) {
				setTimeout(function() {
                    var draggableTableId = _this._oDraggableTable.getId(); // sapUiTableRowHdr
                    var aPathsData = [];
                    //checkbox is not inside tr so needs to select by class .sapUiTableRowHdr
                    var jDragElement = $("#"+draggableTableId+" tbody tr, #"+draggableTableId+" .sapUiTableRowHdr")
                        .not(".sapUiTableColHdrTr, .sapUiTableRowHidden");

                    try{
                        if(jDragElement.hasClass("ui-draggable")){
                            jDragElement.draggable( "destroy" );
                        }
                    }catch(error){
                        console.log(error);
                    }

                    jDragElement.draggable({
						revertDuration: 10,
						stop: function (event, ui) {
                            aPathsData = [];
                            _this._deselectAll();
                        },
						helper: function (event, ui) {
                            var target = $(event.currentTarget);
                            //single drag by checkbox, checkbox is not inside tr so have to find out row index
                            var targetDataCheckbox = target.data("sapUiRowindex");
                            var selectedIdx = _this._oDataTable.getSelectedIndices();

                            //get all selected rows
                            if(selectedIdx.length > 0){
                                aPathsData = _this._getSelectedRowPaths(selectedIdx);
                            }
                            if(!_this.multiSelect){
                                //single drag by checkbox row index
                            	if(targetDataCheckbox >= 0){
                                    selectedIdx = [targetDataCheckbox];
                                    aPathsData = _this._getSelectedRowPaths(selectedIdx);
								}else{
                                    //table tr single dragged element
                                    aPathsData = _this._getSingleDraggedElement(target.attr('id'));
								}
                            }
                            if(!aPathsData){
                            	
							}
                            //get helper html list
							var oHtml = _this._generateDragHelperHTML(aPathsData);
                            _this.multiSelect = false;
                            return oHtml;
						},
						cursor: "move",
						cursorAt: { top: -3, left: -3 },
						zIndex: 10000,
						containment: "document",
						appendTo: "body"
					});
				}, 1000);
            },

            /**
			 * single dragged element when no checkboxes was selected
             * @param targetId
             * @returns {*}
             * @private
             */
            _getSingleDraggedElement : function (targetId) {
                var draggedElement = sap.ui.getCore().byId(targetId),
                    oContext = draggedElement.getBindingContext();
                if(oContext){
                    var sPath = oContext.getPath();
                    return [{
                        oData: this.getModel().getProperty(sPath),
                        sPath: sPath
                    }];
				}
				return false;
            },

            /**
			 * generates html list for dragged paths and gives back to helper function
             * @param aPathsData
             * @returns {jQuery|HTMLElement}
             * @private
             */
            _generateDragHelperHTML : function (aPathsData) {
                var helperTemplate = $('<ul id="dragHelper"></ul>');
                for (var i=0; i<aPathsData.length; i++) {
					var item = $('<li id="'+aPathsData[i].sPath+'" class="ui-draggable-dragging-item">'+
                        +aPathsData[i].oData.WorkOrder+' - '
						+aPathsData[i].oData.WorkOrderDescription
						+'</li>');
					helperTemplate.append(item);
                }
                return helperTemplate;
            }
		});
	}
);