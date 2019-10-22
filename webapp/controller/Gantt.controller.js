sap.ui.define([
    "com/evorait/evoplan/controller/AssignmentActionsController",
    "sap/ui/model/json/JSONModel",
    "com/evorait/evoplan/model/formatter",
    "com/evorait/evoplan/model/ganttFormatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Popup",
    "sap/gantt/misc/Utility",
    "sap/gantt/simple/CoordinateUtils",
    "sap/gantt/misc/AxisTime"
], function (AssignmentActionsController, JSONModel, formatter, ganttFormatter, Filter, FilterOperator, Popup, Utility, CoordinateUtils,AxisTime) {
    "use strict";

    AxisTime.prototype.getNowLabel = function () {
        var date = new Date();
        var utcDate = new Date(date.getTime());
        var value = this.timeToView(utcDate);
        var localDate = d3.time.second.offset(utcDate, this.timeZoneOffset);

        return [{
            "date": localDate,
            "value": Math.round(value)
        }];
    };

    return AssignmentActionsController.extend("com.evorait.evoplan.controller.Gantt", {

        formatter: formatter,

        ganttFormatter: ganttFormatter,

        _treeTable: null,

        _oEventBus: null,

        _oAssignementModel: null,

        _viewId:"",


        /**
         * controller life cycle on init event
         */
        onInit: function () {

            this._oEventBus = sap.ui.getCore().getEventBus();
            this._oAssignementModel = this.getModel("assignment");

            this._oEventBus.subscribe("BaseController", "refreshGanttChart", this._refreshGanttChart, this);
            this._oEventBus.subscribe("AssignTreeDialog", "ganttShapeReassignment", this._reassignShape, this);

            //set on first load required filters
            this._treeTable = this.getView().byId("ganttResourceTreeTable");
            this._ganttChart = this.getView().byId("ganttResourceAssignments");
            // this._setDefaultTreeDateRange();
            this._defaultGanttHorizon();

            this._viewId = this.getView().getId();
        },

        /**
         * on page exit
         */
        onExit: function () {
            this._oEventBus.unsubscribe("BaseController", "refreshGanttChart");
            this._oEventBus.unsubscribe("AssignTreeDialog", "ganttShapeReassignment");
        },


        /**
         * ################### Events #########################
         */

        onBusyStateChanged: function (oEvent) {
            var parameters = oEvent.getParameters();
            if (parameters.busy !== false && !this._isLoaded) {
                this._isLoaded = true;
                this._setDefaultTreeDateRange();
            }
        },

        /**
         * ################### Internal functions ###################
         */

        /**
         * set default filters for tree table
         * @private
         */
        _setDefaultTreeDateRange: function (mParameters) {
            var aFilters = this._getDefaultFilters(mParameters);

            var binding = this.getView().byId("ganttResourceTreeTable").getBinding("rows");
            binding.filter(aFilters, "Application");
        },
        /**
         * Set Default Horizon times
         * @private
         */
        _defaultGanttHorizon : function () {
            var oDefaultDateRange = formatter.getDefaultGanttDateRange(),
                oViewModel = this.getModel("viewModel");
            oViewModel.setProperty("/ganttSettings/totalStartTime", oDefaultDateRange.dateFrom);
            oViewModel.setProperty("/ganttSettings/totalEndTime", oDefaultDateRange.dateTo);
            
            this.changeGanttHorizonViewAt(oViewModel);
        },
        /**
         * Gets default filters for gantt
         *
         * @param mParameters
         * @return {Array}
         * @private
         */
        _getDefaultFilters : function (mParameters) {
            var defDateRange = mParameters || formatter.getDefaultGanttDateRange(),
                aFilters = [];

            aFilters.push(new Filter("StartDate", FilterOperator.LE, formatter.date(defDateRange.dateTo)));
            aFilters.push(new Filter("EndDate", FilterOperator.GE, formatter.date(defDateRange.dateFrom)));
            return aFilters;
        },
        /**
         * On Drop on the resource tree rows or on the Gantt chart
         * call the function import to create the assignment
         *
         * @param {object} oEvent
         * @Author Rahul
         * @since 3.0
         *
         */
        onDropOnResource: function (oEvent) {
            var oDraggedControl = oEvent.getParameter("draggedControl"),
                oDroppedControl = oEvent.getParameter("droppedControl"),
                oBrowserEvent = oEvent.getParameter("browserEvent"),
                oDragContext = oDraggedControl.getBindingContext(),
                oDropContext = oDroppedControl.getBindingContext(),
                oPromise,
                oAxisTime = this.byId("container").getAggregation("ganttCharts")[0].getAxisTime(),
                oResourceBundle = this.getResourceBundle(),
                sMessage = oResourceBundle.getText("ymsg.availability"),
                oViewModel = this.getModel("viewModel");


            oViewModel.setProperty("/ganttSettings/busy",true);

            if(oBrowserEvent.target.tagName === "rect"){
                // When we drop on gantt chart
                var oSvgPoint = CoordinateUtils.getEventSVGPoint(oBrowserEvent.target.ownerSVGElement,oBrowserEvent);
                // oAxisTime.viewToTime(<oSvgPoint>) will give the time stamp for dropped location
                this._assignDemands([oDragContext.getPath()], oDropContext.getPath(),oAxisTime.viewToTime(oSvgPoint.x));
            }else{
                if (!this.isAvailable(oDropContext.getPath())) {
                    oPromise = this._showConfirmMessageBox(sMessage); // this method will resolve promise
                    oPromise.then(function (data) {
                        if (data === "YES") {
                            this._assignDemands([oDragContext.getPath()], oDropContext.getPath());
                        }
                    }.bind(this));
                } else {
                    this._assignDemands([oDragContext.getPath()], oDropContext.getPath());
                }
            }
        },
        /**
         * Calls the respective function import to create assignments
         * @param {Object} aSources Demand paths
         * @param {Object} oTarget Resource Path
         * @private
         */
        _assignDemands: function (aSources, oTarget, oTargetDate) {
            var oPromise = this.assignedDemands(aSources, oTarget, oTargetDate);
            oPromise.then(this._refreshAreas.bind(this)).catch(function (error) {
                console.log(error);
            }.bind(this));
        },
        /**
         * Refreshes the Gantt tree table.
         * Note: There is workaround code written to fix the restore tree state.
         * @constructor
         * @since 3.0
         * @param oEvent
         */
        _refreshGanttChart: function (oEvent) {
            var oTreeTable = this.getView().byId("ganttResourceTreeTable"),
                oViewModel = this.getModel("viewModel");

            if (oTreeTable && oTreeTable.getBinding("rows")) {
                oTreeTable.getBinding("rows")._restoreTreeState().then(function () {
                    oViewModel.setProperty("/ganttSettings/busy",false);
                });

            }
        },
        /**
         * on change of date range trigger the filter for gantt tree.
         * @since 3.0
         * @param oEvent
         */
        onChangeDateRange: function (oEvent) {
            var oFrom = oEvent.getParameter("from"),
                oTo = oEvent.getParameter("to");

            this._setDefaultTreeDateRange({dateTo: oTo, dateFrom: oFrom});
        },
        /**
         * Event triggered when right clicked on gantt shape,
         * The context menu showing un-assign button will be shown.
         * @param oEvent
         */
        onShapeContextMenu: function (oEvent) {
            var oShape = oEvent.getParameter("shape"),
                oViewModel = this.getModel("viewModel");
            if (oShape && oShape.sParentAggregationName === "shapes3") {
                this._selectedShapeContext = oShape.getBindingContext();
                var oModel = this._selectedShapeContext.getModel(),
                    sPath = this._selectedShapeContext.getPath(),
                    sAssignGuid = oModel.getProperty(sPath).Guid;
                if (!this._menu) {
                    this._menu = sap.ui.xmlfragment(
                        "com.evorait.evoplan.view.gantt.ShapeContextMenu",
                        this
                    );
                    this.getView().addDependent(this._menu);
                }

                this._updateAssignmentModel(sAssignGuid).then(function(data){
                    oViewModel.setProperty("/ganttSettings/shapeOpearation/unassign",data.AllowUnassign);
                    oViewModel.setProperty("/ganttSettings/shapeOpearation/reassign",data.AllowReassign)
                    oViewModel.setProperty("/ganttSettings/shapeOpearation/change",data.AllowChange);
                    var eDock = Popup.Dock;
                    this._menu.open(false, oShape, eDock.BeginTop, eDock.endBottom, oShape);
                }.bind(this));


            }
        },
        /**
         * Calls the delete assignment method when you select un-assign button
		 * show reassignment dialog when select menu "Assign new"
         * @param oEvent
         */
        handleMenuItemPress: function (oEvent) {
        	var oParams = oEvent.getParameters(),
				sButtonText = oParams.item.getText();

			var oModel = this._selectedShapeContext.getModel(),
				sPath = this._selectedShapeContext.getPath(),
				sAssignGuid = oModel.getProperty(sPath).Guid;


			if(sButtonText === this.getResourceBundle().getText("xbut.buttonUnassign")){
				//do unassign
                this.byId("container").setBusy(true);
				this.deleteAssignment(oModel, sAssignGuid).then(this._refreshAreas.bind(this));

			} else if(sButtonText === this.getResourceBundle().getText("xbut.buttonReassign")){
				//show reassign dialog
				console.log("show reassign dialog");
				//oView, isReassign, aSelectedPaths, isBulkReAssign, mParameters, callbackEvent
                this.getOwnerComponent().assignTreeDialog.open(this.getView(), true, [sPath], false, null, "ganttShapeReassignment");
			}else if(sButtonText === this.getResourceBundle().getText("xbut.buttonChange")){
			    // Change
			    this.getOwnerComponent().assignInfoDialog.open(this.getView(), null, null, {bFromGantt: true}, sPath);
            }
        },


        /**
         * reassign a demand to a new resource by context menu
         * @private
         */
        _reassignShape: function(sChannel, sEvent, oData){
            if(sEvent === "ganttShapeReassignment"){
                for (var i = 0; i < oData.aSourcePaths.length; i++) {
                    var sourceData = this.getModel().getProperty(oData.aSourcePaths[i]);
                    this._updateAssignmentModel(sourceData.Guid).then(function (oAssignmentObj) {
                        oAssignmentObj.NewAssignPath = oData.sAssignPath;
                        this._oAssignementModel.setData(oAssignmentObj);
                        this.updateAssignment(true, {bFromGantt: true});
                    }.bind(this));
                }
            }
        },

        /**
         * Refresh the Gantt tree and Demand table of Gantt view.
         * @param data
         * @param oResponse
         * @private
         */
        _refreshAreas: function (data, oResponse) {
            this.showMessage(oResponse);
            this._refreshGanttChart();
			this._oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
        },

        /**
         * get shape binding path
         * from dragged data object
         * @param sShapeUid
         * @private
         */
        _getShapeBindingContextPath: function (sShapeUid) {
            var oParsedUid = Utility.parseUid(sShapeUid);
            return oParsedUid.shapeDataName;
        },

        /**
         * Promise for fetching details about asignment demand
         * coming from backend or alsready loaded data
         * @param sAssignmentGuid
         * @param isReassign
         * @private
         */
        _updateAssignmentModel: function (sAssignmentGuid, isReassign) {
            return new Promise(function (resolve, reject) {
                var sPath = this.getModel().createKey("AssignmentSet", {
                    Guid: sAssignmentGuid
                });
                var oAssignmentData = this.getModel().getProperty("/" + sPath);
                // Demnad data or assignment data will be missing some time
                if (!oAssignmentData || !oAssignmentData.Demand || !oAssignmentData.Demand.Guid) {
                    this.getModel().read("/" + sPath, {
                        urlParameters: {"$expand": "Demand"},
                        success: function (result) {
                            var obj = this._getAssignmentModelObject(result);
                            this._oAssignementModel.setData(obj);
                            resolve(obj);
                        }.bind(this),
                        error: function (error) {
                            reject(error);
                        }
                    });
                } else {
                    var obj = this._getAssignmentModelObject(oAssignmentData);
                    this._oAssignementModel.setData(obj);
                    resolve(obj);
                }
            }.bind(this));
        },

        /**
         * get prepared assignment object for reassign, update requests
         * @param oData
         * @returns {*|{DemandGuid, Description, Effort, OperationNumber, AllowUnassign, ResourceGuid, NewAssignId, OrderId, isNewAssignment, SubOperationNumber, AllowReassign, NewAssignPath, showError, AllowChange, DateFrom, ResourceGroupGuid, AssignmentGuid, NewAssignDesc, DemandStatus, EffortUnit, DateTo}}
         * @private
         */
        _getAssignmentModelObject: function (oData) {
            var oDefaultObject = this.getOwnerComponent().assignInfoDialog.getDefaultAssignmentModelObject();
            oDefaultObject.AssignmentGuid = oData.Guid;

            for (var key in oDefaultObject) {
                if (oData.hasOwnProperty(key)) {
                    oDefaultObject[key] = oData[key];
                }
            }
            if (!oData.Demand.Status) {
                var sPath = this.getModel().createKey("DemandSet", {
                    Guid: oData.DemandGuid
                });
                oData.Demand = this.getModel().getProperty("/" + sPath);
            }
            if (oData.Demand) {
                oDefaultObject.AllowChange = oData.Demand.ASGNMNT_CHANGE_ALLOWED;
                oDefaultObject.AllowReassign = oData.Demand.ALLOW_REASSIGN;
                oDefaultObject.AllowUnassign = oData.Demand.ALLOW_UNASSIGN;
                oDefaultObject.OrderId = oData.Demand.ORDERID;
                oDefaultObject.OperationNumber = oData.Demand.OPERATIONID;
                oDefaultObject.SubOperationNumber = oData.Demand.SUBOPERATIONID;
                oDefaultObject.DemandStatus = oData.Demand.Status;
            }
            return oDefaultObject;
        },

        /**
         * when a shape was dropped to another place
         * it should be not droppable to another assignments only to resources
         * @param oEvent
         */
        onShapeDrop: function (oEvent) {
            var oParams = oEvent.getParameters(),
                draggedShape = oParams.draggedShapeDates,
                oViewModel = this.getModel("viewModel");

            oViewModel.setProperty("/ganttSettings/busy",true);

            if (!oParams.targetRow && !oParams.targetShape) {
                var msg = this.getResourceBundle().getText("msg.ganttShapeDropError");
                this.showMessageToast(msg);
                return;
            }

            var targetContext = oParams.targetRow ? oParams.targetRow.getBindingContext() :oParams.targetShape.getParent().getParent().getBindingContext() ,
                targetData = targetContext.getObject(),
                draggedShape = oParams.draggedShapeDates;

            Object.keys(draggedShape).forEach(function (sShapeUid) {
                var sourcePath = this._getShapeBindingContextPath(sShapeUid),
                    sourceData = this.getModel().getProperty(sourcePath),
                    isReassign = sourceData.ObjectId !== targetData.NodeId;

                var oSourceStartDate = moment(draggedShape[sShapeUid].time),
                    oSourceEndDate = moment(draggedShape[sShapeUid].endTime),
                    duration = oSourceEndDate.diff(oSourceStartDate, "seconds"),
                    newEndDate = moment(oParams.newDateTime).add(duration, "seconds");

                this._updateAssignmentModel(sourceData.Guid).then(function (oAssignmentObj) {
                    oAssignmentObj.DateFrom = oParams.newDateTime;
                    oAssignmentObj.DateTo = newEndDate.toDate();
                    oAssignmentObj.NewAssignPath = targetContext.getPath();
                    this._oAssignementModel.setData(oAssignmentObj);
                    this.updateAssignment(isReassign, {bFromGantt: true});
                }.bind(this));
            }.bind(this));
        },

        /**
         * when the shape off assignment was resized save new timespan to backend
         * @param oEvent
         */
        onShapeResize: function (oEvent) {
            var oParams = oEvent.getParameters(),
                oRowContext = oParams.shape.getBindingContext(),
                oData = this.getModel().getProperty(oRowContext.getPath()),
                oViewModel = this.getModel("viewModel");

            oViewModel.setProperty("/ganttSettings/busy",true);

            if (oParams.shape && oParams.shape.sParentAggregationName === "shapes3") {
                this._updateAssignmentModel(oData.Guid).then(function (oAssignmentObj) {
                    oAssignmentObj.DateFrom = oParams.newTime[0];
                    oAssignmentObj.DateTo = oParams.newTime[1];

                    this._oAssignementModel.setData(oAssignmentObj);
                    this.updateAssignment(false, {bFromGantt: true});
                }.bind(this));
            }
        },

        /**
         * double click on a shape
         * open assignment detail dialog
         * @param oEvent
         */
        onShapeDoubleClick: function (oEvent) {
            var oParams = oEvent.getParameters();
            var oContext = oParams.shape.getBindingContext(),
                oRowContext = oParams.rowSettings.getParent().getBindingContext(),
                oShape = oParams.shape;
            if (oShape && oShape.sParentAggregationName === "shapes3") {
                if (oContext) {
                    this.getOwnerComponent().planningCalendarDialog.open(this.getView(), [oRowContext.getPath()], {bFromGantt: true},oShape.getTime());
                } else {
                    var msg = this.getResourceBundle().getText("notFoundContext");
                    this.showMessageToast(msg);
                }
            }
        },
        /**
         * on search the filter the gantt tree resource
         * @param oEvent
         */
        onSearchResource : function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oFilter = new Filter("Description",FilterOperator.Contains, sQuery);
            var aFilters = this._getDefaultFilters();
            aFilters.push(oFilter);
            var binding = this.getView().byId("ganttResourceTreeTable").getBinding("rows");
            binding.filter(aFilters, "Application");

        },
        /**
         * open the create unavailability dialog for selected resource
         * @param oEvent
         */
        onCreateAbsence : function (oEvent) {
            var oTreeTable = this.getView().byId("ganttResourceTreeTable"),
                aIndices = oTreeTable.getSelectedIndices(),oContext,
                oResourceBundle = this.getResourceBundle();
            if(aIndices.length === 0){
                this.showMessageToast(oResourceBundle.getText("ymsg.selectRow"))
                return;
            }
            oContext = oTreeTable.getContextByIndex(aIndices[0]);
           // this.getOwnerComponent().createUnAvail.open(this.getView(), [oContext.getPath()], {bFromGantt: true});
           this.getOwnerComponent().manageAvail.open(this.getView(), [oContext.getPath()], {bFromGantt: true});

        },
        /**
         * on row selection change enable/disable the create absence
         * @param oEvent
         */
        onRowSelectionChange: function (oEvent) {
            var aIndices = oEvent.getSource().getSelectedIndices(),
                oButton = this.getView().byId("idCreateAb"),
                oContext = aIndices.length > 0 ? oEvent.getSource().getContextByIndex(aIndices[0]) : null,
                oData = oContext !== null ? oContext.getModel().getProperty(oContext.getPath()) : null;
            if(aIndices.length > 0 && oData && oData.NodeType === "RESOURCE"){
                oButton.setEnabled(true);
            }else{
                oButton.setEnabled(false);
            }
        },
        /**
         * on click on today adjust the view of Gantt horizon. 
         */
        onPressToday : function (oEvent) {
            this.changeGanttHorizonViewAt(this.getModel("viewModel"));
        },

        getPattern : function (sType) {
            return "url(#"+this._viewId+"--unavailability)";
        },

        formatLegend: function (sCode, sType) {
        if(sType === "COLOUR"){
            return sCode;
        }else{
            return "url(#"+this._viewId+"--unavailability)";
        }
    }


    });
});