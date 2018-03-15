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
	"sap/m/Link",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem"
], function(BaseController, JSONModel, formatter, Filter, FilterOperator, Table, Row, RowSettings, MessageToast, MessagePopover,
	MessagePopoverItem, Link, RowAction, RowActionItem) {
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
            eventBus.subscribe("StatusSelectDialog", "changeStatusDemand", this._triggerSaveDemandStatus, this);
            eventBus.subscribe("BaseController", "refreshDemandTable", this._triggerDemandFilter, this);

			this.getRouter().getRoute("list").attachPatternMatched(this._onObjectMatched, this);
			
            // event listener for changing device orientation with fallback of window resize
            var orientationEvent = this.getOrientationEvent(),
                _this = this;

            window.addEventListener(orientationEvent, function() {
                _this._jDraggable(_this);
            }, false);
		},
		/**
		 * Method get call when ever the hash mathes the route name 
		 * Registering draggable functionality to make sure it will work all the time
		 * @Author Rahul
		 * @version 1.0.4
		 * @param oEvent
		 * @private
		 */
		_onObjectMatched:function(oEvent){
			 var _this = this;
			 _this._jDraggable(_this);
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
        onAssignButtonPress : function (oEvent){
            this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
            var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, true);

            if(oSelectedPaths.aPathsData.length > 0){
                this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedPaths.aPathsData);
            }
            if(oSelectedPaths.aNonAssignable.length > 0){
                this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
            }
        },

        /**
         * open change status dialog
         * @param oEvent
         */
        onChangeStatusButtonPress : function (oEvent) {
            this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
            var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);

            if(this._aSelectedRowsIdx.length > 0){
                this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedPaths.aPathsData);
            }else{
                var msg = this.getResourceBundle().getText('ymsg.selectMinItem');
                MessageToast.show(msg);
            }
        },
        /**
         * on click on navigate acion navigate to overview page
         * @param oEvent
         */
        onActionPress:function(oEvent){
        	var oRouter = this.getRouter();
        	var oRow = oEvent.getParameter("row");
        	var oContext = oRow.getBindingContext();
        	var sPath = oContext.getPath();
        	var oModel = oContext.getModel();
        	var oData = oModel.getProperty(sPath);
        	oRouter.navTo("detail", {guid:oData.Guid});
        },

		onMessagePopoverPress: function(oEvent) {
			oMessagePopover.openBy(oEvent.getSource());
		},

        onExit: function() {
        	if(this._infoDialog){
        		this._infoDialog.destroy();
        	}
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * add configuration to demand table
         * @param oDataTable
         * @private
         */
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
            
            var onClickNavigation = this.onActionPress.bind(this);
            var oTemplate = oDataTable.getRowActionTemplate();
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
			oDataTable.setRowActionTemplate(oTemplate);
			oDataTable.setRowActionCount(1);
			
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
                    console.warn(error);
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
                        var targetCheckboxIdx = target.data("sapUiRowindex"),
                            selectedIdx = _this._oDataTable.getSelectedIndices(),
                            oSelectedPaths = null;


                        //get all selected rows when checkboxes in table selected
                        if(selectedIdx.length > 0){
                            oSelectedPaths = _this._getSelectedRowPaths(_this._oDataTable, selectedIdx, true);
                            aPathsData = oSelectedPaths.aPathsData;

                        } else {
                            //single drag by checkbox row index
                            if(targetCheckboxIdx >= 0){
                                selectedIdx = [targetCheckboxIdx];
                                oSelectedPaths = _this._getSelectedRowPaths(_this._oDataTable, selectedIdx, true);
                                aPathsData = oSelectedPaths.aPathsData;
                            }else{
                                //table tr single dragged element
                                aPathsData = _this._getSingleDraggedElement(target.attr('id'));
                            }
                        }

                        if(oSelectedPaths && oSelectedPaths.aNonAssignable && oSelectedPaths.aNonAssignable.length > 0){
                            _this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
                            // _this._stopDrag(jDragElement);
                        }
                        //get helper html list
                        var oHtml = _this._generateDragHelperHTML(aPathsData,oSelectedPaths.aNonAssignable);
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

        _stopDrag: function (jDragElement) {
            // need to restore this later
            var origRevertDuration = jDragElement.draggable('option', 'revertDuration');
            var origRevertValue = jDragElement.draggable('option', 'revert');
            jDragElement
                .css({top: '0px', left: '0px'})
                .draggable('option', 'revert', true)
                .draggable('option', 'revertDuration', 0)
                .trigger('mouseup')
                .draggable('option', 'revertDuration', origRevertDuration)
                .draggable('option', 'revert', origRevertValue);
                
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
        _generateDragHelperHTML : function (aPathsData,aNonAssignable) {
        	var $Element = $("#dragHelper"),
        		helperTemplate;
        	if($Element.length > 0){
        		$Element.remove();
        	}
        	if(aNonAssignable.length <= 0){
        		helperTemplate = $('<ul id="dragHelper"></ul>');
        	}else{
        		helperTemplate = $('<ul id="dragHelper" style="display:none"></ul>');
        	}
            
            for (var i=0; i<aPathsData.length; i++) {
                var item = $('<li id="'+aPathsData[i].sPath+'" class="ui-draggable-dragging-item"></li>');
                var text = aPathsData[i].oData.DemandDesc;
                item.html(text);
                helperTemplate.append(item);
            }
            return helperTemplate;
        },

        /**
         * catch event from dialog for save demand assignment
         * @param sChanel
         * @param sEvent
         * @param oData
         * @private
         */
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
        },

        /**
         * catch event from dialog for saving demand status change
         * @param sChanel
         * @param sEvent
         * @param oData
         * @private
         */
        _triggerSaveDemandStatus: function (sChanel, sEvent, oData) {
            if(sEvent === "changeStatusDemand"){
                this.updateFunctionDemand(oData.selectedPaths, oData.functionKey);
            }
        },
        /**
         * Initialize and open the Information dialog with necessary details
         * @Author Rahul
         * @param oEvent Button press event
         */
        onIconPress: function(oEvent){
        	// create popover
			if (!this._infoDialog) {
				this._infoDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.InformationPopover", this);
				this.getView().addDependent(this._infoDialog);
			}
			this._infoDialog.open();
        },
        /**
         * Closes the information dialog
         * @Author Rahul
         */
        onCloseDialog: function(){
        	this._infoDialog.close();
        }
	});
});