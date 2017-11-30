sap.ui.define([
		"com/evorait/evoplan/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"com/evorait/evoplan/model/formatter",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
    	"sap/ui/table/Table",
    	"sap/ui/table/Row",
    	"sap/ui/table/RowSettings",
    	"sap/m/MessageToast",
        'sap/m/MessagePopover',
        'sap/m/MessagePopoverItem'
	], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Table, Row, RowSettings, MessageToast, MessagePopover, MessagePopoverItem) {
		"use strict";

        var oLink = new sap.m.Link({
            text: "Show more information",
            href: "",
            target: "_blank"
        });

        var oMessageTemplate = new MessagePopoverItem({
            type: '{Type}',
            title: '{Title}',
            description: '{Description}',
            subtitle: '{Subtitle}',
            counter: '{Counter}',
            link: oLink
        });

        var oMessagePopover = new MessagePopover({
            items: {
                path: '/SaveMessageSet',
                template: oMessageTemplate
            }
        });

		return BaseController.extend("com.evorait.evoplan.controller.List", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			/**
			 * Called when the demand controller is instantiated.
			 * @public
			 */
			onInit : function () {
				var oViewModel;

                this._oDraggableTable = this.byId("draggableList");
                this._oDataTable = this._oDraggableTable.getTable();
                this._configureDataTable(this._oDataTable);
                this._aSelectedRowsIdx = [];

				// Model used to manipulate control states
				var tableTitle = this.getResourceBundle().getText("xtit.itemListTitle");
				oViewModel = new JSONModel({
					viewTitle : this.getResourceBundle().getText("xtit.itemListTitle"),
					filterEntity: "Demand",
					tableTitle : tableTitle,
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
            onAfterRendering: function (oEvent) {},

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
			 * on press assign button in footer
			 * show modal with user for selcet
             * @param oEvent
             */
            onAssignButtonPress : function (oEvent) {
                this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
                if(this._aSelectedRowsIdx.length > 0){
                    if (!this._oAssignDialog) {
                        this._oAssignDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.AssignSelectDialog", this);
                        this.getView().addDependent(this._oAssignDialog);
                    }
                    this._oAssignDialog.open();
				}else{
                    var msg = this.getResourceBundle().getText('ymsg.selectMinItem');
                    MessageToast.show(msg);
				}
            },

            /**
             * close assign modal
             * @param oEvent
             */
            onSearchAssignModal : function (oEvent) {
                var sQuery = oEvent.getSource().getValue(),
                    oTable = sap.ui.getCore().byId("assignModalTable");
                this.onSearchTreeTable(oTable, sQuery);
            },

            /**
             *
             * @param oEvent
             */
            onSelectionChangeAssignModal : function (oEvent) {
                var oContext = oEvent.getParameter("rowContext");
                var targetPath = oContext.sPath;
                //this.saveAssignedDemands([], targetPath);
                this._oAssignDialog.close();
            },

            onChangeStatusButtonPress : function (oEvent) {
                this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
                if(this._aSelectedRowsIdx.length > 0){
                    if (!this._oStatusDialog) {
                        this._oStatusDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.StatusSelectDialog", this);
                        this.getView().addDependent(this._oAssignDialog);
                    }
                    this._oStatusDialog.open();
                }else{
                    var msg = this.getResourceBundle().getText('ymsg.selectMinItem');
                    MessageToast.show(msg);
                }
            },

            onMessagePopoverPress: function (oEvent) {
                oMessagePopover.openBy(oEvent.getSource());
            },

            onExit: function() {
                if(this._oAssignDialog){
                    this._oAssignDialog.destroy();
                }
                if(this._oStatusDialog){
                    this._oStatusDialog.destroy();
                }
            },

            /**
             * @param oEvent
             */
            onCancelAssginModal : function (oEvent) {
                this._oAssignDialog.close();
            },

			/* =========================================================== */
			/* internal methods                                            */
			/* =========================================================== */

            _configureDataTable : function (oDataTable) {
                oDataTable.setEnableBusyIndicator(true);
                oDataTable.setSelectionMode('MultiToggle');
                oDataTable.setEnableColumnReordering(false);
                oDataTable.setEnableCellFilter(false);
                oDataTable.attachBusyStateChanged(this.onBusyStateChanged, this);

                //this highlight is only to show that rows can be dragged - nice to see
                oDataTable.setRowSettingsTemplate(new RowSettings({
                    highlight: "Information"
                }));
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
                    var item = $('<li id="'+aPathsData[i].sPath+'" class="ui-draggable-dragging-item"></li>');
                    var text = '<span class="demandId">'+aPathsData[i].oData.Guid+'</span> - '+aPathsData[i].oData.DemandDesc;
                    item.html(text);
                    helperTemplate.append(item);
                }
                return helperTemplate;
            }
		});
	}
);