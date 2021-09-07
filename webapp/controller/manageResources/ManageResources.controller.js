sap.ui.define([
	"com/evorait/evoplan/controller/manageResources/ManageResourceActionsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem",
	"sap/m/MessageBox"
], function (ManageResourceActionsController, formatter, Filter, FilterOperator, Fragment,
	MessageToast, RowAction, RowActionItem, MessageBox) {
	"use strict";
	var sAssignmentsPath = "/manageResourcesSettings/Assignments",
		sOperationTypePath = "/manageResourcesSettings/operationType";
	return ManageResourceActionsController.extend("com.evorait.evoplan.controller.manageResources.ManageResources", {
		formatter: formatter,
		_bFirsrTime: true,
		onInit: function () {
			this._oEvoplanResourceTable = this.getView().byId("idTableEvoplanResources").getTable();
			this._oEvoplanResourceTable.attachBusyStateChanged(this.onBusyStateChanged, this);
			this.oHrResourceTable = this.getView().byId("idTableHrResources").getTable();
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("ManageResourcesController", "refreshManageResourcesView", this._refreshManageResourcesView, this);
			this.getRouter().getRoute("manageResources").attachPatternMatched(function () {
				this._triggerRefreshEvoPlanGroupTree();
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
				aFilter,
				sCurrentDate = this._oDateFormatDateOnly.format(new Date());
			new Filter({
				filters: [new Filter("End", FilterOperator.LT, new Date())],
				and: false
			})

			if (oMatchType === "past") {
				oBinding.filters.push(new Filter({
					filters: [new Filter("End", FilterOperator.LT, sCurrentDate)],
					and: false
				}));
			} else if (oMatchType === "future") {
				oBinding.filters.push(new Filter({
					filters: [new Filter("Start", FilterOperator.GE, sCurrentDate)],
					and: false
				}));
			}

			if (!this.isLoaded) {
				this.isLoaded = true;
			} else {
				this.mTreeState = this._getTreeState();
			}
			// Bug fix for some time tree getting collapsed
			// oBinding.parameters.numberOfExpandedLevels = 1; //oUserModel.getProperty("/ENABLE_RESOURCE_TREE_EXPAND") ? 1 : 0;

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
			this._oDateFormatDateOnly = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});

		},
		/**
		 * On click on expand the tree nodes gets expand to level 1
		 * On click on collapse all the tree nodes will be collapsed to root.
		 * @param oEvent
		 */
		onClickExpandCollapse: function (oEvent) {
			var oButton = oEvent.getSource(),
				oCustomData = oButton.getCustomData();
			if (oCustomData[0].getValue() === "EXPAND" && this._oEvoplanResourceTable) {
				this._oEvoplanResourceTable.expandToLevel(1);
			} else {
				this._oEvoplanResourceTable.collapseAll();
			}
		},
		/**
		 * Method will refresh the data of tree by restoring its state
		 */
		_triggerRefreshEvoPlanGroupTree: function () {
			if (!this._bFirsrTime) {
				this._refreshManageResourcesView();
			}
			this._bFirsrTime = false;
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
				MessageToast.show(this._oResourceBundle.getText("ymsg.errGroupDrag"));
				oEvent.preventDefault();
			} else {
				this._oViewModel.setProperty("/manageResourcesSettings/draggedItemContext", oDraggedItemContext);
			}
		},
		/**
		 * Dragging from Evoplan Resources Table
		 */
		onDropIntoEvoplanGroups: function (oEvent) {
			//Dragged data(Source) variables
			var oSourceItemContext = this._oViewModel.getProperty("/manageResourcesSettings/draggedItemContext"),
				sSourceItemPath = oSourceItemContext.getPath(),
				aPayLoad;

			//Dropped position(target) variables
			var oTargetItemContext = oEvent.getParameter("droppedControl").getBindingContext(),
				oTargetItemData = oTargetItemContext.getObject(),
				oTargetItemPath = oTargetItemContext.getPath(),
				sTargetGroupNodeId = oTargetItemData.ParentNodeId ? oTargetItemData.ParentNodeId : oTargetItemData.NodeId;

			this._oSelectedNodeContext = oSourceItemContext;
			aPayLoad = this.getPayload(this._oSelectedNodeContext.getObject(), sTargetGroupNodeId);
			this._aPayLoad = aPayLoad;
			this._handleCreateResource(oTargetItemPath, sSourceItemPath, aPayLoad);
		},

		/**
		 * Preparing payload for Copy / Move Resource
		 */
		getPayload: function (oSelectedNode, sTargetGroupNodeId) {
			return {
				AssignmentCount: oSelectedNode.AssignmentCount,
				ChildCount: oSelectedNode.ChildCount,
				Description: oSelectedNode.Description,
				Drillstate: oSelectedNode.Drillstate,
				End: this.getDefaultDate(true),
				HierarchyLevel: 1,
				NodeId: sTargetGroupNodeId + "//" + oSelectedNode.ResourceGuid,
				NodeType: "RESOURCE",
				ParentNodeId: sTargetGroupNodeId,
				ResourceGroupGuid: sTargetGroupNodeId,
				ResourceGuid: oSelectedNode.ResourceGuid,
				Start: this.getDefaultDate()
			};
		},
		/**
		 * handle mass assignment of resources to Group ( THIS DEVELOPMENT IS IN PROGRESS)
		 */
		assignResourcesToGroup: function (oEvent) {
			var oTargetObject = oEvent.getParameter("droppedControl").getBindingContext().getObject(),
				sTargetGroupNodeId = oTargetObject.ParentNodeId ? oTargetObject.ParentNodeId : oTargetObject.NodeId,
				aSelectedIndices = this.oHrResourceTable.getSelectedIndices(),
				sPath = this._oEvoplanResourceTable.getBinding().getPath(),
				oStartDate = this.getDefaultDate(),
				oEndDate = this.getDefaultDate(true),
				aPayLoad = [],
				aSourceData,
				oModel = this.getModel();
			this.mTreeState = this._getTreeState();
			this.clearMessageModel();
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
			}
			for (i in aPayLoad) {
				this.doCreateResource(this.getModel(), sPath, aPayLoad[i]).then(function (oResponse) {});
				// var sEntryPath = "/ResourceManagementSet('" + aPayLoad[i].NodeId + "')";
				// var sEntryPath = "/ResourceManagementSet";
				// this._oEvoplanResourceTable.getBinding().createEntry(sEntryPath, {
				// 	properties: aPayLoad[i]
				// });

				// var sEntryPath = "/ResourceManagementSet",
				// 	// oEntryContext = new sap.ui.model.Context(oModel, sEntryPath);
				// var oEntryContext = this.getModel().createEntry(sEntryPath, {
				// 		// context: oEntryContext,
				// properties: aPayLoad[i]
				// 			// ,
				// 			// success: function (oData, oRes) {
				// 			// 	aletrt("Suc");
				// 			// },
				// 			// error: function (oErr) {
				// 			// 	aletrt("Err");
				// 			// }
				// });
				// this._oEvoplanResourceTable.refreshRows();

				// this._oEvoplanResourceTable.invalidate();

				// this._oEvoplanResourceTable.rerender();

				// oModel.refresh();

				// this._oEvoplanResourceTable.refreshAggregation("rows", sap.ui.model.ChangeReason.Add);

				// this.getModel().createBindingContext(sEntryPath, oEntryContext );

				// this._oEvoplanResourceTable.setBindingContext(oEntryContext);

				// oModel.submitChanges();

				// }.bind(this));

				// this._oEvoplanResourceTable.getRows()
				// var oNewRow = new sap.ui.table.Row("idABC", oEntryContext.getObject());
				// var oNewRow = new sap.ui.table.Row("idABC", oEntryContext.getObject());
			}
			// remove Selections after Create
			this.oHrResourceTable.clearSelection();
		},
		/**
		 * While assigning HR resource to any Group,provid Default date Date range starting from current Date  
		 */
		getDefaultDate: function (bEndDate) {
			if (bEndDate) {
				var oEndData = this.getModel("user").getProperty("/DEFAULT_RES_MGMT_END_DATE");
				return this._oDateFormat.format(new Date(oEndData));
			}
			return this._oDateFormat.format(new Date());
		},
		/**
		 * Copy/Move to the Evoplan Group 
		 */
		_handleCreateResource: function (sPath, sSourceItemPath, aPayload) {
			var sEntitySetName = sPath.split("(")[0],
				isCopy = this.getView().byId("idSwitchResourceAction").getState();
			this.clearMessageModel();
			this.mTreeState = this._getTreeState();
			if (isCopy) {
				this.doCreateResource(this.getModel(), sEntitySetName, aPayload).then(function (oResponse) {}.bind(this));
				// this.doCreateResource(this.getModel(), sEntitySetName, aPayload).then(function (oResponse) {}.bind(this));
			} else if (!aPayload.AssignmentCount) {
				this.doDeleteResource(this._oModel, sSourceItemPath, true).then(function (oResponse) {
					this.doCreateResource(this.getModel(), sEntitySetName, aPayload).then(function (oResponse) {}.bind(this));
					// this.doCreateResource(this.getModel(), sEntitySetName, aPayload).then(function (oResponse) {}.bind(this));
				}.bind(this));
			} else {
				this._callAssignmentsPopUp("moveResource");
			}
		},

		/**
		 * Show Assignment dialog before Move / Delete / Update Resource 
		 */
		_callAssignmentsPopUp: function (sOperationType) {
			var aParameters = {
				ObjectId: this._oSelectedNodeContext.getProperty("NodeId")
			}
			if (sOperationType === "updateResource") {
				aParameters.StartTimestamp = this._aPayLoad.Start;
				aParameters.EndTimestamp = this._aPayLoad.End;

			}
			this._oAppViewModel.setProperty("/busy", true);
			this._oViewModel.setProperty(sOperationTypePath, sOperationType);
			this.executeFunctionImport(this._oModel, aParameters, "ValidateResourceMgmtAssignment", "POST").then(function (oData,
				response) {
				this._oAppViewModel.setProperty("/busy", false);
				if (oData.results && oData.results.length) {
					this._oViewModel.setProperty(sAssignmentsPath, oData.results);
					this.showResourceAssignments(this._oSelectedNodeContext);
				} else if (sOperationType === "updateResource") {
					this._aPayLoad.Start = this._oDateFormat.format(new Date(new Date(this._aPayLoad.Start).setHours(0, 0, 0)));
					this._aPayLoad.End = this._oDateFormat.format(new Date(new Date(this._aPayLoad.End).setHours(23, 59, 59)));
					this.proceedToUpdate(this._oSelectedNodeContext.getPath(), this._aPayLoad);
				}
			}.bind(this));
		},
		/**
		 * Dragging from Resources Table
		 */
		onStartDragResources: function (oEvent) {
			var oSelectedIndices = this.oHrResourceTable.getSelectedIndices();
			if (!oSelectedIndices.length) {
				this.oHrResourceTable.setSelectedIndex(oEvent.getParameter("target").getIndex());
			}
		},

		/**
		 * Refresh Manage Resource Page.
		 */
		_refreshManageResourcesView: function () {
			var oEvoplanTable = this.getView().byId("idTableEvoplanResources");
			var oHrResourcesTable = this.getView().byId("idTableHrResources");
			oEvoplanTable.rebindTable();
			oHrResourcesTable.rebindTable();
		},

		/**
		 * Handle Delete Resource on press of "Delete" Action button from Tree table.
		 */
		_onPressDeleteButton: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext(),
				sPath = oContext.getPath(),
				nAssignmentCount = oContext.getProperty("AssignmentCount");

			this._oSelectedNodeContext = oContext;
			this._showConfirmMessageBox(this.getResourceBundle().getText("ymsg.warningDeleteResource")).then(function (value) {
				if (value === "YES") {
					this.clearMessageModel();
					this.mTreeState = this._getTreeState();
					if (nAssignmentCount) {
						this._callAssignmentsPopUp("deleteResource");
					} else {
						this.doDeleteResource(this._oModel, sPath).then(function (oResponse) {}.bind(this));
					}
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
					this.oResourceDateRange = this.getView().byId("idResourceDateRange");
					return oEditFormPopover;
				}.bind(this));
			}
			this._oEditFormPopover.then(function (oEditFormPopover) {
				this.oResourceDateRange.setValueState("None");
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
			} else if (oSelectedRow.NodeType === "RESOURCE" && (oUpdatedRow.Start.toString() !== oSelectedRow.Start.toString() || oUpdatedRow
					.End
					.toString() !== oSelectedRow.End.toString())) {
				return true;
			} else {
				return false;
			}
		},
		handleDateChange: function (oEvent) {
			var bValidDateRange = oEvent.getParameter("valid");
			if (bValidDateRange) {
				this.oResourceDateRange.setValueState("None");
			} else {
				this.oResourceDateRange.setValueState("Error");
				MessageToast.show(this._oResourceBundle.getText("ymsg.invalidDateRange"));
			}
		},
		/**
		 * Handle Update Group/Resource on press of "Save" button from Edit Popover.
		 */
		onPressPopoverSaveButton: function () {
			var oUpdatedJSONData = this._oViewModel.getProperty("/manageResourcesSettings/selectedRow"),
				oUpdatedRow = JSON.parse(JSON.stringify(oUpdatedJSONData)),
				// var oUpdatedRow = this._oViewModel.getProperty("/manageResourcesSettings/selectedRow"),
				oSelectedRow = this._oSelectedContext.getObject(),
				sSelectedPath = this._oSelectedContext.getPath(),
				sNodeType = oSelectedRow.NodeType;
			this.clearMessageModel();
			oUpdatedRow.Start = oUpdatedJSONData.Start;
			oUpdatedRow.End = oUpdatedJSONData.End;
			if (sNodeType === "RESOURCE" && this.oResourceDateRange.getValueState() !== "None") {
				MessageToast.show(this._oResourceBundle.getText("ymsg.invalidDateRange"));
				return;
			}
			oSelectedRow = this.convertDateToUTC(oSelectedRow, true)
			if (this.isDataChanged(oSelectedRow, oUpdatedRow)) {
				if (sNodeType === "RESOURCE") {
					if (oSelectedRow.AssignmentCount) {
						this._oSelectedNodeContext = this._oSelectedContext;
						this._aPayLoad = oUpdatedRow;
						this.onPressPopoverCloseButton();
						oUpdatedRow.Start = this._oDateFormat.format(new Date(oUpdatedRow.Start.setHours(0, 0, 0)));
						oUpdatedRow.End = this._oDateFormat.format(new Date(oUpdatedRow.End.setHours(23, 59, 59)));
						this._callAssignmentsPopUp("updateResource");
					} else {
						oUpdatedRow.Start = this._oDateFormat.format(oUpdatedRow.Start);
						oUpdatedRow.End = this._oDateFormat.format(oUpdatedRow.End);
						this.proceedToUpdate(sSelectedPath, oUpdatedRow);
					}
				} else {
					this.proceedToUpdate(sSelectedPath, oUpdatedRow);
				}

			} else {
				MessageToast.show(this._oResourceBundle.getText("ymsg.noChange"));
			}
			this.onPressPopoverCloseButton();
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
				// this._oEvoplanResourceTable.collapse(collapseIdx);
			} else {
				// //this.mTreeState = this._getTreeState();= {};
			}
		},
		onResourceMngFilterSelectionChange: function (oEvent) {
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