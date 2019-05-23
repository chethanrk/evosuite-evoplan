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
       
       _changedAssignments : [],

        init: function () {
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("AssignInfoDialog", "RefreshCalendar", this._setCalendarModel, this);
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
        open: function (oView, aSelectedResources, mParameters) {
            var oDialog = this.getDialog();

            this._oView = oView;
            this.selectedResources = aSelectedResources;
            this._component = this._oView.getController().getOwnerComponent();
            this._oResourceBundle = this._component.getModel("i18n").getResourceBundle();
            this._oCalendarModel = this._component.getModel("calendarModel");
            this._oPlanningCalendar = sap.ui.getCore().byId("planningCalendar");
            this._mParameters = mParameters;
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
        _setCalendarModel: function () {
            var aResourceFilters = [],
                oModel = this._oView ? this._oView.getModel() : null;

            if (!oModel) {
                return;
            }
            if (this.selectedResources.length <= 0) {
                return;
            }
			
			// get All selected resource filters
			aResourceFilters = this._generateResourceFilters();

            this._oPlanningCalendar.setBusy(true);
            oModel.read("/AssignmentSet", {
                groupId: "calendarBatch",
                filters: aResourceFilters,
                urlParameters: {
                    "$expand": "Resource,Demand" // To fetch the assignments associated with Resource or ResourceGroup
                }
            });
            oModel.read("/ResourceAvailabilitySet", {
                groupId: "calendarBatch",
                filters: aResourceFilters,
                urlParameters: {
                    "$expand": "Resource" // To fetch the assignments associated with Resource or ResourceGroup
                }
            });
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
         * @returns {Array} resource filters
         */
		_generateResourceFilters : function (){
			var aUsers = [],
                aResourceFilters = [],
                aActualFilters = [],
                oModel = this._oView ? this._oView.getModel() : null,
                // oResourceBundle = this._oResourceBundle,
                oViewFilterSettings = this._component ? this._component.filterSettingsDialog : null;
                
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

                if (aResourceFilters.length > 0) {
                    aActualFilters.push(new Filter({
                            filters: aResourceFilters,
                            and: true
                        }
                    ));
                }
            }
            return aActualFilters;
		},
        /**
         * Success callback for a batch read of assignments and absence infos
         * @param data
         * @param response
         */
        onSuccess: function (data, response) {
            // console.log(this._createData(data));
            this._oCalendarModel.setData({
                startDate: new Date(),
                viewKey: this.getSelectedView(),
                resources: this._createData(data)
            });
            this._oCalendarModel.refresh();
            this._oPlanningCalendar.setBusy(false);
        },

        /**
         * Error callback for a batch read of assignments and absence infos
         */
        onError: function () {
            this._oDialog.setBusy(false);
            // this.showMessageToast(oResourceBundle.getText("errorMessage"));
        },
        /**
         * Get selected filter view
         * @return {string}
         */
        getSelectedView: function () {
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
        onClickCalendarAssignment: function (oEvent) {
            var oAppointment = oEvent.getParameter("appointment");
            var oContext = oAppointment.getBindingContext("calendarModel");
            var oModel = oContext.getModel();
            var sPath = oContext.getPath();
            var oAppointmentData = oModel.getProperty(sPath);
            this._component.assignInfoDialog.open(this._oView, null, oAppointmentData, this._mParameters);

        },
    	/**
    	 * @since 2.1.4
    	 * On drag assigments the method will be triggered. 
    	 */
        onAppointmentDragEnter : function (oEvent) {
        	// No needs to be done
        },
        /** 
         * Called on Assignment drop
         * @param oEvent
         */
        onAppointmentDrop: function(oEvent) {
        	this._refreshAppointment(oEvent);
        },
        /** 
         * Called when assignment resize
         * @param oEvent
         */
        onAppointmentResize: function(oEvent){
        	this._refreshAppointment(oEvent);
        },
        /**
         * Refresh the changed assignments in the local model
         * 
         * @param {Object} oEvent 
         */
        _refreshAppointment : function (oEvent) {
        	var oAppointment = oEvent.getParameter("appointment"),
        		oRow = oEvent.getParameter("calendarRow"),
        		eventBus = sap.ui.getCore().getEventBus(),
        		oStartDate = oEvent.getParameter("startDate"),
        		oEndDate = oEvent.getParameter("endDate"),
        		oAppointmentContext =  oAppointment.getBindingContext("calendarModel"),
        		oModel = oAppointmentContext.getModel(),
        		sAppointmentPath = oAppointmentContext.getPath(),
        		oAssignmentData = oModel.getProperty(sAppointmentPath),
        		oRowContext = oRow.getBindingContext("calendarModel"),
        		sRowPath = oRowContext.getPath(),
        		oRowData = oModel.getProperty(sRowPath),
        		oParams = {
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
				};
				
				if (oAppointment.getParent() !== oRow) {
					this.onDropOnAnotherResource(oModel, oAppointment, oAssignmentData, oRowData, sRowPath, oStartDate, oEndDate);
				}else{
					oModel.setProperty(sAppointmentPath+"/DateFrom",oStartDate);
					oModel.setProperty(sAppointmentPath+"/DateTo",oEndDate);
				}
				
				this._oPlanningCalendar.setBusy(true);
				
				eventBus.publish("PlanningCalendarDialog", "saveAllAssignments", {
						assignments:[oParams]
				});
        },
        /** 
         *  When assignments drop to different resource the assignment removed from the old row and added to new row
         * 
         * @param oModel - Json Model
         * @param oAppointment - Dragged assignment
         * @param oAssignmentData - Dragged Assignments data
         * @param oRowData - Dropped rowdata
         * @param sRowPath - Dropped row path
         * @param oStartDate - new Start date
         * @param oEndDate - new end date
         */
        onDropOnAnotherResource : function (oModel, oAppointment, oAssignmentData, oRowData, sRowPath, oStartDate, oEndDate){
        		var oCopyAssignmentData = jQuery.extend({},oAssignmentData),
        			oDraggedRowContext = oAppointment.getParent().getBindingContext("calendarModel"),
        			sDraggedRowPath = oDraggedRowContext.getPath(),
        			sDraggedRowData = oModel.getProperty(sDraggedRowPath);
        			
        			//remove from the old row
        			sDraggedRowData.Assignments.splice(oRowData.Assignments.indexOf(oCopyAssignmentData),1);
        			oModel.setProperty(sDraggedRowPath,sDraggedRowData);
        			
        			//add it in new row
        			oCopyAssignmentData.DateFrom = oStartDate;
					oCopyAssignmentData.DateTo = oEndDate;
					oRowData.Assignments.push(oCopyAssignmentData);
					oModel.setProperty(sRowPath,oRowData);
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
            var aResources = [];

            if (data.__batchResponses) {
                var oAssignData = data.__batchResponses[0].data;
                var oAbsenceData = data.__batchResponses[1].data;
                var oResourceMap = {};
                for (var l in data.__batchResponses) {

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
                            oResourceMap[j].Assignments.push(oAssignData.results[k]);
                        }
                    }
                    for (var m in oAbsenceData.results) {
                        if (oAbsenceData.results[m].ObjectId === sObjectId) {
                            oResourceMap[j].AbsenceInfo.push(oAbsenceData.results[m]);
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
            // if(this._oCalendarModel){
            //     this._oCalendarModel.setData({});
            // }
            if (this._oDialog) {
                this._oDialog.close();
            }
        }

    });
});