/* globals axios */
sap.ui.define([
	"com/evorait/evoplan/controller/map/MapUtilities",
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
	"sap/ui/unified/Calendar"
], function (MapUtilities, JSONModel, formatter, Filter, FilterOperator, MapConfig, PinPopover,
	Fragment, Dialog, Button, MessageToast, GroupHeaderListItem, Calendar) {
	"use strict";

	return MapUtilities.extend("com.evorait.evoplan.controller.map.Map", {
		selectedDemands: [],
		_isDemandDraggable: false,
		_oGeoMap: null,
		onInit: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oMapModel = this.getModel("mapConfig");
			this._oGeoMap = oGeoMap;
			oGeoMap.setMapConfiguration(MapConfig.getMapConfiguration(oMapModel));
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("BaseController", "refreshMapView", this._refreshMapView, this);
			this._oEventBus.subscribe("BaseController", "resetMapSelection", this._resetMapSelection, this);
			this._oEventBus.subscribe("MapController", "setMapSelection", this._setMapSelection, this);
			this._oEventBus.subscribe("MapController", "showAssignedDemands", this._showAssignedDemands, this);
			this._oEventBus.subscribe("MapController", "displayRoute", this._zoomToPoint, this);

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
				oContext, sPath;
			for (var i in aSelected) {
				oContext = aSelected[i].getBindingContext();
				sPath = oContext.getPath();
				aSelectedDemands.push(sPath);
			}
			oViewModel.setProperty("/mapSettings/selectedDemands", aSelectedDemands);
			oViewModel.setProperty("/mapSettings/routeData", []);
			oViewModel.setProperty("/mapSettings/bRouteDateSelected", false);
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
				oContext, sPath;
			for (var i in aDeSelected) {
				oContext = aDeSelected[i].getBindingContext();
				sPath = oContext.getPath();
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
				oContext = oDragSource.getBindingContext(),
				sPath = oContext.getPath();

			if (aSelectedDemands.length > 0) {
				if (!aSelectedDemands.includes(sPath)) {
					aSelectedDemands.push(sPath);
				}
			} else {
				aSelectedDemands.push(sPath);
			}
			this._selectedResource = oEvent.getSource();
			this.aDraggedDemands = aSelectedDemands;
			this._checkForMultipleResources(oEvent.getSource().getBindingContext().getObject());
			

		},
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
				} else if (this.oResourceSheet && response.results.length > 1){
					this.oResourceSheet.open();
				}else {
					this._openCalendar();
				}
			}.bind(this));

		},
		
		onResourceSelect : function (oEvent) {
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
				aAssignedAssignments = this._assignDemands(aAssignableDemands, oResourceContext, oSelectedDate[0]
					.getStartDate(), oCalendar);

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
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not

			var aFilters = this.byId("listReportFilter").getFilters(),
				aDemandFilters = this.getSelectedDemandFilters();
			if (aDemandFilters && aDemandFilters.aFilters && aDemandFilters.aFilters.length) {
				aFilters.push(aDemandFilters);
			}
			if (this._bShowAssignment) {
				aFilters = [];
				var aAssignedDemands = this.getSelectedDemandFilters("assignDemands");
				if (aAssignedDemands && aAssignedDemands.aFilters && aAssignedDemands.aFilters.length) {
					aFilters.push(aAssignedDemands);
				}
				this._bShowAssignment = false;
				this.applyFiltersToMap(aFilters);
			}
			//setTimeOut has been added to make rebindTable() work
			setTimeout(function () {
				this._oDataTable.getBinding("rows").filter(aFilters, "Application");
			}.bind(this), 15);
			// if(aFilters.length){
			// 	oEvent.getParameter("bindingParams").filters.push(aFilters);
			// }

		},

		_showAssignedDemands: function () {
			this._bShowAssignment = true;
			this._oDraggableTable.rebindTable();
		},

		onAfterRendering: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[1].getBinding("items");
			// To show busy indicator when map loads.
			this.setMapBusy(true);
			oBinding.attachDataReceived(function () {
				this.setMapBusy(false);
			}.bind(this));

			//to select All demands on table rebinde based on selected markers in map
			this._oDraggableTable.attachDataReceived(function () {
				var oSelectedDemands = this.getModel("viewModel").getProperty("/mapSettings/selectedDemands");
				if (oSelectedDemands && oSelectedDemands.length) {
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
				sVariant = oSmartFilter.getSmartVariant().getCurrentVariantId();
			if (sVariant !== "*standard*") {
				this.applyFiltersToMap(aFilter);
			}
		},
		/**
		 * Clearing the selected demands the Reseting the selection
		 *
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
		},
		/**
		 * Clearing the selected demands the Reseting the selection
		 *
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
		 * Reset the map selection in the Model
		 * @Author: Rahul
		 */
		_resetMapSelection: function () {
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not
			var aDemandGuidEntity = [],
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
			if (aSelectedDemands.length > 0) {
				aSelectedDemands.forEach(function (entry) {
					aDemandGuidEntity.push("/DemandSet('" + entry.split("'")[1] + "')");
				});
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
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
			if (aSelectedDemands.length > 0) {
				aSelectedDemands.forEach(function (entry) {
					this.getModel().setProperty("/DemandSet('" + entry.split("'")[1] + "')/IS_SELECTED", true);
				}.bind(this));
			}
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
		 * deselect all checkboxes in table
		 * @private
		 */
		_deselectAll: function () {
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not
			this._oDataTable.clearSelection();
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
		 *  opens the action sheet
		 */
		openActionSheet: function (oEvent) {
			var oContext = oEvent.getSource().getParent().getParent().getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath();
			this.selectedDemandData = oModel.getProperty(sPath);
			this.getOwnerComponent().NavigationActionSheet.open(this.getView(), oEvent.getSource().getParent(), this.selectedDemandData);
		},
		/**
		 * On DragStart set the dragSession selected demands
		 */
		onDragStart: function (oEvent) {
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
		 * On Drag end check for dropped control, If dropped control not found
		 * then make reset the selection
		 * @param oEvent
		 */
		onDragEnd: function (oEvent) {
			this._deselectAll();
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
			this.setMapBusy(true);
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[1].getBinding("items");
			this._resetMapSelection();
			oBinding.refresh();
		},
		/**
		 * open change status dialog
		 * @param oEvent
		 */
		onChangeStatusButtonPress: function (oEvent) {
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
				this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedData, this._mParameters);
			} else {
				//Operation performed from Demands Toolbar
				this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
				var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);
				if (this._aSelectedRowsIdx.length > 0) {
					this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedPaths.aPathsData, this._mParameters);
				} else {
					var msg = this.getResourceBundle().getText("ymsg.selectMinItem");
					MessageToast.show(msg);
				}
			}
		},
		/**
		 * enable/disable buttons on footer when there is some/no selected rows
		 * @since 3.0
		 */
		onRowSelectionChange: function (oEvent) {
			this._bDemandListScroll = true; //Flag to identify Demand List row is selected and scrolled or not
			var selected = this._oDataTable.getSelectedIndices(),
				sDemandPath, bComponentExist;
			var iMaxRowSelection = this.getModel("user").getProperty("/DEFAULT_DEMAND_SELECT_ALL");
			if (selected.length > 0 && selected.length <= iMaxRowSelection) {
				this.byId("assignButton").setEnabled(true);
				this.byId("changeStatusButton").setEnabled(true);
				this.byId("idAssignmentStatusButton").setEnabled(true);
				this.byId("idOverallStatusButton").setEnabled(true);
				this.byId("idUnassignButton").setEnabled(true);
			} else {
				this.byId("assignButton").setEnabled(false);
				this.byId("changeStatusButton").setEnabled(false);
				this.byId("idAssignmentStatusButton").setEnabled(false);
				this.byId("materialInfo").setEnabled(false);
				this.byId("idOverallStatusButton").setEnabled(false);
				this.byId("idUnassignButton").setEnabled(false);
				//If the selected demands exceeds more than the maintained selected configuration value
				if (iMaxRowSelection <= selected.length) {
					var sMsg = this.getResourceBundle().getText("ymsg.maxRowSelection");
					MessageToast.show(sMsg + " " + iMaxRowSelection);
				}
			}
			// To make selection on map by selecting Demand from demand table
			if (oEvent.getParameter("selectAll")) {
				this.checkAllDemands();
			} else if (oEvent.getParameter("rowIndex") === -1) {
				this.unCheckAllDemands();
			} else {
				if (!this._isDemandDraggable) {
					this.updateMapDemandSelection(oEvent);
				}
			}

			//Enabling/Disabling the Material Status Button based on Component_Exit flag
			for (var i = 0; i < selected.length; i++) {
				sDemandPath = this._oDataTable.getContextByIndex(selected[i]).getPath();
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
					this._showAssignErrorDialog([oData.DemandDesc]);
				}
			} else {
				//Operation performed from Demands Toolbar
				this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
				if (this._aSelectedRowsIdx.length > 100) {
					this._aSelectedRowsIdx.length = 100;
				}
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
		 *	Navigates to evoOrder detail page with static url. 
		 */
		OnClickOrderId: function (oEvent) {
			var sOrderId = oEvent.getSource().getText();
			this.openEvoOrder(sOrderId);
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
			this.setMapBusy(true);
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
				sPath;
			if (oSelectedIndices.length > 100) {
				nSelectedDemandsLength = 100;
			}
			if (aSelectedDemands && aSelectedDemands.length) {
				for (var i = 0; i < aSelectedDemands.length; i++) {
					sPath = aSelectedDemands[i];
					oModel.setProperty(sPath + "/IS_SELECTED", true);
				}
			} else {
				for (var j = 0; j < nSelectedDemandsLength; j++) {
					sPath = this._oDataTable.getContextByIndex(oSelectedIndices[j]).getPath(); //oSelectedContexts[i].context.getPath();
					if (!aSelectedDemands.includes(sPath)) {
						aSelectedDemands.push(sPath);
					}
					oModel.setProperty(sPath + "/IS_SELECTED", true);
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
				sPath;
			for (var i = 0; i < aSelectedDemands.length; i++) {
				sPath = aSelectedDemands[i];
				oModel.setProperty(sPath + "/IS_SELECTED", false);
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
				oGeoMap = this.getView().byId("idGeoMap"),
				oModel = oGeoMap.getVos()[1].getModel(),
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
			if (selectedIndices.includes(index)) {
				if (!aSelectedDemands.includes(sPath)) {
					aSelectedDemands.push(sPath);
				}
				oModel.setProperty(sPath + "/IS_SELECTED", true);
			} else {
				aSelectedDemands.splice(aSelectedDemands.indexOf(sPath), 1);
				oModel.setProperty(sPath + "/IS_SELECTED", false);
			}
			oViewModel.setProperty("/mapSettings/selectedDemands", aSelectedDemands);
		},
		/**
		 * Select item in Map Lagend to filter the map and Demand Table.
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		onSelectMapLagend: function (oEvent) {
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
			// oStatusFilter.setTokens(aTokens);
			var oFilterData = {};
			oFilterData["Status"] = {
				items: [],
				ranges: [],
				value: ""
			};
			oFilterData["Status"].items = values;
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
		onDemandQualificationIconPress: function (oEvent) {
			var oRow = oEvent.getSource().getParent(),
				oContext = oRow.getBindingContext(),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				oResourceNode = oModel.getProperty(sPath);
			var sDemandGuid = oResourceNode.Guid;
			this.getOwnerComponent().DemandQualifications.open(this.getView(), sDemandGuid);

		},
		/* Demand Table Filter
		 * @Author Pranav
		 */
		_mapDemandTableFilter: function (oFilters) {
			this.byId("draggableList").rebindTable();
			this.getModel("viewModel").setProperty("/mapSettings/routeData", []);
		},

		/**
		 * To Handle Right click on Map Spots.
		 * @param {object} oEvent - Right click event on Spot 
		 */
		onContextMenu: function (oEvent) {
			var oSpot = oEvent.getSource(),
				sType = oSpot.data("Type");
			this.getModel("viewModel").setProperty("/mapSettings/spotContextMenuType", sType);
			this.oPinPopover.open(oSpot, sType);
		},

		/**
		 * If you remove this, Demand table filter on changing map selection won't work
		 */
		onSelectSpots: function (oEvent) {
			// Do Not remove this method, Demand table filter on changing map selection won't work
			this._bDemandListScroll = false;
		},

		/**
		 * Open's assignments list
		 * 
		 */
		onClickAssignCount: function (oEvent) {
			this.getOwnerComponent().assignmentList.open(this.getView(), oEvent, this._mParameters);
		},

		/**
		 * On Material Info Button press event 
		 * 
		 */
		onMaterialInfoButtonPress: function () {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			if (this._aSelectedRowsIdx.length > 100) {
				this._aSelectedRowsIdx.length = 100;
			}
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);
			var iMaxSelcRow = this.getModel("user").getProperty("/DEFAULT_MAX_DEM_SEL_MAT_LIST");
			if (oSelectedPaths.aPathsData.length > 0 && iMaxSelcRow >= this._aSelectedRowsIdx.length) {
				this.getOwnerComponent().materialInfoDialog.open(this.getView(), false, oSelectedPaths.aPathsData);
			} else {
				var msg = this.getResourceBundle().getText("ymsg.selectMaxItemMaterialInfo");
				MessageToast.show(msg + " " + iMaxSelcRow);
			}
		},
		/**
		 * On Refresh Status Button press in Demand Table 
		 * 
		 */
		onMaterialStatusPress: function (oEvent) {
			var oSelectedIndices = this._oDataTable.getSelectedIndices(),
				oViewModel = this.getModel("appView"),
				sDemandPath;
			oViewModel.setProperty("/busy", true);
			for (var i = 0; i < oSelectedIndices.length; i++) {
				sDemandPath = this._oDataTable.getContextByIndex(oSelectedIndices[i]).getPath();
				this.getOwnerComponent()._getData(sDemandPath).then(function (result) {
					oViewModel.setProperty("/busy", false);
				}.bind(this));
			}
		},

		/**
		 * Opens long text view/edit popover
		 * @param {sap.ui.base.Event} oEvent - press event for the long text button
		 */
		onClickLongText: function (oEvent) {
			this.getModel("viewModel").setProperty("/isOpetationLongTextPressed", false);
			this.getOwnerComponent().longTextPopover.open(this.getView(), oEvent);
		},
		onClickOprationLongText: function (oEvent) {
			this.getModel("viewModel").setProperty("/isOpetationLongTextPressed", true);
			this.getOwnerComponent().longTextPopover.open(this.getView(), oEvent);
		},
		/**
		 * on press unassign button in Demand Table header
		 */
		onPressUnassignDemand: function () {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, true);
			if (oSelectedPaths.aUnAssignDemands.length > 0) {
				this.getOwnerComponent().assignActionsDialog.open(this.getView(), oSelectedPaths, true, this._mParameters);
			} else {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
			}
		},

		/**
		 * On Press of Change Assignment Status Button
		 * Since 2205
		 * @Author Chethan RK
		 */
		onAssignmentStatusButtonPress: function () {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			var aSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx);
			if (aSelectedPaths.aAssignmentDemands.length > 0) {
				this.getModel("viewModel").setProperty("/Show_Assignment_Status_Button", true);
				this.getModel("viewModel").setProperty("/Disable_Assignment_Status_Button", false);
				this.getOwnerComponent().assignActionsDialog.open(this.getView(), aSelectedPaths, true, this._mParameters);
			} else {
				sap.m.MessageToast.show(this.getResourceBundle().getText("ymsg.noAssignments"));
			}
		},

		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshMapView", this._refreshMapView, this);
			this._oEventBus.unsubscribe("BaseController", "resetMapSelection", this._resetMapSelection, this);
			this._oEventBus.unsubscribe("MapController", "setMapSelection", this._setMapSelection, this);
			this._oEventBus.unsubscribe("MapController", "showAssignedDemands", this._showAssignedDemands, this);
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
				aAssignableDemands = [];

			for (var i in aSelectedDemands) {
				var oDemandObject = oModel.getProperty(aSelectedDemands[i]);
				if (oDemandObject.ALLOW_ASSIGN) {
					aAssignableDemands.push(aSelectedDemands[i]);
				}
			}
			return {
				aAssignableDemands: aAssignableDemands
			};

		},
		/**
		 * Assign dragged demand to the resource on which it is dropped for selected date
		 * And open the single planner for that day
		 * 
		 * @Author Rahul
		 * 
		 */
		_assignDemands: function (oDemandObject, oResourceContext, oTargetDate, oCalendar) {
			var aAssignableDemands = oDemandObject.aAssignableDemands;
			oCalendar.setBusy(true);
			var sResourcePath = oResourceContext.getPath();
			Promise.all(this.assignedDemands(aAssignableDemands, sResourcePath, oTargetDate, null, null, true)).then(function (responses) {
				oCalendar.setBusy(false);
				this.getModel("viewModel").setProperty("/mapSettings/aAssignedAsignmentsForPlanning", responses);
				this._refreshMapView();
				this._oEventBus.publish("BaseController", "refreshMapTreeTable", {});
				this.oCalendarPopover.close();
				this.getOwnerComponent().singleDayPlanner.open(this.getView(), sResourcePath, {
					StartDate: oTargetDate,
					ChildCount: aAssignableDemands.length,
					ResourceGuid: oResourceContext.getObject().ResourceGuid
				}, "TIMEDAY", null, true);
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
		}
	});

});