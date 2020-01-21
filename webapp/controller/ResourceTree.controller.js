sap.ui.define([
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/AssignmentsController",
	"com/evorait/evoplan/controller/ResourceTreeFilterBar",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (Device, JSONModel, Filter, FilterOperator,
	FilterType, formatter, BaseController, ResourceTreeFilterBar,
	MessageToast, MessageBox) {
	"use strict";

    return BaseController.extend("com.evorait.evoplan.controller.ResourceTree", {

        formatter: formatter,

        isLoaded: false,

        assignmentPath: null,

        selectedResources: [],

		oFilterConfigsController: null,

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 **/
		onInit: function () {
			this._oDroppableTable = this.byId("droppableTable");
			this._oDataTable = this._oDroppableTable.getTable();
			this._configureDataTable(this._oDataTable);

			this.oFilterConfigsController = new ResourceTreeFilterBar();
			this.oFilterConfigsController.init(this.getView(), "resourceTreeFilterBarFragment");

            //eventbus of assignemnt handling
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("BaseController", "refreshTreeTable", this._triggerRefreshTree, this);
            eventBus.subscribe("App", "RegisterDrop", this._registerDnD, this);
            eventBus.subscribe("ManageAbsences", "ClearSelection", this.resetChanges, this);
            // eventBus.subscribe("AssignInfoDialog", "CloseCalendar", this._closeCalendar, this);

            // event listener for changing device orientation with fallback of window resize
            var orientationEvent = this.getOrientationEvent(),
                _this = this;

			window.addEventListener(orientationEvent, function () {
				_this._jDroppable(_this);
			}, false);

			// register drop every time table was new rendered
            this._oDataTable.onAfterRendering = function() {
                if (sap.ui.table.TreeTable.prototype.onAfterRendering) {
                    sap.ui.table.TreeTable.prototype.onAfterRendering.apply(this, arguments);
                }
                //when app was already loaded
				// On SmartFilterbar expand or collapse drag and drop is not working anymore
				//so when table is finished with rendering init dragDrop again
                if(_this.isLoaded){
					_this._jDroppable(_this);
				}
            };
		},
		/**
		 * Register's the DnD
		 * @private
		 */
		_registerDnD: function () {
			var _this = this;
			_this._jDroppable(_this);
		},
		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.ResourceTree **/
		onAfterRendering: function (oEvent) {},

        /**
         * initial draggable after every refresh of table
         * for example after go to next page
         * @param oEvent
         */
        onBusyStateChanged: function (oEvent) {
            var parameters = oEvent.getParameters();
            if (parameters.busy === false) {
                this._oDataTable.setVisibleRowCountMode(sap.ui.table.VisibleRowCountMode.Auto);
            } else {
                //this.onTreeUpdateStarted();
                this._oDataTable.setVisibleRowCountMode(sap.ui.table.VisibleRowCountMode.Fixed);
            }
        },

        /**
         * Todo: on deselect
         * @param oEvent
         */
        onChangeSelectResource: function (oEvent) {
            var oSource = oEvent.getSource();
            var parent = oSource.getParent();
            var sPath = parent.getBindingContext().getPath();
            var oParams = oEvent.getParameters();

            //Sets the property IsSelected manually
            this.getModel().setProperty(sPath + "/IsSelected", oParams.selected);

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
            if(this.selectedResources.length === 1){
                this.byId("idButtonCreUA").setEnabled(true);
            }else{
                this.byId("idButtonCreUA").setEnabled(false);
            }
        },

        /**
         * Open the planning calendar for selected resources
         * @param oEvent
         */
        onPressShowPlanningCal: function (oEvent) {
        	this.getModel("viewModel").setProperty("/calendarBusy",true);
            this.getOwnerComponent().planningCalendarDialog.open(this.getView(), this.selectedResources, {
                bFromPlannCal: true
            }); // As we are opening the dialog when set model data
        },

        /**
         * on press link of assignment in resource tree row
         * get parent row path and bind this path to the dialog or showing assignment information
         * @param oEvent
         */
        onPressAssignmentLink: function (oEvent) {
            var oSource = oEvent.getSource(),
                oRowContext = oSource.getParent().getBindingContext();

            if (oRowContext) {
                this.assignmentPath = oRowContext.getPath();
                this.getOwnerComponent().assignInfoDialog.open(this.getView(), this.assignmentPath);
            } else {
                var msg = this.getResourceBundle().getText("notFoundContext");
                this.showMessageToast(msg);
            }
        },

        /**
         * Open's Dialog containing assignments to reassign
         * @param oEvent
         */
        onPressReassign: function (oEvent) {
            this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, false);
        },
        /**
         * Open's Dialog containing assignments to unassign
         * @param oEvent
         */
        onPressUnassign: function (oEvent) {
            this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, true);
        },

		onBeforeRebindTable: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oBinding = oParams.bindingParams;

			if(!this.isLoaded){
                this.isLoaded = true;
                oBinding.parameters.numberOfExpandedLevels = 1;
                oBinding.parameters.restoreTreeStateAfterChange = true;
			}
			var aFilter = this.oFilterConfigsController.getAllCustomFilters();
			oBinding.filters = [new Filter(aFilter, true)];
		},

        /**
         * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
         */
        onExit: function () {
            if (this.getOwnerComponent().planningCalendarDialog) {
                this.getOwnerComponent().planningCalendarDialog.getDialog().destroy();
            }
            // if (this.getOwnerComponent().filterSettingsDialog) {
            //     this.getOwnerComponent().filterSettingsDialog.getDialog().destroy();
            // }
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * configure tree table
         * @param oDataTable
         * @private
         */
        _configureDataTable: function (oDataTable) {
            oDataTable.setEnableBusyIndicator(true);
            oDataTable.setSelectionMode("None");
            oDataTable.setColumnHeaderVisible(false);
            oDataTable.setEnableCellFilter(false);
            oDataTable.setEnableColumnReordering(false);
            oDataTable.setEditable(false);
            oDataTable.setVisibleRowCountMode(sap.ui.table.VisibleRowCountMode.Fixed);
            oDataTable.attachBusyStateChanged(this.onBusyStateChanged, this);

        },

		/**
		 * triggers request with all setted filters
		 * @private
		 */
		_triggerFilterSearch: function () {
			/*var aFilters = this.oFilterConfigsController.getAllFilters();
			var binding = this._oDataTable.getBinding("rows");
			binding.filter([new Filter(aFilters, true)], sap.ui.model.FilterType.Application);*/
			this._oDroppableTable.rebindTable();
		},

        /**
         * dropped demands assign and save
         * @param _this
         * @private
         */
        _jDroppable: function (_this) {
            setTimeout(function () {
                var droppableTableId = _this._oDroppableTable.getId();
                var droppedElement = $("#" + droppableTableId + " tbody tr, #" + droppableTableId + " li");

                try {
                    if (droppedElement.hasClass("ui-droppable")) {
                        droppedElement.droppable("destroy");
                    }
                } catch (error) {
                    jQuery.sap.log.warning(error);
                }

                droppedElement.droppable({
                    accept: ".ui-draggable",
                    drop: function (event, ui) {
                        //get hovered marked row, there could be a difference with dropped row
                        var hoverRow = $("#" + droppableTableId + " .sapUiTableRowHvr"),
                            dropTargetId = hoverRow.attr("id"),
                            aSources = [];

                        if (!dropTargetId) {
                            dropTargetId = event.target.id;
                        }

                        var targetElement = sap.ui.getCore().byId(dropTargetId),
                            oContext = targetElement.getBindingContext();

                        if (oContext) {
                            var targetPath = oContext.getPath();
                            var targetObj = _this.getModel().getProperty(targetPath);

                            //don't drop on assignments
                            if (targetObj.NodeType === "ASSIGNMENT") {
                                return;
                            }

							if (!_this.isAssignable({
									data: targetObj
								})) {
								return;
							}
							aSources = _this.getModel("viewModel").getProperty("/dragSession");
							// If the Resource is Not/Partially available
							if (_this.isAvailable(targetPath)) {
								_this.assignedDemands(aSources, targetPath);
							} else {
								_this.showMessageToProceed(aSources, targetPath);
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
        _triggerRefreshTree: function () {
        	var oTreeTable = this._oDataTable,
                oTreeBinding = oTreeTable.getBinding("rows"),
                oPage = this.byId("idResourcePage");
            var UIMinorVersion  = sap.ui.getCore().getConfiguration().getVersion().getMinor();
            var bIsScrollBar = oTreeTable._getScrollExtension().getVerticalScrollbar().className.match("sapUiTableHidden");
            //reset the changes
            this.resetChanges();

            if(oTreeBinding){
                oTreeBinding._restoreTreeState().then(function(){
                    if(parseInt(UIMinorVersion,10) > 52){
                        // this check is used as a workaround for tree restoration for above 1.52.* version
                        // Scrolled manually to fix the rendering 
                        var oScrollContainer = oTreeTable._getScrollExtension();
                        var iScrollIndex = oScrollContainer.getRowIndexAtCurrentScrollPosition();
                        var bScrolled;
                        if(iScrollIndex === 0){
                            oTreeTable._getScrollExtension().updateVerticalScrollPosition(33);
                            bScrolled = true;
                        }else{
                            bScrolled = oTreeTable._getScrollExtension().scrollVertically(1);
                        }

                        // If there is no scroll bar present
                        if(bIsScrollBar){
                            oPage.setHeaderExpanded(false);
                            setTimeout(function(){
                                oPage.setHeaderExpanded(true);
                            },100);
                        }
                    }
                });
            }


        },
		/**
		 * Resets the selected resource if selected  
		 */
		resetChanges: function(){
            var oModel = this.getModel();

            // reset the model changes
            if(oModel.hasPendingChanges()){
                oModel.resetChanges();
            }
            // Resetting selected resource
                this.selectedResources = [];
				this.byId("showPlanCalendar").setEnabled(false);
                this.byId("idButtonreassign").setEnabled(false);
                this.byId("idButtonunassign").setEnabled(false);
                this.byId("idButtonCreUA").setEnabled(false);
		},
        /**
		 * On select of capacitive checkbox the adjusting splitter length
         * @param oEvent checkbox event
         */
        onSelectCapacity:function (oEvent) {
			var bSelect = oEvent.getParameter("selected"),
				oViewModel = this.getModel("viewModel");

			this._jDroppable(this);
			if(bSelect){
                oViewModel.setProperty("/splitterDivider","39%");
			}else{
                oViewModel.setProperty("/splitterDivider","31%");
			}
        },
		/**
		 * Open's popover containing capacitive assignments
		 * @param oEvent
		 */
		openCapacitivePopup : function (oEvent) {
            var oComponent = this.getOwnerComponent();
            oComponent.capacitiveAssignments.open(this.getView(),oEvent);
        },
        /**
         * on press, open the dialog to create an unavailability for selected resources
         * @param oEvent
         */
        onPressCreateUA : function (oEvent) {
            this.getOwnerComponent().manageAvail.open(this.getView(), this.selectedResources);
        },
        /**
         * On click on expand the tree nodes gets expand to level 1
         * On click on collapse all the tree nodes will be collapsed to root.
         * @param oEvent
         */
	        onClickExpandCollapse : function (oEvent) {
            var oButton = oEvent.getSource(),
                oCustomData = oButton.getCustomData();

            if(oCustomData[0].getValue() === "EXPAND" && this._oDataTable){
                this._oDataTable.expandToLevel(1);
            }else{
                this._oDataTable.collapseAll();
            }
        }
    });
});