sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast"
], function (BaseController, models, formatter, Filter, FilterOperator, Fragment,MessageToast) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.NetworkAssignment", {

		formatter: formatter,
		_bFirstTime: false,

		init: function () {
			// keeping this method empty as this is being used for initialize only
		},
		/**
		 * Initializing the Dialog 
		 * @param oView
		 * @param sPath
		 * @param aPSDemandPaths
		 * @param mParameters
		 * @param oDraggedControl
		 * @param oDroppedControl
		 * @param oBrowserEvent
		 */
		open: function (oView, sPath, aPSDemandPaths, mParameters, oDraggedControl, oDroppedControl, oBrowserEvent) {
			this._oView = oView;
			this._sPath = sPath;
			this._aPSDemandPaths = aPSDemandPaths;
			this.oDraggedControl = oDraggedControl;
			this.oDroppedControl = oDroppedControl;
			this.oBrowserEvent = oBrowserEvent;
			if (!this._oDialog) {
				this._oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.NetworkAssignment",
					controller: this
				}).then(function (oDialog) {
					this._oView.getModel("appView").setProperty("/busy", false);
					this._oDialog = oDialog;
					this.onOpen(oDialog, mParameters);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, mParameters);
			}
		},

		/**
		 * Opening the Dialog 
		 * @param oDialog
		 * @param mParameters
		 */
		onOpen: function (oDialog, mParameters) {
			this._mParameters = mParameters;
			this._oController = this._oView.getController();
			this._component = this._oController.getOwnerComponent();
			oDialog.addStyleClass(this._component.getContentDensityClass());
			// connect dialog to view (models, lifecycle)
			this._oView.addDependent(oDialog);
			// open dialog
			oDialog.open();
			this._getPSNetworkDemands(this._aPSDemandPaths);
		},

		_getPSNetworkDemands: function (aSelectedPaths) {
			if (aSelectedPaths.length > 0 && this._bFirstTime) {
				var oSmartTable = sap.ui.getCore().byId("idNetworkDemandTable");
				oSmartTable.rebindTable();
			}
			this._bFirstTime = true;
		},

		onBeforeRebindTable: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oBinding = oParams.bindingParams,
				aFilter = new Filter(this._getPSDemandFilters(this._aPSDemandPaths), true);
			oBinding.filters = [new Filter(aFilter, true)];
		},

		/**
		 * Return resource filters on selected paths
		 * @param _aPSDemandPaths {Array} Selected PS Demands
		 * @return aFilters Demand Filters
		 */
		_getPSDemandFilters: function (_aPSDemandPaths) {
			var aDemandGuid = [],
				aFilters = [];
			for (var i = 0; i < _aPSDemandPaths.length; i++) {
				var sPath = _aPSDemandPaths[i].sPath,
					sGuid = this._oView.getModel().getProperty(sPath).Guid;
				aDemandGuid.push(new Filter("Guid", FilterOperator.EQ, sGuid));
			}
			aFilters.push(new Filter({
				filters: aDemandGuid,
				and: false
			}));
			return aFilters;
		},

		/**
		 * Method for validating Normal Duration logic
		 * @param oEvent
		 */
		onValidateDuration: function (oEvent) {
			var oSource = oEvent.getSource(),
				sDurationHrs = oSource.getValue(),
				oContext = oSource.getBindingContext(),
				sRemainingHrs = oContext.getObject().REMAINING_DURATION,
				oResourceBundle = this._oView.getController().getResourceBundle();
			var sMsg = oResourceBundle.getText("ymsg.negativeLineItemDuration", [oContext.getObject().ORDERID, oContext.getObject().OPERATIONID]);
			if (sDurationHrs.includes("-") || Number(sDurationHrs) <= 0) {
				MessageToast.show(sMsg);
			} else if (Number(sDurationHrs) > Number(sRemainingHrs)) {
				MessageToast.show(sMsg);
			}
		},

		/**
		 * Method for validating Normal Duration logic onClick of Proceed
		 */
		onValidateAllPSDemands: function () {
			var oTable = sap.ui.getCore().byId("idNetworkDemandTable").getTable(),
				aItems = oTable.getItems(),
				bValid = true,
				oResourceBundle = this._oView.getController().getResourceBundle(),
				iCount;
			for (var i in aItems) {
				var oContext = aItems[i].getBindingContext(),
					oItem = oContext.getObject();
				iCount = Number(i) + 1;
				var sMsg = oResourceBundle.getText("ymsg.negativeLineItemDuration", [oItem.ORDERID, oItem.OPERATIONID]);
				if (oItem.DURATION.includes("-") || Number(oItem.DURATION) <= 0) {
					MessageToast.show(sMsg);
					bValid = false;
					break;
				} else if (Number(oItem.DURATION) > Number(oItem.REMAINING_DURATION)) {
					MessageToast.show(sMsg);
					bValid = false;
					break;
				}
				this.onUpdatingDraggedDemands(oItem);
			}
			return bValid;
		},

		/**
		 * Method for updating Duration and Duration Unit for the Dragged Demands in viewModel  
		 * @param oItem
		 */
		onUpdatingDraggedDemands: function (oItem) {
			var aDraggedDemands = this._oView.getModel("viewModel").getProperty("/dragSession");
			for (var d in aDraggedDemands) {
				if (aDraggedDemands[d].oData.Guid === oItem.Guid) {
					aDraggedDemands[d].oData.Duration = oItem.DURATION === "" ? "0" : oItem.DURATION;
					aDraggedDemands[d].oData.DurationUnit = oItem.DURATION_UNIT;
				}
			}
		},
		/**
		 * onClick of Proceed
		 */
		onProceedNetworkAssignment: function () {
			var bValidationCheck = this.onValidateAllPSDemands();
			if (bValidationCheck) {
				var oTargetData,
					aSources = this._oView.getModel("viewModel").getProperty("/dragSession"),
					iOperationTimesLen = this.onShowOperationTimes(this._oView.getModel("viewModel")),
					iVendorAssignmentLen = this.onAllowVendorAssignment(this._oView.getModel("viewModel"), this._oView.getModel("user"));
				this._oDialog.close();
				if (this._mParameters && (this._mParameters.bFromNewGantt || this._mParameters.bFromNewGanttSplit)) {
					oTargetData = this._sPath;
				} else {
					oTargetData = this._oView.getModel().getProperty(this._sPath);
				}
				if (this._oView.getModel("user").getProperty("/ENABLE_EXTERNAL_ASSIGN_DIALOG") && oTargetData.ISEXTERNAL && aSources.length !==
					iVendorAssignmentLen) {
					this._component.VendorAssignment.open(this._oView, this._sPath, this._mParameters, this.oDraggedControl, this.oDroppedControl,
						this.oBrowserEvent);
				} else if (this._oView.getModel("user").getProperty("/ENABLE_ASGN_DATE_VALIDATION") && iOperationTimesLen !== aSources.length &&
					oTargetData.NodeType ===
					"RESOURCE") {
					this._component.OperationTimeCheck.open(this._oView, this._mParameters, this._sPath, this.oDraggedControl, this.oDroppedControl,
						this.oBrowserEvent);
				} else {
					if (!this._mParameters) {
						this._component.assignTreeDialog.onProceedSaveDialog();
					} else {
						if (this._mParameters.bFromGantt) {
							this._oController.onProceedToGanttDropOnResource(this.oDraggedControl, this.oDroppedControl, this.oBrowserEvent);
						} else if (this._mParameters.bFromNewGantt || this._mParameters.bFromNewGanttSplit) {
							this._oController.onProceedNewGanttDemandDrop(this.oDraggedControl, this.oDroppedControl, this.oBrowserEvent);
						} else {
							this._oController.assignedDemands(aSources, this._sPath, this._mParameter);
						}
					}
				}
			}
		},

		/**
		 * Closing Dialog
		 */
		onCancelNetworkAssignment: function () {
			this._oDialog.close();
		}

	});
});