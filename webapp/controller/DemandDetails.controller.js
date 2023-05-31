sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"sap/ui/core/Component",
	"com/evorait/evoplan/model/Constants"
], function (AssignmentsController, Component, Constants) {
	"use strict";

	return AssignmentsController.extend("com.evorait.evoplan.controller.DemandDetails", {

		oViewModel: null,
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * worklist on init
		 */
		onInit: function () {
			this.oViewModel = this.getModel("viewModel");

			this._eventBus = sap.ui.getCore().getEventBus();
			//event registration for refreshing the context in case any change in the view
			this._eventBus.subscribe("BaseController", "refreshDemandOverview", this._triggerRefreshDemand, this);

		},

		/**
		 * Object on exit
		 */
		onExit: function () {
			this.getView().unbindElement();
			this._eventBus.unsubscribe("BaseController", "refreshDemandOverview", this._triggerRefreshDemand, this);
		},

		/* =========================================================== */
		/* Events                                                      */
		/* =========================================================== */

		/**
		 * on press back button
		 * @param oEvent
		 */
		navBack: function (oEvent) {
			this.getView().unbindElement();
			this.onNavBack();
		},

		/**
		 * when ObjectStatus in header is visible as active 
		 * show app to app navigation popup
		 */
		onPressObjectStatus: function (oEvent) {
			var oSource = oEvent.getSource();
			this.openApp2AppPopover(oSource, oSource.data("url"));
		},

		getSetFunction: function (a, b, c, d) {
			return a && !b && c !== "COMP" && d;
		},

		getVisible: function (a, b, c, d, e) {
			return a && !b && c !== "COMP" && d && !e;
		},

		/**
		 * Opens the AssignDialog to assign the demand to resources
		 * @Author Rahul
		 * @return
		 * @param oEvent
		 */
		onClickAssign: function (oEvent) {
			var oSource = oEvent.getSource(),
				oContext = oSource.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oData = oModel.getProperty(sPath),
				oSelectedData = [{
					sPath: sPath,
					oData: oData
				}];
			if (oData.ALLOW_ASSIGN) {
				this.getModel("viewModel").setProperty("/dragSession", oSelectedData);
				this.onShowOperationTimes(this.getModel("viewModel"));
				this.onAllowVendorAssignment(this.getModel("viewModel"), this.getModel("user"));

				this.localStorage.put("Evo-Action-page", "DemandDetails");
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedData, false, {
					bFromDetail: true
				});
			} else {
				this._showAssignErrorDialog([this.getMessageDescWithOrderID(oData)]);
			}
		},

		/**
		 * Opens the StatusDialog to set status for demand 
		 * @Author Chethan
		 * @return
		 * @param oEvent
		 */
		onClickSetFunction: function (oEvent) {
			var oSource = oEvent.getSource(),
				oContext = oSource.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oData = oModel.getProperty(sPath),
				oSelectedData = [{
					sPath: sPath,
					oData: oData
				}];
			this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedData, {
				bFromDetail: true
			});

		},

		/**
		 * open's a action sheets with possible statuses. 
		 */
		onClickAction: function (oEvent) {
			this.localStorage.put("Evo-Action-page", "DemandDetails");
			this.getView().byId("idStatusActionSheet").openBy(oEvent.getSource());
		},

		/**
		 * Opens the AssignInfo dialog to update the assignment
		 * @Author Rahul
		 * @return
		 * @param oEvent
		 */
		onRowClick: function (oEvent) {
			var oAssignment = oEvent.getParameter("listItem"),
				oContext = oAssignment.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oAssignmentData = oModel.getProperty(sPath),
				mParameters = {
					bFromDetail: true
				},
				oDemandContext = this.getView().getBindingContext().getObject();
			this.localStorage.put("Evo-Action-page", "DemandDetails");
			this.openAssignInfoDialog(this.getView(), sPath, oContext, mParameters, oDemandContext);
		},

		/**
		 * Opens the StatusDialog to change status
		 * @Author Rahul
		 * @return
		 * @param oEvent
		 */
		onClickStatus: function (oEvent) {
			var oSource = oEvent.getSource(),
				sBindingPath = oEvent.getSource().getBinding("visible").getPath(),
				sFunctionKey = sBindingPath.slice(sBindingPath.indexOf("_") + 1),
				oContext = oSource.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oData = oModel.getProperty(sPath),
				oSelectedData = [{
					sPath: sPath,
					oData: oData
				}];

			this._eventBus.publish("StatusSelectDialog", "changeStatusDemand", {
				selectedPaths: oSelectedData,
				functionKey: sFunctionKey,
				parameters: {
					bFromDetail: true
				}
			});
		},
		
		/**
		 * This method required when user directly open the demand overview page
		 * and change status or assignment actions are performed
		 * Refresh the binding to ensure that the data shown is updated.
		 * @Author Rahul
		 * @return
		 */
		_triggerRefreshDemand: function () {
			this.getView().getElementBinding().refresh();
		},
		

	});
});