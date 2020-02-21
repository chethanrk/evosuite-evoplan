sap.ui.define([
    "com/evorait/evoplan/controller/AssignmentsController",
    "com/evorait/evoplan/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], function (BaseController, formatter, Filter, FilterOperator, JSONModel) {
    "use strict";

    return BaseController.extend("com.evorait.evoplan.controller.PlanningCalendarDialog", {

        formatter: formatter,

        _changedAssignments: {},

        _changedAbsences :{},

        init: function () {
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("AssignInfoDialog", "RefreshCalendar", this._setCalendarModel, this);
            eventBus.subscribe("AssignInfoDialog", "refreshAssignment", this._refreshAppointment, this);
            eventBus.subscribe("CreateUnAvailability", "refreshAbsence", this._refreshIntervalHeader, this);
        },
        /**
         * init and get dialog view
         * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
         */
        getDialog: function () {
            // create dialog lazily
            if (!this._oDialog) {
                // create dialog via fragment factory
                this._oDialog = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.ResourceCalendarDialog", this);

            }
            return this._oDialog;
        },
        /**
         * open's the planning calendar dialog
         * get detail data from resource and resource group
         * @param oView
         * @param sBindPath
         * @param isBulkReAssign - To Identify the action for the dialog is getting opened.
         */
        open: function (oView, aSelectedResources, mParameters, oStartDate) {
            var oDialog = this.getDialog();
            this._changedAssignments = {};
            this._changedAbsences = {};
            this._selectedView = undefined;
            this._oView = oView;
            this.selectedResources = aSelectedResources;
            this._component = this._oView.getController().getOwnerComponent();
            this._oResourceBundle = this._component.getModel("i18n").getResourceBundle();
            this._oCalendarModel = this._component.getModel("calendarModel");
            this._oPlanningCalendar = sap.ui.getCore().byId("planningCalendar");
            this._mParameters = mParameters || {bFromHome:true};
            this._startDate = oStartDate;
            oDialog.addStyleClass(this._component.getContentDensityClass());
            // connect dialog to view (models, lifecycle)
            oView.addDependent(oDialog);

            this._setCalendarModel();
            // To enable or disable the save button
            this.checkDirty();
            this._enableCreateUABtn(false);
            // open dialog
            // oDialog.open();
        },
        /**
         * Method reads ResourceSet with Assignments
         * and merge into one json model for planning calendar
         * @private
         */
        _setCalendarModel: function () {
            var oModel = this._oView ? this._oView.getModel() : null,
                oUserModel = this._oView.getModel("user");

            if (!oModel) {
                return;
            }
            if (this.selectedResources.length <= 0) {
                return;
            }

            this._oPlanningCalendar.setBusy(true);
            oModel.read("/AssignmentSet", {
                groupId: "calendarBatch",
                filters: this._generateResourceFiltersFor("ASSIGNMENT"), // to fetch filters required for assignments
                urlParameters: {
                    "$expand": "Resource,Demand" // To fetch the assignments associated with Resource or ResourceGroup
                }
            });
            oModel.read("/ResourceAvailabilitySet", {
                groupId: "calendarBatch",
                filters: this._generateResourceFiltersFor("ABSENCE"), // to fetch filters required for absences
                urlParameters: {
                    "$expand": "Resource" // To fetch the assignments associated with Resource or ResourceGroup
                }
            });
            if(oUserModel.getProperty("/ASSET_PLANNING_ENABLED") && oUserModel.getProperty("/ASSETUNAVL_PLANNING_CALENDAR")){
                oModel.read("/AssetPlanningDataSet", {
                    groupId: "calendarBatch",
                    filters: this._generateResourceFiltersFor("ASSETUA")
                });
            }

            var aDeferredGroups = oModel.getDeferredGroups();
            aDeferredGroups = aDeferredGroups.concat(["calendarBatch"]);
            oModel.setDeferredGroups(aDeferredGroups);

            oModel.submitChanges({
                groupId: "calendarBatch",
                success: this.onSuccess.bind(this),
                error: this.onError.bind(this)
            });
        },
        /**
         * Generate resource filters
         *
         * @param sType {String} Will be true if filters required for Asset Availability
         * @return {Array}
         * @private
         */
        _generateResourceFiltersFor: function (sType) {
            var aUsers = [],
                aResourceFilters = [],
                aActualFilters = [],
                oModel = this._oView ? this._oView.getModel() : null,
                // oResourceBundle = this._oResourceBundle,
                oViewFilterSettings = this._oView.getController().oFilterConfigsController || null,
                sDateControl1,
                sDateControl2,
                oUserModel = this._component.getModel("user");

            for (var i = 0; i < this.selectedResources.length; i++) {
                var obj = oModel.getProperty(this.selectedResources[i]);
                if (obj.NodeType === "RESOURCE") {
                    if (obj.ResourceGuid && obj.ResourceGuid !== "") { // This check is required for POOL Node.
                        aUsers.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGuid + "//" + obj.ResourceGroupGuid));
                    } else {
                        aUsers.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid + "//X"));
                    }
                } else if (obj.NodeType === "RES_GROUP") {
                    aUsers.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid));
                }
            }
            if (this._mParameters.bFromGantt) {
                // if we decide to keep different date range for demand view and gantt view
                sDateControl1 = oUserModel.getProperty("/GANT_START_DATE");
                sDateControl2 = oUserModel.getProperty("/GANT_END_DATE");
            } else {
                 sDateControl1 = oViewFilterSettings.getDateRange()[0];
                 sDateControl2 = oViewFilterSettings.getDateRange()[1];
            }


            if (aUsers.length > 0 && (sType === "ASSIGNMENT" || sType === "ABSENCE")) {
                aResourceFilters.push(new Filter({
                    filters: aUsers,
                    and: false
                }));

                // aResourceFilters.push(new Filter([new Filter("DateTo", FilterOperator.GE, sDateControl1),new Filter("DateFrom", FilterOperator.LE, sDateControl2)],true));
                aResourceFilters.push(new Filter("DateTo", FilterOperator.GE, sDateControl1));
                aResourceFilters.push(new Filter("DateFrom", FilterOperator.LE, sDateControl2));
                // To fetch only Absences we need to set AvailabilityGrouptype filter as "N"
                if(sType === "ABSENCE"){
                    aResourceFilters.push(new Filter("AvailabilityTypeGroup", FilterOperator.EQ, "N"));
                }

                if (aResourceFilters.length > 0) {
                    aActualFilters.push(new Filter({
                        filters: aResourceFilters,
                        and: true
                    }));
                }
            } else if(aUsers.length > 0 && sType === "ASSETUA"){
                aActualFilters.push(new Filter("AssetPlandatatype", FilterOperator.EQ, "A"));
                aActualFilters.push(new Filter("EndTimestamp", FilterOperator.GE, sDateControl1));
                aActualFilters.push(new Filter("StartTimestamp", FilterOperator.LE, sDateControl2));
            }
            return aActualFilters;
        },
        /**
         * Success callback for a batch read of assignments and absence infos
         * @param data
         * @param response
         */
        onSuccess: function (data, response) {
            var oDialog = this.getDialog();
            // console.log(this._createData(data));
            this._oCalendarModel.setData({
                resources: this._createData(data)
            });
            // this._oCalendarModel.get.refresh();
            if (this._mParameters.bFromGantt) {
                this._oCalendarModel.setProperty("/viewKey", "TIMEHOUR");
                this._oCalendarModel.setProperty("/startDate", this._startDate || new Date());
            } else {
                this._oCalendarModel.setProperty("/viewKey", this._selectedView ? this.formatter.formatViewKey(this._selectedView) : this.getSelectedView());
                this._oCalendarModel.setProperty("/startDate", new Date());
            }
            oDialog.open();


            this._oView.getModel("viewModel").setProperty("/calendarBusy", false);
            this._oPlanningCalendar.setBusy(false);
        },

        /**
         * Error callback for a batch read of assignments and absence infos
         */
        onError: function () {
            this._oDialog.setBusy(false);
            this._oPlanningCalendar.setBusy(false);
            // this.showMessageToast(oResourceBundle.getText("errorMessage"));
        },
        /**
         * Get selected filter view
         * @return {string}
         */
        getSelectedView: function () {
            var sCalendarView = "TIMENONE",
                oViewFilterSettings = this._oView.getController().oFilterConfigsController || null;
            if(oViewFilterSettings){
                sCalendarView = oViewFilterSettings.getViewType();
            }
            return sCalendarView;
        },
        /**
         * show assignment info dialog on clicked on calendar entry
         * @param oEvent
         */
        onClickCalendarAssignment: function (oEvent) {
            var oAppointment = oEvent.getParameter("appointment"),
                oRow = oAppointment.getParent(),
                oRowContext = oRow.getBindingContext("calendarModel"),
                oAppointmentContext = oAppointment.getBindingContext("calendarModel"),
                oRowPath = oRowContext.getPath(),
                oModel = oRowContext.getModel(),
                sPath = oAppointmentContext.getPath(),
                oAppointmentData = oModel.getProperty(sPath),
                oRowData = oModel.getProperty(oRowPath);

            this.oSelectedContext = oAppointmentContext;

            if (oRowData.ObjectType === "ASSET") {
                return;
            }
            this._component.assignInfoDialog.open(this._oView, null, oAppointmentData, {bFromPlannCal: true});

        },
        /**
         * @since 2.1.4
         * On drag assigments the method will be triggered.
         * Check for wheather an assignment is eligible for changes or not
         * if not prevent the action
         */
        onAppointmentDragEnter: function (oEvent) {
            var oAppointment = oEvent.getParameter("appointment"),
                oContext = oAppointment.getBindingContext("calendarModel"),
                oModel = oContext.getModel(),
                sPath = oContext.getPath(),
                oAppointmentData = oModel.getProperty(sPath);
            // If the assignment is completed the assignment cannot be changed
            if (!oAppointmentData.Demand.ASGNMNT_CHANGE_ALLOWED) {
                this.showMessageToast(this._oResourceBundle.getText("ymsg.assignmentCompleted"));
                oEvent.preventDefault();
            }
        },
        onViewChange: function (oEvent) {
            this._selectedView = oEvent.getSource().getViewKey();
        },
        /**
         * Called on Assignment drop
         * @param oEvent
         */
        onAppointmentDrop: function (oEvent) {
            this._refreshAppointment(oEvent);
            this.checkDirty();
        },
        /**
         * Called when assignment resize
         * @param oEvent
         */
        onAppointmentResize: function (oEvent) {
            this._refreshAppointment(oEvent);
            this.checkDirty();
        },
        /**
         * Refresh the changed assignments in the local model
         * Check the wheather the method triggerd via drag and drop or from the assigninfo dialog.
         *
         * @param {Object} oEvent
         */
        _refreshAppointment: function (oEvent, sEvent, oData) {
            var oModel = this._component.getModel("calendarModel");
            if (sEvent) {
                this._refreshAssignment(oData);
            } else {
                var oAppointment = oEvent.getParameter("appointment"),
                    oRow = oEvent.getParameter("calendarRow"),
                    oStartDate = oEvent.getParameter("startDate"),
                    oEndDate = oEvent.getParameter("endDate"),
                    oAppointmentContext = oAppointment.getBindingContext("calendarModel"),
                    sAppointmentPath = oAppointmentContext.getPath(),
                    oAssignmentData = oModel.getProperty(sAppointmentPath),
                    oRowContext = oRow.getBindingContext("calendarModel"),
                    sRowPath = oRowContext.getPath(),
                    oRowData = oModel.getProperty(sRowPath),
                    oParams = jQuery.extend({}, {
                        "DateFrom": oStartDate || 0,
                        "TimeFrom": {
                            __edmtype: "Edm.Time",
                            ms: oStartDate.getTime()
                        },
                        "DateTo": oEndDate || 0,
                        "TimeTo": {
                            __edmtype: "Edm.Time",
                            ms: oEndDate.getTime()
                        },
                        "AssignmentGUID": oAssignmentData.Guid,
                        "EffortUnit": oAssignmentData.EffortUnit,
                        "Effort": oAssignmentData.Effort,
                        "ResourceGroupGuid": oRowData.ResourceGroupGuid,
                        "ResourceGuid": oRowData.ResourceGuid
                    }, true);

                if (oAppointment.getParent() !== oRow) {
                    this.onDropOnAnotherResource(oModel, oAppointmentContext, oParams, oRowContext);
                } else {
                    if (!oAssignmentData.Demand.ASGNMNT_CHANGE_ALLOWED) {
                        this.showMessageToast(this._oResourceBundle.getText("ymsg.assignmentCompleted"));
                        return;
                    }
                    oModel.setProperty("DateFrom", oStartDate, oAppointmentContext);
                    oModel.setProperty("DateTo", oEndDate, oAppointmentContext);
                    this._changedAssignments[oParams.AssignmentGUID] = oParams;
                }

            }
            if (this._selectedView) {
                oModel.setProperty("/viewKey", this.formatter.formatViewKey(this._selectedView));
            }
            oModel.refresh(true);
			this.checkDirty();
            this._oPlanningCalendar.rerender();

        },
        /**
         * Method will be triggered When Any changes done in assignment info dialog and save it.
         * @constructor
         * @param oData the event data
         */
        _refreshAssignment: function (oData) {
            var oAssignMentModel = this._component.getModel("assignment"),
                oChangedData = oAssignMentModel.getData();
            if (oData.reassign) {
                this._reAssignment(oChangedData);
            } else if (oData.unassign) {
                this._removeAssignment();
                this._storeChanges(oChangedData, true);
            } else {
                this._changeDatesofAssignment(oChangedData);
            }
            this.checkDirty();
        },
        /**
         * Method will be triggered when user select the new resource in assignment dialog and save it.
         * Changes will be saved locally and changes will be reflected in planning calendar.
         * @constructor
         * @param oChangedData the changed data
         */
        _reAssignment: function (oChangedData) {
            var oModel = this.oSelectedContext.getModel(),
                sPath = this.oSelectedContext.getPath(),
                oCalendarData = oModel.getData(),
                oAssignmentData = oModel.getProperty(sPath),
                sObjectId = oChangedData.NewAssignId,
                aIds = oChangedData.NewAssignId.split("//");

            oChangedData.ResourceGroupGuid = aIds[1];
            oChangedData.ResourceGuid = aIds[0];
            oAssignmentData.DateFrom = oChangedData.DateFrom;
            oAssignmentData.DateTo = oChangedData.DateTo;
            this._removeAssignment();
            this._storeChanges(oChangedData);
            for (var i in oCalendarData.resources) {
                if (oCalendarData.resources[i].ObjectId === sObjectId) {
                    oCalendarData.resources[i].Assignments.push(oAssignmentData);
                    break;
                }
            }
            oModel.setData(oCalendarData);

        },
        /**
         *
         * Method will triggered on unassign to remove the assignment locally
         *
         * @Athour
         * @constructor
         */
        _removeAssignment: function () {
            var aPath = this.oSelectedContext.getPath().split("/"),
                iIndex = aPath.pop(),
                sRowAppointmentsPath = aPath.join("/");

            this.oSelectedContext.getProperty(sRowAppointmentsPath).splice(iIndex, 1);
        },
        /**
         * Method will be triggered when there is only change in the date to refresh respective assignment
         *
         * @Athour Rahul
         * @constructor
         * @param oChangedData
         */
        _changeDatesofAssignment: function (oChangedData) {
            var oModel = this.oSelectedContext.getModel();
            oModel.setProperty("DateFrom", oChangedData.DateFrom, this.oSelectedContext);
            oModel.setProperty("DateTo", oChangedData.DateTo, this.oSelectedContext);
            this._storeChanges(oChangedData);
        },
        /**
         * @Athour Rahul
         * @constructor
         * @param oChangedData changed data
         * @param bIsUnAssign {boolean} flag indicate the action that is it unassign or reassign.
         */
        _storeChanges: function (oChangedData, bIsUnAssign) {
            var oParams = oChangedData ? jQuery.extend({}, {
                "DateFrom": oChangedData.DateFrom || 0,
                "TimeFrom": {
                    __edmtype: "Edm.Time",
                    ms: oChangedData.DateFrom.getTime()
                },
                "DateTo": oChangedData.DateTo || 0,
                "TimeTo": {
                    __edmtype: "Edm.Time",
                    ms: oChangedData.DateTo.getTime()
                },
                "AssignmentGUID": oChangedData.AssignmentGuid,
                "EffortUnit": oChangedData.EffortUnit,
                "Effort": oChangedData.Effort,
                "ResourceGroupGuid": oChangedData.ResourceGroupGuid,
                "ResourceGuid": oChangedData.ResourceGuid
            }, true) : null;

            if (!bIsUnAssign) {
                this._changedAssignments[oParams.AssignmentGUID] = oParams;
            } else {
                this._changedAssignments[oParams.AssignmentGUID] = null;
            }
        },
        /**
         *  When assignments drop to different resource the assignment removed from the old row and added to new row
         *
         * @Athour Rahul
         * @param oModel - Json Model
         * @param oAppointment - Dragged assignment
         * @param oAssignmentData - Dragged Assignments data
         * @param oRowData - Dropped rowdata
         * @param sRowPath - Dropped row path
         * @param oStartDate - new Start date
         * @param oEndDate - new end date
         */
        onDropOnAnotherResource: function (oModel, oAppointmentContext, oParams, oRowContext) {
            var aPath = oAppointmentContext.getPath().split("/"),
                iIndex = aPath.pop(),
                sRowAppointmentsPath = aPath.join("/"),
                oAssignmentData = oModel.getProperty(oAppointmentContext.getPath());
            // Assign new dates
            oAssignmentData.DateFrom = oParams.DateFrom;
            oAssignmentData.DateTo = oParams.DateTo;
            // Assign new resource and resourcegroup
            oAssignmentData.ResourceGuid = oParams.ResourceGuid;
            oAssignmentData.ResourceGroupGuid = oParams.ResourceGroupGuid;

            // Check the assignments for reassign functionality
            if (!oAssignmentData.Demand.ALLOW_REASSIGN) {
                this.showMessageToast(this._oResourceBundle.getText("ymsg.noReassignPossible"));
                return;
            }

            oRowContext.getObject().Assignments.push(oAssignmentData);
            oModel.getProperty(sRowAppointmentsPath).splice(iIndex, 1);
            this._changedAssignments[oParams.AssignmentGUID] = oParams;
        },
        /**
         * Create data for planning calendar
         * Loop over the batch response and create the data as required by the the planning calendar
         *
         * @param data
         * @return {Array}
         * @private
         */
        _createData: function (data) {
            var aResources = [],
                oModel = this._oView ? this._oView.getModel() : null,
                oUserModel = this._component ? this._component.getModel("user") : null;

            if (data.__batchResponses) {
                var oAssignData = data.__batchResponses[0]?data.__batchResponses[0].data:[];
                var oAbsenceData = data.__batchResponses[1]?data.__batchResponses[1].data:[];
                var oAssetUNData = data.__batchResponses[2]?data.__batchResponses[2].data:[];
                var oAsset = {};
                oAsset.Assignments = [];
                var oResourceMap = {};
                // create selected resource in resource map
                for (var a = 0; a < this.selectedResources.length; a++) {
                    var oResource = oModel.getProperty(this.selectedResources[a]),
                        sEntitySet = this.selectedResources[a].split("(")[0];
                    if(oResource.NodeType=== "RESOURCE"  || (oResource.NodeType=== "RES_GROUP" && oUserModel.getProperty("/POOL_FUNCTION_ENABLED"))){
                        oResource["ResourceDescription"] = oResource.Description;
                        oResource["ObjectType"] = oResource.NodeType;
                        oResource["GroupDescription"] = oModel.getProperty(sEntitySet + "('" + oResource.ResourceGroupGuid + "')").Description;
                        oResource["ResourceGuid"] = oResource.ResourceGuid;
                        oResource["ResourceGroupGuid"] = oResource.ResourceGroupGuid;
                        oResourceMap[oResource.NodeId] = oResource;
                        oResourceMap[oResource.NodeId].Assignments = [];
                        oResourceMap[oResource.NodeId].AbsenceInfo = [];
                    }

                }
                // put asset data
                for (var n in oAssetUNData.results) {
                    oAsset.ObjectType = "ASSET";
                    oAsset.GroupDescription = this._oResourceBundle.getText("xtit.assetUA");
                    oAsset.Assignments.push({
                        DateFrom: oAssetUNData.results[n].StartTimestamp,
                        DateTo: oAssetUNData.results[n].EndTimestamp,
                        Demand: {
                            DemandDesc: oAssetUNData.results[n].Description
                        },
                        type: "Type06",
                        color:oAssetUNData.results[n].AssetUnavailityColor
                    });
                }
                if(oAsset.Assignments.length > 0){
                    aResources.push(oAsset);
                }

                // To create resource map from object id.
                for (var l = 0; l < 2; l++) {

                    var oData = data.__batchResponses[l].data;
                    for (var i in oData.results) {
                        oResourceMap[oData.results[i].ObjectId] = {};
                        oResourceMap[oData.results[i].ObjectId].Assignments = [];
                        oResourceMap[oData.results[i].ObjectId].AbsenceInfo = [];
                    }
                }
                // Push assignment into respective assignment
                for (var j in oResourceMap) {
                    var sObjectId = j;
                    for (var k in oAssignData.results) {
                        if (oAssignData.results[k].ObjectId === sObjectId) {

                            oResourceMap[j].ResourceDescription = oAssignData.results[k].RESOURCE_DESCRIPTION;
                            oResourceMap[j].ObjectType = oAssignData.results[k].NODE_TYPE;
                            oResourceMap[j].GroupDescription = oAssignData.results[k].GROUP_DESCRIPTION;
                            oResourceMap[j].ResourceGuid = oAssignData.results[k].ResourceGuid;
                            oResourceMap[j].ResourceGroupGuid = oAssignData.results[k].ResourceGroupGuid;
                            oResourceMap[j].Assignments.push(oAssignData.results[k]);
                        }
                    }
                    // Push unavailability into respective assignment
                    for (var m in oAbsenceData.results) {
                        if (oAbsenceData.results[m].ObjectId === sObjectId) {
                            oResourceMap[j].ResourceDescription = oAbsenceData.results[m].ResourceDescription;
                            oResourceMap[j].ObjectType = oAbsenceData.results[m].NodeType;
                            oResourceMap[j].GroupDescription = oAbsenceData.results[m].GroupDescription;
                            oResourceMap[j].ResourceGuid = oAbsenceData.results[m].ResourceGuid;
                            oResourceMap[j].ResourceGroupGuid = oAbsenceData.results[m].ResourceGroupGuid;
                            oResourceMap[j].AbsenceInfo.push(oAbsenceData.results[m]);
                        }
                    }
                    aResources.push(oResourceMap[j]);
                }

            }
            return aResources;
        },
        /**
         * On save dialog check if there are any changes in calendar data
         * if there are changes trigger save assignment
         * if not message will be shown
         * @param oEvent
         */
        onSaveDialog: function (oEvent) {
            if (this.checkDirty()) {
                this._oPlanningCalendar.setBusy(true);
                this._triggerSaveAssignments();
                // enable or disable the button after the operation
                this.checkDirty();
            } else {
                this.showMessageToast(this._oResourceBundle.getText("ymsg.noChangestoSave"));
            }
        },
        /**
         * on press cancel in dialog close it
         * check if there are any changes in calendar data
         * if there are changes Show confirmation box to validate the action
         * if not close the dialog
         * @param oEvent
         */
        onModalCancel: function (oEvent) {
            if (this.checkDirty()) {
                this.showConfirmMessageBox.call(this._oView.getController(), this._oResourceBundle.getText("ymsg.changedDataLost"), this.onClose.bind(
                    this));
            } else {
                this._oDialog.close();
                if (this._mParameters.bFromGantt) {
                    var eventBus = sap.ui.getCore().getEventBus();
                    eventBus.publish("BaseController", "refreshGanttChart", {});
                }
            }
        },
        /**
         * Method gets called when user closed the confirmation pop up.
         * Based on the user action the data gets saved or reverted.
         *
         * @Athour Rahul
         * @version 2.1
         */
        onClose: function (oEvent) {
            if (oEvent === "YES") {
                this._triggerSaveAssignments(true);
                this._oDialog.close();
            } else {
                this._oDialog.close();
            }
        },
        /**
         * Unselecting selected column 
         */
        onBeforeClose : function (oEvent){
        	var oSelected = this._oPlanningCalendar.getSelectedRows();
        	if(oSelected.length > 0){
        		oSelected[0].setSelected(false);
        	}
        },
        /**
         * Triggers assignments save
         * @param bConfirm Boolean value true says not to refresh the calendar
         * as the Dialog is getting closed. False says to refresh the calendar
         * @private
         */
        _triggerSaveAssignments: function (bConfirm) {
            var eventBus = sap.ui.getCore().getEventBus(),
                mParameters = bConfirm ? {
                    bFromHome: true
                } : {
                    bFromPlannCal: true
                };

            eventBus.publish("PlanningCalendarDialog", "saveAllAssignments", {
                assignments: this._changedAssignments,
                absences : this._changedAbsences,
                mParameters: mParameters
            });
            // Reset global values
            this._changedAssignments = {};
            this._changedAbsences = {};
        },
        /**
         * On selection on calendar row
         * @param oEvent
         */
        onRowSelectionChange : function (oEvent) {
            var aSelected, oContext, oModel, sPath, oData;
            aSelected = oEvent.getSource().getSelectedRows();
            if(aSelected.length === 0){
                return;
            }
            oContext = aSelected[0].getBindingContext("calendarModel");
            oModel = oContext.getModel();
            sPath = oContext.getPath();
            oData = oModel.getProperty(sPath);

            if(oData.ObjectType === "ASSET" || oData.ObjectType === "RES_GROUP"){
                this._enableCreateUABtn(false);
                return;
            }
            this._enableCreateUABtn(true);
        },
        /**
         * Check for data dirty
         * This method also enable or disable the save button based on data changed
         * @return {boolean} true if changed false if unchaged
         */
        checkDirty : function () {
            if((Object.keys(this._changedAssignments).length > 0 && this._changedAssignments.constructor === Object) || (Object.keys(this._changedAbsences).length > 0 && this._changedAbsences.constructor === Object)){
                sap.ui.getCore().byId("idCreateSave").setEnabled(true);
                return true;
            }else{
                sap.ui.getCore().byId("idCreateSave").setEnabled(false);
                return false;
            }
        },
        /**
         * enable or disable the create unavailability button
         */
        _enableCreateUABtn : function (bState) {
            var oCreateUAButton = sap.ui.getCore().byId("idCreateUA");
             oCreateUAButton.setEnabled(bState);
        },
        /**
         * Open's the dialog containing the fields to create absence
         * @param oEvent
         */
        onCreateUnAvail : function (oEvent) {
            var oSelected = this._oPlanningCalendar.getSelectedRows(),
                oContext = oSelected[0].getBindingContext("calendarModel"),
                oModel = oContext.getModel(),
                sPath = oContext.getPath(),
                oData = oModel.getProperty(sPath);
            this._component.createUnAvail.open(this._oView, [sPath], {bFromPlannCal: true});
        },
        /**
         *
         * @private
         */
        _refreshIntervalHeader:function (sChanel, sEvent, oData) {
            var oSelected = this._oPlanningCalendar.getSelectedRows(),
                oRowContext = oSelected[0].getBindingContext("calendarModel");
            oRowContext.getObject().AbsenceInfo.push({
                DateFrom:oData.StartTimestamp,
                DateTo:oData.EndTimestamp,
                Description:oData.Description
            });
            oRowContext.getModel().refresh();
            var oNewAbsense = Object.assign({}, oData);
            delete oNewAbsense.Description;
            this._changedAbsences[oData.Guid || new Date()] = oNewAbsense;
            this.checkDirty();

        }

    });
});