sap.ui.define([
	"com/evorait/evoplan/controller/common/NavigationActionSheet",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/evorait/evoplan/controller/map/MapConfig",
	"sap/ui/core/Fragment",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/MessageToast",
	"sap/ui/core/Popup",
	"sap/m/GroupHeaderListItem"
], function (AssignmentActionsController, JSONModel, formatter, Filter, FilterOperator, MapConfig, Fragment, Dialog, Button, MessageToast,

	Popup, GroupHeaderListItem) {
	"use strict";

	return AssignmentActionsController.extend("com.evorait.evoplan.controller.map.Map", {
		selectedDemands: [],
		_bFirstTime: true,
		_isDemandDraggable: false,
		onInit: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oMapModel = this.getModel("mapConfig");
			oGeoMap.setMapConfiguration(MapConfig.getMapConfiguration(oMapModel));
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("BaseController", "refreshMapView", this._refreshMapView, this);
			this._oEventBus.subscribe("BaseController", "refreshMapDemandTable", this._refreshDemandTable, this);
			this._oEventBus.subscribe("BaseController", "resetMapSelection", this._resetMapSelection, this);
			this._oEventBus.subscribe("MapController", "setMapSelection", this._setMapSelection, this);

			var onClickNavigation = this._onActionPress.bind(this);
			var openActionSheet = this.openActionSheet.bind(this);
			this._oDraggableTable = this.byId("draggableList");
			this._oDataTable = this._oDraggableTable.getTable();
			this._setRowActionTemplate(this._oDataTable, onClickNavigation, openActionSheet);
			this._mParameters = {
				bFromMap: true
			};
			this.oVBI = this.getView().byId("idGeoMap");
		},

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
			var aSelected = oEvent.getParameter("selected"),
				oViewModel = this.getModel("viewModel"),
				oModel = this.getModel(),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				oContext, sPath, oDemand;
			for (var i in aSelected) {
				oContext = aSelected[i].getBindingContext();
				sPath = oContext.getPath();
				oDemand = oModel.getProperty(sPath);
				aSelectedDemands.push(sPath);
			}
			oViewModel.setProperty("/mapSettings/selectedDemands", aSelectedDemands);
			oViewModel.setProperty("/mapSettings/routeData", []);
			this._oDraggableTable.rebindTable();
		},
		/**
		 * DeSelected spots can be saved.
		 * @author Rahul
		 * @return Filter
		 */
		onDeselect: function (oEvent) {
			var aDeSelected = oEvent.getParameter("deselected"),
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				oModel = this.getModel(),
				oContext, sPath, oDemand;
			for (var i in aDeSelected) {
				oContext = aDeSelected[i].getBindingContext();
				sPath = oContext.getPath();
				oDemand = oModel.getProperty(sPath);
				aSelectedDemands.splice(aSelectedDemands.indexOf(sPath), 1);
			}
			oViewModel.setProperty("/mapSettings/selectedDemands", aSelectedDemands);
			oViewModel.setProperty("/mapSettings/routeData", []);
			this._oDraggableTable.rebindTable();
		},
		/**
		 * If you remove this event selection part will work
		 */

		onSelectSpots: function (oEvent) {
			// I dunno why its required
		},
		/**
		 *
		 */
		onContextMenu: function (oEvent) {
			// var oMenu = oEvent.getParameter("menu"),
			// 	oSpot = oEvent.getSource(),
			// 	oView = this.getView();

			/*Fragment.load({
					name: "com.evorait.evoplan.view.map.fragments.ActionSheet",
					id: oView.getId(),
					controller: this
				}).then(function (items) {
					for(var i in items){
						oMenu.addItem(items[i]);
					}
					var eDock = Popup.Dock;
                    oMenu.open(true, oSpot, eDock.BeginTop, eDock.endBottom, oSpot);
				}.bind(this));*/
		},
		/**
		 * Create filters for the selected demands
		 *
		 * @author Rahul
		 * @return Filter
		 */
		getSelectedDemandFilters: function () {
			var aFilters = [],
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
			for (var i in aSelectedDemands) {
				aFilters.push(new Filter("Guid", FilterOperator.EQ, aSelectedDemands[i].split("'")[1]));
			}
			return new Filter({
				filters: aFilters,
				and: false
			});
		},
		/**
		 * Function will be called before the table refreshed. Before rebind pushing the selected filters
		 * into the the smart table
		 *
		 * @author Rahul
		 * @return
		 */
		onBeforeRebindTable: function (oEvent) {
			var aFilters = oEvent.getParameter("bindingParams").filters,
				aDemandFilters = this.getSelectedDemandFilters();
			aFilters.push(aDemandFilters);
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
						this._oDraggableTable.getTable().selectAll();
					}.bind(this), 10);
				}
			}.bind(this));
		},
		/**
		 * Clearing the selected demands the Reseting the selection
		 *
		 * @author Rahul
		 * @return
		 */
		onReset: function (oEvent) {
			var oViewModel = this.getModel("viewModel");
			this._resetMapSelection();
			oViewModel.setProperty("/mapSettings/selectedDemands", []);
			oViewModel.setProperty("/mapSettings/routeData", []);
			this.onResetLegendSelection();
		},
		/**
		 * Clearing the selected demands the Reseting the selection
		 *
		 * @author Rahul
		 * @return
		 */
		onClear: function () {
			var oViewModel = this.getModel("viewModel");
			this._resetMapSelection();
			this.onResetLegendSelection();
			oViewModel.setProperty("/mapSettings/selectedDemands", []);
			oViewModel.setProperty("/mapSettings/routeData", []);
			this._oDraggableTable.rebindTable();
		},
		/**
		 * Reset the map selection in the Model
		 * @Author: Rahul
		 */
		_resetMapSelection: function () {
			var aDemandGuidEntity = [],
				oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
			if (aSelectedDemands.length > 0) {
				(aSelectedDemands).forEach(function (entry) {
					aDemandGuidEntity.push("/DemandSet('" + entry.split("'")[1] + "')");
				});
				this.getModel().resetChanges(aDemandGuidEntity);
			}
			// oViewModel.setProperty("/mapSettings/selectedDemands",[]);
		},
		/**
		 * Set the map selection in the Model
		 * @Author: Rahul
		 */
		_setMapSelection: function () {
			var oViewModel = this.getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands");
			if (aSelectedDemands.length > 0) {
				(aSelectedDemands).forEach(function (entry) {
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
			this._oDataTable.clearSelection();
		},
		/**
		 *
		 * On click on demand actions to navigate to demand detail page 
		 */
		_onActionPress: function (oEvent) {
			var oRouter = this.getRouter();
			var oRow = oEvent.getParameter("row");
			var oContext = oRow.getBindingContext();
			var sPath = oContext.getPath();
			var oModel = oContext.getModel();
			var oData = oModel.getProperty(sPath);
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
			this._isDemandDraggable = false;
			var oDroppedControl = oEvent.getParameter("dragSession").getDropControl();
			if (!oDroppedControl) {
				this._deselectAll();
			}
		},
		/**
		 *  refresh the whole map view including map and demand table
		 */
		_refreshMapView: function (oEvent) {
			// Code to refresh Map Demand Table
			if (this._bLoaded) {
				this._oDraggableTable.rebindTable();
				this._refreshMapBinding();
				this.onResetLegendSelection();
			}
			this._bLoaded = true;
		},
		/**
		 * Refresh's the Map demand table
		 * @param sChanel
		 * @param sEvent event which is getting triggered
		 * @param oData Data passed while publishing the event
		 * @returns
		 * @private
		 */
		_refreshDemandTable: function (sChanel, sEvent, oData) {
			if (sEvent === "refreshMapDemandTable" && !this._bFirstTime) {
				this.byId("draggableList").rebindTable();
			}
			this._bFirstTime = false;
		},
		/**
		 * refresh the whole map container bindings
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		_refreshMapBinding: function () {
			// Code to refresh Map
			this.setMapBusy(true);
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[1].getBinding("items");
			oBinding.refresh();
		},
		/**
		 * open change status dialog
		 * @param oEvent
		 */
		onChangeStatusButtonPress: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);

			if (this._aSelectedRowsIdx.length > 0) {
				// TODO comment
				this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedPaths.aPathsData, this._mParameters);
			} else {
				var msg = this.getResourceBundle().getText("ymsg.selectMinItem");
				MessageToast.show(msg);
			}
		},
		/**
		 * enable/disable buttons on footer when there is some/no selected rows
		 * @since 3.0
		 */
		onRowSelectionChange: function (oEvent) {
			var selected = this._oDataTable.getSelectedIndices();
			if (selected.length > 0) {
				this.byId("assignButton").setEnabled(true);
				this.byId("changeStatusButton").setEnabled(true);
			} else {
				this.byId("assignButton").setEnabled(false);
				this.byId("changeStatusButton").setEnabled(false);
			}
			// To make selection on map by selecting Demand from demand table
			if (oEvent.getParameter("selectAll")) {
				this.checkAllDemands();
			} else if (oEvent.getParameter("rowIndex") === -1) {
				this.unCheckAllDemands();
			} else {
				//if(!this._isDemandDraggable)
				this.updateMapDemandSelection(oEvent);
			}
		},

		/**
		 * on press assign button in footer
		 * show modal with user for select
		 * @param oEvent
		 */
		onAssignButtonPress: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			if (this._aSelectedRowsIdx.length > 100) {
				this._aSelectedRowsIdx.length = 100;
			}
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, true);

			if (oSelectedPaths.aPathsData.length > 0) {
				// TODO comment
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedPaths.aPathsData, false, this._mParameters);
			}
			if (oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
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
			var aFilters = oEvent.getSource().getFilters();
			this.getModel("viewModel").setProperty("/mapSettings/filters", aFilters);
			this.applyFiltersToMap();
		},
		/**
		 * Apply Filters into Map bindings.
		 * @Author Rakesh Sahu
		 * @return
		 * @param oEvent
		 */
		applyFiltersToMap: function () {
			var oGeoMap = this.getView().byId("idGeoMap"),
				oBinding = oGeoMap.getAggregation("vos")[1].getBinding("items"),
				oFilters = this.getModel("viewModel").getProperty("/mapSettings/filters");
			this.setMapBusy(true);
			if (oFilters && oFilters.length) {
				oBinding.filter(oFilters);
			} else {
				oBinding.filter([]);
				oBinding.refresh();
			}
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
				sPath;
			if (oSelectedIndices.length > 100) {
				oSelectedIndices.length = 100;
			}
			if (aSelectedDemands && aSelectedDemands.length) {
				for (var i = 0; i < aSelectedDemands.length; i++) {
					sPath = aSelectedDemands[i];
					oModel.setProperty(sPath + "/IS_SELECTED", true);
				}
			} else {
				for (var i = 0; i < oSelectedIndices.length; i++) {
					sPath = this._oDataTable.getContextByIndex(oSelectedIndices[i]).getPath(); //oSelectedContexts[i].context.getPath();
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
			if (sValue !== "Selected") {
				aTokens.push(new sap.m.Token({
					text: sValue,
					key: sValue
				}));
			} else {
				oLegendList.setSelectedItem(oLegendList.getSelectedItem(), false);
			}
			oStatusFilter.setTokens(aTokens);
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
					this._oPopover.openBy(oButton);
				}.bind(this));
			} else {
				this._oPopover.openBy(oButton);
			}
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
							path: "user>/MAP_CLUSTER_DISTANCE",
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
		onExit: function () {
			this._oEventBus.unsubscribe("BaseController", "refreshMapView", this._refreshMapView, this);
			this._oEventBus.unsubscribe("BaseController", "resetMapSelection", this._resetMapSelection, this);
			this._oEventBus.unsubscribe("MapController", "setMapSelection", this._setMapSelection, this);
			this._oEventBus.unsubscribe("BaseController", "refreshMapDemandTable", this._refreshDemandTable, this);
		}

	});

});