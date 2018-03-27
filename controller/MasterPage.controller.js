sap.ui.define([
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/m/Token",
	"sap/m/Tokenizer",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/controller/ErrorHandler",
	"sap/m/MessageToast"
], function(Device, JSONModel, Filter, FilterOperator, FilterType, Token, Tokenizer, formatter, BaseController,ErrorHandler,MessageToast) {
	"use strict";

    return BaseController.extend('com.evorait.evoplan.controller.MasterPage', {

        formatter: formatter,

        defaultDateRange: [],

        firstLoad: false,

        counterResourceFilter: 0,

        defaultViewSelected: "TIMENONE",

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

            //add fragment FilterSettingsDialog to the view
            this._initFilterDialog();

            //eventbus of assignemnt handling
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("BaseController", "refreshTreeTable", this._triggerRefreshTree, this);
            eventBus.subscribe("AssignInfoDialog", "updateAssignment", this._triggerUpdateAssign, this);
            eventBus.subscribe("AssignTreeDialog", "bulkReAssignment", this._triggerUpdateAssign, this);
            eventBus.subscribe("AssignInfoDialog", "deleteAssignment", this._triggerDeleteAssign, this);
            eventBus.subscribe("AssignActionsDialog", "bulkDeleteAssignment", this._triggerDeleteAssign, this);

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
			//add form fields to variant
			this._initialCustomVariant();
			//trigger first filter
			this.onTreeUpdateStarted();
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
                this._oDataTable.setVisibleRowCountMode("Auto");
            }else{
                this.onTreeUpdateStarted();
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
            this._initFilterDialog();
            this._oFilterSettingsDialog.open();
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
		 * ViewSettingsDialog confirm filter
		 * @param oEvent
		 */
		onFilterSettingsConfirm: function(oEvent) {
            this.openGroupFilterSuggest = false;
			this._triggerFilterSearch();
		},

		/**
		 * reset custom controls
		 * @param oEvent
		 */
		onFilterSettingsReset: function(oEvent) {
			//reset multiInput custom filter
			var oCustomGroupFilter = sap.ui.getCore().byId("idGroupFilterItem"),
                aTokens = this._filterGroupInput.getTokens();

            this.openGroupFilterSuggest = false;
			this._filterGroupInput.setTokens([]);
            oCustomGroupFilter.setFilterCount(0);

            this.counterResourceFilter -= aTokens.length;
            this.getModel("viewModel").setProperty("/counterResourceFilter", this.counterResourceFilter);

			//set default view setting
			this._setDefaultFilterView();

			//set default date range
			this._setDefaultFilterDateRange();
		},

        /**
         * on multiinput changed in filter settings dialog
         * @param oEvent
         */
        onUpdateGroupFilter: function (oEvent) {
            var oCustomFilter = sap.ui.getCore().byId("idGroupFilterItem"),
                aTokens = this._filterGroupInput.getTokens(),
                tokenLen = aTokens.length;

            if (oEvent.getParameter('type') === Tokenizer.TokenUpdateType.Added) {
                this.counterResourceFilter += 1;

            }else if (oEvent.getParameter('type') === Tokenizer.TokenUpdateType.Removed) {
                tokenLen -= 1;
                this.counterResourceFilter -= 1;
            }

            this.openGroupFilterSuggest = false;
            oCustomFilter.setFilterCount(tokenLen);
            this.getModel("viewModel").setProperty("/counterResourceFilter", this.counterResourceFilter);
        },

        /**
         * trigger show suggestions of filter dialog group filter
         * @param oEvent
         */
        onGroupFilterValueChange: function (oEvent) {
            if (oEvent.getSource().getValue() !== "") {
                oEvent.getSource().setProperty("filterSuggests", true);

            }else if(this.openGroupFilterSuggest && oEvent.getSource().getValue() === ""){
                oEvent.getSource().setProperty("filterSuggests", false);
            }
        },

        onGroupFilterValueHelpRequest: function (oEvent) {
            if(!this.openGroupFilterSuggest){
                this.openGroupFilterSuggest = true;

                if (oEvent.getSource().getValue() === "") {
                    oEvent.getSource().setProperty("filterSuggests", false);
                    return;
                }
            }else{
                this.openGroupFilterSuggest = false;
            }
            oEvent.getSource().setProperty("filterSuggests", true);
        },

        /**
         * on date input changed in filter settings dialog
         * @param oEvent
         */
        onChangeDateRangeFilter: function (oEvent) {
            var oCustomFilter = sap.ui.getCore().byId("idTimeframeFilterItem");
            oCustomFilter.setFilterCount(1);
            oCustomFilter.setSelected(true);

            if(oEvent){
                var oSource = oEvent.getSource();
                var oNewValue = oEvent.getParameter("value");

                // Date range should be never empty
                if (!oNewValue && oNewValue === "") {
                    var lastValue = this.defaultDateRange[oSource.getId()] || this.formatter.date(new Date());
                    oSource.setValue(lastValue);
                }
            }
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
		
		onClickCalendarAssignment: function(oEvent){
			var oAppointment = oEvent.getParameter("appointment");
			var oContext = oAppointment.getBindingContext("calendarModel");
			var oModel = oContext.getModel();
			var sPath = oContext.getPath();
			var oAppointmentData = oModel.getProperty(sPath);
			this.getOwnerComponent().assignInfoDialog.open(this.getView(), null, oAppointmentData);
			
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
            if(this._oFilterSettingsDialog){
                this._oFilterSettingsDialog.destroy();
            }
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
            oDataTable.setVisibleRowCountMode("Fixed");
            oDataTable.attachBusyStateChanged(this.onBusyStateChanged, this);
        },

        /**
         * init custom smart variant management and add filter controls to it
         * @private
         */
        _initialCustomVariant: function () {
            var oVariant = this.byId("customResourceVariant");
            this._initFilterDialog();

            oVariant.addFilter(this._searchField);
            oVariant.addFilter(this._filterDateRange1);
            oVariant.addFilter(this._filterSelectView);
            oVariant.addFilter(this._filterGroupInput);
        },

        /**
         * set default filter for resource tree
         * @private
         */
        _initFilterDialog: function () {
            if (!this._oFilterSettingsDialog) {
                this._oFilterSettingsDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.FilterSettingsDialog", this);
                this.getView().addDependent(this._oFilterSettingsDialog);

                //counter for default date range and default selected view
                this._searchField = this.byId("searchField");
                this._filterSelectView = sap.ui.getCore().byId("viewFilterItem");
                this._filterDateRange1 = sap.ui.getCore().byId("dateRange1");
                this._filterDateRange2 = sap.ui.getCore().byId("dateRange2");

                //set default view setting
                this._setDefaultFilterView();
                this.counterResourceFilter +=1;
                //set default date range
                this._setDefaultFilterDateRange();
                this.counterResourceFilter +=1;

				//*** add checkbox validator
				this._filterGroupInput = sap.ui.getCore().byId("multiGroupInput");
				this._filterGroupInput.addValidator(function(args) {
				    if(args.suggestedToken){
                        return new Token({
                            key: args.suggestedToken.getProperty("key"),
                            text: args.text
                        });
                    }
				});
			}
		},

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
            var aFilters = this._getAllFilters();
            binding.filter(aFilters, "Application");
        },

        _triggerUpdateAssign: function (sChanel, sEvent, oData) {
            if(sEvent === "updateAssignment"){
                this.updateAssignment(oData.isReassign);
            }else if(sEvent === "bulkReAssignment"){
                this.bulkReAssignment(oData.sPath,oData.aContexts);
            }
        },

        _triggerDeleteAssign: function (sChanel, sEvent, oData) {
            if(sEvent === "deleteAssignment"){
                this.deleteAssignment(oData.sId);
            }else if(sEvent === "bulkDeleteAssignment"){
                this.bulkDeleteAssignment(oData.aContexts);
            }
        },

        /**
         * collection of all filter from view settings dialog and also from search field
         * @returns {Array}
         * @private
         */
        _getAllFilters: function () {
            var aFilters = [];
            var oViewModel = this.getModel("viewModel");

            oViewModel.setProperty("/counterResourceFilter", this.counterResourceFilter);

            // filter dialog values
            //view setting
            var oViewFilterItems = this._filterSelectView.getItems();
            for (var i = 0; i < oViewFilterItems.length; i++) {
                var obj = oViewFilterItems[i];
                if(obj.getSelected()){
                    var key = obj.getKey();
                    aFilters.push(new Filter("NodeType", FilterOperator.EQ, key));
                }
            }

            //set date range
            var sDateControl1 = this._filterDateRange1.getValue();
            var sDateControl2 = this._filterDateRange2.getValue();
            sDateControl1 = this.formatter.date(sDateControl1);
            sDateControl2 = this.formatter.date(sDateControl2);
            var oDateRangeFilter = new Filter("StartDate", FilterOperator.BT, sDateControl1, sDateControl2);
            aFilters.push(oDateRangeFilter);

            //get all token from group filter
            var tokenFilter = this._getFilterDialogGroupToken();
            if(tokenFilter){
                aFilters.push(tokenFilter);
            }

            oViewModel.setProperty("/resourceFilterView", aFilters);

            //get search field value
            var sSearchField = this._searchField.getValue();
            oViewModel.setProperty("/resourceSearchString", sSearchField);
            if (sSearchField && sSearchField.length > 0) {
                aFilters.push(new Filter("Description", FilterOperator.Contains, sSearchField));
            }

			var resourceFilter = new Filter({
				filters: aFilters,
				and: true
			});
			oViewModel.setProperty("/resourceFilterAll", resourceFilter);

			return resourceFilter;
		},

        /**
         * set filter date range before first request in filter settings dialog
         * @private
         */
        _setDefaultFilterDateRange: function () {
            //set default date range from 1month
            var d = new Date();
            d.setMonth(d.getMonth() - 1);
            var dateRange1Id = this._filterDateRange1.getId();
            var dateRange2Id = this._filterDateRange2.getId();

            // save default date range global
            this.defaultDateRange[dateRange1Id] = this.formatter.date(d);
            this.defaultDateRange[dateRange2Id] = this.formatter.date(new Date());

            this._filterDateRange1.setValue(this.defaultDateRange[dateRange1Id]);
            this._filterDateRange2.setValue(this.defaultDateRange[dateRange2Id]);
            this.onChangeDateRangeFilter();
        },

        /**
         * set filter for view before first request in filter settings dialog
         * @private
         */
        _setDefaultFilterView: function () {
            var oViewFilterItems = this._filterSelectView.getItems();
            for (var i = 0; i < oViewFilterItems.length; i++) {
                var obj = oViewFilterItems[i];
                if(obj.getKey() === this.defaultViewSelected){
                    obj.setSelected(true);
                }
            }
        },


        /**
         * get all token from filter dialog group filter
         * @private
         */
        _getFilterDialogGroupToken: function () {
            //filter for Resource group
            var aTokens = this._filterGroupInput.getTokens(),
                aTokenFilter = [];

            if(aTokens && aTokens.length > 0){
                //get all tokens
                for (var j = 0; j < aTokens.length; j++) {
                    var token = aTokens[j],
                        aTokenKeys = token.getKey().split("//");

                    if(aTokenKeys[1] && aTokenKeys[1].trim() !== ""){
                        aTokenFilter.push(
                            new Filter("Description", FilterOperator.Contains, aTokenKeys[1].trim())
                        );
                    }else if(aTokenKeys[0] && aTokenKeys[0].trim() !== ""){
                        aTokenFilter.push(
                            new Filter("Description", FilterOperator.Contains, aTokenKeys[0].trim())
                        );
                    }
                }
                return new Filter({filters: aTokenFilter, and: false});
            }
            return false;
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
			var aUsers = [];
			var aResourceFilters = [];
			var oModel = this.getModel();
			var oResourceBundle = this.getResourceBundle();

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

			var sDateControl1 = this._filterDateRange1.getValue();
			sDateControl1 = this.formatter.date(sDateControl1);

			var sCaledarView;
			var oViewFilterItems = this._filterSelectView.getItems();
			for (var j in oViewFilterItems) {
				var oViewFilterItem = oViewFilterItems[j];
				if (oViewFilterItem.getSelected()) {
					sCaledarView = oViewFilterItem.getKey();
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
						viewKey:sCaledarView,
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
		 * @version 2.0.4
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
                this.byId("idButtonreassign").setEnabled(false);
                this.byId("idButtonunassign").setEnabled(false);
		}
	});
});
