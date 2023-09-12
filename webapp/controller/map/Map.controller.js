/* globals axios */
sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentActionsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/evorait/evoplan/controller/map/MapConfig",
	"com/evorait/evoplan/controller/map/PinPopover",
	"sap/ui/core/Fragment",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/MessageToast",
	"sap/m/GroupHeaderListItem",
	"sap/ui/unified/Calendar",
	"com/evorait/evoplan/controller/map/MapUtilities",
	"sap/ui/core/mvc/OverrideExecution",
	"com/evorait/evoplan/model/Constants",
], function (AssignmentActionsController, JSONModel, formatter, Filter, FilterOperator, MapConfig, PinPopover,
	Fragment, Dialog, Button, MessageToast, GroupHeaderListItem, Calendar, MapUtilities, OverrideExecution,Constants) {
	"use strict";

	return AssignmentActionsController.extend("com.evorait.evoplan.controller.map.Map", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			// lyfecycle methods are not mentioned in methods list. They always have dafault properties
			methods: {
				DUMMY: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				getGroupHeader: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onSelect: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onDeselect: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onDrop: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onResourceSelect: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onCloseCalDialog: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onSelectDate: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				getSelectedDemandFilters: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onBeforeRebindTable: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onInitialized: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onReset: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onClear: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onClearRoutes: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onContextMenuMap: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				setMapBusy: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onDragStart: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onDragEnd: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onChangeStatusButtonPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onRowSelectionChange: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onAssignButtonPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onDemandFilterChange: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				applyFiltersToMap: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				checkAllDemands: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				unCheckAllDemands: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				updateMapDemandSelection: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onSelectMapLegend: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onResetLegendSelection: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onClickMapDemandFilter: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onCloseDialog: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onClusterSwitchPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onDemandQualificationIconPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onContextMenu: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onSelectSpots: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				},
				onAutoscheduleButtonPress: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.Instead
				}
			}
		},

		selectedDemands: [],
		_isDemandDraggable: false,
		_oGeoMap: null,
		_mapContextActionSheet: null,

		onInit: function () {
			// call super class onInit
			AssignmentActionsController.prototype.onInit.apply(this, arguments);

			var oGeoMap = this.getView().byId("idGeoMap"),
				oMapModel = this.getModel("mapConfig");
			this._oGeoMap = oGeoMap;
			this._viewModel = this.getModel("viewModel");
			this._oModel = this.getModel();
			oGeoMap.setMapConfiguration(MapConfig.getMapConfiguration(oMapModel));
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("BaseController", "refreshMapView", this._refreshMapView, this);
			this._oEventBus.subscribe("BaseController", "resetMapSelection", this._resetMapSelection, this);
			this._oEventBus.subscribe("MapController", "setMapSelection", this._setMapSelection, this);
			this._oEventBus.subscribe("MapController", "showAssignedDemands", this._showAssignedDemands, this);
			this._oEventBus.subscribe("MapController", "displayRoute", this._zoomToPoint, this);
			this._oEventBus.subscribe("DemandTableOperation", "clearDemandsSelection", this.clearDemandsSelection, this);
			var onClickNavigation = this._onActionPress.bind(this);
			var openActionSheet = this.openActionSheet.bind(this);
			this._oDraggableTable = this.byId("draggableList");
			this._oDataTable = this._oDraggableTable.getTable();
			this._smartFilter = this.byId("listReportFilter");
			this._setRowActionTemplate(this._oDataTable, onClickNavigation, openActionSheet);
			this._mParameters = {
				bFromMap: true
			};
			this.oVBI = this.getView().byId("idGeoMap");
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not

			this.getModel("viewModel").setProperty("/GeoJsonLayersData", []);

			//initialize PinPopover controller
			this.oPinPopover = new PinPopover(this);


			this.oMapUtilities = new MapUtilities();
		},

		//TODO comment
		getGroupHeader: function (oGroup) {
			return new GroupHeaderListItem({
				title: oGroup.key,
				upperCase: false
			});
		},

		/**
		 * Selected spots can be saved.
		 * @author Rahul
		 * @return Filter
		 */
		onSelect: function (oEvent) {
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not
			var aSelected = oEvent.getParameter("selected"),
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				sPath;
			for (var i in aSelected) {
				sPath = this._getSpotPath(aSelected[i]);
				aSelectedDemands.push(sPath);
			}
			oViewModel.setProperty("/mapSettings/selectedDemands", aSelectedDemands);
			oViewModel.setProperty("/mapSettings/routeData", []);
			oViewModel.setProperty("/mapSettings/bRouteDateSelected", false);
			oViewModel.setProperty("/Scheduling/selectedDemandPath", aSelectedDemands[0]);
			oViewModel.setProperty("/Scheduling/aSelectedDemandPath", aSelectedDemands);
			this.oSchedulingActions.validateScheduleButtons();
			this.oSchedulingActions.validateReScheduleButton();
			this._oDraggableTable.rebindTable();
		},
		/**
		 * DeSelected spots can be saved.
		 * @author Rahul
		 * @return Filter
		 */
		onDeselect: function (oEvent) {
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not
			var aDeSelected = oEvent.getParameter("deselected"),
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				sPath;
			for (var i in aDeSelected) {
				sPath = this._getSpotPath(aDeSelected[i]);
				aSelectedDemands.splice(aSelectedDemands.indexOf(sPath), 1);
			}
			oViewModel.setProperty("/mapSettings/selectedDemands", aSelectedDemands);
			oViewModel.setProperty("/mapSettings/bRouteDateSelected", false);
			oViewModel.setProperty("/mapSettings/routeData", []);
			this._oDraggableTable.rebindTable();
		},
		/**
		 * When Demands are dropped on resource pins
		 * Check Assignable demands
		 * open the date picker to select the day.
		 * If demand status is other than INIT then check for unassinable Demand
		 * If demand can be reasignable then reassign the demand to the resource on which it dropped.
		 * Open the single planner with assigned assignments for that day
		 * 
		 * @Author Rahul
		 * 
		 */

		onDrop: function (oEvent) {
			var oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				oDragSource = oEvent.getParameter("oDragSource"),
				sPath = this._getSpotPath(oDragSource);

			if (aSelectedDemands.length > 0) {
				if (!aSelectedDemands.includes(sPath)) {
					aSelectedDemands.push(sPath);
				}
			} else {
				aSelectedDemands.push(sPath);
			}
			oViewModel.setProperty("/mapSettings/bIsSignlePlnAsgnSaved", false);
			this._selectedResource = oEvent.getSource();
			this.aDraggedDemands = aSelectedDemands;
			this._checkForMultipleResources(oEvent.getSource().getBindingContext().getObject());

		},

		onResourceSelect: function (oEvent) {
			this._selectedResource = oEvent.getParameter("item");
			this._openCalendar();
			oEvent.getSource().getParent().close();
		},

		/**
		 * @author Rahul
		 * */
		onCloseCalDialog: function (oEvent) {
			oEvent.getSource().getParent().close();
		},
		/**
		 * @author Rahul
		 * */
		onSelectDate: function (oEvent) {
			var oCalendar = oEvent.getSource(),
				oSelectedDate = oCalendar.getSelectedDates(),
				aAssignableDemands = this._checkDemands(),
				oResourceContext = this._selectedResource.getBindingContext("viewModel") ? this._selectedResource.getBindingContext("viewModel") :
				this._selectedResource.getBindingContext(),
				sPath = oResourceContext.getPath(),
				oResourceBundle = this.getResourceBundle(),
				sDescription = this._selectedResource.getBindingContext("viewModel") ? this._selectedResource.getBindingContext("viewModel").getProperty(
					sPath + "/Description") : this._selectedResource.getBindingContext().getProperty(sPath + "/Description");
			if (aAssignableDemands.aUnAssignableDemands.length > 0) {
				//increased the msg appearance time to 6 seconds
				this.showMessageToast(oResourceBundle.getText("ymsg.unasignableDemands"));
			}
			// added condition, in case there no assignable demands then planning calendar would not open, date picker calendar would be closed
			if (aAssignableDemands.aAssignableDemands && aAssignableDemands.aAssignableDemands.length) {
				this._assignDemands(aAssignableDemands, oResourceContext, oSelectedDate[
					0].getStartDate(), oCalendar, sDescription);
			} else {
				this.oCalendarPopover.close();
			}

		},
		/**
		 * Create filters for the selected demands
		 * @author Rahul
		 * @return Filter
		 */
		getSelectedDemandFilters: function (sParam) {
			var aFilters = [],
				oViewModel = this.getModel("viewModel"),
				aDemands;
			if (sParam === "assignDemands") {
				aDemands = oViewModel.getProperty("/mapSettings/assignedDemands");
			} else {
				aDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
			}
			for (var i in aDemands) {
				aFilters.push(new Filter("Guid", FilterOperator.EQ, aDemands[i].split("'")[1]));
			}
			return new Filter({
				filters: aFilters,
				and: false
			});
		},
		/**
		 * Function will be called before the table refreshed. Before rebind pushing the selected filters
		 * into the the smart table
		 * @author Rahul
		 * @return
		 */
		onBeforeRebindTable: function (oEvent) {
			var oParams = oEvent.getParameter("bindingParams");
			oParams["parameters"].batchGroupId = "DemandBatch";
			
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not

			var aFilters,
				aDemandFilters = this.getSelectedDemandFilters();
			if (aDemandFilters && aDemandFilters.aFilters && aDemandFilters.aFilters.length) {
				aFilters = aDemandFilters;
			}
			if (this._bShowAssignment) {
				var aAssignedDemands = this.getSelectedDemandFilters("assignDemands");
				if (aAssignedDemands && aAssignedDemands.aFilters && aAssignedDemands.aFilters.length) {
					aFilters = aAssignedDemands;
				}
				this._bShowAssignment = false;
				this.applyFiltersToMap([aFilters]);
			}
			if (aFilters) {
				this._isFilterAppliedToMap = true;
				oEvent.getParameter("bindingParams").filters.push(aFilters);
			}
		},

		_showAssignedDemands: function () {
			this._bShowAssignment = true;
			this._oDraggableTable.rebindTable();
		},

		onAfterRendering: function () {
			//to select All demands on table rebinde based on selected markers in map
			this._oDraggableTable.attachDataReceived(function () {
				if (this._isFilterAppliedToMap) {
					this._isFilterAppliedToMap = false;
					setTimeout(function () {
						if (this._bDemandListScroll === false && !this.oView.getModel("viewModel").getProperty("/mapSettings/bRouteDateSelected")) {
							this._oDraggableTable.getTable().selectAll();
						}
					}.bind(this), 10);
				}
			}.bind(this));
		},
		/**
		 * On After variant load 
		 * @author Rahul
		 */
		onInitialized: function (oEvent) {
			var oSmartFilter = this.byId("listReportFilter"),
				aFilter = oSmartFilter.getFilters(),
				sVariant = oSmartFilter.getSmartVariant().getCurrentVariantId(); //returns empty string when standard variant is selected
			this._getDemandsForMap();
			if (sVariant !== "") {
				this.applyFiltersToMap(aFilter);
			}
		},
		/**
		 * Clearing the selected demands the Reseting the selection
		 * @author Rahul
		 * @return
		 */
		onReset: function (oEvent) {
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not
			var oViewModel = this.getModel("viewModel");
			this._resetMapSelection();
			oViewModel.setProperty("/mapSettings/selectedDemands", []);
			oViewModel.setProperty("/mapSettings/routeData", []);
			oViewModel.setProperty("/Disable_Assignment_Status_Button", false);
			this.onResetLegendSelection();
			this.oSchedulingActions.resetSchedulingJson();
			this._oEventBus.publish("BaseController", "refreshMapTreeTable",{});
		},
		/**
		 * Clearing the selected demands the Reseting the selection
		 * @author Rahul
		 * @return
		 */
		onClear: function () {
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not
			var oViewModel = this.getModel("viewModel");
			this._resetMapSelection();
			this.onResetLegendSelection();
			oViewModel.setProperty("/mapSettings/selectedDemands", []);
			oViewModel.setProperty("/mapSettings/routeData", []);
			oViewModel.setProperty("/mapSettings/assignedDemands", []);
			this._oDraggableTable.rebindTable();
		},

		/**
		 * Clear displayed routes on Map
		 * @param {sap.ui.base.Event} oEvent - `press` event
		 */
		onClearRoutes: function (oEvent) {
			this._oEventBus.publish("Map", "clearRoutes", {});
		},

		/**
		 * Display ActionSheet on right-click on Map
		 * @param {sap.ui.base.Event} oEvent - `contextMenu` event
		 */
		onContextMenuMap: function (oEvent) {
			var oSourcePosition = [oEvent.mParameters.clientX, oEvent.mParameters.clientY];
			var oDivOnThePosition = this.oMapUtilities.gethiddenDivPosition(oSourcePosition, this.getView());

			if (!this._mapContextActionSheet) {
				this._mapContextActionSheet = sap.ui.xmlfragment("com.evorait.evoplan.view.map.fragments.MapContextActionSheet", this);
				this.getView().addDependent(this._mapContextActionSheet);
			}

			this._mapContextActionSheet.openBy(oDivOnThePosition);
		},

		/**
		 * Enable/Disable busy indicator in map
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		setMapBusy: function (bValue) {
			this.getModel("viewModel").setProperty("/mapSettings/busy", bValue);
		},

		/**
		 * On DragStart set the dragSession selected demands
		 */
		onDragStart: function (oEvent) {
			var sMsg = this.getResourceBundle().getText("msg.notAuthorizedForAssign");
			if (!this.getModel("viewModel").getProperty("/validateIW32Auth")) {
				this.showMessageToast(sMsg);
				oEvent.preventDefault();
				return;
			}
			var oDragSession = oEvent.getParameter("dragSession"),
				oDraggedControl = oDragSession.getDragControl();

			var aIndices = this._oDataTable.getSelectedIndices(),
				oSelectedPaths, aPathsData;
			this.getModel("viewModel").setProperty("/dragDropSetting/isReassign", false);

			oDragSession.setTextData("Hi I am dragging");
			this._isDemandDraggable = true;
			//get all selected rows when checkboxes in table selected
			if (aIndices.length > 0) {
				oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, aIndices, true);
				aPathsData = oSelectedPaths.aPathsData;
			} else {
				//table tr single dragged element
				oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, [oDraggedControl.getIndex()], true);
				aPathsData = oSelectedPaths.aPathsData;
			}
			// keeping the data in drag session
			this.getModel("viewModel").setProperty("/mapDragSession", aPathsData);
			this.getModel("viewModel").setProperty("/dragSession", aPathsData);
			if (oSelectedPaths && oSelectedPaths.aNonAssignable && oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
				oEvent.preventDefault();
			}
		},
		/**
		 * enable/disable buttons on footer when there is some/no selected rows
		 * @since 3.0
		 */
		onRowSelectionChange: function (oEvent) {
			// this._bDemandListScroll = true; //Flag to identify Demand List row is selected and scrolled or not
			//todo need to check scroll, this flag is disturbing selection/deselection
			var selected = this._oDataTable.getSelectedIndices(),
				bEnable = this.getModel("viewModel").getProperty("/validateIW32Auth"),
				sDemandPath, bComponentExist, sMsg, iLastIndex,
				oViewModel=this.getModel("viewModel");
			var iMaxRowSelection = this.getModel("user").getProperty("/DEFAULT_DEMAND_SELECT_ALL");

			this._aSelectedRowsIdx = _.clone(selected);
			if (this._aSelectedRowsIdx.length > 0) {
				this._aSelectedRowsIdx.length = this._aSelectedRowsIdx.length > 0 && this._aSelectedRowsIdx.length <= iMaxRowSelection ? this._aSelectedRowsIdx
					.length : iMaxRowSelection;
			}
			if (this._aSelectedRowsIdx.length > 0 && this._aSelectedRowsIdx.length <= iMaxRowSelection) {
				this.byId("assignButton").setEnabled(bEnable);
				this.byId("changeStatusButton").setEnabled(bEnable);
				this.byId("idUnassignButton").setEnabled(bEnable);
				this.byId("idAssignmentStatusButton").setEnabled(bEnable);
				this.byId("idOverallStatusButton").setEnabled(true);
			} else {
				this.byId("assignButton").setEnabled(false);
				this.byId("changeStatusButton").setEnabled(false);
				this.byId("idAssignmentStatusButton").setEnabled(false);
				this.byId("materialInfo").setEnabled(false);
				this.byId("idOverallStatusButton").setEnabled(false);
				this.byId("idUnassignButton").setEnabled(false);
			}

			// condition to deselect All when max selection limit is already reach but pressing select All checkbox
			if (oEvent.getParameter("selectAll") && this._nSelectedDemandsCount === iMaxRowSelection) {
				this._oDataTable.clearSelection();
				return;
			}
			//If the selected demands exceeds more than the maintained selected configuration value
			if (selected.length > iMaxRowSelection) {
				if (oEvent.getParameter("selectAll")) {
					iLastIndex = selected.pop();
					this._oDataTable.removeSelectionInterval(iMaxRowSelection, iLastIndex);
					sMsg = this.getResourceBundle().getText("ymsg.allSelect", [iMaxRowSelection]);
				} else {
					iLastIndex = oEvent.getParameter('rowIndex');
					this._oDataTable.removeSelectionInterval(iLastIndex, iLastIndex);
					sMsg = this.getResourceBundle().getText("ymsg.maxRowSelection", [iMaxRowSelection]);
				}
				this.showMessageToast(sMsg);
			} else {
				if(selected.length !== 0 && oEvent.getParameter("selectAll")) {
					sMsg = this.getResourceBundle().getText("ymsg.allSelect", selected.length);
					this.showMessageToast(sMsg);
				}				
			}

			// To make selection on map by selecting Demand from demand table
			if (oEvent.getParameter("selectAll")) {
				this.checkAllDemands();
			} else if (oEvent.getParameter("rowIndex") === -1) {
				this.unCheckAllDemands();
			} else {
				// if (!this._isDemandDraggable) {
				this.updateMapDemandSelection(oEvent);
				// }
			}


			//Enabling/Disabling the Material Status Button based on Component_Exit flag
			for (var i = 0; i < this._aSelectedRowsIdx.length; i++) {
				sDemandPath = this._oDataTable.getContextByIndex(this._aSelectedRowsIdx[i]).getPath();
				bComponentExist = this.getModel().getProperty(sDemandPath + "/COMPONENT_EXISTS");
				if (bComponentExist) {
					this.byId("materialInfo").setEnabled(true);
					this.byId("idOverallStatusButton").setEnabled(true);
					break;
				} else {
					this.byId("materialInfo").setEnabled(false);
					this.byId("idOverallStatusButton").setEnabled(false);
				}
			}

		    //Enabling or disabling Re-Schedule button based on status and flag
		    if(this._aSelectedRowsIdx && this._aSelectedRowsIdx.length > 0){
				oViewModel.setProperty("/Scheduling/selectedDemandPath", this._oDataTable.getContextByIndex(this._aSelectedRowsIdx[0]).getPath());
			} else {
				oViewModel.setProperty("/Scheduling/selectedDemandPath", null);
			}
			oViewModel.setProperty("/Scheduling/aSelectedDemandPath", this._aSelectedRowsIdx);
			this.oSchedulingActions.validateScheduleButtons();
			this.oSchedulingActions.validateReScheduleButton();
			this._nSelectedDemandsCount = this._oDataTable.getSelectedIndices().length;
		},
		/**
		 * on press assign button in footer
		 * show modal with user for select
		 * @param oEvent
		 */
		onAssignButtonPress: function (oEvent) {
			var sParentId = oEvent.getSource().getParent().getId();
			if (sParentId.includes("menu")) {
				//Operation performed from Spot context Menu
				var oModel = this.getModel(),
					sPath = this.selectedDemandPath,
					oData = oModel.getProperty(sPath),
					oSelectedData = [{
						sPath: sPath,
						oData: oData
					}];
				if (oData.ALLOW_ASSIGN) {
					this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedData, false, this._mParameters);
				} else {
					this._showAssignErrorDialog([this.getMessageDescWithOrderID(oData)]);
				}
			} else {
				//Operation performed from Demands Toolbar
				var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, true);
				this.getModel("viewModel").setProperty("/dragSession", oSelectedPaths.aPathsData);
				if (oSelectedPaths.aPathsData.length > 0) {
					this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedPaths.aPathsData, false, this._mParameters);
				}
				if (oSelectedPaths.aNonAssignable.length > 0) {
					this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
				}
			}
		},

		/**
		 * Get Filters from smartfilter dialog to apply on Map.
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		onDemandFilterChange: function (oEvent) {
			var aFilters = this._smartFilter.getFilters();
			this.getModel("viewModel").setProperty("/mapSettings/filters", aFilters);
			this.setMapBusy(true);
			this.onReset();
			setTimeout(this.applyFiltersToMap.bind(this), 0);
		},
		/**
		 * Apply Filters into Map bindings.
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		applyFiltersToMap: function (aFilters) {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[1].getBinding("items"),
				oFilters = aFilters ? aFilters : this.getModel("viewModel").getProperty("/mapSettings/filters");
			if (oFilters && oFilters.length) {
				oBinding.filter(oFilters);
			} else {
				oBinding.filter([]);
				oBinding.refresh();
			}
			this._mapDemandTableFilter(oFilters);
		},

		/**
		 * Select All spots in map from Demand Table.
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		checkAllDemands: function () {
			this.setMapBusy(true);
			var oGeoMap = this.getView().byId("idGeoMap"),
				oModel = oGeoMap.getVos()[1].getModel(),
				oSelectedIndices = this._oDataTable.getSelectedIndices(),
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				nSelectedDemandsLength = oSelectedIndices.length,
				sPath, sSelectedGuid,
				aMapSpots = this._viewModel.getProperty("/mapSettings/DemandSet");
			if (oSelectedIndices.length > 100) {
				nSelectedDemandsLength = 100;
			}
			if (aSelectedDemands && aSelectedDemands.length) {
				for (var i = 0; i < aSelectedDemands.length; i++) {
					sPath = aSelectedDemands[i];
					sSelectedGuid = this._oModel.getProperty(sPath + '/Guid');
					aMapSpots.map(function myFunction(oSpot) {
						if (oSpot.Guid === sSelectedGuid) {
							oSpot.IS_SELECTED = true;
						}
					});
				}
			} else {
				for (var j = 0; j < nSelectedDemandsLength; j++) {
					sPath = this._oDataTable.getContextByIndex(oSelectedIndices[j]).getPath(); //oSelectedContexts[i].context.getPath();
					if (!aSelectedDemands.includes(sPath)) {
						aSelectedDemands.push(sPath);
					}
					sSelectedGuid = this._oModel.getProperty(sPath + '/Guid');
					aMapSpots.map(function myFunction(oSpot) {
						if (oSpot.Guid === sSelectedGuid) {
							oSpot.IS_SELECTED = true;
						}
					});
				}
				oViewModel.setProperty("/mapSettings/selectedDemands", aSelectedDemands);
			}
			this.setMapBusy(false);
		},
		/**
		 * Deselect All spots in map from Demand Table.
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		unCheckAllDemands: function () {
			this.setMapBusy(true);
			var oGeoMap = this.getView().byId("idGeoMap"),
				oModel = oGeoMap.getVos()[1].getModel(),
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				aMapSpots = this._viewModel.getProperty("/mapSettings/DemandSet"),
				sSelectedGuid, sPath;
			for (var i = 0; i < aSelectedDemands.length; i++) {
				sPath = aSelectedDemands[i];
				sSelectedGuid = this._oModel.getProperty(sPath + '/Guid');
				aMapSpots.map(function myFunction(oSpot) {
					if (oSpot.Guid === sSelectedGuid) {
						oSpot.IS_SELECTED = false;
					}
				});
			}
			oViewModel.setProperty("/mapSettings/selectedDemands", []);
			this.setMapBusy(false);
		},
		/**
		 * Select/Deselect single spot in map from Demand Table.
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		updateMapDemandSelection: function (oEvent) {
			var selectedIndices = this._oDataTable.getSelectedIndices(),
				index = oEvent.getParameter("rowIndex"),
				sPath = oEvent.getParameter("rowContext").getPath(),
				sSelectedGuid = oEvent.getParameter("rowContext").getProperty('Guid'),
				oGeoMap = this.getView().byId("idGeoMap"),
				oModel = oGeoMap.getVos()[1].getModel(),
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				aMapSpots = this._viewModel.getProperty("/mapSettings/DemandSet");
			if (selectedIndices.includes(index)) {
				if (!aSelectedDemands.includes(sPath)) {
					aSelectedDemands.push(sPath);
				}
				aMapSpots.map(function myFunction(oSpot) {
					if (oSpot.Guid === sSelectedGuid) {
						oSpot.IS_SELECTED = true;
					}
				});
			} else {
				aSelectedDemands.splice(aSelectedDemands.indexOf(sPath), 1);
				aMapSpots.map(function myFunction(oSpot) {
					if (oSpot.Guid === sSelectedGuid) {
						oSpot.IS_SELECTED = false;
					}
				});
			}
			oViewModel.setProperty("/mapSettings/selectedDemands", aSelectedDemands);
		},
		/**
		 * Select item in Map Legend to filter the map and Demand Table.
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		onSelectMapLegend: function (oEvent) {
			var sValue = oEvent.getSource().getSelectedItem().getTitle(),
				oStatusFilter = this.byId("listReportFilter").getControlByKey("Status"),
				aTokens = [],
				oLegendList = this.byId("idMapLegendsList");
			var values = [];
			if (sValue !== "Selected") {
				aTokens.push(new sap.m.Token({
					text: sValue,
					key: sValue
				}));
				values.push({
					text: sValue,
					key: sValue
				});
			} else {
				oLegendList.setSelectedItem(oLegendList.getSelectedItem(), false);
			}
			var oFilterData = {};
			oFilterData.Status = {
				items: [],
				ranges: [],
				value: ""
			};
			oFilterData.Status.items = values;
			this._smartFilter.setFilterData(oFilterData);
		},
		/**
		 * remove Selection in Map Lagend to filter the map and Demand Table.
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		onResetLegendSelection: function (oEvent) {
			var oLegendList = this.byId("idMapLegendsList");
			oLegendList.setSelectedItem(oLegendList.getSelectedItem(), false);
		},
		/**
		 * On Click Map Demand Setting
		 * @Author Pranav
		 * @return
		 * @param oEvent
		 */
		onClickMapDemandFilter: function (oEvent) {
			var oButton = oEvent.getSource().getAggregation("toolbar").getContent()[2],
				oView = this.getView();

			if (!this._oPopover) {
				Fragment.load({
					name: "com.evorait.evoplan.view.map.fragments.ClusterSwitch",
					id: oView.getId(),
					controller: this
				}).then(function (oPopover) {
					this._oPopover = oPopover;
					this.getView().addDependent(this._oPopover);
					oPopover.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					this._oPopover.open(oButton);
				}.bind(this));
			} else {
				this._oPopover.open(oButton);
			}
		},
		onCloseDialog: function () {
			this._oPopover.close();
		},
		/**
		 * Map Clustering
		 * @Author Pranav Kumar
		 * @return
		 * @param oEvent
		 */
		onClusterSwitchPress: function (oEvent) {
			var bCluster = oEvent.getParameters().state;

			if (bCluster) {
				if (!this.oCurrentClustering) {
					this.oCurrentClustering = new sap.ui.vbm.ClusterDistance({
						rule: "Status=INIT",
						distance: {
							path: "user>/DEFAULT_MAP_CLUSTER_DISTANCE",
							formatter: function (value) {
								return parseInt(value);
							}
						},
						vizTemplate: new sap.ui.vbm.Cluster({
							type: "Success",
							icon: "sap-icon://end-user-experience-monitoring"
						})

					});
				}
				this.oVBI.addCluster(this.oCurrentClustering);
			} else {
				this.oVBI.removeCluster(this.oCurrentClustering);
			}
		},

		/**
		 * To Handle Right click on Map Spots.
		 * @param {object} oEvent - Right click event on Spot 
		 */
		onContextMenu: function (oEvent) {
			var oSpot = oEvent.getSource(),
				sType = oSpot.data("Type");
			this.getModel("viewModel").setProperty("/mapSettings/spotContextMenuType", sType);
			this.oPinPopover.open(oSpot, sType, this._getSpotPath(oSpot));
		},

		/**
		 * If you remove this, Demand table filter on changing map selection won't work
		 */
		onSelectSpots: function (oEvent) {
			// Do Not remove this method, Demand table filter on changing map selection won't work
			this._bDemandListScroll = false;
		},

		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshMapView", this._refreshMapView, this);
			this._oEventBus.unsubscribe("BaseController", "resetMapSelection", this._resetMapSelection, this);
			this._oEventBus.unsubscribe("MapController", "setMapSelection", this._setMapSelection, this);
			this._oEventBus.unsubscribe("MapController", "showAssignedDemands", this._showAssignedDemands, this);
			this._oEventBus.unsubscribe("DemandTableOperation", "clearDemandsSelection", this.clearDemandsSelection, this);
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Check for multiple resources residing in same location
		 * 
		 * @Author Rahul
		 */
		_checkForMultipleResources: function (oResource) {
			var aFilters = [],
				oViewModel = this.getModel("viewModel");
			var oView = this.getView();

			aFilters.push(new Filter("LONGITUDE", FilterOperator.EQ, oResource.LONGITUDE));
			aFilters.push(new Filter("LATITUDE", FilterOperator.EQ, oResource.LATITUDE));
			this.setMapBusy(true);
			this.getOwnerComponent().readData("/ResourceSet", aFilters).then(function (response) {
				this.setMapBusy(false);
				oViewModel.setProperty("/mapSettings/droppedResources", response.results);
				if (!this.oResourceSheet && response.results.length > 1) {
					Fragment.load({
						name: "com.evorait.evoplan.view.map.fragments.ActionSheet",
						controller: this
					}).then(function (popover) {
						this.oResourceSheet = popover;
						oView.addDependent(this.oResourceSheet);
						this.oResourceSheet.open();
					}.bind(this));
				} else if (this.oResourceSheet && response.results.length > 1) {
					this.oResourceSheet.open();
				} else {
					this._openCalendar();
				}
			}.bind(this));

		},

		/**
		 * Reset the map selection in the Model
		 * @Author: Rahul
		 */
		_resetMapSelection: function () {
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not
			var aDemandGuidEntity = [],
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				aMapSpots = this._viewModel.getProperty("/mapSettings/DemandSet"),
				sSelectedGuid, sPath;
			if (aSelectedDemands.length > 0) {
				aSelectedDemands.forEach(function (entry) {
					sPath = "/DemandSet('" + entry.split("'")[1] + "')";
					aDemandGuidEntity.push(sPath);
					sSelectedGuid = this._oModel.getProperty(sPath + '/Guid');
					aMapSpots.map(function myFunction(oSpot) {
						if (oSpot.Guid === sSelectedGuid) {
							oSpot.IS_SELECTED = false;
						}
					});
				}.bind(this));
				oViewModel.setProperty("/mapSettings/selectedDemands", []);
				this.getModel().resetChanges(aDemandGuidEntity);
			}
		},
		/**
		 * Set the map selection in the Model
		 * @Author: Rahul
		 */
		_setMapSelection: function () {
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not
			var oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				aMapSpots = this._viewModel.getProperty("/mapSettings/DemandSet");
			if (aSelectedDemands.length > 0) {
				aSelectedDemands.forEach(function (entry) {
					aMapSpots.map(function myFunction(oSpot) {
						if (oSpot.Guid === entry.split("'")[1]) {
							oSpot.IS_SELECTED = true;
						}
					});
				}.bind(this));
			}
		},

		/**
		 * check for unsaved data in Demand table
		 * on click on navigate acion navigate to Demand Detail Page
		 * modified method since 2201, by Rakesh Sahu
		 * @param oEvent
		 */
		_onActionPress: function (oEvent) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
				oViewModel = this.getModel("viewModel"),
				oModel = this.getModel(),
				bDemandEditMode = oViewModel.getProperty("/bDemandEditMode");

			this.oRow = oEvent.getParameter("row");

			if (bDemandEditMode && oModel.hasPendingChanges()) {
				this.showDemandEditModeWarningMessage().then(function (bResponse) {
					var sDiscard = oResourceBundle.getText("xbut.discard&Nav"),
						sSave = oResourceBundle.getText("xbut.buttonSave");

					if (bResponse === sDiscard) {
						oModel.resetChanges();
						oViewModel.setProperty("/bDemandEditMode", false);
						this._navToDetail(null, this.oRow);
					} else
					if (bResponse === sSave) {
						oViewModel.setProperty("/bDemandEditMode", false);
						this.submitDemandTableChanges();
					}
				}.bind(this));

			} else {
				if (bDemandEditMode) {
					oViewModel.setProperty("/bDemandEditMode", false);
				}
				this._navToDetail(oEvent);
			}
		},
		/**
		 * navigation to demand detail page
		 * added method since 2201, by Rakesh Sahu
		 * @param oEvent
		 * @param oRow
		 */
		_navToDetail: function (oEvent, oRow) {
			oRow = oRow ? oRow : oEvent.getParameter("row");
			var oRouter = this.getRouter(),
				oContext = oRow.getBindingContext(),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				oData = oModel.getProperty(sPath);
			this.onReset();
			oRouter.navTo("mapDemandDetails", {
				guid: oData.Guid
			});
		},

		/**
		 *  refresh the whole map view including map and demand table
		 */
		_refreshMapView: function (oEvent) {
			// Code to refresh Map Demand Table
			if (this._bLoaded) {
				var oViewModel = this.getModel("viewModel");
				oViewModel.setProperty("/mapSettings/routeData", []);
				this._resetMapSelection();
				setTimeout(function () {
					this._refreshMapBinding();
				}.bind(this), 10);

				this._oDraggableTable.rebindTable();
				this.onResetLegendSelection();
			}
			this._bLoaded = true;
		},
		/**
		 * refresh the whole map container bindings
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		_refreshMapBinding: function () {
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not
			// Code to refresh Map
			this._getDemandsForMap();
		},

		/* Demand Table Filter
		 * @Author Pranav
		 */
		_mapDemandTableFilter: function (oFilters) {
			this.setMapBusy(false);
			this.byId("draggableList").rebindTable();
			this.getModel("viewModel").setProperty("/mapSettings/routeData", []);
		},

		_zoomToPoint: function (sEventChannel, sEventName, oPoint) {
			this._oGeoMap.setCenterPosition(oPoint.LONGITUDE + ";" + oPoint.LATITUDE);
			this._oGeoMap.setZoomlevel(13);
		},
		/**
		 * Checks the Demands for correct status in order assign or reAssign
		 * */
		_checkDemands: function () {
			var aSelectedDemands = this.aDraggedDemands,
				oModel = this.getModel(),
				aAssignableDemands = [],
				aUnAssignableDemands = [];

			for (var i in aSelectedDemands) {
				var oDemandObject = oModel.getProperty(aSelectedDemands[i]);
				if (oDemandObject.ALLOW_ASSIGN) {
					aAssignableDemands.push(aSelectedDemands[i]);
				} else {
					aUnAssignableDemands.push(oDemandObject);
				}
			}
			return {
				aAssignableDemands: aAssignableDemands,
				aUnAssignableDemands: aUnAssignableDemands
			};

		},
		/**
		 * Assign dragged demand to the resource on which it is dropped for selected date
		 * And open the single planner for that day
		 * 
		 * @Author Rahul
		 * 
		 */
		_assignDemands: function (oDemandObject, oResourceContext, oTargetDate, oCalendar, sDescription) {
			var aAssignableDemands = oDemandObject.aAssignableDemands;
			oCalendar.setBusy(true);
			var sResourcePath = oResourceContext.getPath();
			Promise.all(this.assignedDemands(aAssignableDemands, sResourcePath, this._getDate(oTargetDate), null, null, true)).then(function (
				responses) {
				oCalendar.setBusy(false);
				this.getModel("viewModel").setProperty("/mapSettings/aAssignedAsignmentsForPlanning", responses);
				this.oCalendarPopover.close();
				this.getOwnerComponent().singleDayPlanner.open(this.getView(), sResourcePath, {
					StartDate: oTargetDate,
					EndDate: oTargetDate,
					ChildCount: aAssignableDemands.length,
					ResourceGuid: oResourceContext.getObject().ResourceGuid,
					ResourceGroupGuid: oResourceContext.getObject().ResourceGroupGuid
				}, "TIMEDAY", {
					Description: sDescription
				}, true);
			}.bind(this));
		},
		/**
		 * Open the current calendar to select the date
		 * 
		 * @Author Rahul
		 * */
		_openCalendar: function (oResource) {
			var oView = this.getView();
			if (!this.oCalendarPopover) {
				Fragment.load({
					name: "com.evorait.evoplan.view.map.fragments.CalendarDialog",
					controller: this,
					id: "idSelectDate"
				}).then(function (popover) {
					this.oCalendarPopover = popover;
					oView.addDependent(this.oCalendarPopover);
					this.oCalendarPopover.open();
				}.bind(this));
			} else {
				this.oCalendarPopover.open();

			}
		},
		/**
		 *  Get date with timezone offset
		 * 
		 */
		_getDate: function (date) {
			var iYear = date.getFullYear(),
				iMonth = date.getMonth().toString().length === 1 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1,
				iDate = date.getDate().toString().length === 1 ? "0" + date.getDate() : date.getDate();

			return new Date(iYear + "-" + iMonth + "-" + iDate);
		},
		/**
		 *  Read demands from from Odata and store it to Local JSON
		 */
		_getDemandsForMap: function () {
			this.setMapBusy(true);
			var sSelect="$select=Guid,IS_SELECTED,MAP_MARKER_COLOUR,DEMAND_KEY,LONGITUDE,LATITUDE,Status,EffortUnit,DateFrom,DateTo,START_DATE,END_DATE,EARL_SCHED_START_DATE,EARL_SCHED_FIN_DATE,LATE_SCHED_START_DATE,LATE_SCHED_FIN_DATE,ACTUAL_START_DATE,ACTUAL_FIN_DATE,NOTIF_REQ_START_DATE,NOTIF_REQ_END_DATE,NOTIFICATION_DATE,FIXED_ASSGN_START_DATE,FIXED_ASSGN_END_DATE,OPERATION_LTXT,ORDERID,OPERATIONID,REVISION_NO,NOTIFICATION,MATERIAL_STATUS"
			this.getOwnerComponent().readData("/DemandSet",null,sSelect).then(function (response) {
				this.setMapBusy(false);
				this._viewModel.setProperty("/mapSettings/DemandSet", response.results);
				this._viewModel.refresh();
			}.bind(this));
		},
		/**
		 *  generating odata path for demand from local JSON
		 * 
		 */
		_getSpotPath: function (oSpot) {
			if (oSpot.getBindingContext()) {
				return oSpot.getBindingContext().getPath(); //path for spots with odata binding 
			} else {
				return "/DemandSet('" + oSpot.getBindingContext('viewModel').getProperty('Guid') + "')"; //path for spots with JSON binding 
			}
		}
	});

});