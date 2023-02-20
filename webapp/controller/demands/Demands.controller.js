sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/table/Table",
	"sap/ui/table/Row",
	"sap/m/MessageToast",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem",
	"sap/ui/core/Fragment"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Table, Row, MessageToast,
	RowAction, RowActionItem, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.demands.Demands", {

		formatter: formatter,

		_bFirstTime: true,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the demand controller is instantiated.
		 * @public
		 */
		onInit: function () {
			this._oDraggableTable = this.byId("draggableList");
			this._oDataTable = this._oDraggableTable.getTable();
			this._configureDataTable(this._oDataTable);
			this._aSelectedRowsIdx = [];
			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("BaseController", "refreshDemandTable", this._triggerDemandFilter, this);
			this._eventBus.subscribe("AssignTreeDialog", "updateDemandTableSelection", this._deselectDemands, this);
			//toAdd busystete change event to the table
			this._oDataTable.attachBusyStateChanged(this.onBusyStateChanged, this);
			this._mParameters = {
				bFromHome: true
			};
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * after rendering of view
		 * @param oEvent
		 */
		onAfterRendering: function (oEvent) {
			var tableTitle = this.getResourceBundle().getText("xtit.itemListTitle"),
				noDataText = this.getResourceBundle().getText("tableNoDataText", [tableTitle]),
				viewModel = this.getModel("viewModel");
			this._viewModel = viewModel;
			viewModel.setProperty("/subViewTitle", tableTitle);
			viewModel.setProperty("/subTableNoDataText", noDataText);
			viewModel.setProperty("/Show_Assignment_Status_Button", false);
		},

		/**
		 * on press assign button in footer
		 * show modal with user for select
		 * @param oEvent
		 */
		onAssignButtonPress: function (oEvent) {
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, true);
			this.getModel("viewModel").setProperty("/dragSession", oSelectedPaths.aPathsData);

			if (oSelectedPaths.aPathsData.length > 0) {
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedPaths.aPathsData);
			}
			if (oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
			}
		},

		/**
		 * check for unsaved data in Demand table
		 * on click on navigate acion navigate to Demand Detail Page
		 * modified method since 2201, by Rakesh Sahu
		 * @param oEvent
		 */
		onActionPress: function (oEvent) {
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
		 * Busy State changed event
		 * To handle scroll for the particular selected index
		 */
		onBusyStateChanged: function (oEvent) {
			var parameters = oEvent.getParameters();
			if (parameters.busy === false) {
				var aDraggedIndex = this.getModel("viewModel").getProperty("/iFirstVisibleRowIndex");
				if (aDraggedIndex && aDraggedIndex !== -1) {
					this._oDataTable.setFirstVisibleRow(aDraggedIndex);
					//set first dragged index to set initial
					this.getModel("viewModel").setProperty("/iFirstVisibleRowIndex", -1);
				}
			}
		},

		/**
		 * navigation to demand detail page
		 * added method since 2201, by Rakesh Sahu
		 * @param oEvent
		 * @param oRow
		 */
		_navToDetail: function (oEvent, oRow) {
			var oRouter = this.getRouter(),
				oRow = oRow ? oRow : oEvent.getParameter("row"),
				oContext = oRow.getBindingContext(),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				oData = oModel.getProperty(sPath);
			this.getModel("viewModel").setProperty("/Disable_Assignment_Status_Button", false);
			oRouter.navTo("DemandDetail", {
				guid: oData.Guid
			});
		},

		/**
		 * Called when view attached is destroyed
		 */
		onExit: function () {
			if (this._infoDialog) {
				this._infoDialog.destroy();
			}
			this._eventBus.unsubscribe("BaseController", "refreshDemandTable", this._triggerDemandFilter, this);
			this._eventBus.unsubscribe("AssignTreeDialog", "updateDemandTableSelection", this._deselectDemands, this);
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * add configuration to demand table
		 * @param oDataTable
		 * @private
		 */
		_configureDataTable: function (oDataTable) {
			// Row Action template to navigate to Detail page
			var onClickNavigation = this.onActionPress.bind(this),
				openActionSheet = this.openActionSheet.bind(this);

			oDataTable.setEnableBusyIndicator(true);
			oDataTable.setSelectionMode("MultiToggle");
			oDataTable.setEnableColumnReordering(false);
			oDataTable.setEnableCellFilter(false);
			oDataTable.setVisibleRowCountMode("Auto");

			this._setRowActionTemplate(oDataTable, onClickNavigation, openActionSheet);

			//enable/disable buttons on footer when there is some/no selected rows
			oDataTable.attachRowSelectionChange(function (oEvent) {
				var selected = this._oDataTable.getSelectedIndices(),
					bEnable = this.getModel("viewModel").getProperty("/validateIW32Auth"),
					sDemandPath, bComponentExist;
				var iMaxRowSelection = this.getModel("user").getProperty("/DEFAULT_DEMAND_SELECT_ALL");

				this._aSelectedRowsIdx = _.clone(selected);
				if (this._aSelectedRowsIdx.length > 0) {
					this._aSelectedRowsIdx.length = this._aSelectedRowsIdx.length > 0 && this._aSelectedRowsIdx.length <= iMaxRowSelection ? this._aSelectedRowsIdx
						.length : iMaxRowSelection;
				}
				if (this._aSelectedRowsIdx.length > 0 && this._aSelectedRowsIdx.length <= iMaxRowSelection) {
					this.byId("idfindRightTechnicianButton").setEnabled(true);
					this.byId("assignButton").setEnabled(bEnable);
					this.byId("changeStatusButton").setEnabled(bEnable);
					this.byId("idUnassignButton").setEnabled(bEnable);
					this.byId("idAssignmentStatusButton").setEnabled(bEnable);
					this.byId("idOverallStatusButton").setEnabled(true);
				} else {
					this.byId("idfindRightTechnicianButton").setEnabled(false);
					this.byId("assignButton").setEnabled(false);
					this.byId("changeStatusButton").setEnabled(false);
					this.byId("idAssignmentStatusButton").setEnabled(false);
					this.byId("idOverallStatusButton").setEnabled(false);
					this.byId("materialInfo").setEnabled(false);
					this.byId("idUnassignButton").setEnabled(false);
				}

				//If the selected demands exceeds more than the maintained selected configuration value
				if (iMaxRowSelection <= this._aSelectedRowsIdx.length) {
					var sMsg = this.getResourceBundle().getText("ymsg.maxRowSelection", [iMaxRowSelection]);
					if (oEvent.getParameter("selectAll")) {
						sMsg = this.getResourceBundle().getText("ymsg.allSelect", [iMaxRowSelection, this._aSelectedRowsIdx.length]);
					}
					this.showMessageToast(sMsg);
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

				this.showWarningMsgResourceTree(true);
			}, this);
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
				oDraggedControl = oDragSession.getDragControl(),
				aIndices = this._oDataTable.getSelectedIndices(),
				oSelectedPaths, aPathsData;
			this.getModel("viewModel").setProperty("/dragDropSetting/isReassign", false);

			// Set index of first visible row to avoid scrolling to top after drag n drop
			this.getModel("viewModel").setProperty("/iFirstVisibleRowIndex", this._oDataTable.getFirstVisibleRow());

			//Restricting selected demand list as per the global config select all property 
			aIndices = aIndices.slice(0, this.getModel("user").getProperty("/DEFAULT_DEMAND_SELECT_ALL"));

			oDragSession.setTextData("Hi I am dragging");
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
			this.getModel("viewModel").setProperty("/dragSession", aPathsData);
			if (oSelectedPaths && oSelectedPaths.aNonAssignable && oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
				oEvent.preventDefault();
			}
		},

		/**
		 * Refresh's the demand table
		 * @param sChanel
		 * @param sEvent event which is getting triggered
		 * @param oData Data passed while publishing the event
		 * @returns
		 * @private
		 */
		_triggerDemandFilter: function (sChanel, sEvent, oData) {
			this.showWarningMsgResourceTree(false);
			if (sEvent === "refreshDemandTable" && !this._bFirstTime) {
				this._oDraggableTable.rebindTable();
			}
			this._bFirstTime = false;
			this.getModel("viewModel").setProperty("/dragDropSetting/isReassign", false);
		},

		/**
		 * Event will triggered when the filter is initialized
		 * @param oEvent
		 */
		onInitialized: function (oEvent) {
			this._setDefaultFilters(oEvent.getSource());
		},
		/**
		 * Fetch filters from component data and set the initial filters to smart filterbar
		 * @param oFilterBar
		 * @private
		 */
		_setDefaultFilters: function (oFilterBar) {
			var oComponent = this.getOwnerComponent(),
				oStartupData = oComponent.getComponentData().startupParameters,
				oServiceMetadata = this.getModel().getServiceMetadata(),
				oSchema = oServiceMetadata.dataServices.schema[0],
				aEntityTypes = oSchema.entityType,
				oAnnotations = this.getModel().getServiceAnnotations(),
				oFilterData = {},
				bValueHelp = false,
				bTypeDate = false,
				aKeys, sKey, aValues, aRanges, aTexts;
			if (!oStartupData) {
				return;
			}
			aKeys = Object.keys(oStartupData);
			for (var i in aKeys) {
				sKey = aKeys[i];
				oFilterData[aKeys[i]] = {
					items: [],
					ranges: [],
					value: ""
				};

				bValueHelp = this._checkValueHelp(sKey, oAnnotations);
				bTypeDate = this._checkType(sKey, aEntityTypes);
				if (bValueHelp) {
					aValues = [];
					for (var j in oStartupData[sKey]) {
						aValues.push({
							key: oStartupData[sKey][j],
							text: oStartupData[sKey][j]
						});
					}
					oFilterData[aKeys[i]].items = aValues;
				} else if (bTypeDate) {
					aRanges = [];
					for (var k in oStartupData[sKey]) {
						aRanges.push({
							exclude: false,
							keyField: sKey,
							operation: "BT",
							value1: oStartupData[sKey][k],
							value2: oStartupData[sKey][k]
						});
					}
					oFilterData[aKeys[i]].ranges = aRanges;
				} else {
					aTexts = [];
					for (var l = 0; l < oStartupData[sKey].length - 1; l++) {
						aTexts.push({
							exclude: false,
							keyField: sKey,
							operation: "EQ",
							tokenText: "=" + oStartupData[sKey][l],
							value1: oStartupData[sKey][l]
						});
					}
					oFilterData[aKeys[i]].ranges = aTexts;
					oFilterData[aKeys[i]].value = oStartupData[sKey][oStartupData[sKey].length - 1];
				}
			}
			oFilterBar.setFilterData(oFilterData);
		},
		/**
		 * @Author Rahul
		 * Checks for the given key is there a value help or not
		 * Basically checking for ValueList annotaion
		 */
		_checkValueHelp: function (sKey, oAnnotations) {
			var oPropAnnotations = oAnnotations.propertyAnnotations,
				akeys = Object.keys(oPropAnnotations),
				sEntity = "com.evorait.evoplan.Demand";
			for (var i in akeys) {
				if (akeys[i] === sEntity) {
					if (oPropAnnotations[akeys[i]][sKey] && oPropAnnotations[akeys[i]][sKey]["com.sap.vocabularies.Common.v1.ValueList"]) {
						return true;
					} else {
						return false;
					}
				}
			}
			return false;
		},
		/**
		 * Checks the given key property type as Date or not
		 * @param sKey
		 * @param aEntityTypes
		 * @return {boolean}
		 * @private
		 */
		_checkType: function (sKey, aEntityTypes) {
			var sEntity = "Demand";
			for (var i in aEntityTypes) {
				if (aEntityTypes[i].name === sEntity) {
					for (var j in aEntityTypes[i].property) {
						if (aEntityTypes[i].property[j].name === sKey && (aEntityTypes[i].property[j].name.type === "Edm.DateTime" || aEntityTypes[i].property[
								j].name.type === "Edm.DateTimeOffset")) {
							return true;
						}
					}
				}
			}
			return false;
		},

		/**
		 * To Highlight Resources Based on Selected Demands
		 */
		onPressFindResource: function (oEvent) {
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			if (this._aSelectedRowsIdx.length > 100) {
				this._aSelectedRowsIdx.length = 100;
			}
			var oSelectedPaths = this._getAllowedDemandsToCheckResource(this._oDataTable, this._aSelectedRowsIdx),
				sRequirementProfileIds,
				sErrorMsg = this.getResourceBundle().getText("xmsg.findResourceNotAllowed");

			if (oSelectedPaths.aPathsData.length > 0) {
				sRequirementProfileIds = this.getFormattedReqProfileId(oSelectedPaths.aPathsData);
				this._eventBus.publish("FindTechnician", "filterToFindRightResource", {
					sRequirementProfileIds: sRequirementProfileIds
				});
			}
			if (oSelectedPaths.aNonAssignable.length > 0) {
				this._showAssignErrorDialog(oSelectedPaths.aNonAssignable, false, sErrorMsg);
			}
		},

		/**
		 * get Filters of Requirement Profile IDs of Selected Demands
		 */
		getFormattedReqProfileId: function (oData) {
			var aRequirementProfileIds = [];
			oData.forEach(function (entry) {
				if (entry.oData.REQUIREMENT_PROFILE_ID) {
					aRequirementProfileIds.push(new Filter("REQUIREMENT_PROFILE_ID", FilterOperator.EQ, entry.oData.REQUIREMENT_PROFILE_ID));
				}
			});
			return aRequirementProfileIds;
		},

		/**
		 * Validate Selected Demands Based on ALLOW_FINDRESOURCE Flag
		 */
		_getAllowedDemandsToCheckResource: function (oTable, aSelectedRowsIdx) {
			var aPathsData = [],
				aNonAssignableDemands = [],
				oData, oContext, sPath;
			oTable.clearSelection();
			for (var i = 0; i < aSelectedRowsIdx.length; i++) {
				oContext = oTable.getContextByIndex(aSelectedRowsIdx[i]);
				sPath = oContext.getPath();
				oData = this.getModel().getProperty(sPath);

				//on check on oData property ALLOW_ASSIGN when flag was given
				if (oData.ALLOW_FINDRESOURCE) {
					aPathsData.push({
						sPath: sPath,
						oData: oData,
						index: aSelectedRowsIdx[i]
					});
					oTable.addSelectionInterval(aSelectedRowsIdx[i], aSelectedRowsIdx[i]);
				} else {
					aNonAssignableDemands.push(this.getMessageDescWithOrderID(oData));
				}
			}
			return {
				aPathsData: aPathsData,
				aNonAssignable: aNonAssignableDemands
			};
		},
		/**
		 * Resetting resource tree when Demand Filter changed to clear highlighted resources 
		 * 
		 */
		onDemandFilterChange: function () {
			var oViewModel = this.getModel("viewModel");
			if (oViewModel.getProperty("/CheckRightTechnician")) {
				oViewModel.setProperty("/CheckRightTechnician", false);
				this._eventBus.publish("FindTechnician", "setBusyResourceTree");
			}
		},

		/**
		 * Resetting Demand selection based on not allowed for find technician 
		 */
		_deselectDemands: function (sChannel, oEvent, oData) {
			var oSelectedIndices = this._oDataTable.getSelectedIndices(),
				sDemandPath;
			for (var i = 0; i < oSelectedIndices.length; i++) {
				sDemandPath = this._oDataTable.getContextByIndex(oSelectedIndices[i]).getPath();
				if (oData.oDeselectAssignmentsContexts.includes(sDemandPath)) {
					this._oDataTable.removeSelectionInterval(oSelectedIndices[i], oSelectedIndices[i]);
				}
			}
		},

	});
});