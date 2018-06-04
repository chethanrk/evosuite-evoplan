sap.ui.define([
    "com/evorait/evoplan/controller/BaseController",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], function (BaseController, formatter, Filter, FilterOperator, JSONModel) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.PlanningCalendarDialog", {

        formatter:formatter,

        init: function () {
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("AssignInfoDialog", "CloseCalendar", this.onModalCancel, this);
        },
        /**
         * init and get dialog view
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        getDialog : function () {
            // create dialog lazily
            if (!this._oDialog) {
                // create dialog via fragment factory
                this._oDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.ResourceCalendarDialog", this);

            }
            return this._oDialog;
        },
        /**
         * open dialog
         * get detail data from resource and resource group
         * @param oView
         * @param sBindPath
         * @param isBulkReAssign - To Identify the action for the dialog is getting opened.
         */
        open : function (oView,aSelectedResources) {
            var oDialog = this.getDialog();

            this._oView = oView;
            this.selectedResources = aSelectedResources;
            this._component = this._oView.getController().getOwnerComponent();
            this._oResourceBundle = this._component.getModel("i18n").getResourceBundle();
            this._oCalendarModel = this._component.getModel("calendarModel");
            oDialog.addStyleClass(this._component.getContentDensityClass());
            // connect dialog to view (models, lifecycle)
            oView.addDependent(oDialog);

            this._setCalendarModel();
            // open dialog
            oDialog.open();
        },
        /**
         * Method reads ResourceSet with Assignments
         * and merge into one json model for planning calendar
         * @private
         */
        _setCalendarModel: function() {
            var aUsers = [],
                aResourceFilters = [],
                aActualFilters = [],
                oModel = this._oView.getModel(),
                oResourceBundle = this._oResourceBundle,
                oViewFilterSettings = this._component.filterSettingsDialog,
                oPlanningCalDialog = this.getDialog();


            if (this.selectedResources.length <= 0) {
                return;
            }

            for (var i = 0; i < this.selectedResources.length; i++) {
                var obj = oModel.getProperty(this.selectedResources[i]);
                if (obj.NodeType === "RESOURCE") {
                    aUsers.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGuid + "//" + obj.ResourceGroupGuid));
                } else if (obj.NodeType === "RES_GROUP") {
                    aUsers.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid));
                }
            }
            var sDateControl1 = oViewFilterSettings.getFilterDateRange()[0].getValue();
            var sDateControl2 = oViewFilterSettings.getFilterDateRange()[1].getValue();

            if (aUsers.length > 0) {
                aResourceFilters.push(new Filter({
                    filters: aUsers,
                    and: false
                }));

                // aResourceFilters.push(new Filter([new Filter("DateTo", FilterOperator.GE, sDateControl1),new Filter("DateFrom", FilterOperator.LE, sDateControl2)],true));
                aResourceFilters.push(new Filter("DateTo", FilterOperator.GE, sDateControl1));
                aResourceFilters.push(new Filter("DateFrom", FilterOperator.LE, sDateControl2));
                if(aResourceFilters.length > 0){
                    aActualFilters.push(new Filter({
                            filters: aResourceFilters,
                            and: true
                        }
                    ));
                }
            }

            oPlanningCalDialog.setBusy(true);
            oModel.read("/AssignmentSet",{
                    groupId: "calendarBatch",
                    filters: aResourceFilters,
                    urlParameters: {
                        "$expand": "Resource,Demand" // To fetch the assignments associated with Resource or ResourceGroup
                    }
                });
            oModel.read("/ResourceAvailabilitySet",{
                groupId: "calendarBatch",
                filters: aResourceFilters,
                urlParameters: {
                    "$expand": "Resource" // To fetch the assignments associated with Resource or ResourceGroup
                }
            });
            var aDeferredGroups = oModel.getDeferredGroups();
            aDeferredGroups = aDeferredGroups.concat(["calendarBatch"]);
            oModel.setDeferredGroups(aDeferredGroups);

            oModel.submitChanges({groupId:"calendarBatch", success: this.onSuccess.bind(this), error: this.onError.bind(this)});
        },

        /**
         * Success callback for a batch read of assignments and absence infos
         * @param data
         * @param response
         */
        onSuccess: function(data,response){
            console.log(this._createData(data));
            this._oCalendarModel.setData({
                startDate: new Date(),
                viewKey: this.getSelectedView(),
                resources: this._createData(data)
            });
            this._oCalendarModel.refresh();
            this._oDialog.setBusy(false);
        },

        /**
         * Error callback for a batch read of assignments and absence infos
         */
        onError: function(){
            this._oDialog.setBusy(false);
            this.showMessageToast(oResourceBundle.getText("errorMessage"));
        },
        /**
         * Get selected filter view
         * @return {string}
         */
        getSelectedView : function () {
            var sCalendarView = "TIMENONE",
                oViewFilterSettings = this._component.filterSettingsDialog;
            var oViewFilterItems = oViewFilterSettings.getFilterSelectView().getItems();
            for (var j in oViewFilterItems) {
                var oViewFilterItem = oViewFilterItems[j];
                if (oViewFilterItem.getSelected()) {
                    sCalendarView = oViewFilterItem.getKey();
                }
            }
            return sCalendarView;
        },
        /**
         * show assignment info dialog on clicked calendar entry
         * @param oEvent
         */
        onClickCalendarAssignment: function(oEvent){
            var oAppointment = oEvent.getParameter("appointment");
            var oContext = oAppointment.getBindingContext("calendarModel");
            var oModel = oContext.getModel();
            var sPath = oContext.getPath();
            var oAppointmentData = oModel.getProperty(sPath);
            this._component.assignInfoDialog.open(this._oView, null, oAppointmentData);

        },
        /**
         * Create data for planning calendar
         *
         * @param data
         * @return {Array}
         * @private
         */
        _createData:function(data){
            var aResources = [],
                oResourceMap={};
            if(data.__batchResponses) {
                var oAssignData = data.__batchResponses[0].data;
                var oAbsenceData = data.__batchResponses[1].data;
                for(var l in data.__batchResponses) {

                    var oData = data.__batchResponses[l].data;
                    for (var i in oData.results) {
                        oResourceMap[oData.results[i].ObjectId] = oData.results[i].Resource;
                        oResourceMap[oData.results[i].ObjectId].Assignments = [];
                        oResourceMap[oData.results[i].ObjectId].AbsenceInfo = [];
                    }
                }

                    for (var j in oResourceMap) {
                        var sObjectId = oResourceMap[j].ObjectId;
                        for (var k in oAssignData.results) {
                            if (oAssignData.results[k].ObjectId === sObjectId) {
                                oResourceMap[j].Assignments.push(oAssignData.results[k])
                            }
                        }
                        for (var k in oAbsenceData.results) {
                            if (oAbsenceData.results[k].ObjectId === sObjectId) {
                                oResourceMap[j].AbsenceInfo.push(oAbsenceData.results[k])
                            }
                        }
                        aResources.push(oResourceMap[j]);
                    }
            }
            return aResources;
        },
        /**
         * on press cancel in dialog close it
         * @param oEvent
         */
        onModalCancel: function (oEvent) {
            if(this._oCalendarModel){
                this._oCalendarModel.setData({});
            }
            if(this._oDialog){
                this._oDialog.close();
            }

        }

    });
});