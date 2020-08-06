sap.ui.define([
	"com/evorait/evoplan/controller/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	    "sap/ui/core/Fragment"
], function (BaseController, formatter, Filter, FilterOperator, MessageToast,Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.AssignActionsDialog", {
		formatter: formatter,

		init: function () {
			this._eventBus = sap.ui.getCore().getEventBus();
			this._eventBus.subscribe("AssignTreeDialog", "closeActionDialog", this.onCloseDialog, this);
		},
		/**
		 * initialize and get dialog object
		 * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
		 */
		getDialog: function () {
			// create dialog lazily
			if (!this._oDialog) {
				// create dialog via fragment factory
				this._oDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.AssignActionsDialog", this);
			}
			return this._oDialog;
		},
		 /*
		 * open dialog
		 * @Author Pranav
		 * @version 2.0.6
		 * @param oView - view in which it getting invoked.
		 * @param aSelectedResources - selected resources before opening the dialog.
		 * @param isUnAssign - to Identify action for which it is opened.
         * init and get dialog view
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        open: function (oView, aSelectedResources,isUnAssign, mParameters) {
            // create dialog lazily
            if (!this._oDialog) {
            	oView.getModel("appView").setProperty("/busy", true);
                Fragment.load({
                    id: "AssignActions",
                    name: "com.evorait.evoplan.view.fragments.AssignActionsDialog",
                    controller: this
                }).then(function (oDialog) {
                	oView.getModel("appView").setProperty("/busy", false);
                    this._oDialog = oDialog;
                    this.onOpen(oDialog, oView, aSelectedResources,isUnAssign, mParameters);
                }.bind(this));
            }else {
                this.onOpen(this._oDialog, oView, aSelectedResources,isUnAssign, mParameters);
            }
        },

        /**
         * Sets the necessary value as global to this controller
         * Open's the popover
         * @param oView
         * @param oEvent
         */
        onOpen: function (oDialog, oView, aSelectedPath,isUnAssign, mParameters) {
           	this._oView = oView;
			this._aSelectedResources = aSelectedPath;
			this._isUnAssign = isUnAssign;
			this._resourceBundle = this._oView.getController().getResourceBundle();
			this._component = this._oView.getController().getOwnerComponent();
			this._mParameters = mParameters || {
				bFromHome: true
			};
			oDialog.addStyleClass(this._component.getContentDensityClass());
			oView.addDependent(oDialog);
			oDialog.open();
        },
		
		
		/**
		 * Adding the expand clause to smart table by setting binding parameters on beforeRebind event
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oEvent
		 */
		onBeforeRebind: function (oEvent) {
			var mBindingParams = oEvent.getParameter("bindingParams");
			mBindingParams.parameters["expand"] = "Demand";
			var oFilter = new Filter(this._getResourceFilters(this._aSelectedResources), true);
			mBindingParams.filters.push(oFilter);
		},
		/**
		 * Setting initial setting for dialog when it opens
		 * Filters the resctive demands based on selected resource assignment
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oEvent
		 */
		onBeforeOpen: function (oEvent) {
			var oUnAssignBtn = sap.ui.getCore().byId("AssignActions--idButtonBulkUnAssign"),
				oReAssignBtn = sap.ui.getCore().byId("AssignActions--idButtonBulkReAssign"),
				oDialog = this.getDialog();
			this._oAssignMentTable = sap.ui.getCore().byId("AssignActions--idDemandAssignmentTable").getTable();

			if (this._isUnAssign) {
				oUnAssignBtn.setVisible(true);
				oReAssignBtn.setVisible(false);
				oDialog.setTitle(this._resourceBundle.getText("xtit.unAssignTitle"));
			} else {
				oUnAssignBtn.setVisible(false);
				oReAssignBtn.setVisible(true);
				oDialog.setTitle(this._resourceBundle.getText("xtit.reAssignTitle"));
			}
			if (this.isFirstTime)
				sap.ui.getCore().byId("AssignActions--idDemandAssignmentTable").rebindTable();

			this.isFirstTime = true;
		},
		/**
		 * Event for unassign
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oEvent
		 */
		onUnassign: function (oEvent) {
			var oTable = this._oAssignMentTable,
				aContexts = oTable.getSelectedContexts();

			//check at least one demand selected
			if (aContexts.length === 0) {
				var msg = this._oView.getController().getResourceBundle().getText("ymsg.selectMinItem");
				MessageToast.show(msg);
				return;
			}

			this._eventBus.publish("AssignActionsDialog", "bulkDeleteAssignment", {
				aContexts: aContexts,
				parameters: this._mParameters
			});
			this.onCloseDialog();
		},
		/**
		 * Event for reassign.
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oEvent
		 */
		onReassign: function (oEvent) {
			var aContexts = this._oAssignMentTable.getSelectedContexts();

			//check at least one demand selected
			if (aContexts.length === 0) {
				var msg = this._oView.getController().getResourceBundle().getText("ymsg.selectMinItem");
				MessageToast.show(msg);
				return;
			}
			this._eventBus.publish("AssignActionsDialog", "selectAssign", {
				oView: this._oView,
				isReassign: this.reAssign,
				aSelectedContexts: aContexts,
				isBulkReassign: true,
				parameters: this._mParameters
			});
		},
		/**
		 * To validate the selected demands eligible to perform the following action
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oTable Table object
		 * @param bForReassign To identify the action.
		 * @return {{bValidate: boolean, aDemands: Array}}
		 */
		validateDemands: function (aSelectedItems, bForReassign) {
			this._oAssignMentTable.removeSelections(); // reomoves the selected items

			for (var i in aSelectedItems) {
				var oItem = aSelectedItems[i],
					oContext = oItem.getBindingContext(),
					sPath = oContext.getPath(),
					oModel = oContext.getModel(),
					bFlag = undefined;

				if (bForReassign)
					bFlag = oModel.getProperty(sPath + "/Demand/ALLOW_UNASSIGN");
				else
					bFlag = oModel.getProperty(sPath + "/Demand/ALLOW_REASSIGN");

				if (bFlag) {
					this._oAssignMentTable.setSelectedItem(oItem);
				}
			}
		},
		/**
		 * Return resource filters on selected resources
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param aSelectedResources {Array} Selected Resources
		 * @return aResourceFilters Filters
		 */
		_getResourceFilters: function (aSelectedResources) {
			var aResources = [],
				oModel = this._oView.getModel(),
				oViewFilterSettings = this._oView.getController().oFilterConfigsController || null;

			var aFilters = [];

			for (var i = 0; i < aSelectedResources.length; i++) {
				var obj = oModel.getProperty(aSelectedResources[i]);
				if (obj.NodeType === "RESOURCE") {
					if (obj.ResourceGuid && obj.ResourceGuid !== "") { // This check is required for POOL Node.
						aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGuid + "//" + obj.ResourceGroupGuid));
					} else {
						aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid + "//X"));
					}
				} else if (obj.NodeType === "RES_GROUP") {
					aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid));
				}
			}

			if (oViewFilterSettings) {
				var dateRangeValues = oViewFilterSettings.getDateRange(),
					sDateControl1 = dateRangeValues[0],
					sDateControl2 = dateRangeValues[1];
			} else {
				var selectedTimeFormat = formatter.getResourceFormatByKey("TIMENONE"),
					sDateControl1 = this.formatter.date(selectedTimeFormat.getDateBegin()),
					sDateControl2 = this.formatter.date(selectedTimeFormat.getDateEnd());
			}

			if (aResources.length > 0) {
				aFilters.push(new Filter({
					filters: aResources,
					and: false
				}));
				// aFilters.push(new Filter([new Filter("DateTo", FilterOperator.GE, sDateControl1),new Filter("DateFrom", FilterOperator.LE, sDateControl2)],true));
				aFilters.push(new Filter("DateTo", FilterOperator.GE, sDateControl1));
				aFilters.push(new Filter("DateFrom", FilterOperator.LE, sDateControl2));
			}
			return aFilters;
		},
		/**
		 * Filters the demand by demand guids for filter assignments
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param aSelectedResources
		 * @private
		 */
		_filterDemandTable: function (aSelectedResources) {
			if (this._oAssignMentTable && this._oAssignMentTable.getBinding("items")) {
				this._oAssignMentTable.getBinding("items").filter(this._getResourceFilters(aSelectedResources));
			}
		},
		/**
		 * Checking selected demand is allowed for respective action on selection change of demand
		 *
		 * @Author Rahul
		 * @version 2.0.6
		 * @param oEvent
		 */
		onSelectionChange: function (oEvent) {
			if (oEvent.getParameter("selected") && !oEvent.getParameter("selectAll")) {
				var oListItem = oEvent.getParameter("listItem"),
					oContext = oListItem.getBindingContext(),
					sPath = oContext.getPath(),
					oModel = oContext.getModel(),
					bFlag = false;

				if (!this._isUnAssign) {
					bFlag = oModel.getProperty(sPath + "/Demand/ALLOW_REASSIGN");
				} else {
					bFlag = oModel.getProperty(sPath + "/Demand/ALLOW_UNASSIGN");
				}
				oListItem.setSelected(bFlag);
			} else {
				if (oEvent.getParameter("selectAll")) {
					var aListItems = oEvent.getParameter("listItems");
					this.validateDemands(aListItems, this._isUnAssign);
				}
			}
		},
		/**
		 * close dialog
		 */
		onCloseDialog: function () {
			this._oAssignMentTable.removeSelections();
			this.getDialog().close();
		},
		exit: function () {
			this._eventBus.unsubscribe("AssignTreeDialog", "closeActionDialog", this.onCloseDialog, this);
		}
	});
});