sap.ui.define([
    "com/evorait/evoplan/controller/BaseController",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, formatter, History, JSONModel, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("com.evorait.evoplan.controller.AssetsOrders", {
        formatter: formatter,

        _selectedAsset: undefined,

        _aSelectedDemands: [],
        /**
         * Called when a controller is instantiated and its View controls (if available) are already created.
         * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
         * @memberOf com.evorait.evoplan.view.AssetsOrders
         */
        onInit: function () {
            this._configureTimeAlloc();
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var iOriginalBusyDelay,
                oViewModel = this.getOwnerComponent().getModel("viewModel");

            var eventBus = sap.ui.getCore().getEventBus();
            //event registration for refreshing the context in case any change in the view
            eventBus.subscribe("BaseController", "refreshAssetCal", this._triggerAssetFilter, this);
            this.getRouter().getRoute("assetManager").attachPatternMatched(this._onObjectMatched, this);
            // Store original busy indicator delay, so it can be restored later on
            iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
            this.getOwnerComponent().getModel().metadataLoaded().then(function () {
                    // Restore original busy indicator delay for the object view
                    oViewModel.setProperty("/delay", iOriginalBusyDelay);
                }
            );

        },
        /**
         * Initialize the time allocation Dialog with default values
         * @private
         */
        _configureTimeAlloc: function () {
            var oTimeAllocModel = new JSONModel();
            oTimeAllocModel.setData({
                dateFrom: moment().startOf('day').toDate(),
                dateTo: moment().endOf('day').toDate(),
                desc: "",
                assetGuid: "",
                guid: ""
            });
            this.setModel(oTimeAllocModel, "timeAlloc");
            // Set default date range
            this._setDefaultDateRange();
            this._oMessagePopover = sap.ui.getCore().byId("idMessagePopover");
            this.getView().addDependent(this._oMessagePopover);
        },
        /**
         * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
         * (NOT before the first rendering! onInit() is used for that one!).
         * @memberOf com.evorait.evoplan.view.AssetsOrders
         */
        // onBeforeRendering: function () {
        //
        // },

        /**
         * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
         * This hook is the same one that SAPUI5 controls get after being rendered.
         * @memberOf com.evorait.evoplan.view.AssetsOrders
         */
        onAfterRendering: function () {
            var oPlanCal = this.byId("PC1"),
                oBinding = oPlanCal.getBinding("rows");
            oBinding.attachDataRequested(function () {
                oPlanCal.setBusy(true);
            });
            oBinding.attachDataReceived(function () {
                oPlanCal.setBusy(false);
            });
        },

        /**
         * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
         * @memberOf com.evorait.evoplan.view.AssetsOrders
         */
        onExit: function () {
            if (this._infoDialog)
                this._infoDialog.destroy();
            if (this._oMessagePopover) {
                this._oMessagePopover.destroy();
            }
            this._selectedAsset = undefined;
            this._aSelectedDemands = [];
        },

        /**
         * When Object matched to route, the Assets filters should be applied on the selected assets
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: function (oEvent) {
            var oArguments = oEvent.getParameter("arguments"),
                oDateRange = this.byId("idDateRange"),
                oForm = oDateRange.getDateValue(),
                oTo = oDateRange.getSecondDateValue();
            // Generates and add to json model the Date range filter by defaulting the dates
            this._generateRangeFilter(oForm, oTo);
            // Generate and add to json model the selected assets filter
            this._generateAssetFilter(oArguments);
            // Triggers filter
            this._triggerAssetFilter();
        },


        /**
         * On Click create order button the page navigates to create order screen
         *
         * @Author Rahul
         * @since 2.1
         * @public
         * @param oEvent
         */
        createOrder: function (oEvent) {
            var oRouter = this.getRouter();

            oRouter.navTo("orderCreate", {
                asset: this._selectedAsset.AssetGuid,
                wc: this._selectedAsset.MainWorkCenter,
                plant: this._selectedAsset.Plant,
                type: this._selectedAsset.TechnicalObjectType
            });
            this.getModel("viewModel").setProperty("/assetFloc", this._selectedAsset.TechnicalObject);
            this.getModel("viewModel").setProperty("/assetDesc", this._selectedAsset.Description);
        },

        /**
         * On Click on Demands for an asset it navigates to the Demand details page.
         * If it is multi assignment, The demands get selected by selecting demands with CTRL pressed.
         * @Author Rahul
         * @since 2.1
         * @public
         * @param oEvent
         */
        showDetails: function (oEvent) {
            var oSelectedDemand = oEvent.getParameter("appointment"),
                oContext = oSelectedDemand.getBindingContext(),
                oModel = oContext.getModel(),
                sPath = oContext.getPath(),
                oData = oModel.getProperty(sPath),
                oRouter = this.getRouter();
            if (oEvent.getParameter("multiSelect")) {  // CTL+ <appointment> will trigger this parameter (Not documented in SAPUI5 Demokit)
                this._multiAssignment(oData, oSelectedDemand);
                return;
            } else {
                this._aSelectedDemands = [];
                this.byId("assignButton").setEnabled(false);
                if (oData.AssetPlandatatype === "A") {
                    this._openTimeAllocUpdate(oData);
                } else {
                    oRouter.navTo("assetDemandDetail", {
                        guid: oData.Guid,
                        asset: oData.AssetGuid
                    });
                }
            }
        },
        /**
         * Select or unselect appointment(Demand)
         * @param oData
         * @param oSelectedDemand
         * @private
         */
        _multiAssignment: function (oData, oSelectedDemand) {
            var oResourceBundle = this.getResourceBundle(),
                oContext = oSelectedDemand.getBindingContext(),
                sPath = oContext.getPath();
            if (oData.AssetPlandatatype === "D") {
                if (this._aSelectedDemands.indexOf(oSelectedDemand) >= 0) {
                    this._aSelectedDemands.splice(this._aSelectedDemands.indexOf(sPath), 1);
                    oSelectedDemand.setSelected(false);  // if the selected demand is selected again Demad has to be unselected.
                } else {
                    this._aSelectedDemands.push(oSelectedDemand);
                }
                if (this._aSelectedDemands.length > 0)
                    this.byId("assignButton").setEnabled(true);
                else
                    this.byId("assignButton").setEnabled(false);
            } else {
                oSelectedDemand.setSelected(false);
                this.showMessageToast(oResourceBundle.getText("ymsg.notDemand"));
            }
        },
        /**
         * Open Time allocation dialog to update
         * @private
         */
        _openTimeAllocUpdate: function (oData) {
            var oTimeAllocModel = this.getModel("timeAlloc");
            oTimeAllocModel.setProperty("/guid", oData.Guid);
            oTimeAllocModel.setProperty("/assetGuid", oData.AssetGuid);
            oTimeAllocModel.setProperty("/dateFrom", oData.StartTimestamp);
            oTimeAllocModel.setProperty("/dateTo", oData.EndTimestamp);
            oTimeAllocModel.setProperty("/desc", oData.Description);
            this.createTimeAlloc();
        },
        /**
         * close dialog
         */
        onCloseDialog: function () {
            this._infoDialog.close();
        },
        /**
         * Open's the Time allocation screen
         * @since 2.1
         */
        createTimeAlloc: function () {
            // create popover
            if (!this._infoDialog) {
                this._infoDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.CreateTimeAllocation", this);
                this._infoDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
                this.getView().addDependent(this._infoDialog);
            }
            this._infoDialog.open();
        },
        /**
         * On Close TimeAllocation dialog clear the all fields in the dialog
         */
        onCloseTimeAlloc: function () {
            this._clearTimeAllocFields();
        },
        /**
         * on change of date range the filter on assets has to be changed
         *
         * @since 2.1
         * @function
         * @param {sap.ui.base.Event} oEvent change event
         */
        onChangeDateRange: function (oEvent) {
            var oFrom = oEvent.getParameter("from"),
                oTo = oEvent.getParameter("to");

            this._generateRangeFilter(oFrom, oTo);
            this._triggerAssetFilter();
            this._setMinMaxToCalendar(oFrom, oTo);
        },
        /**
         * Create the Time Allocation for specified the date range
         * @since 2.1
         * @param oEvent
         */
        onSaveTimeAlloc: function (oEvent) {
            var oSelectedAsset = this._selectedAsset;
            var oResourceBundle = this.getResourceBundle();
            var oFromDate = sap.ui.getCore().byId("idTimeAllocSD");
            var oToDate = sap.ui.getCore().byId("idTimeAllocED");
            var sDescription = sap.ui.getCore().byId("idTimeAllocDesc");
            var oTimeAllocModel = this.getModel("timeAlloc");

            var sGuid = oTimeAllocModel.getProperty("/guid"),
                sDateFrom = oTimeAllocModel.getProperty("/dateFrom"),
                sDateTo = oTimeAllocModel.getProperty("/dateTo"),
                sDesc = oTimeAllocModel.getProperty("/desc"),
                sAssetGuid = oTimeAllocModel.getProperty("/assetGuid");

            if (!sDateFrom) {
                oFromDate.setValueState("Error");
                oFromDate.setValueStateText(oResourceBundle.getText("ymsg.fieldMandatory"));
                return;
            }

            if (!sDateTo) {
                oToDate.setValueState("Error");
                oToDate.setValueStateText(oResourceBundle.getText("ymsg.fieldMandatory"));
                return;
            }

            if (!sDesc.trim()) {
                sDescription.setValueState("Error");
                sDescription.setValueStateText(oResourceBundle.getText("ymsg.fieldMandatory"));
                return;
            }

            if (sDateFrom && sDateTo && sDesc.trim()) {
                if (sDateFrom.getTime() > sDateTo.getTime()) {
                    this.showMessageToast(oResourceBundle.getText("ymsg.datesInvalid"));
                    return;
                }
                var oParams = {
                    AssetGuid: sAssetGuid ? sAssetGuid : oSelectedAsset.AssetGuid,
                    StartTimestamp: sDateFrom,
                    EndTimestamp: sDateTo,
                    DowntimeDesc: sDesc.trim(),
                    AssetUnavailabilityGuid: sGuid
                };
                this.clearMessageModel();
                if (sGuid && sGuid !== "")
                    this.callFunctionImport(oParams, "UpdateAssetUnavailability", "POST", true);
                else
                    this.callFunctionImport(oParams, "CreateAssetUnavailability", "POST", true);
            } else {
                return;
            }
            //Close the dialog
            this._infoDialog.close();
        },
        /**
         * On selection of asset in planning calendar setting selected asset data to global filed of controller
         *
         * @since 2.1
         * @param oEvent
         */
        onRowSelectionChange: function (oEvent) {
            var oSelected = oEvent.getParameter("rows"),
                oContext = oSelected[0].getBindingContext(),
                oModel = oContext.getModel(),
                sPath = oContext.getPath(),
                oData = oModel.getProperty(sPath);
            this._selectedAsset = oData;
            // Disable header buttons
            this._enableHeaderButton(true);
        },
        /**
         * @Author Rahul
         * @since 2.1
         * @param bState:boolean to set enabled property
         * @private
         */
        _enableHeaderButton: function (bState) {
            this.byId("idCreateBut").setEnabled(bState);
            this.byId("idTimeAlloBut").setEnabled(bState);
        },
        /**
         * Clears the Time Allocation fields
         * @since 2.1
         * @private
         */
        _clearTimeAllocFields: function () {

            var oFromDate = sap.ui.getCore().byId("idTimeAllocSD");
            var oToDate = sap.ui.getCore().byId("idTimeAllocED");
            var sDescription = sap.ui.getCore().byId("idTimeAllocDesc");
            var oTimeAllocModel = this.getModel("timeAlloc");

            oTimeAllocModel.setProperty("/guid", "");
            oTimeAllocModel.setProperty("/dateFrom", moment().startOf('day').toDate());
            oTimeAllocModel.setProperty("/dateTo", moment().endOf('day').toDate());
            oTimeAllocModel.setProperty("/desc", "");
            oTimeAllocModel.setProperty("/assetGuid", "");

            oFromDate.setValueState("None");
            oFromDate.setValueStateText("");
            oToDate.setValueState("None");
            oToDate.setValueStateText("");
            sDescription.setValueState("None");
            sDescription.setValueStateText("");
        },
        /**
         * Clears the value state
         * @since 2.1
         */
        onChange: function (oEvent) {
            var oFiled = oEvent.getSource();
            oFiled.setValueState("None");
            oFiled.setValueStateText("");
        },
        /**
         * Sets the Default date range to Start of month to a year ahead
         * @since 2.1
         * @private
         */
        _setDefaultDateRange: function () {
            var oDateRange = this.byId("idDateRange");
            var oStartDate = moment().startOf('month').toDate();
            var oEndDate = moment().startOf('month').add(1, 'years').toDate();

            oDateRange.setDateValue(oStartDate);
            oDateRange.setSecondDateValue(oEndDate);
            this._setMinMaxToCalendar(oStartDate, oEndDate);


        },
        /**
         * Triggers the filter on Asset entity set by combining the selected assets and date filters
         * @since 2.1
         *
         * @param bChildren flag indicate apply filters for children nodes
         * @private
         */
        _triggerAssetFilter: function () {
            var oPlanCal = this.byId("PC1"),
                oBinding = oPlanCal.getBinding("rows"),
                aAssetFilters = this.getModel("viewModel").getProperty("/assetsFilter"),
                oDateRangeFilter = this.getModel("viewModel").getProperty("/assetsRangeFilter"),
                aAllFilters = jQuery.extend(true, [], aAssetFilters);
            if (oDateRangeFilter) {
                aAllFilters.push(oDateRangeFilter);
            }
            oBinding.filter(aAllFilters);
            this._enableHeaderButton(false);
            this.byId("assignButton").setEnabled(false);
            this._aSelectedDemands = [];
        },
        /**
         * Generates filters for assets based the date range to filter Demand and unavailability of
         * assets withing date range
         *
         * @since 2.1
         * @param oFrom
         * @param oTo
         * @private
         */
        _generateRangeFilter: function (oFrom, oTo) {
            var aFilters = [],
                oAssetFilter;
            if (oFrom && oTo) {
                aFilters.push(new Filter("DateFrom", FilterOperator.GE, oFrom));
                aFilters.push(new Filter("DateTo", FilterOperator.LE, oTo));

                oAssetFilter = new Filter({
                    filters: aFilters,
                    and: true
                });
            }
            this.getModel("viewModel").setProperty("/assetsRangeFilter", oAssetFilter);
        },
        /**
         * Genarates filters for Assets based on the selected assets in the Asset tree
         *
         * @since 2.1
         * @param args
         * @return {Array}
         * @private
         */
        _generateAssetFilter: function (args) {
            var aAssets = args.assets.split(","),
                aFilters = [];
            for (var i in aAssets) {
                aFilters.push(new Filter("AssetGuid", FilterOperator.EQ, aAssets[i]));
            }
            if (args.withChildren) {
                aFilters.push(new Filter("ActionType", FilterOperator.EQ, "X"));
            }
            this.getModel("viewModel").setProperty("/assetsFilter", aFilters);
            return aFilters;
        },
        /**
         * open's the message popover by it source
         * @since 2.1
         * @param oEvent
         */
        onMessagePopoverPress: function (oEvent) {
            this._oMessagePopover.openBy(oEvent.getSource());
        },
        /**
         * Multi Assignment from asset view. Opens the Tree table dialog to select resource
         * @since 2.1
         */
        onAssignButtonPress: function () {
            var oSelectedPaths = this._getSelectedRowPaths(null, null, null, this._aSelectedDemands);

            if (oSelectedPaths.aPathsData.length > 0) {
                this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedPaths.aPathsData);
            }
            if (oSelectedPaths.aNonAssignable.length > 0) {
                this._showAssignErrorDialog(oSelectedPaths.aNonAssignable);
            }
        },
        /**
         * Set maxdate and min date
         * @param from
         * @param to
         * @private
         */
        _setMinMaxToCalendar: function (sFrom, sTo) {
            var oPlanCal = this.byId("PC1");
            oPlanCal.setMinDate(sFrom);
            oPlanCal.setMaxDate(sTo);
        }
    });

});