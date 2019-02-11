sap.ui.define([
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/AssignmentsController",
	"sap/m/MessageToast",
    "sap/m/MessageBox"
], function(Device, JSONModel, Filter, FilterOperator,
            FilterType, formatter, BaseController,
            MessageToast,MessageBox) {
	"use strict";

    return BaseController.extend('com.evorait.evoplan.controller.ResourceTree', {

        formatter: formatter,

        firstLoad: false,

        assignmentPath: null,

        selectedResources: [],


        /**
        * Called when a controller is instantiated and its View controls (if available) are already created.
        * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
        **/
        onInit: function() {
            this._oDroppableTable = this.byId("droppableTable");
            this._oDataTable = this._oDroppableTable;
            this._configureDataTable(this._oDataTable);
            this.getOwnerComponent().filterSettingsDialog.init(this.getView());
            //add form fields to variant
            this._initCustomVariant();

            //eventbus of assignemnt handling
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("BaseController", "refreshTreeTable", this._triggerRefreshTree, this);
            eventBus.subscribe("FilterSettingsDialog", "triggerSearch", this._triggerFilterSearch, this);
            eventBus.subscribe("App", "RegisterDrop", this._registerDnD, this);
            // eventBus.subscribe("AssignInfoDialog", "CloseCalendar", this._closeCalendar, this);

            // event listener for changing device orientation with fallback of window resize
            var orientationEvent = this.getOrientationEvent(),
                _this = this;

            window.addEventListener(orientationEvent, function() {
                _this._jDroppable(_this);
            }, false);
        },
        /**
         * Register's the DnD
         * @private
         */
        _registerDnD:function(){
            var _this = this;
            _this._jDroppable(_this);
        },
		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.ResourceTree **/
		onAfterRendering: function(oEvent) {
			//init droppable
			this.refreshDroppable(oEvent);
		},


        /**
         * initial draggable after every refresh of table
         * for example after go to next page
         * @param oEvent
         */
        onBusyStateChanged : function (oEvent) {
            var parameters = oEvent.getParameters();
            if(parameters.busy === false){
                this._jDroppable(this);
                this._oDataTable.setVisibleRowCountMode(sap.ui.table.VisibleRowCountMode.Auto);

                if(this.hasCustomDefaultVariant){
                    this.hasCustomDefaultVariant = false;
                    this._triggerFilterSearch();
				}
            }else{
                this.onTreeUpdateStarted();
                this._oDataTable.setVisibleRowCountMode(sap.ui.table.VisibleRowCountMode.Fixed);
            }
        },

        /**
         * initialize or update droppable after updating tree list
         * @param oEvent
         */
        refreshDroppable : function (oEvent) {
            if(this._oDroppableTable){
                this._jDroppable(this);
            }
        },

        /**
         * trigger add filter to tree table for the first time
         */
        onTreeUpdateStarted: function () {
            if(!this.firstLoad){
                this._triggerFilterSearch();
                this.firstLoad = true;
            }
        },

        /**
         * search on searchfield in header
         * @param oEvent
         */
        onSearchResources : function (oEvent) {
            this._triggerFilterSearch();
        },

        /**
         * open FilterSettingsDialog
         * @param oEvent
         */
        onFilterButtonPress : function (oEvent) {
            this.getOwnerComponent().filterSettingsDialog.open(this.getView());
        },

        onInitialiseVariant: function (oEvent) {
        	var oParameters = oEvent.getParameters();
            if(oParameters.defaultContent && !oParameters.isStandard){
            	this.hasCustomDefaultVariant = true;
            }
        },

		/**
		 * when a new variant is selected trigger search
		 * new Filters are bind to tree table
		 * @param oEvent
		 */
		onSelectVariant: function(oEvent) {
            this._triggerFilterSearch();
		},

		/**
		 * Todo: on deselect
		 * @param oEvent
		 */
		onChangeSelectResource: function(oEvent) {
			var oSource = oEvent.getSource();
			var parent = oSource.getParent();
			var sPath = parent.getBindingContext().getPath();
			var oParams = oEvent.getParameters();
			
			//Sets the property IsSelected manually 
			this.getModel().setProperty(sPath+"/IsSelected",oParams.selected);
			
			if (oParams.selected) {
				this.selectedResources.push(sPath);

			} else if (this.selectedResources.indexOf(sPath) >= 0) {
				//removing the path from this.selectedResources when user unselect the checkbox
                this.selectedResources.splice(this.selectedResources.indexOf(sPath), 1);
			}

			if (this.selectedResources.length > 0) {
				this.byId("showPlanCalendar").setEnabled(true);
                this.byId("idButtonreassign").setEnabled(true);
                this.byId("idButtonunassign").setEnabled(true);
			} else {
				this.byId("showPlanCalendar").setEnabled(false);
                this.byId("idButtonreassign").setEnabled(false);
                this.byId("idButtonunassign").setEnabled(false);
			}
		},

		/**
         * Open the planning calendar for selected resources
		 * @param oEvent
		 */
		onPressShowPlanningCal: function(oEvent) {
			this.getOwnerComponent().planningCalendarDialog.open(this.getView(),this.selectedResources); // As we are opening the dialog when set model data
		},


        /**
         * on press link of assignment in resource tree row
         * get parent row path and bind this path to the dialog or showing assignment information
         * @param oEvent
         */
        onPressAssignmentLink: function (oEvent) {
            var oSource = oEvent.getSource(),
                oRowContext = oSource.getParent().getBindingContext();

            if(oRowContext) {
                this.assignmentPath = oRowContext.getPath();
                this.getOwnerComponent().assignInfoDialog.open(this.getView(), this.assignmentPath);
            }else{
                var msg = this.getResourceBundle().getText("notFoundContext");
                this.showMessageToast(msg);
            }
        },

        onPressReassign: function (oEvent){
            this.getOwnerComponent().assignActionsDialog.open(this.getView(),this.selectedResources,false);
        },
        onPressUnassign: function (oEvent) {
            this.getOwnerComponent().assignActionsDialog.open(this.getView(),this.selectedResources,true);
        },

        /**
         * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
         */
        onExit: function() {
            if (this.getOwnerComponent().planningCalendarDialog) {
                this.getOwnerComponent().planningCalendarDialog.getDialog().destroy();
            }
            if(this.getOwnerComponent().filterSettingsDialog) {
                this.getOwnerComponent().filterSettingsDialog.getDialog().destroy();
            }
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * configure tree table
         * @param oDataTable
         * @private
         */
        _configureDataTable : function (oDataTable) {
            oDataTable.setEnableBusyIndicator(true);
            oDataTable.setSelectionMode('None');
            oDataTable.setColumnHeaderVisible(false);
            oDataTable.setEnableCellFilter(false);
            oDataTable.setEnableColumnReordering(false);
            oDataTable.setEditable(false);
            oDataTable.setVisibleRowCountMode(sap.ui.table.VisibleRowCountMode.Fixed);
            oDataTable.attachBusyStateChanged(this.onBusyStateChanged, this);
        },

        /**
         * init custom smart variant management and add filter controls to it
         * @private
         */
        _initCustomVariant: function () {
            var oVariant = this.byId("customResourceVariant");
            this.getOwnerComponent().filterSettingsDialog.setVariant(oVariant);
        },

        /**
         * triggers request with all setted filters
         * @private
         */
        _triggerFilterSearch: function () {
            var binding = this._oDataTable.getBinding("rows");
            var aFilters = this.getOwnerComponent().filterSettingsDialog.getAllFilters();
            binding.filter(aFilters, "Application");
        },

        /**
         * dropped demands assign and save
         * @param _this
         * @private
         */
        _jDroppable: function (_this) {
            setTimeout(function() {
                var droppableTableId = _this._oDroppableTable.getId();
                var droppedElement = $("#"+droppableTableId+" tbody tr, #"+droppableTableId+" li");

                try{
                    if(droppedElement.hasClass("ui-droppable")){
                        droppedElement.droppable( "destroy" );
                    }
                }catch(error){
                    jQuery.sap.log.warning(error);                                                       
                }

                droppedElement.droppable({
                    accept: ".ui-draggable",
                    drop: function( event, ui ) {
                        //get hovered marked row, there could be a difference with dropped row
                        var hoverRow = $("#"+droppableTableId+" .sapUiTableRowHvr"),
                            dropTargetId = hoverRow.attr("id"),
                            aSources = [];

                        if(!dropTargetId){
                            dropTargetId = event.target.id;
                        }

                        var targetElement = sap.ui.getCore().byId(dropTargetId),
                            oContext = targetElement.getBindingContext();

                        if(oContext){
                            var targetPath = oContext.getPath();
                            var targetObj = _this.getModel().getProperty(targetPath);

                            //don't drop on assignments
                            if(targetObj.NodeType === "ASSIGNMENT"){
                                return;
                            }

							if(!_this.isAssignable({data:targetObj})){
                                return;
                            }
                            aSources = _this.getModel("viewModel").getProperty("/dragSession");
							// If the Resource is Not/Partially available
                            if(_this.isAvailable(targetPath)){
                                _this.assignedDemands(aSources, targetPath, {bFromHome: true});
                            }else{
                                _this.showMessageToProceed(aSources, targetPath, {bFromHome: true});
                            }
						}
					}
				});
			}, 1000);
		},
		/**
		 * Method will refresh the data of tree by restoring its state
		 * 
		 * @Author Rahul
		 * @version 2.0.4
		 * @return 
		 * @private
		 */
		_triggerRefreshTree:function(){
			var oContext = this.byId("droppableTable").getAggregation("rows")[0].getBindingContext(),
                oModel,
                sPath;
				
				this.resetChanges();
				
			    if(oContext){
                    oModel = oContext.getModel();
                    sPath = oContext.getPath();

                    oModel.setProperty(sPath+"/IsSelected",true); // changing the property in order trigger submit change
                    this.byId("droppableTable").getBinding("rows").submitChanges();// submit change will refresh of tree according maintained parameters
                }else{
                    this._triggerFilterSearch();
                }
			
		},
		/**
		 * Resets the selected resource if selected  
		 */
		resetChanges: function(){
                this.selectedResources = [];
				this.byId("showPlanCalendar").setEnabled(false);
                this.byId("idButtonreassign").setEnabled(false);
                this.byId("idButtonunassign").setEnabled(false);
		}
	});
});