sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"

], function (BaseController, formatter, Fragment, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.qualifications.ResourceQualifications", {

		formatter: formatter,

		init: function () {
			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("ResourceQualificationDialog", "refreshQualificationDemandsTable", this._refreshQualificationDemandsTable,
				this);
		},

		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 */
		open: function (oView, sId, mParameters) {
			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					id: oView.getId(),
					name: "com.evorait.evoplan.view.qualifications.fragments.ResourceQualifications",
					controller: this
				}).then(function (oDialog) {
					this._oDialog = oDialog;
					this._oView = oView;
					this.onOpen(oDialog, oView, sId, mParameters);
					oView.getModel("appView").setProperty("/busy", false);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, sId, mParameters);
			}
		},

		onOpen: function (oDialog, oView, sId, mParameters) {
			this._mParameters = mParameters || {
				bFromHome: true,
				bFromResourcQualification: true
			};
			this._component = this._oView.getController().getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// connect dialog to view (models, lifecycle)
			oView.addDependent(oDialog);
			this._getResourceInfo(sId);
			// open dialog
			oDialog.open();
		},
		/**
		 * Handle Assign Button visibilty based on Demands selection 
		 * @private
		 */
		_configureDataTable: function (oDataTable) {
			var oViewModel = this._oView.getModel("viewModel");
			//enable/disable buttons on footer when there is some/no selected rows
			oDataTable.attachRowSelectionChange(function () {
				var selected = oDataTable.getSelectedIndices();
				if (selected.length > 0) {
					oViewModel.setProperty("/resourceQualification/AssignBtnEnable", true);
					oViewModel.setProperty("/resourceQualification/FindResourceBtnEnable", true);
				} else {
					oViewModel.setProperty("/resourceQualification/AssignBtnEnable", false);
					oViewModel.setProperty("/resourceQualification/FindResourceBtnEnable", false);
				}
			}, this);
		},

		/**
		 * Binding header inforamation of Resource
		 */
		_getResourceInfo: function (sId) {
			var oDialog = this._oDialog,
				oModel = this._component.getModel(),
				sKey = oModel.createKey("ResourceSet", {
					ObjectId: sId
				});

			oDialog.bindElement({
				path: "/" + sKey,
				events: {
					change: function () {
						var oElementBinding = oDialog.getElementBinding();
						oElementBinding.refresh();
					},
					dataRequested: function () {
						oDialog.setBusy(true);
					},
					dataReceived: function () {
						oDialog.setBusy(false);
					}
				}
			});
		},
		/**
		 * handle Assign Button visibility based on Tab selection in Resource Qualification Dialog 
		 * 
		 */
		onTabSelectionChanged: function (oEvent) {
			var sTabKey = oEvent.getParameter("selectedKey"),
				oViewModel = this._oView.getModel("viewModel"),
				oIconTabBar = this._oView.byId("idResourceQualificationIconTabBar"),
				sDemandTabName = this._oView.getModel("i18n").getResourceBundle().getText("xtit.itemListTitle");
			if (sTabKey === sDemandTabName) {
				oViewModel.setProperty("/resourceQualification/AssignBtnVisible", true);
				// oViewModel.setProperty("/resourceQualification/FindResourceBtnVisible", true);
				this._loadContentDemandTab();
				oIconTabBar.addContent(this._oView.byId("idResourceQualificationDemandsTable"));
			} else {
				oViewModel.setProperty("/resourceQualification/AssignBtnVisible", false);
				oViewModel.setProperty("/resourceQualification/FindResourceBtnVisible", false);
			}
		},
		/**
		 * handle the load operation of matched Demands table in Resource Qualification Dialog 
		 * 
		 */
		_loadContentDemandTab: function () {
			var oIconTabBar = this._oView.byId("idResourceQualificationIconTabBar");
			if (!this._oDemandTab) {
				var sFragmentPath = "com.evorait.evoplan.view.qualifications.fragments.ResourceQualificationDemandTab";
				this.loadFragment(sFragmentPath, this).then(function (oFragment) {
					this._oDemandTab = oFragment;
					this._oView.addDependent(this._oDemandTab);
					this._configureDataTable(sap.ui.getCore().byId("idResourceQualificationDemandsTable").getTable());
					oIconTabBar.addContent(this._oDemandTab);
				}.bind(this));
			}
		},
		/**
		 * On press assign Button on Demands Tab in Resource Qualification
		 * 
		 */
		onAssignButtonPress: function () {
			this._oDataTable = sap.ui.getCore().byId("idResourceQualificationDemandsTable").getTable();
			this._aSelectedRowsIdx = this._oDataTable.getSelectedIndices();
			this._assignPath = this._oDialog.getBindingContext().getPath();

			if (this._aSelectedRowsIdx.length > 100) {
				this._aSelectedRowsIdx.length = 100;
			}
			var oSelectedPaths = this._getAllowedDemands(this._oDataTable, this._aSelectedRowsIdx);

			if (oSelectedPaths.aPathsData.length > 0) {
				this._eventBus.publish("AssignTreeDialog", "assignSelectedDemand", {
					selectedPaths: oSelectedPaths.aPathsData,
					assignPath: this._assignPath,
					parameters: this._mParameters
				});
			}
			if (oSelectedPaths.aNonAssignable.length > 0) {
				this.showAssignErrorDialog(oSelectedPaths.aNonAssignable);
			}
		},
		/**
		 * Validate Selected Demands Based on ALLOW_ASSIGN Flag
		 * 
		 */
		_getAllowedDemands: function (oTable, aSelectedRowsIdx) {
			var aPathsData = [],
				aNonAssignableDemands = [],
				oData, oContext, sPath;
			oTable.clearSelection();
			for (var i = 0; i < aSelectedRowsIdx.length; i++) {
				oContext = oTable.getContextByIndex(aSelectedRowsIdx[i]);
				sPath = oContext.getPath();
				oData = oTable.getModel().getProperty(sPath);

				//on check on oData property ALLOW_ASSIGN when flag was given
				if (oData.ALLOW_ASSIGN) {
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
		 * Refresh Resource Qualification Match Demands table when Assignment is done
		 */
		_refreshQualificationDemandsTable: function () {
			sap.ui.getCore().byId("idResourceQualificationDemandsTable").rebindTable();
		},
		/**
		 * Handling the qualification match filter before the Demand table refresh
		 */
		onBeforeRebindDemandsTable: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oBinding = oParams.bindingParams,
				oMatchType = sap.ui.getCore().byId("idButtonQualificationMatchType").getSelectedKey();

			if (oMatchType === "Full") {
				oBinding.filters = [new Filter("RESOURCE_MATCH", FilterOperator.EQ, "F")];
			} else if (oMatchType === "Partial") {
				oBinding.filters = [new Filter("RESOURCE_MATCH", FilterOperator.EQ, "P")];
			} else {
				oBinding.filters = [];
			}
		},

		/**
		 * Close the Qualification Dialog
		 * @param oEvent
		 */
		onCloseDialog: function (oEvent) {
			this._resetDialoge();
			this._oDialog.close();
		},
		/**
		 * reset changes in Resource Qualification Dialog
		 */
		_resetDialoge: function () {
			var oIconTabBar = this._oView.byId("idResourceQualificationIconTabBar"),
				sTabKey = this._oView.getModel("i18n").getResourceBundle().getText("xtit.qualifications");
			oIconTabBar.destroyContent();
			oIconTabBar.setSelectedKey(sTabKey);
			delete this._oDemandTab;
			this._oDialog.unbindElement();
		},
		/**
		 * exit of Qualification dialog
		 */
		exit: function () {
			this._eventBus.unsubscribe("ResourceQualificationDialog", "refreshQualificationDemandsTable", this._refreshQualificationDemandsTable,
				this);
		}
	});
});