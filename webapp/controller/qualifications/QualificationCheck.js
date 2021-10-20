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
			// keeping this method empty as this is being used for initialize only
		},

		/**
		 * Initialize the dialog for Qualification Match results 
		 * @param that
		 * @param oView
		 * @param mParameters
		 */
		open: function (that, oView, mParameters, successCallbackFn, errorCallbackFn) {
			this.oView = oView;
			this.fnSuccessCallback = successCallbackFn;
			this.fnErrorCallback = errorCallbackFn;

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
			if (this.fnErrorCallback) {
				this.fnErrorCallback();
			}
			var mParams = this.oView.getModel("viewModel").getProperty("/QualificationMatchList/mParameter");
			//when from new gantt shape busy state needs removed
			if (mParams && mParams.bCustomBusy && (mParams.bFromNewGantt || mParams.bFromNewGanttSplit)) {
				this.oView.getModel("ganttModel").setProperty(mParams.sSourcePath + "/busy", false);
			}
			this._oDialog.close();
		},

		/**
		 * proceed to assgin the selected items from Qualification match Table 
		 * @param oEvent
		 */
		onProceed: function (oEvent) {
			var oTable = sap.ui.getCore().byId("idQualificationMatchTable"),
				oViewModel = oTable.getModel("viewModel"),
				aQualificationMatchList = oViewModel.getProperty("/QualificationMatchList"),
				aQualificationItems = aQualificationMatchList.QualificationData, //rename Variable
				aSourcePaths = aQualificationMatchList.SourcePaths,
				oContext = aQualificationMatchList.Contexts,
				targetObj = aQualificationMatchList.TargetObject,
				sAssignPath = aQualificationMatchList.AssignPath,
				mParameters = aQualificationMatchList.mParameter,
				oParams = aQualificationMatchList.oParams,
				oTargetDate = aQualificationMatchList.targetDate,
				oNewEndDate = aQualificationMatchList.newEndDate,
				aGuids = aQualificationMatchList.aGuids,
				sSourceMethod = aQualificationMatchList.SourceMethod,
				aSelectedSourcePaths = [],
				aSelectedGuids = [];

			//Check for no Items selected to Proceed
			if (!oTable.getSelectedItems().length) {
				MessageToast.show(this.getResourceBundle().getText("xmsg.msgItemSelect"));
				return;
			}
			//getting Selected Demands based on the Available parameter
			if (aSourcePaths || oContext) {
				aSelectedSourcePaths = this.getSelectedSources(oTable, aSourcePaths, oContext, aQualificationItems);
			} else {
				aSelectedGuids = this.getSelectedDemands(oTable, aGuids, aQualificationItems);
			}
			//based on the opertion different method calls
			switch (sSourceMethod) {
			case "assignedDemands":
				if (this.fnSuccessCallback) {
					this.fnSuccessCallback();
					break;
				}
				this.proceedToServiceCallAssignDemands(aSelectedSourcePaths, targetObj, mParameters, oParams);
				break;
			case "bulkReAssignment":
				this.bulkReAssignmentFinalCall(sAssignPath, aSelectedSourcePaths, mParameters);
				break;
			case "UpdateAssignment":
				this.callFunctionImport(oParams, "UpdateAssignment", "POST", mParameters, true);
				break;
			default: //Case for update Assignment from Gantt 
				if (this.fnSuccessCallback) {
					this.fnSuccessCallback();
					break;
				}
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
				aQualificationItems = oViewModel.getProperty("/QualificationMatchList/QualificationData"),
				oSelectedPath = oEvent.getParameter("listItem").getBindingContextPath(),
				bIsSelected = oEvent.getParameter("listItem").getSelected(),
				vSelectedDemand = oViewModel.getProperty(oSelectedPath) ? oViewModel.getProperty(oSelectedPath).DemandGuid : null;

			for (var i = 0; i < aQualificationItems.length; i++) {
				if (aQualificationItems[i].DemandGuid === vSelectedDemand) {
					aQualificationItems[i].IsSelected = bIsSelected;
				}
			}
			oViewModel.setProperty("/QualificationMatchList/QualificationData", aQualificationItems);
			oViewModel.refresh();
		},

		/**
		 * Return the Selected Demand object/paths 
		 * @param oEvent
		 */
		getSelectedSources: function (oTable, aSourcePaths, aSourceContexts, aQualificationItems) {
			var aSelectedGuids = this.getSelectedGuids(aQualificationItems),
				aSelectedSources = [];
			if (oTable.isAllSelectableSelected()) {
				// aSelectedSources = aSourcePaths;
				aSelectedSources = aSourcePaths ? aSourcePaths : aSourceContexts;
				return aSelectedSources;
			}
			if (aSourcePaths) {
				aSelectedSources = aSourcePaths.filter(function (e) {
					return aSelectedGuids.includes(e.oData.Guid);
				});
			} else {
				aSelectedSources = aSourceContexts.filter(function (e) {
					return aSelectedGuids.includes(this.getModel().getProperty(e.getPath() + "/Demand/Guid"));
				}.bind(this));
			}
			return aSelectedSources;
		},
		getSelectedGuids: function (aQualificationItems) {
			var aSelectedGuids = [];
			for (var i = 0; i < aQualificationItems.length; i++) {
				if (aQualificationItems[i].IsSelected && !aSelectedGuids.includes(aQualificationItems[i].DemandGuid)) {
					aSelectedGuids.push(aQualificationItems[i].DemandGuid);
				}
			}
			return aSelectedGuids;
		},

		/**
		 * Return the Selected Demand Guids 
		 * @param oEvent
		 */
		getSelectedDemands: function (oTable, aGuids, aQualificationItems) {
			var aSelectedGuids = [];
			if (oTable.isAllSelectableSelected()) {
				aSelectedGuids = aGuids;
			} else {
				//TODO the else part would never be executing as single selectio is being used for Gantt, keeping these code for Future use
				// for (var i = 0; i < aQualificationItems.length; i++) {
				// 	if (aQualificationItems[i].IsSelected && !aSelectedGuids.includes(aQualificationItems[i].DemandGuid)) {
				// 		aSelectedGuids.push("/DemandSet('" + aQualificationItems[i].DemandGuid + "')");
				// 	}
				// }
			}
			return aSelectedGuids;
		}
	});
});