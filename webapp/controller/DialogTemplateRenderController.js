sap.ui.define([
	"com/evorait/evoplan/controller/TemplateRenderController",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/model/Constants"
], function (TemplateRenderController, Fragment, Constants) {
	"use strict";

	return TemplateRenderController.extend("com.evorait.evoplan.controller.DialogTemplateRenderController", {

		_oHelperModel: null,

		_oDialog: null,

		_oResourceBundle: null,

		_oView: null,

		_oModel: null,

		_mParams: {},

		/**
		 * overwrite constructor
		 * set manuel owner component for nested xml views
		 */
		constructor: function (oComponent) {
			this.setOwnerComponent(oComponent);
			TemplateRenderController.apply(this, arguments);
		},

		/**
		 * open dialog 
		 * and render annotation based SmartForm inside dialog content
		 */
		open: function (oView, mParams, sDialogController) {
			this._eventBus = sap.ui.getCore().getEventBus();
			this._oView = oView;
			this._oModel = oView.getModel();
			this._oResourceBundle = oView.getController().getOwnerComponent().getModel("i18n").getResourceBundle();
			this._mParams = mParams;
			this._oSmartTable = mParams.smartTable;
			this._component = this._oView.getController().getOwnerComponent();

			//set annotation path and other parameters
			this.setTemplateProperties(mParams);

			this._loadDialog(sDialogController);
		},

		/**
		 * load dialog fragment
		 * or get bacl already loaded dialog fragment
		 * @param oEvent
		 */
		onPressClose: function (oEvent) {
			this._oModel.resetChanges();
			this._oDialog.unbindElement();
			this._oDialog.close();
		},

		/**
		 * Save SmartForm
		 * @param oEvent
		 */
		onPressSave: function (oEvent) {
			var oContentView = this._oDialog.getContent()[0],
				oViewController = oContentView.getController(),
				aForms = oViewController.getAllSmartForms(oContentView.getControlsByFieldGroupId("smartFormTemplate"));

			if (aForms.length > 0 && oViewController.validateForm) {
				var mErrors = oViewController.validateForm(aForms);
				//if form is valid save created entry
				oViewController.saveChanges(mErrors, this._saveSuccessFn.bind(this), this._saveErrorFn.bind(this), this._oDialog);
			} else {
				//todo show message
			}
		},

		/**
		 * On press navigates to demand detail page of linked demand. 
		 * 
		 */
		onGotoDemand: function (oEvent) {
			var oRouter = this._component.getRouter(),
				oAssignment = oEvent.getSource().getParent().getBindingContext().getObject(),
				sDemandGuid = oAssignment.DemandGuid;

			this._oDialog.close();
			if (this._mParams.origin === Constants.ORIGIN.GANTT_DEMAND) {
				oRouter.navTo("ganttDemandDetails", {
					guid: sDemandGuid
				});
			} else if (this._mParams.origin === Constants.ORIGIN.GANTTSPLIT) {
				oRouter.navTo("splitGanttDetails", {
					guid: sDemandGuid
				});
			} else {
				oRouter.navTo("DemandDetail", {
					guid: sDemandGuid
				});
			}

		},

		/** 
		 * On unassign assignment of assignment the unassign function import will be called
		 * @param oEvent
		 */
		onDeleteAssignment: function (oEvent) {
			var sId = this._component.getModel("assignment").getProperty("/AssignmentGuid");
			if (this._mParameters && this._mParameters.bFromPlannCal) {
				this._eventBus.publish("AssignInfoDialog", "refreshAssignment", {
					unassign: true
				});
			} else {
				this._eventBus.publish("AssignInfoDialog", "deleteAssignment", {
					sId: sId,
					parameters: this._mParameters
				});
			}
			this.onPressClose();
		},

		/**
		 * Function to validate effort assignment save 
		 * 
		 */
		onSaveDialog: function (oEvent) {
			var oAssignment = oEvent.getSource().getParent().getBindingContext().getObject(),
				sDateFrom = oAssignment.DateFrom,
				sDateTo = oAssignment.DateTo,
				sEffort = oAssignment.Effort,
				iNewEffort = this.getEffortTimeDifference(sDateFrom, sDateTo),
				oResourceBundle = this._oView.getController().getResourceBundle();
			this.sAssignmentPath = oEvent.getSource().getParent().getBindingContext().getPath();

			if (Number(iNewEffort) < Number(sEffort)) {
				this._showEffortConfirmMessageBox(oResourceBundle.getText("xtit.effortvalidate")).then(function (oAction) {
					if (oAction === "YES") {
						this.onSaveAssignments(sDateFrom, sDateTo);
					}
				}.bind(this));

			} else {
				this.onSaveAssignments(sDateFrom, sDateTo);
			}
		},

		/**
		 * save form data
		 * @param oEvent
		 */
		onSaveAssignments: function (oDateFrom, oDateTo) {
			var sMsg = this._oView.getController().getResourceBundle().getText("ymsg.datesInvalid");
			if (oDateTo !== undefined && oDateFrom !== undefined) {
				oDateFrom = oDateFrom.getTime();
				oDateTo = oDateTo.getTime();
				// To Validate DateTo and DateFrom
				if (oDateTo >= oDateFrom) {
					if (this._mParams.origin === Constants.ORIGIN.PLANNING_CALENDER) {
						this._eventBus.publish("AssignInfoDialog", "refreshAssignment", {
							reassign: this.reAssign
						});
					} else {
						this._eventBus.publish("AssignInfoDialog", "updateAssignment", {
							isReassign: this.reAssign,
							parameters: this._mParams
						});
					}
					this.onPressClose();
				} else {
					this.showMessageToast(sMsg);
				}
			} else {
				this.showMessageToast(sMsg);
			}
		},

		onExit: function () {
			TemplateRenderController.prototype.onExit.apply(this, arguments);
			this._oDialog.destroy(true);
			this._oDialog = undefined;
		},

		/* =========================================================== */
		/* internal methods                                              */
		/* =========================================================== */

		/*
		 * init dialog with right fragment name
		 * and set context to the view
		 * @returns {sap.ui.core.Control|sap.ui.core.Control[]}
		 * @private
		 */
		_loadDialog: function (sDialogController) {
			if (!this._oDialog) {
				Fragment.load({
					name: "com.evorait.evoplan.view.fragments.FormDialog",
					controller: this,
					type: "XML"
				}).then(function (oFragment) {
					this._oDialog = oFragment;
					this._oDialog.addStyleClass(this._oView.getModel("viewModel").getProperty("/densityClass"));
					this._setFragmentViewBinding();
				}.bind(this));
			} else {
				this._setFragmentViewBinding();
			}
		},

		/**
		 * load new template and set inside dialog
		 * Bind dialog view to generated path
		 */
		_setFragmentViewBinding: function () {
			var sPath = this.getEntityPath(this._mParams.entitySet, this._mParams.pathParams, this._oView, this._mParams.sPath);

			this._oDialog.setBusy(true);
			this._oDialog.unbindElement();
			this._oDialog.bindElement(sPath);
			this._oDialog.setTitle(this._oResourceBundle.getText(this._mParams.title));
			this._oView.addDependent(this._oDialog);

			this._oModel.metadataLoaded().then(function () {
				//get template and create views
				this._mParams.oView = this._oView;
				this.insertTemplateFragment(sPath, this._mParams.viewName, "FormDialogWrapper", this._afterBindSuccess.bind(this,sPath), this._mParams);
			}.bind(this));

			this._oDialog.open();
		},

		/**
		 * What should happen after binding changed
		 */
		_afterBindSuccess: function (sPath) {
			this._oDialog.setBusy(false);
			this._component.assignInfoDialog.onOpen(this._oDialog, this._oView, null, null, null, sPath);
		},

		/**
		 * Saving was successful
		 * do further things after save
		 * @param oResponse
		 */
		_saveSuccessFn: function (oResponse) {
			this._oDialog.close();
			var responseCode = oResponse.__batchResponses[0].__changeResponses;
			if (responseCode) {
				if (responseCode[0].statusCode === "200" || responseCode[0].statusCode === "201" || responseCode[0].statusCode === "204") {
					var msg = this._oResourceBundle.getText("msg.saveSuccess");
					this.showMessageToast(msg);
					setTimeout(function () {
						if (this._oSmartTable) {
							this._oSmartTable.rebindTable();
						}
					}.bind(this), 1500);
				} else {
					//Todo show error message
				}
			}
		},

		/**
		 * Saving failed
		 * do further things after save
		 * @param oError
		 */
		_saveErrorFn: function (oError) {

		}

	});
});