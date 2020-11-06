sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentActionsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast"
], function (BaseController, formatter, Fragment, MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.qualifications.QualificationCheck", {

		formatter: formatter,

		init: function () {
			// this._eventBus = sap.ui.getCore().getEventBus();
		},

		/**
		 * Initialize the dialog for Qualification Match results 
		 * @param that
		 * @param oView
		 * @param sBindPath
		 * @param mParameters
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

		/**
		 * Open the dialog for Qualification Match results 
		 * @param that
		 * @param oDialog
		 * @param mParameters
		 */
		onOpen: function (that, oDialog, mParameters) {
			this._mParameters = mParameters || {
				bFromHome: true
			};
			this._component = that.getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// connect dialog to view (models, lifecycle)
			this.oView.addDependent(oDialog);
			// open dialog
			oDialog.open();
			if(mParameters && mParameters.bFromGantt){
				this._component.getModel("viewModel").setProperty("/ganttSettings/busy", false);
			}

		},

		/**
		 * Select All items in the Qualication match table
		 * @param oEvent
		 */
		onSelectAll: function (oEvent) {
			sap.ui.getCore().byId("idQualificationMatchTable").selectAll();
		},

		/**
		 * Close the dialog for Qualification Match results 
		 * @param oEvent
		 */
		onCloseDialog: function (oEvent) {
			this._component.getModel("viewModel").setProperty("/ganttSettings/busy", false);
			this._oDialog.close();
		},

		/**
		 * proceed to assgin the selected items from Qualification match Table 
		 * @param oEvent
		 */
		onProceed: function (oEvent) {
			var oTable = sap.ui.getCore().byId("idQualificationMatchTable"),
				oViewModel = oTable.getModel("viewModel"),
				aListItems = oViewModel.getProperty("/QualificationMatchList/QualificationData"),
				aSourcePaths = oViewModel.getProperty("/QualificationMatchList/SourcePaths"),
				oContext = oViewModel.getProperty("/QualificationMatchList/Contexts"),
				targetObj = oViewModel.getProperty("/QualificationMatchList/TargetObject"),
				sAssignPath = oViewModel.getProperty("/QualificationMatchList/AssignPath"),
				mParameters = oViewModel.getProperty("/QualificationMatchList/mParameters"),
				oParams = oViewModel.getProperty("/QualificationMatchList/oParams"),
				oTargetDate = oViewModel.getProperty("/QualificationMatchList/targetDate"),
				oNewEndDate = oViewModel.getProperty("/QualificationMatchList/newEndDate"),
				aGuids = oViewModel.getProperty("/QualificationMatchList/aGuids"),
				sSourceMethod = oViewModel.getProperty("/QualificationMatchList/SourceMethod"),
				aSelectedSourcePaths = [],
				aSelectedGuids = [];

			//Check for no Items selected to Proceed
			if (!oTable.getSelectedItems().length) {
				MessageToast.show(this.getResourceBundle().getText("xmsg.msgItemSelect"));
				return;
			}

			if (aSourcePaths) {
				aSelectedSourcePaths = this.getSelectedSources(oTable, aSourcePaths, aListItems);
			} else {
				aSelectedGuids = this.getSelectedDemands(oTable, aGuids, aListItems);
			}
			//based on the opertion different method calls
			switch (sSourceMethod) {
			case "assignedDemands":
				this.proceedToServiceCallAssignDemands(aSelectedSourcePaths, targetObj, mParameters, oParams);
				break;
			case "bulkReAssignment":
				aSelectedSourcePaths = this.getSelectedContexts(oTable, oContext, aListItems);
				this.bulkReAssignmentFinalCall(sAssignPath, aSelectedSourcePaths, mParameters);
				break;
			case "UpdateAssignment":
				this.callFunctionImport(oParams, "UpdateAssignment", "POST", mParameters, true);
				break;
			default: //Case for update Assignment from Gantt 
				if (!oParams) {
					oParams = this.setDateTimeParams([], targetObj.StartDate, targetObj.StartTime, targetObj.EndDate, targetObj.EndTime, oTargetDate,
						oNewEndDate);
				}
				this.proceedToServiceCallAssignDemands(aSelectedSourcePaths, targetObj, mParameters, oParams, aSelectedGuids);
			}

			this.onCloseDialog();

		},

		/**
		 * Handle Selection/Deselection items from Qualification match Table 
		 * @param oEvent
		 */
		onSelectionChangeQualificationTable: function (oEvent) {
			var oTable = oEvent.getSource(),
				oViewModel = oTable.getModel("viewModel"),
				aListItems = oViewModel.getProperty("/QualificationMatchList/QualificationData"),
				oSelectedPath = oEvent.getParameter("listItem").getBindingContextPath(),
				bIsSelected = oEvent.getParameter("listItem").getSelected(),
				vSelectedDemand = oViewModel.getProperty(oSelectedPath)?oViewModel.getProperty(oSelectedPath).DemandGuid:null;

			for (var i = 0; i < aListItems.length; i++) {
				if (aListItems[i].DemandGuid === vSelectedDemand) {
					aListItems[i].IsSelected = bIsSelected;
				}
			}
			oViewModel.setProperty("/QualificationMatchList/QualificationData", aListItems);
			oViewModel.refresh();
		},

		/**
		 * Return the Selected Demand object 
		 * @param oEvent
		 */
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
		/**
		 * Return the Selected Assignment object 
		 * @param oEvent
		 */
		getSelectedContexts: function (oTable, aSourceContexts, aListItems) {
			var aSelectedGuids = [],
				aSelectedContexts = [];
			if (oTable.isAllSelectableSelected()) {
				aSelectedContexts = aSourceContexts;
			} else {
				for (var i = 0; i < aListItems.length; i++) {
					if (aListItems[i].IsSelected && !aSelectedGuids.includes(aListItems[i].DemandGuid)) {
						aSelectedGuids.push(aListItems[i].DemandGuid);
					}
				}
				aSelectedContexts = aSourceContexts.filter(function (e) {
					return aSelectedGuids.includes(this.getModel().getProperty(e.getPath() + "/Demand/Guid"));
				});
			}
			return aSelectedContexts;
		},

		/**
		 * Return the Selected Demand Guids 
		 * @param oEvent
		 */
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