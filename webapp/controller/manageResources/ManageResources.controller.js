sap.ui.define([
	"com/evorait/evoplan/controller/manageResources/ManageResourceActionsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem",
	"sap/m/MessageBox",
], function (ManageResourceActionsController, formatter, Filter, FilterOperator, Fragment,
	MessageToast, RowAction, RowActionItem, MessageBox) {
	"use strict";
	var sAssignmentsPath = "/manageResourcesSettings/Assignments";
	return ManageResourceActionsController.extend("com.evorait.evoplan.controller.manageResources.ManageResources", {
		formatter: formatter,

		onInit: function () {
			this._oEvoplanResourceTable = this.getView().byId("idTableEvoplanResources").getTable();
			this._oEvoplanResourceTable.attachBusyStateChanged(this.onBusyStateChanged, this);
			this.oHrResourceTable = this.getView().byId("idTableHrResources").getTable();
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("ManageResourcesController", "refreshManageResourcesView", this._refreshManageResourcesView, this);
			this.getRouter().getRoute("manageResources").attachPatternMatched(function () {
				this._mParameters = {
					bFromManageResource: true
				};
			}.bind(this));
			this.onInitResourceActionController();
		},
		/**
		 * bind resource tree table only when filterbar was initalized
		 * @param oEvent
		 */
		onBeforeRebindTable: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oBinding = oParams.bindingParams,
				oUserModel = this.getModel("user"),
				oMatchType = this.byId("resourceMngFilter").getSelectedKey(),
				aFilter;
				
				if (oMatchType === "past") {
				oBinding.filters = [new Filter("End", FilterOperator.LT, new Date())];
			} else if (oMatchType === "future") {
				oBinding.filters = [new Filter("Start", FilterOperator.GE, new Date().setHours(0,0,0))];
			} else {
				oBinding.filters = [];
			}

			if (!this.isLoaded) {
				this.isLoaded = true;
			}
			// Bug fix for some time tree getting collapsed
			oBinding.parameters.numberOfExpandedLevels = 0; //oUserModel.getProperty("/RESOURCE_TREE_EXPAND") ? 1 : 0;

		},
		/**
		 * Defining and initianlizing required Global parameters after rendering the page
		 * @param 
		 */
		onAfterRendering: function () {
			this._setRowActionTemplate();
			this._oModel = this.getModel();
			this._oViewModel = this.getView().getModel("viewModel");
			this._oAppViewModel = this.getView().getModel("appView");
			this._oResourceBundle = this.getResourceBundle();
			this._oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-ddTHH:mm:ss"
			});
		},

		/**
		 * Setting row Action buttons for Deleting/Editing the row (Group/Resource)
		 */
		_setRowActionTemplate: function () {
			var oTemplate = this._oEvoplanResourceTable.getRowActionTemplate(),
				oResourceBundle = this.getModel("i18n").getResourceBundle();
			if (oTemplate) {
				oTemplate.destroy();
				oTemplate = null;
			}
			oTemplate = new RowAction({
				items: [
					new RowActionItem({
						icon: "sap-icon://edit",
						text: oResourceBundle.getText("xtol.editBtn"),
						press: this._onPressEditButton.bind(this)
					})
				]
			});
			oTemplate.addItem(new RowActionItem({
				icon: "sap-icon://delete",
				text: oResourceBundle.getText("xtol.deleteBtn"),
				press: this._onPressDeleteButton.bind(this),
				visible: {
					path: "NodeType",
					formatter: formatter.setVisibilityDeleteButton
				}
			}));
			this._oEvoplanResourceTable.setRowActionTemplate(oTemplate);
			this._oEvoplanResourceTable.setRowActionCount(oTemplate.getItems().length);
		},
		/**
		 * Dragging from Evoplan Resources Table
		 */
		onStartDragEvoplanGroups: function (oEvent) {
			var nDraggedItemIndex = oEvent.getParameter("target").getIndex(),
				oDraggedItemContext = this._oEvoplanResourceTable.getContextByIndex(nDraggedItemIndex),
				sNodeType = oDraggedItemContext.getProperty("NodeType");
			if (sNodeType === "RES_GROUP") {
				MessageToast.show("Group Can't be Dragged!");
				oEvent.preventDefault();
			}
		},
		/**
		 * Dragging from Evoplan Resources Table
		 */
		onDropIntoEvoplanGroups: function (oEvent) {
			//Dragged data(Source) variables
			var oSourceItem = oEvent.getParameter("draggedControl"),
				nSourceItemIndex = oSourceItem.getIndex(),
				sSourceControlId = oSourceItem.getParent().getId(),
				sSourceItemPath,
				aSourceData,
				aPayLoad;

			//Dropped position(target) variables
			var oTargetItem = oEvent.getParameter("droppedControl"),
				oTargetItemContext = this._oEvoplanResourceTable.getContextByIndex(oTargetItem.getIndex()),
				oTargetItemData = oTargetItemContext.getObject(),
				oTargetItemPath = oTargetItemContext.getPath(),
				sTargetGroupNodeId = oTargetItemData.ParentNodeId ? oTargetItemData.ParentNodeId : oTargetItemData.NodeId;

			//Condition to check the Source Table whether it is from Evoplan Group or HR Resources 
			if (sSourceControlId.includes("idDataTableHrResource")) {
				// this._assignResourcesToGroup(oEvent, sTargetGroupNodeId);// Currently is in progress
				sSourceItemPath = this.oHrResourceTable.getContextByIndex(nSourceItemIndex).getPath();
				aSourceData = this._oModel.getProperty(sSourceItemPath);
				aPayLoad = {
					ChildCount: 0,
					Description: aSourceData.Firstname + " " + aSourceData.Lastname,
					Drillstate: "leaf",
					End: this.getDefaultDate(true),
					HierarchyLevel: 1,
					NodeId: sTargetGroupNodeId + "//" + aSourceData.Guid,
					NodeType: "RESOURCE",
					ParentNodeId: sTargetGroupNodeId,
					ResourceGroupGuid: sTargetGroupNodeId,
					ResourceGuid: aSourceData.Guid,
					Start: this.getDefaultDate()
				};
				this._handleCreateResource(oTargetItemPath, sSourceItemPath, aPayLoad, true);
			} else {
				sSourceItemPath = this._oEvoplanResourceTable.getContextByIndex(nSourceItemIndex).getPath();
				aPayLoad = this._oModel.getProperty(sSourceItemPath);
				aPayLoad.NodeId = sTargetGroupNodeId + "//" + aPayLoad.ResourceGuid;
				aPayLoad.ParentNodeId = sTargetGroupNodeId;
				aPayLoad.ResourceGroupGuid = sTargetGroupNodeId;
				aPayLoad.End = this.getDefaultDate(true);
				aPayLoad.Start = this.getDefaultDate();
				this._handleCreateResource(oTargetItemPath, sSourceItemPath, aPayLoad);
			}
		},
		/**
		 * handle mass assignment of resources to Group ( THIS DEVELOPMENT IS IN PROGRESS)
		 */
		_assignResourcesToGroup: function (oEvent, sTargetGroupNodeId) {
			var aSelectedIndices = this.oHrResourceTable.getSelectedIndices(),
				sPath = this._oEvoplanResourceTable.getBinding().getPath(),
				oStartDate = this.getDefaultDate(),
				oEndDate = this.getDefaultDate(true),
				aPayLoad = [],
				aSourceData;

			for (var i in aSelectedIndices) {
				aSourceData = this.oHrResourceTable.getContextByIndex(aSelectedIndices[i]).getObject();

				aPayLoad.push({
					ChildCount: 0,
					Description: aSourceData.Firstname + " " + aSourceData.Lastname,
					Drillstate: "leaf",
					End: oEndDate,
					HierarchyLevel: 1,
					NodeId: sTargetGroupNodeId + "//" + aSourceData.Guid,
					NodeType: "RESOURCE",
					ParentNodeId: sTargetGroupNodeId,
					ResourceGroupGuid: sTargetGroupNodeId,
					ResourceGuid: aSourceData.Guid,
					Start: oStartDate
				});
				// this._handleCreateResource(oTargetItemPath, sSourceItemPath, aPayLoad, true);
			}
			for (i in aPayLoad) {
				this.doCreateResource(this.getModel(), sPath, aPayLoad[i]) //.then(function (oResponse) {}.bind(this));
			}

			// this.doCreateResource(this.getModel(), sPath, aPayLoad) //.then(function (oResponse) {}.bind(this));
			// aSourceData = this._oModel.getProperty(sSourceItemPath);
			// aPayLoad = {
			// 	ChildCount: 0,
			// 	Description: aSourceData.Firstname + " " + aSourceData.Lastname,
			// 	Drillstate: "leaf",
			// 	End: this.getDefaultDate(true),
			// 	HierarchyLevel: 1,
			// 	NodeId: sTargetGroupNodeId + "//" + aSourceData.Guid,
			// 	NodeType: "RESOURCE",
			// 	ParentNodeId: sTargetGroupNodeId,
			// 	ResourceGroupGuid: sTargetGroupNodeId,
			// 	ResourceGuid: aSourceData.Guid,
			// 	Start: this.getDefaultDate()
			// };
			// this._handleCreateResource(oTargetItemPath, sSourceItemPath, aPayLoad, true);
		},
		/**
		 * While assigning HR resource to any Group,provid Default date Date range starting from current Date  
		 */
		getDefaultDate: function (bEndDate) {
			if (bEndDate) {
				// var oCurrentDate = new Date(),
				// 	oEndData = oCurrentDate.setDate(oCurrentDate.getDate() + 30);
				var oEndData = this.getModel("user").getProperty("/RES_MGMT_END_DATE");
				return this._oDateFormat.format(new Date(oEndData));
			}
			return this._oDateFormat.format(new Date());
		},
		/**
		 * Copy/Move to the Evoplan Group 
		 */
		_handleCreateResource: function (sPath, sSourceItemPath, aPayload, bIsFromHr) {
			var sEntitySetName = sPath.split("(")[0],
				isCopy = this.getView().byId("idSwitchResourceAction").getState();

			this.mTreeState = this._getTreeState();
			if (isCopy || bIsFromHr) {
				this.doCreateResource(this.getModel(), sEntitySetName, aPayload).then(function (oResponse) {}.bind(this));
			} else {
				this.doDeleteResource(this._oModel, sSourceItemPath, true).then(function (oResponse) {
					this.doCreateResource(this.getModel(), sEntitySetName, aPayload).then(function (oResponse) {}.bind(this));
				}.bind(this));
			}
		},
		/**
		 * Dragging from HR Resources Table
		 */
		onStartDragHrResources: function (oEvent) {
			// MessageToast.show("Drag Started from HR Resources Table");
		},

		/**
		 * Refresh Manage Resource Page.
		 */
		_refreshManageResourcesView: function () {
			var oEvoplanTable = this.getView().byId("idTableEvoplanResources");
			var oHrResourcesTable = this.getView().byId("idTableHrResources");
			this.mTreeState = this._getTreeState();
			oEvoplanTable.rebindTable();
			oHrResourcesTable.rebindTable();
		},

		/**
		 * Handle Delete Resource on press of "Delete" Action button from Tree table.
		 */
		_onPressDeleteButton: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext(),
				sPath = oContext.getPath(),
				sNodeId = oContext.getProperty("NodeId"),
				oStart = oContext.getProperty("Start"),
				oEnd = oContext.getProperty("End"),
				aParameters = {
					ObjectId: sNodeId,
					StartTimestamp: oStart,
					EndTimestamp: oEnd
				}

			this.mTreeState = this._getTreeState();

			this._showConfirmMessageBox(this.getResourceBundle().getText("ymsg.warningDeleteResource")).then(function (value) {
				if (value === "YES") {
					this._oAppViewModel.setProperty("/busy", true);
					this.executeFunctionImport(this._oModel, aParameters, "ValidateResourceMgmtAssignment", "POST").then(function (oData,
						response) {
						this._oAppViewModel.setProperty("/busy", false);
						if (oData.results && oData.results.length) {
							this._oViewModel.setProperty(sAssignmentsPath, oData.results);
							this.showResourceAssignments(oContext);

						} else {
							this.doDeleteResource(this._oModel, sPath).then(function (oResponse) {
								// this.showResponseMessage(oResponse.headers.message, oResponse.headers.message_type);
							}.bind(this));
						}

					}.bind(this));

				}
			}.bind(this));
		},
		/**
		 * Convert GMT date (Coming from Backend) to UTC date Format.
		 *  @param oSelectedRow containing the dates
		 *  @param bUTC Specifies to be converted in UTC or not
		 */
		convertDateToUTC: function (oSelectedRow, bUTC) {
			if (oSelectedRow.Start && oSelectedRow.Start) {
				oSelectedRow.End = new Date(this._oDateFormat.format(oSelectedRow.End, bUTC));
				oSelectedRow.Start = new Date(this._oDateFormat.format(oSelectedRow.Start, bUTC));
			}
			return oSelectedRow;
		},
		/**
		 * Handle Edit Geoup/Resource on press of "Edit" Action button from Tree table.
		 */
		_onPressEditButton: function (oEvent) {
			var oButton = oEvent.getSource().getParent(),
				oView = this.getView(),
				sNodeType = oEvent.getSource().getBindingContext().getProperty("NodeType"),
				sPath = "/manageResourcesSettings/selectedRow",
				oSelectedRow;

			this._oSelectedContext = oEvent.getSource().getBindingContext();

			oSelectedRow = this._oSelectedContext.getObject();
			if (oSelectedRow.NodeType === "RESOURCE") {
				oSelectedRow = this.convertDateToUTC(oSelectedRow, true);
			}

			this._oViewModel.setProperty(sPath, oSelectedRow);

			if (!this._oEditFormPopover) {
				this._oEditFormPopover = Fragment.load({
					id: oView.getId(),
					name: "com.evorait.evoplan.view.manageResources.fragments.EditGroupResource",
					controller: this
				}).then(function (oEditFormPopover) {
					oView.addDependent(oEditFormPopover);
					oEditFormPopover.setModel(this._oViewModel);
					return oEditFormPopover;
				}.bind(this));
			}
			this._oEditFormPopover.then(function (oEditFormPopover) {
				oEditFormPopover.bindElement(sPath);
				oEditFormPopover.openBy(oButton);
			}.bind(this));
			// this.handleUpdateResource(this._oModel, this._oSelectedContext.getPath);
		},
		/**
		 * validation for saving the updated values for Group or Resource.
		 */
		isDataChanged: function (oSelectedRow, oUpdatedRow) {
			if (oSelectedRow.NodeType === "RES_GROUP" && oUpdatedRow.Description !== oSelectedRow.Description) {
				return true;
			} else if (oSelectedRow.NodeType === "RESOURCE" && (oUpdatedRow.Start.toString() !== oSelectedRow.Start.toString() || oUpdatedRow.End
					.toString() !== oSelectedRow.End.toString())) {
				return true;
			} else {
				return false;
			}
		},
		/**
		 * Handle Update Group/Resource on press of "Save" button from Edit Popover.
		 */
		onPressPopoverSaveButton: function () {
			var oUpdatedRow = this._oViewModel.getProperty("/manageResourcesSettings/selectedRow"),
				oSelectedRow = this._oSelectedContext.getObject(),
				oSelectedPath = this._oSelectedContext.getPath(),
				sNodeType = oSelectedRow.NodeType;

			oSelectedRow = this.convertDateToUTC(oSelectedRow, true)
			if (this.isDataChanged(oSelectedRow, oUpdatedRow)) {
				if (sNodeType === "RESOURCE") {
					oUpdatedRow.Start = this._oDateFormat.format(oUpdatedRow.Start);
					oUpdatedRow.End = this._oDateFormat.format(oUpdatedRow.End);
				}
				this.doUpdateResource(this._oModel, oSelectedPath, oUpdatedRow).then(function (oResponse) {
					this._updateContext(oUpdatedRow);
				}.bind(this));

			} else {
				MessageToast.show(this._oResourceBundle.getText("ymsg.noChange"));
			}
			this.onPressPopoverCloseButton();
		},
		/**
		 * Applying updated changes without refreshing the table.
		 */
		_updateContext: function (oUpdatedRow) {
			var sNodeType = this._oSelectedContext.getProperty("NodeType"),
				sPath = this._oSelectedContext.getPath(),
				oRow = this._oModel.getProperty(sPath);
			if (sNodeType === "RES_GROUP") {
				oRow.Description = oUpdatedRow.Description;
			} else {
				this.getOwnerComponent()._getData(sPath).then(function (result) {
					oRow.Start = result.Start;
					oRow.End = result.End;
				}.bind(this));
			}
			this.getOwnerComponent()._getData(sPath.split("(")[0]).then(function (result) {}.bind(this));
		},
		/**
		 * Close Edit Popover.
		 */
		onPressPopoverCloseButton: function () {
			this._oEditFormPopover.then(function (oEditFormPopover) {
				oEditFormPopover.unbindElement();
				oEditFormPopover.close();
			}.bind(this));
		},
		/**
		 * map the current tree state with expand and collapse on each level
		 * before tree is doing a new GET request
		 * @private
		 */
		_getTreeState: function () {
			var oBindings = this._oEvoplanResourceTable.getBinding(),
				aNodes = oBindings.getNodes(),
				oCollection = {};

			for (var i = 0; i < aNodes.length; i++) {
				oCollection[aNodes[i].key] = {
					path: aNodes[i].key,
					level: aNodes[i].level,
					nodeState: aNodes[i].nodeState
				};
			}
			return oCollection;
		},
		/**
		 * initial draggable after every refresh of table
		 * for example after go to next page
		 * @param oEvent
		 */
		onBusyStateChanged: function (oEvent) {
			var parameters = oEvent.getParameters();
			if (parameters.busy === false) {
				if (this.mTreeState && Object.keys(this.mTreeState).length > 0) {
					this._restoreTreeState();
				}
			}
		},
		/**
		 * After Resource tree GET request restore the expand/collapse state
		 * from before refresh
		 * @private
		 */
		_restoreTreeState: function () {
			var oBindings = this._oEvoplanResourceTable.getBinding(),
				aNodes = oBindings.getNodes(),
				expandIdx = [],
				collapseIdx = [];

			for (var j = 0; j < aNodes.length; j++) {
				if (this.mTreeState[aNodes[j].key] && !aNodes[j].nodeState.isLeaf) {
					if (!aNodes[j].nodeState.expanded && this.mTreeState[aNodes[j].key].nodeState.expanded) {
						expandIdx.push(j);
						delete this.mTreeState[aNodes[j].key];
					} else if (!aNodes[j].nodeState.collapsed && this.mTreeState[aNodes[j].key].nodeState.collapsed) {
						collapseIdx.push(j);
					}
				}
			}
			if (expandIdx.length > 0) {
				this._oEvoplanResourceTable.expand(expandIdx);
			} else if (collapseIdx.length > 0) {
				this._oEvoplanResourceTable.collapse(collapseIdx);
			} else {
				this.mTreeState = {};
			}
		},
		onResourceMngFilterSelectionChange: function(oEvent)
		{
			var oEvoplanTable = this.getView().byId("idTableEvoplanResources");
			oEvoplanTable.rebindTable();
		},
		/**
		 * destroy contents on Exit
		 * @param 
		 */
		onExit: function () {
			this._oEventBus.unsubscribe("ManageResourcesController", "refreshManageResourcesView", this._refreshManageResourcesView, this);
			this.onExitResourceActionController();
		}
	});

});