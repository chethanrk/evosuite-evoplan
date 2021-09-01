sap.ui.define([
	"com/evorait/evoplan/controller/FormController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment"
], function (FormController, JSONModel, Filter, FilterOperator, Fragment) {
	"use strict";

	return FormController.extend("com.evorait.evoplan.controller.DialogFormController", {

		oTemplateModel: null,

		_oDialog: null,

		_aSmartForms: [],

		_oContext: null,

		_sPath: null,

		_mParams: {},

		_type: {},

		_selectedEntitySet: null,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * worklist on init
		 */
		onInit: function () {
			this.oTemplateModel = this.getModel("templateProperties");

			//SmartForm is editable
			this._aSmartForms = this.getAllSmartForms(this.getView().getControlsByFieldGroupId("smartFormTemplate"));

			var eventBus = sap.ui.getCore().getEventBus();
			//Binnding has changed in TemplateRenderController.js
			eventBus.subscribe("TemplateRendererEvoplan", "changedBinding", this._changedBinding, this);
		},

		/**
		 * life cycle event before view rendering
		 */
		onBeforeRendering: function () {},

		/**
		 * life cycle event after view rendering
		 */
		onAfterRendering: function () {},

		/**
		 * life cycle event for view destroy
		 */
		onExit: function () {
			var eventBus = sap.ui.getCore().getEventBus();
			eventBus.unsubscribe("TemplateRendererEvoplan", "changedBinding", this._changedBinding, this);
		},

		/* =========================================================== */
		/* Events                                                      */
		/* =========================================================== */

		/**
		 * There was entries selected so save them
		 * @param mParams
		 * @param oSuccessCallback
		 * @param oErrorCallback
		 * @param oCtrl
		 */
		saveSelectedEntries: function (oSuccessCallback, oErrorCallback, oCtrl) {},

		/**
		 * @param oEvent
		 */
		onChangeSmartField: function (oEvent) {},

		/**
		 * open custom ValueHelper for a sap.m.Input
		 * with data from customData inside field
		 * @param oEvent
		 */
		onCreateValueHelpRequested: function (oEvent) {
			var oSource = oEvent.getSource(),
				mCustomData = oSource.data();

			this._oVHDInput = oSource;

			if (!this._oValueHelpDialog) {
				Fragment.load({
					name: "com.evorait.evoplan.view.fragments.ValueHelpDialogSingleSelect",
					controller: this,
					type: "XML"
				}).then(function (oFragment) {
					this._oValueHelpDialog = oFragment;
					this._oValueHelpDialog.addStyleClass(this.getModel("viewModel").getProperty("/densityClass"));
					this._setCustomFilterProperties(mCustomData);
				}.bind(this));
			} else {
				this._setCustomFilterProperties(mCustomData);
			}
		},

		/*
		 * set properties to the custom filter
		 */
		_setCustomFilterProperties: function (mCustomData) {
			this.getView().addDependent(this._oValueHelpDialog);
			this._bindVHDTableWithSet(mCustomData);

			var oToken = new sap.m.Token();
			oToken.setKey(this._oVHDInput.getSelectedKey());
			oToken.setText(this._oVHDInput.getValue());
			this._oValueHelpDialog.setTokens([oToken]);
			this._oValueHelpDialog.open();
		},

		/**
		 * on press OK in custom ValueHelper
		 * @param oEvent
		 */
		onValueHelpOkPress: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			this._oVHDInput.setSelectedKey(aTokens[0].getKey());
			this._oValueHelpDialog.close();
		},

		/**
		 * on press cancel ion custom ValueHelper
		 * @param oEvent
		 */
		onValueHelpCancelPress: function (oEvent) {
			this._oValueHelpDialog.close();
		},

		/**
		 * after closing custom ValueHelper
		 * @param oEvent
		 */
		onValueHelpAfterClose: function (oEvent) {
			this._oValueHelpDialog.destroy(true);
			this._oValueHelpDialog = null;
		},

		/*
		 * onpress long text button
		 * @param oEvent
		 */
		addSelectedLongText: function (oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext("CreateSelectModel");
			this._createLongtextDialog(this.getView(), oBindingContext);
		},

		/**
		 * Dialog default properties
		 */
		setDefaultDialogProps: function () {
			var mDialogParams = {
				draggable: false,
				resizable: false,
				verticalScrolling: true,
				horizontalScrolling: true,
				stretch: false
			}
			this.getModel("viewModel").setProperty("/dialog", mDialogParams);

		},

		/* =========================================================== */
		/* internal methods                                              */
		/* =========================================================== */

		/**
		 * Binding has changed in TemplateRenderController
		 * Set new controller context and path
		 * and load plant and new operation number when required
		 * @param sChannel
		 * @param sEvent
		 * @param oData
		 */
		_changedBinding: function (sChannel, sEvent, oData) {
			if (sChannel === "TemplateRendererEvoplan" && sEvent === "changedBinding") {
				var sViewId = this.getView().getId(),
					sViewName = this.getView().getViewName();
				this._sViewNameId = sViewName + "#" + sViewId;

				if (oData.viewNameId === this._sViewNameId) {
					//SmartForm is editable
					this._aSmartForms = this.getAllSmartForms(this.getView().getControlsByFieldGroupId("smartFormTemplate"));
					this.setFormsEditable(this._aSmartForms, true);
				}
			}
		},

		/**
		 * Set all controller globals information for dialog
		 * like context and dialog control
		 */
		_getDefaultGlobalParameters: function () {
			//get new binding context
			this._oContext = this.getView().getBindingContext();
			if (!this._oContext) {
				return;
			}
			this._sPath = this._oContext.getPath();

			//global parameters
			this._mParams = this.oTemplateModel.getProperty("/tempData");
			//is it add, edit, copy or split
			for (var key in this._type) {
				if (this._type.hasOwnProperty(key)) {
					this._type[key] = key === this._mParams.type;
				}
			}

			// Selected entity set
			this._selectedEntitySet = this._mParams.entitySet;
			//get dialog control
			this._oDialog = this.getView().getParent();
			if (this._oDialog) {
				this._oDialog.setContentWidth("auto");
			}
		},

		/**
		 * replace (example: OperationSortNumber) valueHelper with a Select control
		 * CAUSE: Prefiltering operation dropdown is not supported by annotations
		 */
		_replaceFieldWithSelect: function (sFieldName, mParams) {
			var oField = this.getFormFieldByName(sFieldName, this._aSmartForms);
			if (!oField) {
				//field exists as a combobox, remove selection
				var sectionName = this._mParams.section;
				oField = sap.ui.getCore().byId(sFieldName + sectionName);
				if (oField) {
					oField.setSelectedKey(null);
				}
			}
			if (oField) {
				setTimeout(function () {
					this.replaceSmartFieldWithDropdown(oField, this._sViewNameId + "/" + sFieldName, mParams, this.onChangeSmartField.bind(this));
				}.bind(this), 1500);
			}
		},

		/**
		 * show dialog where user needs add/edit NOTES
		 * @param oView
		 * @param oContext
		 */
		_createLongtextDialog: function (oView, oContext) {
			var dialog = new sap.m.Dialog({
				title: "{i18n>tit.longText}",
				type: "Message",
				styleClass: this.getOwnerComponent().getContentDensityClass(),
				resizable: true,
				content: new sap.m.TextArea({
					value: "{CreateSelectModel>NOTES}",
					width: "100%",
					rows: 7
				}),
				beginButton: new sap.m.Button({
					text: "Ok",
					press: function () {
						dialog.close();
					}.bind(this)
				}),
				afterClose: function () {
					dialog.destroy();
				},
				beforeOpen: function () {
					oView.addDependent(dialog);
					dialog.setBindingContext(oContext, "CreateSelectModel");
				}
			});
			var mDevice = this.getView().getModel("device").getProperty("/system");
			if (mDevice.tablet || mDevice.phone) {
				dialog.setContentWidth("100%");
			}
			dialog.open();
		},

		/**
		 * Add a new group element inside of a specific SmartForm Group
		 * with a given control
		 * @param oGroup
		 * @param oControl
		 * @param sLabel
		 * @param idx
		 */
		_addNewGroupElement: function (oGroup, oControl, sLabel, idx) {
			var oNewGroupElement = new sap.ui.comp.smartform.GroupElement({
				label: sLabel ? this.getResourceBundle().getText(sLabel) : ""
			});
			oNewGroupElement.addElement(oControl);
			oGroup.insertGroupElement(oNewGroupElement, idx || 100);
		},

		/**
		 * in custom ValueHelper table is bind with VHSet from customData
		 * @param mCustomData
		 */
		_bindVHDTableWithSet: function (mCustomData) {
			var aCols = [];
			for (var key in mCustomData) {
				if (key.startsWith("vhProp-")) {
					aCols.push({
						template: mCustomData[key],
						label: "{/" + mCustomData.vhSet + "/" + mCustomData[key] + "/##com.sap.vocabularies.Common.v1.Label/String}"
					});
					if (key.indexOf(mCustomData.property) >= 0) {
						this._oValueHelpDialog.setKey(mCustomData[key]);
					} else {
						this._oValueHelpDialog.setDescriptionKey(mCustomData[key]);
					}
				}
			}

			this._oValueHelpDialog.getTableAsync().then(function (oTable) {
				oTable.setModel(this.getView().getModel());
				oTable.setModel(new JSONModel({
					cols: aCols
				}), "columns");
				if (oTable.bindRows) {
					oTable.bindAggregation("rows", "/" + mCustomData.vhSet);
				}
				if (oTable.bindItems) {
					oTable.bindAggregation("items", "/" + mCustomData.vhSet, function () {
						return new ColumnListItem({
							cells: aCols.map(function (column) {
								return new Label({
									text: "{/" + mCustomData.vhSet + "/" + column.template + "/##com.sap.vocabularies.Common.v1.Label/String}"
								});
							})
						});
					});
				}
				this._oValueHelpDialog.update();
			}.bind(this));
		},

	});
});