sap.ui.define([
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/controller/ErrorHandler",
	"sap/m/MessageToast"
], function(Device, JSONModel, Filter, FilterOperator, FilterType, formatter, BaseController,ErrorHandler,MessageToast) {
	"use strict";

    return BaseController.extend('com.evorait.evoplan.controller.MasterPage', {

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
            eventBus.subscribe("AssignInfoDialog", "updateAssignment", this._triggerUpdateAssign, this);
            eventBus.subscribe("AssignInfoDialog", "deleteAssignment", this._triggerDeleteAssign, this);
            eventBus.subscribe("FilterSettingsDialog", "triggerSearch", this._triggerFilterSearch, this);

            // event listener for changing device orientation with fallback of window resize
            var orientationEvent = this.getOrientationEvent(),
                _this = this;

            window.addEventListener(orientationEvent, function() {
                _this._jDroppable(_this);
            }, false);
        },

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage **/
		onAfterRendering: function(oEvent) {
			//init droppable
			this.refreshDroppable(oEvent);
			//init planning calendar dialog
			this._initPlanCalendarDialog();
		},

        /**
         *
         * @param oEvent
         */
        onBeforeRebindTable: function(oEvent) {
            var oBindingParams = oEvent.getParameter('bindingParams');
            oBindingParams.parameters.numberOfExpandedLevels = 1;
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
			} else {
				this.byId("showPlanCalendar").setEnabled(false);
			}
		},

		/**
		 * @param oEvent
		 */
		onPressShowPlanningCal: function(oEvent) {
			this._setCalendarModel();
			/*this._oPlanningCalDialog.open();*/ // As we are opening the dialog when set model data
		},

		onCalendarModalCancel: function(oEvent) {
			this._oPlanningCalDialog.close();
		},
        /**
         * on press cancel in dialog close it
         * @param oEvent
         */
        onModalCancel: function (oEvent) {
            if (this._oPlanningCalDialog) {
                this._oPlanningCalDialog.close();
            }
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

        /**
         * show assignment info dialog on clicked calendar entry
         * @param oEvent
         */
		onClickCalendarAssignment: function(oEvent){
			var oAppointment = oEvent.getParameter("appointment");
			var oContext = oAppointment.getBindingContext("calendarModel");
			var oModel = oContext.getModel();
			var sPath = oContext.getPath();
			var oAppointmentData = oModel.getProperty(sPath);
			this.getOwnerComponent().assignInfoDialog.open(this.getView(), null, oAppointmentData);
			
		},
        /**
         * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
         */
        onExit: function() {
            if (this._oPlanningCalDialog) {
                this._oPlanningCalDialog.destroy();
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
         *
         * @private
         */
		_initPlanCalendarDialog: function() {
			if (!this._oPlanningCalDialog) {
				this._oPlanningCalDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.ResourceCalendarDialog", this);
				this.getView().addDependent(this._oPlanningCalDialog);
				this._setCalendarModel();
			}
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

        _triggerUpdateAssign: function (sChanel, sEvent, oData) {
            if(sEvent === "updateAssignment"){
                this.updateAssignment(oData.isReassign);
            }
        },

        _triggerDeleteAssign: function (sChanel, sEvent, oData) {
            if(sEvent === "deleteAssignment"){
                this.deleteAssignment(oData.sId);
            }
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
                    console.warn(error);
                }

                droppedElement.droppable({
                    accept: ".ui-draggable",
                    drop: function( event, ui ) {
                        //get hovered marked row, there could be a difference with dropped row
                        var hoverRow = $("#"+droppableTableId+" .sapUiTableRowHvr"),
                            dropTargetId = hoverRow.attr("id");

                        if(!dropTargetId){
                            dropTargetId = event.target.id;
                        }

                        var targetElement = sap.ui.getCore().byId(dropTargetId),
                            oContext = targetElement.getBindingContext();

                        if(oContext){
                            var targetPath = oContext.getPath();
                            var targetObj = _this.getModel().getProperty(targetPath);

                            //don't drop on orders
                            if(targetObj.NodeType === "ASSIGNMENT"){
                                return;
                            }

							var draggedElements = ui.helper[0],
								aSources = [];
							$(draggedElements).find('li').each(function(idx, obj) {
								aSources.push({
									sPath: $(this).attr('id')
								});
							});
                            _this.assignedDemands(aSources, targetPath);
						}
					}
				});
			}, 1000);
		},

		/**
		 * Method reads ResourceSet with Assignments
		 * and merge into one json model for planning calendar
		 * @private
		 */
		_setCalendarModel: function() {
			var aUsers = [],
                aResourceFilters = [],
                oModel = this.getModel(),
                oResourceBundle = this.getResourceBundle(),
                oViewFilterSettings = this.getOwnerComponent().filterSettingsDialog;


			if (this.selectedResources.length <= 0) {
				return;
			}

			for (var i = 0; i < this.selectedResources.length; i++) {
				var obj = oModel.getProperty(this.selectedResources[i]);
				if (obj.NodeType === "RESOURCE") {
					aUsers.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGuid + "//" + obj.ResourceGroupGuid));
				} else if (obj.NodeType === "RES_GROUP") {
					aUsers.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid));
				}
			}
			if (aUsers.length > 0) {
				aResourceFilters.push(new Filter({
					filters: aUsers,
					and: false
				}));
			}

			var sDateControl1 = oViewFilterSettings.getFilterDateRange()[0].getValue();
			sDateControl1 = this.formatter.date(sDateControl1);

			var sCalendarView;
			var oViewFilterItems = oViewFilterSettings.getFilterSelectView().getItems();
			for (var j in oViewFilterItems) {
				var oViewFilterItem = oViewFilterItems[j];
				if (oViewFilterItem.getSelected()) {
					sCalendarView = oViewFilterItem.getKey();
				}
			}
			
			oModel.read("/ResourceSet", {
				filters: aResourceFilters,
				urlParameters: {
					"$expand": "ResourceToAssignments,ResourceToAssignments/Demand" // To fetch the assignments associated with Resource or ResourceGroup
				},
				success: function(data, response) {
					var oCalendarModel = new JSONModel();
					oCalendarModel.setData({
						startDate: new Date(sDateControl1),
						viewKey: sCalendarView,
						resources: data.results
					});
					this.setModel(oCalendarModel, "calendarModel");
					this._oPlanningCalDialog.open();
				}.bind(this),
				error: function(error, response) {
					MessageToast.show(oResourceBundle.getText("errorMessage"), {duration: 5000});
				}.bind(this)
			});
		},

		/**
		 * Method will refresh the data of tree by restoring its state
		 * 
		 * @Author Rahul
		 * @version 1.0.4
		 * @return 
		 * @private
		 */
		_triggerRefreshTree:function(){
			var oContext = this.byId("droppableTable").getBinding("rows").getContextByIndex(0),
            	oModel = oContext.getModel(),
            	sPath = oContext.getPath();
            	
                oModel.setProperty(sPath+"/IsSelected",true); // changing the property in order trigger submit change 
                this.byId("droppableTable").getBinding("rows").submitChanges();// submit change will refresh of tree according maintained parameters
				//Resetting selected resource for calendar as by default IsSelected will come as false from backend
				this.selectedResources = [];
				this.byId("showPlanCalendar").setEnabled(false);
		}
	});
});
