sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment"
], function (BaseController, models, formatter, Filter, FilterOperator, Fragment) {
	"use strict";
	/**
	 * Created for Fixed Appointment Feature 
	 * available since Release/2201
	 */
	return BaseController.extend("com.evorait.evoplan.controller.common.MaterialInfoDialog", {

		formatter: formatter,
		_bFirstTime: false,
		init: function () {},

		/**
		 * open dialog
		 * get detail data from resource and resource group
		 * @param oView
		 * @param sBindPath
		 */
		open: function (oView, aFixedAppointmentPayload, aAllParameters, mParameters, sSource, isReassign) {
			// create dialog lazily
			if (!this._FixedAppointmentsDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.FixedAppointmentsList",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					this._FixedAppointmentsDialog = oDialog;
					oView.addDependent(oDialog);
					this._component = oView.getController().getOwnerComponent();
					oDialog.addStyleClass(this._component.getContentDensityClass());
					this._oEventBus = sap.ui.getCore().getEventBus();
					this.onOpen(oDialog, oView, aFixedAppointmentPayload, aAllParameters, mParameters, sSource, isReassign);
				}.bind(this));
			} else {
				this.onOpen(this._FixedAppointmentsDialog, oView, aFixedAppointmentPayload, aAllParameters, mParameters, sSource, isReassign);
			}
		},

		onOpen: function (oDialog, oView, aFixedAppointmentPayload, aAllParameters, mParameters, sSource, isReassign) {
			this._oView = oView;
			this._aAllParameters = aAllParameters;
			this._aFixedAppointmentPayload = aFixedAppointmentPayload;
			this._mParameters = mParameters || {
				bFromHome: true
			};
			this.sSource = sSource;
			this.isReassign = isReassign;
			// open dialog
			oDialog.open();
		},
		/**
		 * Select All items in the Qualication match table
		 * @param oEvent
		 */
		onAssignmentDateCheckSelectAll: function (oEvent) {
			sap.ui.getCore().byId("idFixedAppointmentsList").selectAll();
		},

		onProceed: function () {
			var oViewModel = this._oView.getModel('viewModel'),
				aFixedAppointments = oViewModel.getProperty("/aFixedAppointmentsList"),
				oAssignment,
				demandObj,
				bIsLast = false;

			if (this.sSource === "Gantt" || this.sSource === "OldGantt") {
				var sChannel = this.sSource === "Gantt" ? "GanttFixedAssignments" : "OldGanttFixedAssignments";

				this._oEventBus.publish(sChannel, "assignDemand", {
					oResourceData: this._aFixedAppointmentPayload.oResourceData,
					sDragPath: this._aFixedAppointmentPayload.sDragPath,
					oTarget: this._aFixedAppointmentPayload.oTarget,
					oTargetDate: aFixedAppointments[0].IsSelected ? aFixedAppointments[0].FIXED_APPOINTMENT_START_DATE : this._aFixedAppointmentPayload
						.DateFrom
				});
				this._FixedAppointmentsDialog.close();
				return;
			}

			if (this.sSource === "Gantt-Split" || this.sSource === "OldGantt-Split") {
				var sChannel = this.sSource === "Gantt-Split" ? "GanttFixedAssignments" : "OldGanttFixedAssignments";

				this._oEventBus.publish(sChannel, "assignDemand", {
					oResourceData: this._aFixedAppointmentPayload.oResourceData,
					sDragPath: null,
					oTarget: this._aFixedAppointmentPayload.oTarget,
					oTargetDate: aFixedAppointments[0].IsSelected ? aFixedAppointments[0].FIXED_APPOINTMENT_START_DATE : this._aFixedAppointmentPayload
						.DateFrom,
					aGuids: this._aFixedAppointmentPayload.sDragPath
				});
				this._FixedAppointmentsDialog.close();
				return;
			}

			for (var i in aFixedAppointments) {
				demandObj = aFixedAppointments[i];
				oAssignment = this.sSource === "reAssign" ? this._aFixedAppointmentPayload : this._aFixedAppointmentPayload[i];
				if (demandObj.IsSelected) {
					oAssignment.DateFrom = demandObj.FIXED_APPOINTMENT_START_DATE;
					oAssignment.TimeFrom.ms = oAssignment.DateFrom.getTime();
					oAssignment.DateTo = demandObj.FIXED_APPOINTMENT_END_DATE;
					oAssignment.TimeTo.ms = oAssignment.DateTo.getTime();
				}
				this._aAllParameters.push(oAssignment);
			}
			//final service call will be done with this payload
			if (this.sSource === "reAssign") {
				var oData = this._oView.getModel("assignment").getData();
				if (this.isReassign && oData.NewAssignPath && !this.isAvailable.call(this._oView.getController(), oData.NewAssignPath)) {
					this.showMessageToProceed.call(this._oView.getController(), null, null, null, null, true, this._aAllParameters[0], this._mParameters);
				} else {
					// Proceed to check the Qualification for UpdateAssignment
					this.checkQualificationUpdate.call(this._oView.getController(), oData, this._aAllParameters[0], this._mParameters);
				}
			} else {
				var sMethod = this.sSource === "bulkReAssignment" ? "UpdateAssignment" : "CreateAssignment";
				for (i = 0; i < this._aAllParameters.length; i++) {
					if (parseInt(i, 10) === this._aAllParameters.length - 1) {
						bIsLast = true;
					}
					this.callFunctionImport.call(this._oView.getController(), this._aAllParameters[i], sMethod, "POST", this._mParameters,
						bIsLast);
				}
			}
			this.onCloseDialog("afterProceed");
		},

		/**
		 * close dialog
		 */
		onCloseDialog: function (oEvent) {
			if (oEvent !== "afterProceed" && this._aAllParameters && this._aAllParameters.length) {
				var bIsLast = false,
					sMethod = this.sSource === "bulkReAssignment" ? "UpdateAssignment" : "CreateAssignment";
				//final service call will be done with this payload 
				for (var i = 0; i < this._aAllParameters.length; i++) {
					if (parseInt(i, 10) === this._aAllParameters.length - 1) {
						bIsLast = true;
					}
					this.callFunctionImport.call(this._oView.getController(), this._aAllParameters[i], sMethod, "POST", this._mParameters,
						bIsLast);
				}
			}
			sap.ui.getCore().byId("idFixedAppointmentsList").removeSelections();
			this._FixedAppointmentsDialog.close();
		}
	});
});