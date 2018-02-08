sap.ui.define([
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/m/Token",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/BaseController",
], function(Device, JSONModel, Filter, FilterOperator, FilterType, Token, formatter, BaseController) {
	"use strict";

	return BaseController.extend('com.evorait.evoplan.controller.MasterPage', {

		formatter: formatter,

		defaultDateRange: [],

		firstLoad: false,

		counterResourceFilter: 2,

		defaultViewSelected: "TIMENONE",

<<<<<<< HEAD
		selectedResources: [],
=======
        selectedResources: [],

        /**
        * Called when a controller is instantiated and its View controls (if available) are already created.
        * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
        * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage **/
        onInit: function() {
            this._oDataTable = this.byId("droppableTable");
            this._configureDataTable(this._oDataTable);
>>>>>>> branch 'EVOPLAN2-73' of https://RahulInamadar@bitbucket.org/evorait/evoplan2-ui5.git

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage **/
		onInit: function() {
			this._oDataTable = this.byId("droppableTable");
			this._configureDataTable(this._oDataTable);

			//add fragment FilterSettingsDialog to the view
			this._initFilterDialog();

			//eventbus of assignemnt handling
			var eventBus = sap.ui.getCore().getEventBus();
			eventBus.subscribe("BaseController", "refreshTable", this._triggerFilterSearch, this);
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

			//Todo: remove example data when filter request is working
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
		onBusyStateChanged: function(oEvent) {
			var parameters = oEvent.getParameters();
			if (parameters.busy === false) {
				this._jDroppable(this);
			}
		},

		/**
		 * initialize or update droppable after updating tree list
		 * @param oEvent
		 */
		refreshDroppable: function(oEvent) {
			if (this._oDataTable) {
				this._jDroppable(this);
			}
		},

		/**
		 * trigger add filter to tree table for the first time
		 */
		onTreeUpdateStarted: function() {
			if (!this.firstLoad) {
				this._triggerFilterSearch();
				this.firstLoad = true;
			}
		},

		/**
		 * @param oEvent
		 */
		onSearchResources: function(oEvent) {
			this._triggerFilterSearch();
		},

		/**
		 * open FilterSettingsDialog
		 * @param oEvent
		 */
		onFilterButtonPress: function(oEvent) {
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
			this._triggerFilterSearch();
		},

		/**
		 * reset custom controls
		 * @param oEvent
		 */
		onFilterSettingsReset: function(oEvent) {
			//reset multiInput custom filter
			var oCustomFilter = sap.ui.getCore().byId("idGroupFilterItem");
			this._filterGroupInput.setTokens([]);
			oCustomFilter.setFilterCount(0);

			//set default view setting
			this._setDefaultFilterView();

			//set default date range
			this._setDefaultFilterDateRange();
		},

		/**
		 *  on multiinput changed
		 * @param oEvent
		 */
		onChangeGroupFilter: function(oEvent) {
			var oCustomFilter = sap.ui.getCore().byId("idGroupFilterItem");
			var aTokens = this._filterGroupInput.getTokens();

			oCustomFilter.setFilterCount(aTokens.length);
			this.counterResourceFilter = aTokens.length + 2;
			this.getModel("viewModel").setProperty("/counterResourceFilter", this.counterResourceFilter);
		},

		/**
		 * on date input changed
		 * @param oEvent
		 */
		onChangeDateRangeFilter: function(oEvent) {
			var oCustomFilter = sap.ui.getCore().byId("idTimeframeFilterItem");
			oCustomFilter.setFilterCount(1);
			oCustomFilter.setSelected(true);

			if (oEvent) {
				var oSource = oEvent.getSource();
				var oNewValue = oEvent.getParameter("value");

<<<<<<< HEAD
				// Date range should be never empty
				if (!oNewValue && oNewValue === "") {
					var lastValue = this.defaultDateRange[oSource.getId()] || this.formatter.date(new Date());
					oSource.setValue(lastValue);
				}
			}
		},
=======
        /**
         * Todo: on deselect
         * @param oEvent
         */
        onChangeSelectResource: function (oEvent) {
            var oSource = oEvent.getSource();
            var parent = oSource.getParent();
            var sPath = parent.getBindingContext().getPath();
            var oParams = oEvent.getParameters();
>>>>>>> branch 'EVOPLAN2-73' of https://RahulInamadar@bitbucket.org/evorait/evoplan2-ui5.git

<<<<<<< HEAD
		/**
		 * Todo: on deselect
		 * @param oEvent
		 */
		onChangeSelectResource: function(oEvent) {
			var oSource = oEvent.getSource();
			var parent = oSource.getParent();
			var sPath = parent.getBindingContext().getPath();
			var oParams = oEvent.getParameters();
=======
            if(oParams.selected){
                this.selectedResources.push(sPath);

            }else if(this.selectedResources.indexOf(sPath) >= 0){
                //todo remove path from this.selectedResources
            }

            if(this.selectedResources.length > 0){
                this.byId("showPlanCalendar").setEnabled(true);
            }else{
                this.byId("showPlanCalendar").setEnabled(false);
            }
        },
>>>>>>> branch 'EVOPLAN2-73' of https://RahulInamadar@bitbucket.org/evorait/evoplan2-ui5.git

<<<<<<< HEAD
			if (oParams.selected) {
				this.selectedResources.push(sPath);
=======
        /**
         * Todo: set up filter of selected resources in this.selectedResources
         * @param oEvent
         */
        onPressShowPlanningCal: function (oEvent) {
            this._setCalendarModel();
            this._oPlanningCalDialog.open();
        },
>>>>>>> branch 'EVOPLAN2-73' of https://RahulInamadar@bitbucket.org/evorait/evoplan2-ui5.git

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
		 * Todo: set up filter of selected resources in this.selectedResources
		 * @param oEvent
		 */
		onPressShowPlanningCal: function(oEvent) {
			this._setCalendarModel();
			this._oPlanningCalDialog.open();
		},

		onCalendarModalCancel: function(oEvent) {
			this._oPlanningCalDialog.close();
		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf C:.Users.Michaela.Documents.EvoraIT.EvoPlan2.evoplan2-ui5.src.view.MasterPage
		 **/
		onExit: function() {
			if (this._oFilterSettingsDialog) {
				this._oFilterSettingsDialog.destroy();
			}
			if (this._oPlanningCalDialog) {
				this._oPlanningCalDialog.destroy();
			}
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
		_configureDataTable: function(oDataTable) {
			oDataTable.setEnableBusyIndicator(true);
			oDataTable.setSelectionMode('None');
			oDataTable.setColumnHeaderVisible(false);
			oDataTable.setEnableCellFilter(false);
			oDataTable.setEnableColumnReordering(false);
			oDataTable.setEditable(false);
			oDataTable.setWidth("100%");
			oDataTable.attachBusyStateChanged(this.onBusyStateChanged, this);
			//oDataTable.attachFilter(this.onFilterChanged, this);
		},

		_initialCustomVariant: function() {
			var oVariant = this.byId("customResourceVariant");
			this._initFilterDialog();

			oVariant.addFilter(this._searchField);
			oVariant.addFilter(this._filterDateRange1);
			oVariant.addFilter(this._filterSelectView);
			oVariant.addFilter(this._filterGroupInput);
		},

		/**
		 * set default filter
		 * @private
		 */
		_initFilterDialog: function() {
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
				//set default date range
				this._setDefaultFilterDateRange();

				//*** add checkbox validator
				this._filterGroupInput = sap.ui.getCore().byId("multiGroupInput");
				this._filterGroupInput.addValidator(function(args) {
					var text = args.text;
					return new Token({
						key: text,
						text: text
					});
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
		_triggerFilterSearch: function() {
			var binding = this._oDataTable.getBinding("rows");
			var aFilters = this._getAllFilters();
			binding.filter(aFilters, "Application");
		},

		/**
		 * collection of all filter from view settings dialog and also from search field
		 * @returns {Array}
		 * @private
		 */
		_getAllFilters: function() {
			var aFilters = [];
			var oViewModel = this.getModel("viewModel");

			oViewModel.setProperty("/counterResourceFilter", this.counterResourceFilter);

			// filter dialog values
			//view setting
			var oViewFilterItems = this._filterSelectView.getItems();
			for (var i = 0; i < oViewFilterItems.length; i++) {
				var obj = oViewFilterItems[i];
				if (obj.getSelected()) {
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

			//filter for Resource group
			var aTokens = this._filterGroupInput.getTokens(),
				aTokenFilter = [];

			if (aTokens && aTokens.length > 0) {
				var parentNodeFilter = new Filter("ParentNodeId", FilterOperator.EQ, "");
				//get all tokens
				for (var j = 0; j < aTokens.length; j++) {
					var token = aTokens[j];
					aTokenFilter.push(
						new Filter("Description", FilterOperator.Contains, token.getKey())
					);
				}
				aFilters.push(new Filter({
					filters: aTokenFilter,
					and: false
				}));
				/*aFilters.push(new Filter({
				    filters: [groupFilter, parentNodeFilter],
				    and: true
				}));*/
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

		_setDefaultFilterDateRange: function() {
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

		_setDefaultFilterView: function() {
			var oViewFilterItems = this._filterSelectView.getItems();
			for (var i = 0; i < oViewFilterItems.length; i++) {
				var obj = oViewFilterItems[i];
				if (obj.getKey() === this.defaultViewSelected) {
					obj.setSelected(true);
				}
			}
		},

		/**
		 * dropped demands assign and save
		 * @param _this
		 * @private
		 */
		_jDroppable: function(_this) {
			setTimeout(function() {
				var droppableTableId = _this._oDataTable.getId();
				var droppedElement = $("#" + droppableTableId + " tbody tr, #" + droppableTableId + " li");

				try {
					if (droppedElement.hasClass("ui-droppable")) {
						droppedElement.droppable("destroy");
					}
				} catch (error) {
					console.warn(error);
				}

				droppedElement.droppable({
					accept: ".ui-draggable",
					classes: {
						"ui-droppable-hover": "ui-droppable-hover",
						"ui-droppable-active": "ui-droppable-active"
					},
					drop: function(event, ui) {
						var dropTargetId = event.target.id,
							targetElement = sap.ui.getCore().byId(dropTargetId),
							oContext = targetElement.getBindingContext();

						if (oContext) {
							var targetPath = oContext.getPath();
							var targetObj = _this.getModel().getProperty(targetPath);

							//don't drop on orders
							if (targetObj.NodeType === "ASSIGNMENT") {
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
		 * Todo: call ResourceSet and ResourceGroupSet with Assignments
		 * and merge into one json model for planning calendar
		 * @private
		 */
		_setCalendarModel: function() {
			var aUsers = [];
			var aGroups = [];
			var aResourceFilters = [];
			var aResourceGroupFilters = [];
			var oModel = this.getModel();

<<<<<<< HEAD
			if (this.selectedResources.length <= 0) {
				return;
			}
=======
        /**
         * Todo: call ResourceSet and ResourceGroupSet with Assignments
         * and merge into one json model for planning calendar
         * @private
         */
        _setCalendarModel: function () {
            var aUsers = [];
            var aGroups = [];
            var aFilters = [];
            var oModel = this.getModel();
>>>>>>> branch 'EVOPLAN2-73' of https://RahulInamadar@bitbucket.org/evorait/evoplan2-ui5.git

<<<<<<< HEAD
			for (var i = 0; i < this.selectedResources.length; i++) {
				var obj = oModel.getProperty(this.selectedResources[i]);
				if (obj.NodeType === "RESOURCE") {
					aUsers.push(new Filter("ObjectGuid", FilterOperator.EQ, obj.ResourceGuid));
				} else if (obj.NodeType === "RES_GROUP") {
					aGroups.push(new Filter("ObjectGuid", FilterOperator.EQ, obj.ResourceGroupGuid));
				}
			}
=======
            if(this.selectedResources.length <= 0){
                return;
            }

            for (var i = 0; i < this.selectedResources.length; i++) {
                var obj = oModel.getProperty(this.selectedResources[i]);
                console.log(obj);
                if(obj.NodeType === "RESOURCE"){
                    aUsers.push(new Filter("ObjectGuid", FilterOperator.EQ, obj.ResourceGuid));
                }else if(obj.NodeType === "RES_GROUP"){
                    aGroups.push(new Filter("ObjectGuid", FilterOperator.EQ, obj.ResourceGroupGuid));
                }
            }
>>>>>>> branch 'EVOPLAN2-73' of https://RahulInamadar@bitbucket.org/evorait/evoplan2-ui5.git

			aResourceFilters.push(new Filter({
				filters: aUsers,
				and: false
			}));
			
			aResourceGroupFilters.push(new Filter({
				filters: aGroups,
				and: false
			}));

			var sDateControl1 = this._filterDateRange1.getValue();
			sDateControl1 = this.formatter.date(sDateControl1);
			var oDateRangeFilter = new Filter("DateFrom", FilterOperator.GE, sDateControl1);
			aResourceFilters.push(oDateRangeFilter);
			aResourceGroupFilters.push(oDateRangeFilter);

			/*var modelFilter = new Filter({
				filters: aFilters,
				and: true
			});*/

<<<<<<< HEAD
			oModel.read("/ResourceSet",{
					groupId: "calendarBatch",
					filters: aResourceFilters,
					urlParameters:{
						"$expand": "AssignmentSet" //curently it is not working
					}
					
				});
			oModel.read("/ResourceGroupSet",{
					groupId: "calendarBatch",
					filters: aResourceGroupFilters,
					urlParameters:{
						"$expand": "AssignmentSet" 
					}
				});
				
			var aDeferredGroups = oModel.getDeferredGroups();
			aDeferredGroups=aDeferredGroups.concat(["calendarBatch"]);
			oModel.setDeferredGroups(aDeferredGroups);
			
			//TODO Call the batcg request
		/*	oModel.submitChanges({
				groupId:"calendarBatch",
				success: function(data, response) {
					console.log(response);
					//TODO Need to merge both request data into single json model
				},
				error: function(error) {
					console.log(error);
				}});*/
=======
            //Todo: add expand to assignment
            /*this.getModel().read("/ResourceSet", {
                filters: aFilters,
                success: function(data, response){
                    console.log(response);
                },
                error: function(error){
                    console.log(error);
                }
            });*/
>>>>>>> branch 'EVOPLAN2-73' of https://RahulInamadar@bitbucket.org/evorait/evoplan2-ui5.git

			var oModel = new JSONModel();
			//MockData for Planning calendar
			oModel.setData({
				startDate: new Date(sDateControl1),
				people: [{
					pic: "sap-icon://collaborate",
					name: "Resource Group",  //Name of resource
					role: "",  
					appointments: [{
						start:new Date("2018", "0", "8", "08", "0"),
						end: new Date("2018", "0", "8", "09", "30"),
						title: "Meet Max Mustermann",
						key: "0123456789",
						type: "Type04"
					}, {
						start: new Date("2018", "0", "8", "10", "0"),
						end: new Date("2018", "0", "8", "12", "0"),
						title: "Team meeting",
						info: "room 1"
					}, {
						start: new Date("2018", "0", "8", "12", "30"),
						end: new Date("2018", "0", "8", "13", "30"),
						title: "Lunch"
					}, {
						start: new Date("2018", "0", "8", "14", "30"),
						end: new Date("2018", "0", "8", "15", "30"),
						title: "Team Meeting 2",
						info: "room 3"
					}]
				}, {
					pic: "sap-icon://employee",
					name: "Resource",
					role: "team member",
					appointments: [{
						start:new Date("2018", "0", "8", "08", "0"),
						end: new Date("2018", "0", "8", "09", "30"),
						title: "Meet Max Mustermann",
						key: "0123456789",
						type: "Type04"
					}, {
						start: new Date("2018", "0", "8", "10", "0"),
						end: new Date("2018", "0", "8", "12", "0"),
						title: "Team meeting",
						info: "room 1"
					}, {
						start: new Date("2018", "0", "8", "12", "30"),
						end: new Date("2018", "0", "8", "13", "30"),
						title: "Lunch"
					}, {
						start: new Date("2018", "0", "8", "14", "30"),
						end: new Date("2018", "0", "8", "15", "30"),
						title: "Team Meeting 2",
						info: "room 3"
					},
					{
						start: new Date("2018", "0", "8", "16", "30"),
						end: new Date("2018", "0", "8", "17", "30"),
						title: "Tea",
						info: "room 3"
					},
					{
						start: new Date("2018", "0", "8", "17", "30"),
						end: new Date("2018", "0", "8", "18", "10"),
						title: "Tea"
					}]
				},
				{
					pic: "sap-icon://employee",
					name: "Resource",
					role: "team member",
					appointments: [{
						start:new Date("2018", "0", "8", "08", "0"),
						end: new Date("2018", "0", "8", "09", "30"),
						title: "Meet Max Mustermann",
						key: "0123456789",
						type: "Type04"
					}, {
						start: new Date("2018", "0", "8", "10", "0"),
						end: new Date("2018", "0", "8", "12", "0"),
						title: "Team meeting",
						info: "room 1"
					}, {
						start: new Date("2018", "0", "8", "12", "30"),
						end: new Date("2018", "0", "8", "13", "30"),
						title: "Lunch"
					}, {
						start: new Date("2018", "0", "8", "14", "30"),
						end: new Date("2018", "0", "8", "15", "30"),
						title: "Team Meeting 2",
						info: "room 3"
					},
					{
						start: new Date("2018", "0", "8", "16", "30"),
						end: new Date("2018", "0", "8", "17", "30"),
						title: "Tea",
						info: "room 3"
					},
					{
						start: new Date("2018", "0", "8", "17", "30"),
						end: new Date("2018", "0", "8", "18", "10"),
						title: "Tea"
					}]
				}]
			});

			//sap.ui.getCore().byId("planningCalendar").setModel(oModel);
			this.setModel(oModel, "calendarModel");
		}

	});
});
