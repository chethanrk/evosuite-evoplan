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
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",
	"sap/m/Link"
], function(BaseController, JSONModel, formatter, Filter, FilterOperator, Table, Row, RowSettings, MessageToast, MessagePopover,
	MessagePopoverItem, Link) {
	"use strict";

	var oLink = new Link({
		text: "{i18n>xtit.showMoreInfo}",
		href: "",
		target: "_blank"
	});

	var oMessageTemplate = new MessagePopoverItem({
		type: '{MessageModel>type}',
		title: '{MessageModel>title}',
		description: '{MessageModel>description}',
		subtitle: '{MessageModel>subtitle}',
		counter: '{MessageModel>counter}',
		link: oLink
	});

	var oMessagePopover = new MessagePopover({
		items: {
			path: 'MessageModel>/',
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
		onInit: function() {
			this._oDraggableTable = this.byId("draggableList");
			this._oDataTable = this._oDraggableTable.getTable();
			this._configureDataTable(this._oDataTable);
			this._aSelectedRowsIdx = [];
			this.getView().addDependent(oMessagePopover);


            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("AssignTreeDialog", "assignSelectedDemand", this._triggerSaveAssignment, this);
            eventBus.subscribe("BaseController", "refreshDemandTable", this._triggerDemandFilter, this);
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
		onAfterRendering: function(oEvent) {
			var tableTitle = this.getResourceBundle().getText("xtit.itemListTitle");
			var noDataText = this.getResourceBundle().getText("tableNoDataText", [tableTitle]);
			var viewModel = this.getModel("viewModel");
			viewModel.setProperty("/subViewTitle", tableTitle);
			viewModel.setProperty("/subTableNoDataText", noDataText);
		},

		/**
		 * initial draggable after every refresh of table
		 * for example after go to next page
		 * @param oEvent
		 */
		onBusyStateChanged: function(oEvent) {
			var parameters = oEvent.getParameters();
			if (parameters.busy === false) {
				this._jDraggable(this);
			}
		},

            /**
			 * on press assign button in footer
			 * show modal with user for select
             * @param oEvent
             */
            onAssignButtonPress : function (oEvent) {
                this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
                if(this._aSelectedRowsIdx.length > 0){
                    this.getOwnerComponent().assignTreeDialog.open(this.getView(), false);
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
                var sQuery = oEvent.getSource().getValue() || "",
                    oTable = sap.ui.getCore().byId("assignModalTable");

                var viewModel = this.getModel("viewModel"),
                    binding = oTable.getBinding("rows"),
                    viewFilters = viewModel.getProperty("/resourceFilterView"),
                    aFilters = viewFilters.slice(0);

                if(!aFilters && aFilters.length == 0){
                    return;
                }

                aFilters.push(new Filter("Description", FilterOperator.Contains, sQuery));
                var resourceFilter = new Filter({filters: aFilters, and: true});
                binding.filter(resourceFilter, "Application");
            },

            onChangeStatusButtonPress : function (oEvent) {
                this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
                if(this._aSelectedRowsIdx.length > 0){
                    if (!this._oStatusDialog) {
                        this._oStatusDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.StatusSelectDialog", this);
                        this.getView().addDependent(this._oStatusDialog);
                    }
                    this._oStatusDialog.open();
                }else{
                    var msg = this.getResourceBundle().getText('ymsg.selectMinItem');
                    MessageToast.show(msg);
                }
            },

		onMessagePopoverPress: function(oEvent) {
			oMessagePopover.openBy(oEvent.getSource());
		},

            onExit: function() {
                if(this._oStatusDialog){
                    this._oStatusDialog.destroy();
                }
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

                //enable/disable buttons on footer when there is some/no selected rows
                oDataTable.attachRowSelectionChange(function () {
                    var selected = this._oDataTable.getSelectedIndices();
                    if(selected.length > 0){
                        this.byId("assignButton").setEnabled(true);
                        this.byId("changeStatusButton").setEnabled(true);
                    }else{
                        this.byId("assignButton").setEnabled(false);
                        this.byId("changeStatusButton").setEnabled(false);
                    }
                }, this);
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
                    var draggableTableId = _this._oDraggableTable.getId(), // sapUiTableRowHdr
                        aPathsData = [];
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
                                aPathsData = _this._getSelectedRowPaths(_this.getModel(), _this._oDataTable, selectedIdx);
                            }
                            if(!_this.multiSelect){
                                //single drag by checkbox row index
                            	if(targetDataCheckbox >= 0){
                                    selectedIdx = [targetDataCheckbox];
                                    aPathsData = _this._getSelectedRowPaths(_this.getModel(), _this._oDataTable, selectedIdx);
								}else{
                                    //table tr single dragged element
                                    aPathsData = _this._getSingleDraggedElement(target.attr('id'));
								}
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
                    //var text = '<span class="demandId">'+aPathsData[i].oData.Guid+'</span> - '+aPathsData[i].oData.DemandDesc;
                    var text = aPathsData[i].oData.DemandDesc;
                    item.html(text);
                    helperTemplate.append(item);
                }
                return helperTemplate;
            },

            _triggerSaveAssignment: function (sChanel, sEvent, oData) {
                if(sEvent === "assignSelectedDemand"){
                    this.assignedDemands(oData.selectedPaths, oData.assignPath);
                }
            },
             /**
			 * generates html list for dragged paths and gives back to helper function
             * @param sChanel
             * @param sEvent event which is getting triggered
             * @param oData Data passed while publishing the event
             * @returns 
             * @private
             */
            _triggerDemandFilter: function(sChanel, sEvent, oData){
            	if(sEvent === "refreshDemandTable"){
                    this.byId("draggableList").rebindTable();
                }
            }
		});
	}
);