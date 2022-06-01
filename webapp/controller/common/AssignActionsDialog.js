sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Filter, FilterOperator, MessageToast, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.AssignActionsDialog", {
		formatter: formatter,
		_bSelectAll: true,

		init: function () {
			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("AssignTreeDialog", "closeActionDialog", this.onCloseDialog, this);
			this._eventBus.subscribe("AssignTreeDialog", "updateSelection", this._deselectAssignments, this);
		},
		/*
		 * open dialog
		 * @Author Pranav
		 * @version 2.0.6
		 * @param oView - view in which it getting invoked.
		 * @param aSelectedResources - selected resources before opening the dialog.
		 * @param isUnAssign - to Identify action for which it is opened.
		 * init and get dialog view
		 * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
		 */
		open: function (oView, aSelectedResources, isUnAssign, mParameters) {
			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					id: "AssignActions",
					name: "com.evorait.evoplan.view.common.fragments.AssignActionsDialog",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(oDialog, oView, aSelectedResources, isUnAssign, mParameters);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, aSelectedResources, isUnAssign, mParameters);
			}
		},

		/**
		 * Sets the necessary value as global to this controller
		 * Open's the popover
		 * @param oView
		 * @param oEvent
		 */
		onOpen: function (oDialog, oView, aSelectedPath, isUnAssign, mParameters) {
			this._oView = oView;
			this._aSelectedResources = aSelectedPath;
			this._isUnAssign = isUnAssign;
			this._resourceBundle = this._oView.getController().getResourceBundle();
			this._component = this._oView.getController().getOwnerComponent();
			this._mParameters = mParameters || {
				bFromHome: true
			};

			this._bCheckRightTechnician = this._oView.getModel("viewModel").getProperty("/CheckRightTechnician");
			oDialog.addStyleClass(this._component.getContentDensityClass());
			oView.addDependent(oDialog);
			oDialog.open();
		},

		/**
		 * Adding the expand clause to smart table by setting binding parameters on beforeRebind event
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oEvent
		 */
		onBeforeRebind: function (oEvent) {
			var mBindingParams = oEvent.getParameter("bindingParams"),
				oFilter;
			mBindingParams.parameters.expand = "Demand";
			oFilter = new Filter(this._getResourceFilters(this._aSelectedResources), true);
			mBindingParams.filters.push(oFilter);
		},
		/**
		 * Setting initial setting for dialog when it opens
		 * Filters the resctive demands based on selected resource assignment
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oEvent
		 */
		onBeforeOpen: function (oEvent) {
			var oUnAssignBtn = sap.ui.getCore().byId("AssignActions--idButtonBulkUnAssign"),
				oReAssignBtn = sap.ui.getCore().byId("AssignActions--idButtonBulkReAssign"),
				oCheckRightTechnician = sap.ui.getCore().byId("AssignActions--idCheckRightTechnician"),
				bEnableQualification = this._oView.getModel("user").getProperty("/ENABLE_QUALIFICATION"),
				oDialog = this._oDialog;
			this._oAssignMentTable = sap.ui.getCore().byId("AssignActions--idDemandAssignmentTable").getTable();

			if (this._isUnAssign) {
				oUnAssignBtn.setVisible(true);
				oReAssignBtn.setVisible(false);
				oCheckRightTechnician.setVisible(false);
				oDialog.setTitle(this._resourceBundle.getText("xtit.unAssignTitle"));
			} else {
				oUnAssignBtn.setVisible(false);
				oReAssignBtn.setVisible(true);
				if (bEnableQualification) {
					oCheckRightTechnician.setVisible(true);
				}
				oDialog.setTitle(this._resourceBundle.getText("xtit.reAssignTitle"));
			}
			//Hiding UnAssign and Assign New buttons when it's Change Assignment Status   #since 2205
			if (this._oView.getModel("user").getProperty("/ENABLE_ASSIGNMENT_STATUS") && this._oView.getModel("viewModel").getProperty(
					"/Show_Assignment_Status_Button")) {
				oUnAssignBtn.setVisible(false);
				oReAssignBtn.setVisible(false);
				oDialog.setTitle(this._resourceBundle.getText("xbut.ChngAssgnStatus"));
			}
			if (this.isFirstTime) {
				sap.ui.getCore().byId("AssignActions--idDemandAssignmentTable").rebindTable();
			}

			this.isFirstTime = true;
		},
		/**
		 * Event for unassign
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oEvent
		 */
		onUnassign: function (oEvent) {
			var oTable = this._oAssignMentTable,
				aContexts = oTable.getSelectedContexts(),
				sMsg;

			//check at least one demand selected
			if (aContexts.length === 0) {
				sMsg = this._oView.getController().getResourceBundle().getText("ymsg.selectMinItem");
				MessageToast.show(sMsg);
				return;
			}

			this._eventBus.publish("AssignActionsDialog", "bulkDeleteAssignment", {
				aContexts: aContexts,
				parameters: this._mParameters
			});
			this.onCloseDialog();
		},
		/**
		 * Event for reassign.
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oEvent
		 */
		onReassign: function (oEvent) {
			var aContexts = this._oAssignMentTable.getSelectedContexts(),
				sMsg;
			this.getOperationDemands(aContexts);

			//check at least one demand selected
			if (aContexts.length === 0) {
				sMsg = this._oView.getController().getResourceBundle().getText("ymsg.selectMinItem");
				MessageToast.show(sMsg);
				return;
			}
			this._eventBus.publish("AssignActionsDialog", "selectAssign", {
				oView: this._oView,
				isReassign: this.reAssign,
				aSelectedContexts: aContexts,
				isBulkReassign: true,
				parameters: this._mParameters
			});
		},
		/**
		 * To validate the selected demands eligible to perform the following action
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oTable Table object
		 * @param bForReassign To identify the action.
		 * @return {{bValidate: boolean, aDemands: Array}}
		 */
		validateDemands: function (aSelectedItems, bForReassign) {
			var oItem,
				oContext,
				sPath,
				oModel,
				bFlag;

			this._oAssignMentTable.removeSelections(); // reomoves the selected items

			for (var i in aSelectedItems) {
				oItem = aSelectedItems[i];
				oContext = oItem.getBindingContext();
				sPath = oContext.getPath();
				oModel = oContext.getModel();

				if (bForReassign) {
					bFlag = oModel.getProperty(sPath + "/Demand/ALLOW_UNASSIGN");
				} else {
					bFlag = oModel.getProperty(sPath + "/Demand/ALLOW_REASSIGN");
				}

				if (bFlag) {
					this._oAssignMentTable.setSelectedItem(oItem);
				}
			}
		},
		/**
		 * Return resource filters on selected resources
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param aSelectedResources {Array} Selected Resources
		 * @return aResourceFilters Filters
		 */
		_getResourceFilters: function (aSelectedResources) {
			var aResources = [],
				oModel = this._oView.getModel(),
				oViewFilterSettings = this._oView.getController().oFilterConfigsController || null,
				aFilters = [],
				obj,
				dateRangeValues,
				selectedTimeFormat,
				sDateControl1,
				sDateControl2;

			if (this._mParameters.bFromNewGantt) {
				oModel = this._oView.getModel("ganttModel");
			}
			//For Assignment Status Change
			if (this._oView.getModel("user").getProperty("/ENABLE_ASSIGNMENT_STATUS") && aSelectedResources.aAssignmentDemands) {
				for (var a in aSelectedResources.aAssignmentDemands) {
					aResources.push(new Filter("DemandGuid", FilterOperator.EQ, aSelectedResources.aAssignmentDemands[a].oData.Guid));
				}
				aFilters.push(new Filter({
					filters: aResources,
					and: false
				}));
			}
			//For UnAssigning from Demand View
			else if (this._oView.getModel("user").getProperty("/ENABLE_DEMAND_UNASSIGN") && aSelectedResources.aUnAssignDemands) {
				for (var u in aSelectedResources.aUnAssignDemands) {
					aResources.push(new Filter("DemandGuid", FilterOperator.EQ, aSelectedResources.aUnAssignDemands[u].oData.Guid));
				}
				aFilters.push(new Filter({
					filters: aResources,
					and: false
				}));
			} else {
				for (var i = 0; i < aSelectedResources.length; i++) {
					obj = oModel.getProperty(aSelectedResources[i]);
					if (obj.NodeType === "RESOURCE") {
						if (obj.ResourceGuid && obj.ResourceGuid !== "") { // This check is required for POOL Node.
							aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGuid + "//" + obj.ResourceGroupGuid));
						} else {
							aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid + "//X"));
						}
					} else if (obj.NodeType === "RES_GROUP") {
						aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid));
					}
				}

				if (oViewFilterSettings) {
					dateRangeValues = oViewFilterSettings.getDateRange();
					sDateControl1 = dateRangeValues[0];
					sDateControl2 = dateRangeValues[1];
				} else {
					selectedTimeFormat = formatter.getResourceFormatByKey("TIMENONE");
					sDateControl1 = this.formatter.date(selectedTimeFormat.getDateBegin());
					sDateControl2 = this.formatter.date(selectedTimeFormat.getDateEnd());
				}

				//Picking Date Range from Gantt and Gantt Split for Filtering
				if (this._mParameters.bFromGantt || this._mParameters.bFromNewGantt) {
					sDateControl1 = this.formatter.date(this._oView.byId("idDateRangeGantt2").getDateValue());
					sDateControl2 = this.formatter.date(this._oView.byId("idDateRangeGantt2").getSecondDateValue());
				}

				if (aResources.length > 0) {
					aFilters.push(new Filter({
						filters: aResources,
						and: false
					}));
					aFilters.push(new Filter("DateTo", FilterOperator.GE, sDateControl1));
					aFilters.push(new Filter("DateFrom", FilterOperator.LE, sDateControl2));
				}
			}
			return aFilters;
		},
		/**
		 * Filters the demand by demand guids for filter assignments
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param aSelectedResources
		 * @private
		 */
		_filterDemandTable: function (aSelectedResources) {
			if (this._oAssignMentTable && this._oAssignMentTable.getBinding("items")) {
				this._oAssignMentTable.getBinding("items").filter(this._getResourceFilters(aSelectedResources));
			}
		},
		/**
		 * Checking selected demand is allowed for respective action on selection change of demand
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oEvent
		 */
		onSelectionChange: function (oEvent) {
			//Enabling Change Assignment Status Button   #since 2205
			if (this._oView.getModel("user").getProperty("/ENABLE_ASSIGNMENT_STATUS") && this._oView.getModel("viewModel").getProperty(
					"/Show_Assignment_Status_Button")) {
				var oSource = oEvent.getSource(),
					aSelectedItems = oSource.getSelectedItems(),
					bEnableAssignmentStatusButton = true;
				if (aSelectedItems.length === 0) {
					bEnableAssignmentStatusButton = false;
				}
				this._oView.getModel("viewModel").setProperty("/Disable_Assignment_Status_Button", bEnableAssignmentStatusButton);
			} else {
				if (oEvent.getParameter("selected") && !oEvent.getParameter("selectAll")) {
					var oListItem = oEvent.getParameter("listItem"),
						oContext = oListItem.getBindingContext(),
						sPath = oContext.getPath(),
						oModel = oContext.getModel(),
						bFlag = false;

					if (!this._isUnAssign) {
						bFlag = oModel.getProperty(sPath + "/Demand/ALLOW_REASSIGN");
					} else {
						bFlag = oModel.getProperty(sPath + "/Demand/ALLOW_UNASSIGN");
					}
					oListItem.setSelected(bFlag);
				} else {
					if (oEvent.getParameter("selectAll")) {
						//_bSelectAll is used for toggling between select all & diselect all
						if (this._bSelectAll) {
							var aListItems = oEvent.getSource().getItems();
							this.validateDemands(aListItems, this._isUnAssign);
							this._bSelectAll = false;
						} else {
							this._oAssignMentTable.removeSelections();
							this._bSelectAll = true;
						}
					} else if (!oEvent.getParameter("selected")) {
						this._bSelectAll = true;
					} else {
						this._oAssignMentTable.removeSelections();
						this._bSelectAll = true;
					}
				}
			}
		},
		/**
		 * close dialog
		 */
		onCloseDialog: function () {
			if (this._oDialog) {
				this._oAssignMentTable.removeSelections();
				this._oView.getModel("viewModel").setProperty("/CheckRightTechnician", this._bCheckRightTechnician);
				this._oDialog.close();
				if (this._oView.getModel("user").getProperty("/ENABLE_ASSIGNMENT_STATUS") && this._oView.getModel("viewModel").getProperty(
						"/Show_Assignment_Status_Button")) {
					this._oView.getModel("viewModel").setProperty("/Show_Assignment_Status_Button", false);
					//	this._oView.getModel("viewModel").setProperty("/Show_Assignment_Status_Button", false );
				}
			}
		},
		/**
		 * Deselect from assignments list items not allowed to check Find Technician
		 */
		_deselectAssignments: function (sChannel, oEvent, oData) {
			var oSelectedContextPaths = [],
				sAssignmentPath,
				oItemsAssignmentList;
			oItemsAssignmentList = this._oAssignMentTable.getItems();
			for (var i = 0; i < oItemsAssignmentList.length; i++) {
				sAssignmentPath = oItemsAssignmentList[i].getBindingContextPath();
				if (oData.oDeselectAssignmentsContexts.includes(sAssignmentPath)) {
					oItemsAssignmentList[i].setSelected(false);
				}
			}
		},

		onDataBind: function () {
			if (this._oView.getModel("user").getProperty("/ENABLE_DEMAND_UNASSIGN") && this._aSelectedResources.aUnAssignDemands && !this._oView
				.getModel("viewModel").getProperty("/Show_Assignment_Status_Button")) {
				this._oAssignMentTable.selectAll();
			}
		},

		getOperationDemands: function (aContexts) {
			var aPathsData = [];
			for (var c in aContexts) {
				var sPath = "/" + aContexts[c].getObject().Demand.__ref;
				this.getAssignDemands(sPath).then(function (data) {
					var oDemandObj = {
						index: c,
						oData: data,
						sPath: sPath
					};
					aPathsData.push(oDemandObj);
				}.bind(this));
			}
			this._oView.getModel("viewModel").setProperty("/dragSession", aPathsData);
		},

		getAssignDemands: function (sUri) {
			return new Promise(function (resolve, reject) {
				this._oView.getModel().read(sUri, {
					success: function (oData, oResponse) {
						resolve(oData);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			}.bind(this));

		},
		/**
		 * Opening Assignment Status Change PopOver
		 * @param oEvent
		 * Since 2205
		 * @Author Chethan RK
		 */
		openAssignmentStatus: function (oEvent) {
			var oSource = oEvent.getSource(),
				aSelectedAssignments = this._oAssignMentTable.getSelectedItems(),
				aAssignmentStatus = this._getAssignmentStatus(aSelectedAssignments);
			this._component.AssignmentStatus.open(this._oView, oSource, aAssignmentStatus, this._mParameters, this._oAssignMentTable);
		},

		exit: function () {
			this._eventBus.unsubscribe("AssignTreeDialog", "closeActionDialog", this.onCloseDialog, this);
			this._eventBus.subscribe("AssignTreeDialog", "updateSelection", this._deselectAssignments, this);
		}
	});
});