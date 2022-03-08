sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentActionsController",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment"
], function (BaseController, models, formatter, Filter, FilterOperator, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.AssignmentStatus", {

		formatter: formatter,

		init: function () {
			this._eventBus = sap.ui.getCore().getEventBus();
		},

		/*
		 * open dialog
		 * @Author Chethan RK
		 * @since 2205
		 * @param oView
		 * @param aSelectedAssignments - selected Assignments before opening the dialog.
		 * @param mParameters 
		 * @param oAssignmentTable 
		 * init and get dialog view
		 * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
		 */
		open: function (oView, oSource, aSelectedAssignments, mParameters, oAssignmentTable) {
			this._oView = oView;
			this.aSelectedAssignments = aSelectedAssignments;
			this._mParameters = mParameters;
			this._oAssignmentTable = oAssignmentTable;
			// create dialog lazily
			if (!this._oDialog) {
				Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.AssignmentStatus",
					controller: this
				}).then(function (oDialog) {
					this._oDialog = oDialog;
					this._component = this._oView.getController().getOwnerComponent();
					this._oModel = this._component.getModel();
					oDialog.addStyleClass(this._component.getContentDensityClass());
					oView.addDependent(oDialog);
					this.onOpen(oSource);
				}.bind(this));
			} else {
				this.onOpen(oSource);
			}
		},

		/**
		 * Open's the popover
		 * @param oSource
		 */
		onOpen: function (oSource) {
			this._oView.getModel().resetChanges();
			// open popover
			this._oDialog.openBy(oSource);
		},
		/**
		 * OnChange of Assignment Status
		 * @param oEvent
		 * @Author Chethan RK
		 * @since 2205
		 */
		onChangeAssignmentStatus: function (oEvent) {
			var oSource = oEvent.getSource(),
				oContext = oSource.getBindingContext(),
				oSelectedFunction = oContext.getObject(),
				sFunctionKey = oSelectedFunction.Function,
				aAssignmentStatus = this._getAllowAssignmentStatusChange(sFunctionKey);
			if (aAssignmentStatus.length > 0) {
				this._proceedToAssignmentStatusServiceCall(aAssignmentStatus, sFunctionKey);
			} else {
				this._showAssignmentStatusErrorDialog();
			}
		},

		/**
		 * Checking whether the selected Function is allowed or not for Assignments
		 * @param oEvent
		 * @returns [aAssignmentStatus]
		 * @Author Chethan RK
		 * @since 2205
		 */
		_getAllowAssignmentStatusChange: function (sFunctionKey) {
			var aAssignmentStatus = [],
				sAllowFunction = "ALLOW_" + sFunctionKey,
				aSelectedAssignments = this.aSelectedAssignments;
			for (var a in aSelectedAssignments) {
				if (aSelectedAssignments[a].oData[sAllowFunction]) {
					aAssignmentStatus.push(aSelectedAssignments[a]);
				}
			}
			return aAssignmentStatus;
		},

		/**
		 * Function Import Call for changing Assignment Status
		 * @param [aAssignmentStatus]
		 * @param sFunctionKey
		 * @Author Chethan RK
		 * @since 2205
		 */
		_proceedToAssignmentStatusServiceCall: function (aAssignmentStatus, sFunctionKey) {
			var oParams, bLast,
				iAssignmentsLen = aAssignmentStatus.length - 1;
			for (var i in aAssignmentStatus) {
				bLast = false;
				oParams = {
					Function: sFunctionKey,
					AssignmentGUID: aAssignmentStatus[i].oData.Guid
				};
				if (parseInt(i) === iAssignmentsLen) {
					bLast = true;
				}
				this.executeFunctionImport.call(this._oView.getController(), this._oModel, oParams, "ExecuteAssignmentFunction", "POST").then(
					function (data) {
						if (bLast) {
							this._refreshAll();
						}
					}.bind(this));
			}
		},

		/**
		 * Error Message for Assignment Status
		 * @Author Chethan RK
		 * @since 2205
		 */
		_showAssignmentStatusErrorDialog: function () {
			var msg = this._oView.getModel("i18n").getResourceBundle().getText("assignmentNotPossible");
			var dialog = new sap.m.Dialog({
				title: "Error",
				type: "Message",
				state: "Error",
				content: new sap.m.FormattedText({
					htmlText: "<strong>" + msg + "</strong><br/><br/>"
				}),
				beginButton: new sap.m.Button({
					text: "OK",
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
		},

		/**
		 * Refreshing views after Assignment Status 
		 * @Author Chethan RK
		 * @since 2205
		 */
		_refreshAll: function () {
			if (!this._mParameters) {
				this._eventBus.publish("BaseController", "refreshDemandTable", {});
				this._eventBus.publish("BaseController", "refreshDemandGanttTable", {});
				this._eventBus.publish("BaseController", "refreshMapView", {});
			} else {
				if (this._mParameters.bFromHome) {
					this._eventBus.publish("BaseController", "refreshDemandTable", {});
				} else if (this._mParameters.bFromNewGantt || this._mParameters.bFromGantt) {
					this._eventBus.publish("BaseController", "refreshDemandGanttTable", {});
				} else if (this._mParameters.bFromMap) {
					this._eventBus.publish("BaseController", "refreshMapView", {});
				}
			}
			if (this._oAssignmentTable) {
				this._oAssignmentTable.removeSelections();
			}
		}
	});
});