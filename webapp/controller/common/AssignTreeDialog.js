sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment"
], function (BaseController, models, formatter, Filter, FilterOperator, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.AssignTreeDialog", {

		formatter: formatter,

		init: function () {
			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("AssignInfoDialog", "selectAssign", this._triggerOpenDialog, this);
			this._eventBus.subscribe("AssignActionsDialog", "selectAssign", this._triggerOpenDialog, this);
		},

		open: function (oView, isReassign, aSelectedPaths, isBulkReAssign, mParameters, callbackEvent, isToolReAssign) {
			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.AssignSelectDialog",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(oDialog, oView, isReassign, aSelectedPaths, isBulkReAssign, mParameters, callbackEvent, isToolReAssign);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, isReassign, aSelectedPaths, isBulkReAssign, mParameters, callbackEvent, isToolReAssign);
			}
		},
		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 * @param isBulkReAssign - To Identify the action for the dialog is getting opened.
		 */
		onOpen: function (oDialog, oView, isReassign, aSelectedPaths, isBulkReAssign, mParameters, callbackEvent, isToolReAssign) {
			this._oView = oView;
			this._reAssign = isReassign;
			this._aSelectedPaths = aSelectedPaths;
			this._bulkReAssign = isBulkReAssign;
			this._isToolReAssign = isToolReAssign;
			this._mParameters = mParameters || {
				bFromHome: true
			};
			this._callbackEvent = callbackEvent;
			this._component = this._oView.getController().getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// connect dialog to view (models, lifecycle)
			oView.addDependent(oDialog);

			if (aSelectedPaths && aSelectedPaths.constructor === Array && mParameters) {
				if (mParameters.hasOwnProperty("bFromNewGantt") && aSelectedPaths.length === 1) {
					if (mParameters.bFromNewGantt) {
						oDialog.bindElement(aSelectedPaths[0])
					}
				}
			}
			//Find Technician Feature code starts here...
			var oDemandsPaths, sMsg,
				bCheckRightTechnician = this._oView.getModel("viewModel").getProperty("/CheckRightTechnician");

			if (bCheckRightTechnician) {
				oDemandsPaths = this._getAllowedDemands(aSelectedPaths, isReassign, isBulkReAssign);
				this._aSelectedPaths = oDemandsPaths.oAllowedSelectedPaths;
				this._oFiltersRightTechnician = [this._getFormattedReqProfileId(this._aSelectedPaths, isReassign, isBulkReAssign)];
			}
			// open dialog
			if (this._aSelectedPaths && this._aSelectedPaths.length) {
				oDialog.open();
			}

			//Error Handling in case for Assignments not allowed for find Technician
			if (oDemandsPaths && oDemandsPaths.oNotAllowedPaths && oDemandsPaths.oNotAllowedPaths.length) {
				if (!this._reAssign && !this._bulkReAssign) {
					this._eventBus.publish("AssignTreeDialog", "updateDemandTableSelection", {
						oDeselectAssignmentsContexts: oDemandsPaths.oDeselectAssignmentsContexts
					});
				} else {
					this._eventBus.publish("AssignTreeDialog", "updateSelection", {
						oDeselectAssignmentsContexts: oDemandsPaths.oDeselectAssignmentsContexts
					});
				}

				//Global Error Msg Popup shows Description of discarded assignments
				sMsg = this._oView.getController().getResourceBundle().getText("xmsg.findResourceNotAllowed");
				this._showAssignErrorDialog(oDemandsPaths.oNotAllowedPaths, null, sMsg);
			}
		},

		/**
		 * Validate Selected Demands Based on ALLOW_FINDRESOURCE Flag
		 */
		_getAllowedDemands: function (aSelectedPaths, isReassign, isBulkReAssign) {
			var oAllowedSelectedPaths = [],
				oNotAllowedPaths = [],
				oDeselectAssignmentsContexts = [],
				sPath, oDemand;

			for (var i = 0; i < aSelectedPaths.length; i++) {
				if (isBulkReAssign) {
					sPath = aSelectedPaths[i].getPath() + "/Demand";
					oDemand = this._oView.getModel().getProperty(sPath);
				} else if (isReassign) {
					sPath = aSelectedPaths[i] + "/Demand";
					oDemand = this._oView.getModel().getProperty(sPath);
				} else {
					oDemand = aSelectedPaths[i].oData;
				}
				//on check on oData property ALLOW_ASSIGN when flag was given
				if (oDemand.ALLOW_FINDRESOURCE) {
					oAllowedSelectedPaths.push(aSelectedPaths[i]);
				} else {
					oNotAllowedPaths.push(this.getMessageDescWithOrderID(oDemand));
					oDeselectAssignmentsContexts.push(aSelectedPaths[i].sPath);
				}
			}
			return {
				oAllowedSelectedPaths: oAllowedSelectedPaths,
				oNotAllowedPaths: oNotAllowedPaths,
				oDeselectAssignmentsContexts: oDeselectAssignmentsContexts
			};
		},

		/**
		 * get Filters of Requirement Profile IDs of Selected Demands
		 * 
		 */
		_getFormattedReqProfileId: function (aSelectedPaths, isReassign, isBulkReAssign) {
			var aRequirementProfileIds = [],
				sPath,
				sRequirementProfileId;
			aSelectedPaths.forEach(function (entry) {
				if (isBulkReAssign) {
					sPath = entry.getPath() + "/Demand/REQUIREMENT_PROFILE_ID";
					sRequirementProfileId = this._oView.getModel().getProperty(sPath);
				} else if (isReassign) {
					sPath = entry + "/Demand/REQUIREMENT_PROFILE_ID";
					sRequirementProfileId = this._oView.getModel().getProperty(sPath);
				} else {
					sRequirementProfileId = entry.oData.REQUIREMENT_PROFILE_ID;
				}

				if (sRequirementProfileId) {
					aRequirementProfileIds.push(new Filter("REQUIREMENT_PROFILE_ID", FilterOperator.EQ, sRequirementProfileId));
				}
			}.bind(this));
			return new Filter({
				filters: aRequirementProfileIds,
				and: false
			});
		},
		/**
		 * search on resource tree
		 * @param oEvent
		 */
		onSearchModal: function (oEvent) {
			var sQuery = oEvent.getSource().getValue() || "",
				oTable = sap.ui.getCore().byId("assignModalTable");

			var viewModel = this._oView.getModel("viewModel"),
				binding = oTable.getBinding("rows"),
				viewFilters = viewModel.getProperty("/resourceFilterView"),
				aFilters = viewFilters.slice(0);

			if (!aFilters && aFilters.length === 0) {
				return;
			}
			if (sQuery && sQuery !== "") {
				aFilters.push(new Filter("Description", FilterOperator.Contains, sQuery));
			}
			if (this._oFiltersRightTechnician && this._oFiltersRightTechnician.length) {
				aFilters = aFilters.concat(this._oFiltersRightTechnician);
			}
			var resourceFilter = new Filter({
				filters: aFilters,
				and: true
			});
			binding.filter(resourceFilter, "Application");
		},

		/**
		 *
		 * @param oEvent
		 */
		onSelectionChange: function (oEvent) {
			var oContext = oEvent.getParameter("rowContext");
			this._assignPath = oContext.sPath;
		},

		onSaveDialog: function () {
			var msg;
			if (this._assignPath) {
				var oTargetObj = this._oView.getModel().getProperty(this._assignPath);
				if (this._isToolReAssign && (oTargetObj.NodeType === "RES_GROUP" || oTargetObj.IS_PRT)) { // If tool is reassigned to group or tool or prt then drop the process
					msg = this._oView.getModel("i18n").getResourceBundle().getText("ymsg.selectResourceOrDemand");
					this.showMessageToast(msg);

				} else if (this._isToolReAssign && !oTargetObj.ResourceGuid) {
					msg = this._oView.getModel("i18n").getResourceBundle().getText("ymsg.poolPrtNotAllowed");
					this.showMessageToast(msg);
				} else if (this._isToolReAssign && oTargetObj.OBJECT_SOURCE_TYPE === "DEM_PMNO") { //PRT re-assignment to notification demand not allowed
					msg = this._oView.getModel("i18n").getResourceBundle().getText("ymsg.prtToNotifNA");
					this.showMessageToast(msg);
				} else if (!this._reAssign && !this._isToolReAssign) {
					var aSources = this._oView.getModel("viewModel").getProperty("/dragSession"),
						oUserModel = this._oView.getModel("user"),
						iOperationTimesLen = this.onShowOperationTimes(this._oView.getModel("viewModel")),
						iVendorAssignmentLen = this.onAllowVendorAssignment(this._oView.getModel("viewModel"), oUserModel),
						aPSDemandsNetworkAssignment = this._showNetworkAssignments(this._oView.getModel("viewModel"));

					if (aSources) {
						//Checking PS Demands for Network Assignment 
						if (oUserModel.getProperty("/ENABLE_NETWORK_ASSIGNMENT") && aPSDemandsNetworkAssignment.length !== 0) {
							this._component.NetworkAssignment.open(this._oView, this._assignPath, aPSDemandsNetworkAssignment, null);
						} //Checking Vendor Assignment for External Resources
						else if (oUserModel.getProperty("/ENABLE_EXTERNAL_ASSIGN_DIALOG") && oTargetObj.ISEXTERNAL && aSources.length !==
							iVendorAssignmentLen) {
							this._component.VendorAssignment.open(this._oView, this._assignPath, null);
						} else if (oUserModel.getProperty("/ENABLE_ASGN_DATE_VALIDATION") && iOperationTimesLen !== aSources.length && oTargetObj.NodeType ===
							"RESOURCE") {
							//Checking Operation Times
							this._component.OperationTimeCheck.open(this._oView, null, this._assignPath);
						} else {
							this.onProceedSaveDialog();
						}
					} else {
						this.onProceedSaveDialog();
					}
				} else {
					this.onProceedSaveDialog();
				}
			} else {
				//show error message
				msg = this._oView.getModel("i18n").getResourceBundle().getText("notFoundContext");
				this.showMessageToast(msg);
			}
		},

		/**
		 * save form data when demand selected from Demand table
		 * or if set reassign save path in help model
		 * @param oEvent
		 */
		onProceedSaveDialog: function (oEvent) {
			if (this._assignPath) {
				//Storing Updated Resources Information for Refreshing only the selected resources in Gantt View
				if (this._oView) {
					this._updatedDmdResources(this._oView.getModel("viewModel"), this._oView.getModel().getProperty(this._assignPath));
					if (this._bulkReAssign) {
						this._updatedAssignmentsPath(this._aSelectedPaths);
					} else {
						if (this._isToolReAssign) {
							this._updatedDmdResources(this._oView.getModel("viewModel"), this._oView.getModel("assignment").getData());
						} else {
							if (!this._aSelectedPaths[0].sPath) {
							this._updatedDmdResources(this._oView.getModel("viewModel"), this._oView.getModel().getProperty(this._aSelectedPaths[0]));
							}
						}
					}
				}
				
				if (this._isToolReAssign) {
					this._eventBus.publish("AssignTreeDialog", "ToolReAssignment", {
						sAssignPath: this._assignPath,
						aSourcePaths: this._aSelectedPaths,
						view: this._oView,
						oAssignmentModel: this._oView.getModel("assignment")

					});
					if (this._callbackEvent) {
						this._eventBus.publish("AssignTreeDialog", this._callbackEvent, {
							sAssignPath: this._assignPath,
							aSourcePaths: this._aSelectedPaths,
							parameters: this._mParameters
						});
					}
					this._closeDialog();
					return;
				}
				if (this._callbackEvent) {
					this._eventBus.publish("AssignTreeDialog", this._callbackEvent, {
						sAssignPath: this._assignPath,
						aSourcePaths: this._aSelectedPaths,
						parameters: this._mParameters
					});
					this._closeDialog();
					return;
				}
				// In case of bulk reassign
				if (this._bulkReAssign) {
					this._eventBus.publish("AssignTreeDialog", "bulkReAssignment", {
						sPath: this._assignPath,
						aContexts: this._aSelectedPaths,
						parameters: this._mParameters
					});
					this._closeDialog();
					this._eventBus.publish("AssignTreeDialog", "closeActionDialog", {});
					return;
				}
				// In case single reassign
				if (this._reAssign) {
					this._eventBus.publish("AssignTreeDialog", "selectedAssignment", {
						sPath: this._assignPath
					});
					this._closeDialog();
					return;
				}
				if (this._aSelectedPaths) {
					this._eventBus.publish("AssignTreeDialog", "assignSelectedDemand", {
						selectedPaths: this._aSelectedPaths,
						assignPath: this._assignPath,
						parameters: this._mParameters
					});

					this._closeDialog();
					return;
				}
			}
		},
		/**
		 * Refresh the table before opening the dialog
		 */
		refreshDialogTable: function (oEvent) {
			var oTable = sap.ui.getCore().byId("assignModalTable"),
				oSearchField = sap.ui.getCore().byId("idSeachModalTree"),
				binding = oTable.getBinding("rows"),
				aFilters = this._oView.getModel("viewModel").getProperty("/resourceFilterView");

			if (this._oFiltersRightTechnician && this._oFiltersRightTechnician.length) {
				aFilters = aFilters.concat(this._oFiltersRightTechnician);
			}
			// Search field should be empty
			oSearchField.setValue("");
			binding.filter(aFilters, "Application");
		},

		/**
		 * when dialog closed inside controller
		 */
		_closeDialog: function () {
			if (this._oDialog) {
				this._oFiltersRightTechnician = false;
				this.refreshDialogTable();
				this._oDialog.close();
			}
		},

		/**
		 * close dialog from XML view
		 * Cancel progress
		 */
		onCloseDialog: function () {
			this._closeDialog();
			//setting null on dialog close:Sagar
			this._oView.getModel("assignment").setProperty("/NewAssignPath", null);
			this._oView.getModel("assignment").setProperty("/NewAssignId", null);
			this._oView.getModel("assignment").setProperty("/NewAssignDesc", null);
			//when from new gantt shape busy state needs removed
			if (this._mParameters.bCustomBusy && (this._mParameters.bFromNewGantt || this._mParameters.bFromNewGanttSplit)) {
				this._oView.getModel("ganttModel").setProperty(this._mParameters.sSourcePath + "/busy", false);
			}
		},
		/**
		 * Open's dialog as per event channel to list the resources to reassign 
		 */
		_triggerOpenDialog: function (sChanel, sEvent, oData) {
			if (sChanel === "AssignInfoDialog" && sEvent === "selectAssign") {
				this.open(oData.oView, oData.isReassign, oData.aSelectedPaths, oData.parameters, null, null, oData.isToolReAssign);
			} else if (sChanel === "AssignActionsDialog" && sEvent === "selectAssign") {
				this.open(oData.oView, oData.isReassign, oData.aSelectedContexts, oData.isBulkReassign, oData.parameters);
			}
		},

		exit: function () {
			this._eventBus.unsubscribe("AssignInfoDialog", "selectAssign", this._triggerOpenDialog, this);
			this._eventBus.unsubscribe("AssignActionsDialog", "selectAssign", this._triggerOpenDialog, this);
		}

	});
});