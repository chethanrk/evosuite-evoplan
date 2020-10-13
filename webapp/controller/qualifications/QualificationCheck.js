sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentActionsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.qualifications.QualificationCheck", {

		formatter: formatter,

		init: function () {
			// this._eventBus = sap.ui.getCore().getEventBus();
		},

		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 */
		open: function (that, oView, mParameters) {
			this.oView = oView;
			if (!this._oDialog) {
				that.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.qualifications.fragments.QualificationCheck",
					controller: this
				}).then(function (oDialog) {
					that.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(that, oDialog, mParameters);
				}.bind(this));
			} else {
				this.onOpen(that, this._oDialog, mParameters);
			}
		},

		onOpen: function (that, oDialog, mParameters) {
			this._mParameters = mParameters || {
				bFromHome: true
			};
			this._component = that.getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// oDialog.setModel(that.getModel("viewModel"), "viewModel");
			// connect dialog to view (models, lifecycle)
			this.oView.addDependent(oDialog);

			// this._getResourceInfo(sId);

			// open dialog
			setTimeout(function () {
				oDialog.open();
			}, 100);

		},

		/**
		 * save form data
		 * @param oEvent
		 */
		onSelectAll: function (oEvent) {
			sap.ui.getCore().byId("idQualificationMatchTable").selectAll();
		},
		onCloseDialog: function (oEvent) {
			this._oDialog.close();
		},
		onProceed: function (oEvent) {
			var oTable = sap.ui.getCore().byId("idQualificationMatchTable"),
				oViewModel = oTable.getModel("viewModel"),
				aListItems = oViewModel.getProperty("/QualificationMatchList/QualificationData"),
				aSourcePaths = oViewModel.getProperty("/QualificationMatchList/SourcePaths"),
				targetObj = oViewModel.getProperty("/QualificationMatchList/TargetObject"),
				mParameters = oViewModel.getProperty("/QualificationMatchList/mParameters"),
				oParams = oViewModel.getProperty("/QualificationMatchList/oParams"),
				oTargetDate = oViewModel.getProperty("/QualificationMatchList/targetDate"),
				oNewEndDate = oViewModel.getProperty("/QualificationMatchList/newEndDate"),
				aGuids = oViewModel.getProperty("/QualificationMatchList/aGuids"),
				aSelectedSourcePaths = [],
				aSelectedGuids = [];
			if (aSourcePaths) {
				aSelectedSourcePaths = this.getSelectedSources(oTable, aSourcePaths, aListItems);
			} else {
				aSelectedGuids = this.getSelectedDemands(oTable, aGuids, aListItems);
			}
			if (!oParams) {
				oParams = this.setDateTimeParams([], targetObj.StartDate, targetObj.StartTime, targetObj.EndDate, targetObj.EndTime, oTargetDate, oNewEndDate);
			}
			this.proceedToServiceCallAssignDemands(aSelectedSourcePaths, targetObj, mParameters, oParams, aSelectedGuids);
			this.onCloseDialog();

		},
		onSelectionChangeQualificationTable: function (oEvent) {
			var oTable = oEvent.getSource(),
				oViewModel = oTable.getModel("viewModel"),
				aListItems = oViewModel.getProperty("/QualificationMatchList/QualificationData"),
				oSelectedPath = oEvent.getParameter("listItem").getBindingContextPath(),
				bIsSelected = oEvent.getParameter("listItem").getSelected(),
				vSelectedDemand = oViewModel.getProperty(oSelectedPath).DemandGuid;

			for (var i = 0; i < aListItems.length; i++) {
				if (aListItems[i].DemandGuid === vSelectedDemand) {
					aListItems[i].IsSelected = bIsSelected;
				}
			}
			oViewModel.setProperty("/QualificationMatchList/QualificationData", aListItems);
			oViewModel.refresh();
		},
		getSelectedSources: function (oTable, aSourcePaths, aListItems) {
			var aSelectedGuids = [],
				aSelectedSourcePaths = [];
			if (oTable.isAllSelectableSelected()) {
				aSelectedSourcePaths = aSourcePaths;
			} else {
				for (var i = 0; i < aListItems.length; i++) {
					if (aListItems[i].IsSelected && !aSelectedGuids.includes(aListItems[i].DemandGuid)) {
						aSelectedGuids.push(aListItems[i].DemandGuid);
					}
				}
				aSelectedSourcePaths = aSourcePaths.filter(function (e) {
					return aSelectedGuids.includes(e.oData.Guid);
				});
			}
			return aSelectedSourcePaths;
		},
		getSelectedDemands: function (oTable, aGuids, aListItems) {
			var aSelectedGuids = [];
			if (oTable.isAllSelectableSelected()) {
				aSelectedGuids = aGuids;
			} else {
				for (var i = 0; i < aListItems.length; i++) {
					if (aListItems[i].IsSelected && !aSelectedGuids.includes(aListItems[i].DemandGuid)) {
						aSelectedGuids.push("/DemandSet('" + aListItems[i].DemandGuid + "')");
					}
				}
			}
			return aSelectedGuids;

		},
		exit: function () {
			// unsubscribe
		}
	});
});