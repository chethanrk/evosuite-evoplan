sap.ui.define([
	"com/evorait/evosuite/evoorder/controller/FormController",
	"com/evorait/evosuite/evoorder/controller/TableController",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Filter",
	"sap/ui/core/mvc/OverrideExecution"
], function (FormController, TableController, MessageBox, Fragment, FilterOperator, Filter, OverrideExecution) {
	"use strict";

	return FormController.extend("com.evorait.evosuite.evoorder.block.operations.OperationsBlockController", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {

				onAfterVariantInitialise: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.After
				},

				onBusyStateChanged: {
					public: true,
					final: false,
					overrideExecution: OverrideExecution.After
				},

				onPressNavigation: {
					public: true,
					final: true
				},

				onPressAssignToMe: {
					public: true,
					final: true
				},

				showLongText: {
					public: true,
					final: true
				},

				addOperation: {
					public: true,
					final: true
				},

				editOperation: {
					public: true,
					final: true
				},

				copyOperation: {
					public: true,
					final: true
				},

				splitOperation: {
					public: true,
					final: true
				},

				handleSelectionChange: {
					public: true,
					final: true
				},

				onChangeFinalConfirmation: {
					public: true,
					final: true
				},

				onPressChangeOperationStatus: {
					public: true,
					final: true
				},

				onSelectStatus: {
					public: true,
					final: true
				}

			}
		},

		isLoaded: false,

		_oSmartTable: null,
		_oTable: null,
		_rows: 0,
		_oOperationContext: null,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {
			this._oSmartTable = this.getView().byId("idOperationsTable");
			this._oTable = this._oSmartTable.getTable();
			this._oTable.attachBusyStateChanged(this.onBusyStateChanged, this);
			this.getModel("viewModel").setProperty("/singleSelectedOperation", false);
		},

		/**
		 * called when object is exited
		 */
		onExit: function () {
			this.getView().unbindElement();
			this.destroyOperationStatusSheet();
		},

		onAfterRendering: function () {
			this._oResoucreBundle = this.getView().getModel("i18n").getResourceBundle();
			// Calling from here because we will get IS_STANDING_ORDER value after rendering
			this._oSmartTable.attachAfterVariantInitialise(this.onAfterVariantInitialise, this);
			this._oSmartTable.attachAfterVariantApply(this.onAfterVariantApply, this);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * SmartTable before loading request
		 * concat default SortOrder and RequestAtLeast from annotations
		 * @param oEvent
		 */
		onBeforeRebindTable: function (oEvent) {
			TableController.prototype.onBeforeRebindTable.apply(this, arguments);
		},

		/**
		 * Called when on after variant initialize
		 * Each time when visit the page
		 */
		onAfterVariantInitialise: function (oEvent) {
			var oCustomSwitchColumn = this.getView().byId("idCustomColSwitch"),
				oViewModelData = this.getModel("viewModel");
			if (oCustomSwitchColumn && oViewModelData) {
				this._handleCustColValidation(oCustomSwitchColumn, oViewModelData);
			}
		},

		/**
		 * Called when on after variant applied
		 * Each time When changed between different the variants
		 */
		onAfterVariantApply: function (oEvent) {
			var oCustomSwitchColumn = this.getView().byId("idCustomColSwitch"),
				oViewModel = this.getModel("viewModel");

			if (oCustomSwitchColumn && oViewModel && oCustomSwitchColumn.getVisible()) {
				this._handleCustColValidation(oCustomSwitchColumn, oViewModel);
			}
		},

		onBusyStateChanged: function (oEvent) {
			var parameters = oEvent.getParameters();
			if (parameters.busy === false) {
				var oRowsBinding = this._oTable.getBinding("rows");
				this._oTable.setVisibleRowCount(oRowsBinding.getLength());
				this.getModel("viewModel").setProperty("/operationsRowsCount", oRowsBinding.getLength());

				//experimental in UI5
				//Triggers automatic resizing of a column to the widest content
				if (this._oTable.autoResizeColumn) {
					var aColumns = this._oTable.getColumns();
					for (var i = aColumns.length; i > 0; i--) {
						this._oTable.autoResizeColumn(i);
					}
				}
				this._oTable.setFixedColumnCount(2);
			}
		},

		/**
		 * navigate to operation detail page
		 */
		onPressNavigation: function (oEvent) {
			var oRow = oEvent.getParameter("row"),
				oContext = oRow.getBindingContext();

			this.getRouter().navTo("OperationDetail", {
				ObjectKey: oContext.getProperty("ObjectKey"),
				OrderType: oContext.getProperty("ORDER_TYPE")
			});
		},

		/**
		 * Press assign to me button
		 */
		onPressAssignToMe: function (oEvent) {
			this.assignOperationToMe(oEvent.getSource().getBindingContext(), this._oSmartTable);
		},

		/**
		 * Called on click of Long text indicator
		 * @param oEvent
		 */
		showLongText: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext();
			var longText = oContext.getProperty("NOTES");
			this.displayLongText(longText);
		},

		/**
		 * Add new operation
		 */
		addOperation: function () {
			var mParams = {
				viewName: this.setViewNameWithOrderType("com.evorait.evosuite.evoorder.view.templates.DialogContentWrapper#AddOperation"),
				annotationPath: this.setViewNameWithOrderType("com.sap.vocabularies.UI.v1.Facets#AddOperation"),
				entitySet: "WOOperationSet",
				controllerName: "AddEditOperation",
				title: "tit.addOperation",
				type: "add",
				section: "addOpr",
				smartTable: this._oSmartTable,
				splittedViewTableConfigs: this.getModel("templateProperties").getProperty("/Configs/CreateOpTables")
			};
			this.getOwnerComponent().DialogTemplateRenderer.open(this.getView(), mParams);
		},

		/**
		 * edit an selected operation
		 */
		editOperation: function () {
			if (this._oOperationContext) {
				var mParams = {
					viewName: this.setViewNameWithOrderType("com.evorait.evosuite.evoorder.view.templates.DialogContentWrapper#EditOperation"),
					annotationPath: this.setViewNameWithOrderType("com.sap.vocabularies.UI.v1.Facets#AUCOperation"),
					entitySet: "WOOperationSet",
					controllerName: "AddEditOperation",
					title: "tit.editOperation",
					type: "edit",
					sPath: this._oOperationContext.getPath(),
					section: "editOpr",
					smartTable: this._oSmartTable
				};
				this.getOwnerComponent().DialogTemplateRenderer.open(this.getView(), mParams);
				this._oTable.clearSelection(true);
			} else {
				var msg = this.getView().getModel("i18n").getResourceBundle().getText("msg.operationSelectAtLeast");
				this.showMessageToast(msg);
			}
		},

		/**
		 * copy a selected operation
		 */
		copyOperation: function () {
			if (this._oOperationContext) {
				var mParams = {
					viewName: this.setViewNameWithOrderType("com.evorait.evosuite.evoorder.view.templates.DialogContentWrapper#CopyOperation"),
					annotationPath: this.setViewNameWithOrderType("com.sap.vocabularies.UI.v1.Facets#AUCOperation"),
					entitySet: "WOOperationSet",
					controllerName: "AddEditOperation",
					title: "tit.copyOperation",
					type: "copy",
					selected: this._oOperationContext,
					section: "copyOpr",
					smartTable: this._oSmartTable
				};
				this.getOwnerComponent().DialogTemplateRenderer.open(this.getView(), mParams);
				this._oTable.clearSelection(true);
			} else {
				var msg = this.getView().getModel("i18n").getResourceBundle().getText("msg.operationSelectAtLeast");
				this.showMessageToast(msg);
			}
		},

		/**
		 * Event to split duaration of operation
		 */
		splitOperation: function () {
			if (this._oOperationContext) {
				var mParams = {
					viewName: this.setViewNameWithOrderType("com.evorait.evosuite.evoorder.view.templates.DialogContentWrapper#SplitOperation"),
					annotationPath: this.setViewNameWithOrderType("com.sap.vocabularies.UI.v1.Facets#SplitOperation"),
					entitySet: "WOOperationSet",
					controllerName: "AddEditOperation",
					title: "tit.splitOperation",
					type: "split",
					selected: this._oOperationContext,
					section: "splitOpr",
					smartTable: this._oSmartTable
				};
				this.getOwnerComponent().DialogTemplateRenderer.open(this.getView(), mParams);
				this._oTable.clearSelection(true);
			} else {
				var msg = this.getView().getModel("i18n").getResourceBundle().getText("msg.operationSelectAtLeast");
				this.showMessageToast(msg);
			}
		},

		/**
		 *  save selected context
		 * @param oEvent
		 */
		handleSelectionChange: function (oEvent) {
			this._oOperationContext = oEvent.getParameter("rowContext");
			var aSelected = this._oSmartTable.getTable().getSelectedIndices();
			this.getModel("viewModel").setProperty("/singleSelectedOperation", aSelected.length === 1);
		},

		/**
		 * handle final confirmation
		 * @param oEvent
		 */
		onChangeFinalConfirmation: function (oEvent) {
			this.oCtrl = oEvent.getSource().getParent().getParent();
			this.oOperationData = oEvent.getSource().getBindingContext().getObject();
			this.oParentObj = oEvent.getSource().getParent().getParent().getBindingContext().getObject();
			this.oModel = this.getModel();
			this.oOperationSwitch = oEvent.getSource();

			if (this.oOperationData.IS_CHECKLIST_RELEVANT && this.oOperationData.IS_CHECKLIST_INITIAL) {
				var sWarnMsg = this._oResoucreBundle.getText("msg.isChecklistRelevantWarning", [this.oOperationData.OPERATION_NUMBER]);
				this._confirmFinalConfirmationDialog("Warning", sWarnMsg);
			} else {
				this._confirmFinalConfirmationDialog();
			}
		},

		/**
		 * Click event on operation status icon
		 */
		onPressChangeOperationStatus: function (oEvent) {
			if (this._oOperationContext) {
				this.setOperationStatusButtonVisibility(this._oOperationContext.getObject());
				//Check status availability
				if (this._checkOperationStatusButtonVisibility()) {
					this.openOperationStatusDropdown(oEvent.getSource());
				} else {
					var msgValidation = this.getView().getModel("i18n").getResourceBundle().getText("msg.userStatusAvailability");
					this.showMessageToast(msgValidation);
				}
			} else {
				var msg = this.getView().getModel("i18n").getResourceBundle().getText("msg.operationSelectAtLeast");
				this.showMessageToast(msg);
			}
		},

		/**
		 * Save the selected status
		 * @param oEvent
		 */
		onSelectStatus: function (oEvent) {
			this.updateStatus(oEvent, this._oOperationContext.getPath(), this._oOperationContext.getObject(), null, this._oSmartTable);
			this._oOperationContext = null;
		},

		/**
		 * delete multiple selected operations
		 * @param oEvent
		 */
		deleteOperation: function (oEvent) {
			var oTable = this._oSmartTable.getTable(),
				aSelectedIdx = oTable.getSelectedIndices(),
				aSelected = [],
				sTitle = this.getResourceBundle().getText("tit.confirmDeleteSelected"),
				sMsg = this.getResourceBundle().getText("msg.confirmOperationDelete");

			if (aSelectedIdx.length > 0) {
				aSelectedIdx.forEach(function (sIdx) {
					aSelected.push(oTable.getContextByIndex(sIdx));
				});
				var successFn = function () {
					this.deleteEntries(aSelected, this._oSmartTable).then(function () {
						this.getModel("viewModel").setProperty("/singleSelectedOperation", false);
					}.bind(this));
				};
				this.showConfirmDialog(sTitle, sMsg, successFn.bind(this));
			} else {
				var msg = this.getView().getModel("i18n").getResourceBundle().getText("msg.operationSelectAtLeast");
				this.showMessageToast(msg);
			}
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/*
		 * show final confirmation dialog to reconfirm
		 */
		_confirmFinalConfirmationDialog: function (sState, sMsg) {
			var sTitle = this._oResoucreBundle.getText("msg.confirmationText"),
				msg = this._oResoucreBundle.getText("msg.confirmFinalConfirmation");

			if (sMsg) {
				msg = sMsg + "\n\n" + msg;
			}

			var successcallback = function () {
				this._submitZeroTimeConfirmation();
			};

			var cancelCallback = function () {
				this.oOperationSwitch.setState(false);
			};
			this.showConfirmDialog(sTitle, msg, successcallback.bind(this), cancelCallback.bind(this), sState);
		},

		/*
		 * send zero time confirmation on operation final confirmed
		 */
		_submitZeroTimeConfirmation: function () {
			//send zero TimeConfirmation with FinalConfirmation as true
			var oContext = this.oModel.createEntry("/WOTimeConfirmationSet"),
				sPath = oContext.getPath(),
				sConfirmationText = this.getView().getModel("i18n").getResourceBundle().getText("msg.confirmationText");

			this.oModel.setProperty(sPath + "/ORDER_NUMBER", this.oOperationData.ORDER_NUMBER);
			this.oModel.setProperty(sPath + "/OPERATION_NUMBER", this.oOperationData.OPERATION_NUMBER);
			this.oModel.setProperty(sPath + "/UNIT_OF_WORK", this.oOperationData.UNIT_OF_WORK);
			this.oModel.setProperty(sPath + "/PERSON_NUMBER", this.oOperationData.PERSON_RESPONSIBLE);
			this.oModel.setProperty(sPath + "/ACTIVITY_TYPE", this.oOperationData.ACTIVITY_TYPE);
			this.oModel.setProperty(sPath + "/IS_FINAL_CONFIRMATION", true);
			this.oModel.setProperty(sPath + "/CONFIRMATION_TEXT", sConfirmationText);
			this.oModel.setProperty(sPath + "/ACTUAL_WORK", "0");
			this.oModel.setProperty(sPath + "/WORKCENTER", this.oParentObj.WORKCENTER);
			this.oModel.setProperty(sPath + "/PLANT", this.oParentObj.PLANT);

			this.saveChanges({
				state: "success",
				isCreate: false
			}, this._saveCreateSuccessFn.bind(this), this._saveCreateErrorFn.bind(this), this.oCtrl);
		},

		/**
		 * success callback after creating time confirmation
		 */
		_saveCreateSuccessFn: function () {
			this._oSmartTable.rebindTable();
		},

		/**
		 * error callback after creating time confirmation
		 * to set switch initial state
		 */
		_saveCreateErrorFn: function () {
			this.oOperationSwitch.setState(false);
		},

		/**
		 * Handle visibility of custom column based on valifation
		 * @param {oCustCol}
		 * @param {oViewModel}
		 */
		_handleCustColValidation: function (oCustCol, oViewModel) {
			//Validation based on IS_STANDING_ORDER and startPage, create time is allowed
			var oData = oViewModel.getData(),
				oUserData = this.getModel("user").getData();

			var bValue = this.formatter.showFinalConfirmation(oData.IS_STANDING_ORDER, oData.startPage, oUserData.ENABLE_TIME_CONFIRM_CREATE,
				oUserData.ENABLE_TIME_FINAL_CONFIRM_SHOW);
			oCustCol.setVisible(bValue);
		},

		/**
		 * Validate operation status change button
		 * returns true if any of the status is available for selected operation
		 * Return Param {bShowButton}
		 */
		_checkOperationStatusButtonVisibility: function () {
			var aOprUserStatus = this.getModel("viewModel").getProperty("/OperationAllows"),
				bShowButton = false;
			if (!aOprUserStatus) {
				aOprUserStatus = [];
			}

			for (var status in aOprUserStatus) {
				if (aOprUserStatus[status] === true || aOprUserStatus[status] === "X") {
					bShowButton = true;
				}
			}
			return bShowButton;
		}
	});

});