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
    "sap/gantt/misc/AxisTime",
    "com/evorait/evoplan/model/Constants"
], function (AssignmentActionsController, JSONModel, formatter, ganttFormatter, Filter, FilterOperator, Popup, Utility, CoordinateUtils,
             AxisTime, Constants) {
    "use strict";

    return AssignmentActionsController.extend("com.evorait.evoplan.controller.Gantt", {

        formatter: formatter,

        ganttFormatter: ganttFormatter,

        _treeTable: null,

        _oEventBus: null,

        _oAssignementModel: null,

        _viewId: "",

        _bLoaded: false,
        selectedResources: [],

        /**
         * controller life cycle on init event
         */
        onInit: function () {
            var oUserModel = this.getModel("user");

            this._oEventBus = sap.ui.getCore().getEventBus();
            this._oAssignementModel = this.getModel("assignment");

            this._oEventBus.subscribe("BaseController", "refreshGanttChart", this._refreshGanttChart, this);
            this._oEventBus.subscribe("AssignTreeDialog", "ganttShapeReassignment", this._reassignShape, this);


            //set on first load required filters
            this._treeTable = this.getView().byId("ganttResourceTreeTable");
            this._ganttChart = this.getView().byId("ganttResourceAssignments");
            this._axisTime = this.getView().byId("idAxisTime");
            this._userData = this.getModel("user").getData();

            this.getRouter().getRoute("gantt").attachPatternMatched(function () {
                this._routeName = Constants.GANTT.NAME;
            }.bind(this));
            this.getRouter().getRoute("ganttSplit").attachPatternMatched(function () {
                this._routeName = Constants.GANTT.SPLIT;
            }.bind(this));

            if (this._userData.ENABLE_RESOURCE_AVAILABILITY) {
                this._ganttChart.addStyleClass("resourceGanttWithTable");
            }
            this._defaultGanttHorizon();
            this._viewId = this.getView().getId();

        },

        /**
         * on page exit
         */
        onExit: function () {
            this._oEventBus.unsubscribe("BaseController", "refreshGanttChart", this._refreshGanttChart, this);
            this._oEventBus.unsubscribe("AssignTreeDialog", "ganttShapeReassignment", this._reassignShape, this);
            this._oEventBus.unsubscribe("BaseController", "refreshTreeTable", this._refreshGanttChart, this);
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
         * @public
         */
        onAfterRendering: function () {
            var oTable = this.getView().byId("ganttResourceTreeTable"),
                oBinding = oTable.getBinding("rows");

            // To show busy indicator when filter getting applied.
            oBinding.attachDataRequested(function () {
                oViewModel.setProperty("/ganttSettings/busy", true);
            });
            oBinding.attachDataReceived(function () {
                oViewModel.setProperty("/ganttSettings/busy", false);
            });
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
        _defaultGanttHorizon: function () {
            var oViewModel = this.getModel("viewModel");
            this.changeGanttHorizonViewAt(oViewModel);
        },
        /**
         * Gets default filters for gantt
         *
         * @param mParameters
         * @return {Array}
         * @private
         */
        _getDefaultFilters: function (mParameters) {
            var oDateFrom, oDateTo, oUserModel = this.getModel("user"),
                aFilters = [];

            oDateFrom = mParameters ? mParameters.dateFrom : oUserModel.getProperty("/GANT_START_DATE");
            oDateTo = mParameters ? mParameters.dateTo : oUserModel.getProperty("/GANT_END_DATE");

            aFilters.push(new Filter("StartDate", FilterOperator.LE, formatter.date(oDateTo)));
            aFilters.push(new Filter("EndDate", FilterOperator.GE, formatter.date(oDateFrom)));
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
                oDragContext = oDraggedControl ? oDraggedControl.getBindingContext() : undefined,
                oDropContext = oDroppedControl.getBindingContext(),
                sDragPath = oDragContext ? oDragContext.getPath() : localStorage.getItem("Evo-Dmnd-guid"),
                oAxisTime = this.byId("container").getAggregation("ganttCharts")[0].getAxisTime(),
                oViewModel = this.getModel("viewModel"),
                oResourceData = this.getModel().getProperty(oDropContext.getPath()),
                oSvgPoint;

            //Null check for
            if ((!oDragContext || !sDragPath) && !oDropContext) {
                return;
            }

            oViewModel.setProperty("/ganttSettings/busy", true);
            // Check the resource assignable or not
            if (!this.isAssignable({
                    data: oResourceData
                })) {
                oViewModel.setProperty("/ganttSettings/busy", false);
                return;
            }

            localStorage.setItem("Evo-Action-page", "ganttSplit");
            if (oBrowserEvent.target.tagName === "rect" && oDragContext) {
                // When we drop on gantt chart
                oSvgPoint = CoordinateUtils.getEventSVGPoint(oBrowserEvent.target.ownerSVGElement, oBrowserEvent);
                // oAxisTime.viewToTime(<oSvgPoint>) will give the time stamp for dropped location
                this._assignDemands(oResourceData, [sDragPath], oDropContext.getPath(), oAxisTime.viewToTime(oSvgPoint.x));
            } else if (oBrowserEvent.target.tagName === "rect" && !oDragContext) {
                oSvgPoint = CoordinateUtils.getEventSVGPoint(oBrowserEvent.target.ownerSVGElement, oBrowserEvent);
                this._assignDemands(oResourceData, null, oDropContext.getPath(), oAxisTime.viewToTime(oSvgPoint.x), false, [sDragPath]);
            } else if (oDragContext) {
                this._assignDemands(oResourceData, [sDragPath], oDropContext.getPath(), null, true);
            } else {
                this._assignDemands(oResourceData, null, oDropContext.getPath(), null, true, [sDragPath]);
            }
        },
        /**
         * Calls the respective function import to create assignments
         * @param {Object} aSources Demand paths
         * @param {Object} oTarget Resource Path
         * @private
         */
        _assignDemands: function (oResourceData, aSources, oTarget, oTargetDate, bCheckAvail, aGuids) {
            var oUserModel = this.getModel("user"),
                oResourceModel = this.getResourceBundle(),
                oViewModel = this.getModel("viewModel");
            if (!bCheckAvail && oUserModel.getProperty("/ENABLE_RESOURCE_AVAILABILITY") && oUserModel.getProperty("/ENABLE_ASSIGNMENT_STRETCH") &&
                oResourceData.NodeType !== "RES_GROUP" && (oResourceData.NodeType === "RESOURCE" && oResourceData.ResourceGuid && oResourceData.ResourceGuid !==
                    "")) {

                this._checkAvailability(aSources, oTarget, oTargetDate, aGuids).then(function (data) {
                    if (data.PastFail) {
                        oViewModel.setProperty("/ganttSettings/busy", false);
                        return;
                    }
                    if (!data.Unavailable) {
                        this.assignedDemands(aSources, oTarget, oTargetDate, false, aGuids)
                            .then(this._refreshAreas.bind(this)).catch(function (error) {
                        }.bind(this));
                    } else {
                        this._showConfirmMessageBox(oResourceModel.getText("ymsg.extendMsg")).then(function (value) {
                            if (value === "NO") {
                                this.assignedDemands(aSources, oTarget, oTargetDate, true, aGuids)
                                    .then(this._refreshAreas.bind(this)).catch(function (error) {
                                }.bind(this));
                            } else {
                                this.assignedDemands(aSources, oTarget, oTargetDate, false, aGuids)
                                    .then(this._refreshAreas.bind(this)).catch(function (error) {
                                }.bind(this));
                            }
                        }.bind(this));
                    }
                }.bind(this));

            } else {
                this.assignedDemands(aSources, oTarget, oTargetDate, false, aGuids)
                    .then(this._refreshAreas.bind(this)).catch(function (error) {
                }.bind(this));
            }

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
            //reset the changes
            this.resetChanges();
            if (this._bLoaded && oTreeTable && oTreeTable.getBinding("rows")) {
                this._ganttChart.setSelectionPanelSize("25%");
                oTreeTable.getBinding("rows")._restoreTreeState().then(function () {
                    oViewModel.setProperty("/ganttSettings/busy", false);
                    oTreeTable.clearSelection();
                    oTreeTable.rerender();
                }.bind(this));
            }
            this._bLoaded = true;
        },
        /**
         * on change of date range trigger the filter for gantt tree.
         * @since 3.0
         * @param oEvent
         */
        onChangeDateRange: function (oEvent) {
            var oFrom = oEvent.getParameter("from"),
                oTo = oEvent.getParameter("to");
            if (oFrom === null || oTo === null) {
                this.getResourceBundle().getText("xtit.datenotselected");
                return;
            }
            this._setTotalHorizon({
                dateTo: oTo,
                dateFrom: oFrom
            });
            this._setDefaultTreeDateRange({
                dateTo: oTo,
                dateFrom: oFrom
            });
        },
        /**
         * Setting the Time horizon for configured values.
         * @param mParameters
         * @private
         */
        _setTotalHorizon: function (mParameters) {
            var oTotalHorizon = this._axisTime.getAggregation("totalHorizon"),
                oUserModel = this.getModel("user"),
                sStartDate = mParameters ? mParameters.dateFrom : oUserModel.getProperty("/GANT_START_DATE"),
                sEndDate = mParameters ? mParameters.dateTo : oUserModel.getProperty("/GANT_END_DATE");

            oTotalHorizon.setStartTime(formatter.date(sStartDate));
            oTotalHorizon.setEndTime(formatter.date(sEndDate));

        },
        /**
         * Event triggered when right clicked on gantt shape,
         * The context menu showing un-assign button will be shown.
         * @param oEvent
         */
        onShapeContextMenu: function (oEvent) {
            var oShape = oEvent.getParameter("shape"),
                oViewModel = this.getModel("viewModel"),
                oAppView = this.getModel("appView");
            if (oShape && oShape.sParentAggregationName === "shapes3") {
                this._selectedShapeContext = oShape.getBindingContext();
                var oModel = this._selectedShapeContext.getModel(),
                    sPath = this._selectedShapeContext.getPath(),
                    sAssignGuid = oModel.getProperty(sPath).Guid,
                    sStatus = oModel.getProperty(sPath).DEMAND_STATUS;
                if (!this._menu) {
                    this._menu = sap.ui.xmlfragment(
                        "com.evorait.evoplan.view.gantt.ShapeContextMenu",
                        this, oAppView.getProperty("/currentRoute")
                    );
                    this.getView().addDependent(this._menu);
                }
                if (sStatus !== "COMP") {
                    this._updateAssignmentModel(sAssignGuid).then(function (data) {
                        oViewModel.setProperty("/ganttSettings/shapeOpearation/unassign", data.AllowUnassign);
                        oViewModel.setProperty("/ganttSettings/shapeOpearation/reassign", data.AllowReassign);
                        oViewModel.setProperty("/ganttSettings/shapeOpearation/change", data.AllowChange);
                        oViewModel.setProperty("/ganttSettings/shapeData", data);
                        var eDock = Popup.Dock;
                        this._menu.open(true, oShape, eDock.BeginTop, eDock.endBottom, oShape);
                    }.bind(this));
                }

            }
        },
        /**
         * Calls the delete assignment method when you select un-assign button
         * show reassignment dialog when select menu "Assign new"
         * @param oEvent
         */
        handleMenuItemPress: function (oEvent) {
            var oParams = oEvent.getParameters(),
                oSelectedItem = oParams.item,
                sButtonText = oSelectedItem.getText(),
                oCustomData = oSelectedItem.getAggregation("customData"),
                sFunctionKey = oCustomData.length ? oCustomData[0].getValue() : null;

            var oModel = this._selectedShapeContext.getModel(),
                sPath = this._selectedShapeContext.getPath(),
                sAssignGuid = oModel.getProperty(sPath).Guid,
                oSelectedData = [{
                    oData: {
                        Guid: oModel.getProperty(sPath).DemandGuid
                    }
                }],
                mParameters = {bFromGantt: true},
                oAppModel = this.getModel("appView");

            if (oAppModel.getProperty("/currentRoute") === "ganttSplit") {
                mParameters = {bFromGanttSplit: true};
            }
            // TODO comment
            localStorage.setItem("Evo-Action-page", "ganttSplit");

            if (sButtonText === this.getResourceBundle().getText("xbut.buttonUnassign")) {
                //do unassign
                this.byId("container").setBusy(true);
                this.deleteAssignment(oModel, sAssignGuid).then(this._refreshAreas.bind(this));
                // this._deleteAssignment(oModel, sAssignGuid);
            } else if (sButtonText === this.getResourceBundle().getText("xbut.buttonReassign")) {
                //show reassign dialog
                //oView, isReassign, aSelectedPaths, isBulkReAssign, mParameters, callbackEvent
                this.getOwnerComponent().assignTreeDialog.open(this.getView(), true, [sPath], false, null, "ganttShapeReassignment");
            } else if (sButtonText === this.getResourceBundle().getText("xbut.buttonChange")) {
                // Change
                this.getOwnerComponent().assignInfoDialog.open(this.getView(), null, null, mParameters, sPath);
            } else {
                if (sFunctionKey) {
                    this._oEventBus.publish("StatusSelectDialog", "changeStatusDemand", {
                        selectedPaths: oSelectedData,
                        functionKey: sFunctionKey,
                        parameters: mParameters
                    });
                }
            }
        },
        /**
         * Unassign assignment with delete confirmation dialog.
         */
        _deleteAssignment: function (oModel, sAssignGuid) {
            this._showConfirmMessageBox.call(this, this.getResourceBundle().getText("ymsg.confirmDel")).then(function (data) {
                if (data === "YES") {
                    this.deleteAssignment(oModel, sAssignGuid).then(this._refreshAreas.bind(this));
                } else {
                    this.byId("container").setBusy(false);
                    return;
                }
            }.bind(this));
        },

        /**
         * reassign a demand to a new resource by context menu
         * @private
         */
        _reassignShape: function (sChannel, sEvent, oData) {
            if (sEvent === "ganttShapeReassignment") {
                for (var i = 0; i < oData.aSourcePaths.length; i++) {
                    var sourceData = this.getModel().getProperty(oData.aSourcePaths[i]);
                    this._updateAssignmentModel(sourceData.Guid).then(function (oAssignmentObj) {
                        if (oAssignmentObj.AllowReassign) {
                            oAssignmentObj.NewAssignPath = oData.sAssignPath;
                            this._oAssignementModel.setData(oAssignmentObj);
                            this.updateAssignment(true, {
                                bFromGantt: true
                            });
                        } else {
                            this.getModel().resetChanges(oData.aSourcePaths);
                        }

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
            if (this._routeName !== Constants.GANTT.SPLIT) {
                this._oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
            }
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
                        urlParameters: {
                            "$expand": "Demand"
                        },
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
                oDefaultObject.AllowAppoint = oData.Demand.ALLOW_APPOINTMNT;
                oDefaultObject.AlloDispatch = oData.Demand.ALLOW_DISPATCHED;
                oDefaultObject.AllowDemMobile = oData.Demand.ALLOW_DEM_MOBILE;
                oDefaultObject.AllowAcknowledge = oData.Demand.ALLOW_ACKNOWLDGE;
                oDefaultObject.AllowReject = oData.Demand.ALLOW_REJECT;
                oDefaultObject.AllowEnroute = oData.Demand.ALLOW_ENROUTE;
                oDefaultObject.AllowStarted = oData.Demand.ALLOW_STARTED;
                oDefaultObject.AllowHold = oData.Demand.ALLOW_ONHOLD;
                oDefaultObject.AllowComplete = oData.Demand.ALLOW_COMPLETE;
                oDefaultObject.AllowIncomplete = oData.Demand.ALLOW_INCOMPLETE;
                oDefaultObject.AllowClosed = oData.Demand.ALLOW_CLOSED;
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
                oViewModel = this.getModel("viewModel"),
                msg = this.getResourceBundle().getText("msg.ganttShapeDropError"),
                oModel = this.getModel();

            if (!oParams.targetRow && !oParams.targetShape) {
                this.showMessageToast(msg);
                return;
            }
            // TODO comment
            localStorage.setItem("Evo-Action-page", "ganttSplit");

            var targetContext = oParams.targetRow ? oParams.targetRow.getBindingContext() : oParams.targetShape.getParent().getParent().getBindingContext(),
                targetData = targetContext ? targetContext.getObject() : null,
                draggedShape = oParams.draggedShapeDates;
            // If you drop in empty gantt area where there is no data
            if (!targetData) {
                this.showMessageToast(msg);
                return;
            }

            // Check the resource assignable or not
            if (!this.isAssignable({
                    data: targetData
                })) {
                oViewModel.setProperty("/ganttSettings/busy", false);
                return;
            }

            oViewModel.setProperty("/ganttSettings/busy", true);
            Object.keys(draggedShape).forEach(function (sShapeUid) {
                var sourcePath = this._getShapeBindingContextPath(sShapeUid),
                    sourceData = this.getModel().getProperty(sourcePath),
                    isReassign = sourceData.ObjectId !== targetData.NodeId;

                var oSourceStartDate = moment(draggedShape[sShapeUid].time),
                    oSourceEndDate = moment(draggedShape[sShapeUid].endTime),
                    duration = oSourceEndDate.diff(oSourceStartDate, "seconds"),
                    newEndDate = moment(oParams.newDateTime).add(duration, "seconds");

                this._updateAssignmentModel(sourceData.Guid).then(function (oAssignmentObj) {
                    if (isReassign && !oAssignmentObj.AllowReassign) {
                        oModel.resetChanges([sourcePath]);
                        oViewModel.setProperty("/ganttSettings/busy", false);
                        return;
                    } else if (!oAssignmentObj.AllowChange) {
                        oModel.resetChanges([sourcePath]);
                        oViewModel.setProperty("/ganttSettings/busy", false);
                        return;
                    } else {
                        oAssignmentObj.DateFrom = oParams.newDateTime;
                        oAssignmentObj.DateTo = newEndDate.toDate();
                        oAssignmentObj.NewAssignPath = targetContext.getPath();
                        this._oAssignementModel.setData(oAssignmentObj);
                        this.updateAssignment(isReassign, {
                            bFromGantt: true
                        });
                    }
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
                oViewModel = this.getModel("viewModel"),
                oModel = oRowContext.getModel();

            oViewModel.setProperty("/ganttSettings/busy", true);
            // TODO comment
            localStorage.setItem("Evo-Action-page", "ganttSplit");

            if (oParams.shape && oParams.shape.sParentAggregationName === "shapes3") {
                this._updateAssignmentModel(oData.Guid).then(function (oAssignmentObj) {
                    if (oAssignmentObj.AllowChange) {
                        oAssignmentObj.DateFrom = oParams.newTime[0];
                        oAssignmentObj.DateTo = oParams.newTime[1];

                        this._oAssignementModel.setData(oAssignmentObj);
                        this.updateAssignment(false, {
                            bFromGantt: true
                        });
                    } else {
                        oModel.resetChanges([oRowContext.getPath()]);
                        oViewModel.setProperty("/ganttSettings/busy", false);
                        return;
                    }

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
                // TODO comment
                localStorage.setItem("Evo-Action-page", "ganttSplit");
                if (oContext) {
                    this.getOwnerComponent().planningCalendarDialog.open(this.getView(), [oRowContext.getPath()], {
                        bFromGantt: true
                    }, oShape.getTime());
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
        onSearchResource: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oFilter = new Filter("Description", FilterOperator.Contains, sQuery);
            var aFilters = this._getDefaultFilters();
            aFilters.push(oFilter);
            var binding = this.getView().byId("ganttResourceTreeTable").getBinding("rows");
            binding.filter(aFilters, "Application");

        },
        /**
         * open the create unavailability dialog for selected resource
         * @param oEvent
         */
        onCreateAbsence: function (oEvent) {
            var oTreeTable = this.getView().byId("ganttResourceTreeTable"),
                aIndices = oTreeTable.getSelectedIndices(),
                oContext,
                oResourceBundle = this.getResourceBundle();
            if (this.selectedResources.length === 0) {
                this.showMessageToast(oResourceBundle.getText("ymsg.selectRow"));
                return;
            }
            // TODO comment
            localStorage.setItem("Evo-Action-page", "ganttSplit");
            //oContext = oTreeTable.getContextByIndex(aIndices[0]);
            // this.getOwnerComponent().createUnAvail.open(this.getView(), [oContext.getPath()], {bFromGantt: true});
            this.getOwnerComponent().manageAvail.open(this.getView(), [this.selectedResources[0]], {
                bFromGantt: true
            });

        },

        /**
         * on click on today adjust the view of Gantt horizon.
         */
        onPressToday: function (oEvent) {
            this.changeGanttHorizonViewAt(this.getModel("viewModel"), this._axisTime.getZoomLevel());
        },

        /**
         * When user select a resource by selecting checkbox enable/disables the
         * appropriate buttons in the footer.
         * @param oEvent
         * @Author Pranav
         */

        onChangeSelectResource: function (oEvent) {
            var oSource = oEvent.getSource();
            var parent = oSource.getParent();
            var sPath = parent.getBindingContext().getPath();
            var oParams = oEvent.getParameters();

            //Sets the property IsSelected manually
            this.getModel().setProperty(sPath + "/IsSelected", oParams.selected);

            if (oParams.selected) {
                this.selectedResources.push(sPath);

            } else if (this.selectedResources.indexOf(sPath) >= 0) {
                //removing the path from this.selectedResources when user unselect the checkbox
                this.selectedResources.splice(this.selectedResources.indexOf(sPath), 1);
            }

            if (this.selectedResources.length > 0) {
                this.byId("idButtonreassign").setEnabled(true);
                this.byId("idButtonunassign").setEnabled(true);

            } else {
                this.byId("idButtonreassign").setEnabled(false);
                this.byId("idButtonunassign").setEnabled(false);
            }
            var oData = this.getModel().getProperty(this.selectedResources[0]);

            if (this.selectedResources.length === 1 && oData && oData.NodeType === "RESOURCE" && oData.ResourceGuid !== "" && oData.ResourceGroupGuid !== "") {
                this.byId("idButtonCreUA").setEnabled(true);
            } else {
                this.byId("idButtonCreUA").setEnabled(false);
            }

        },

        /**
         * On click on expand the tree nodes gets expand to level 1
         * On click on collapse all the tree nodes will be collapsed to root.
         * @param oEvent
         */
        onClickExpandCollapse: function (oEvent) {
            var oButton = oEvent.getSource(),
                oCustomData = oButton.getCustomData();

            if (oCustomData[0].getValue() === "EXPAND" && this._treeTable) {
                this._treeTable.expandToLevel(1);
            } else {
                this._treeTable.collapseAll();
            }
        },

        /**
         * Open's Dialog containing assignments to reassign
         * @param oEvent
         */
        onPressReassign: function (oEvent) {
            localStorage.setItem("Evo-Action-page", "ganttSplit");
            this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, false, {
                bFromGantt: true
            });
        },
        /**
         * Open's Dialog containing assignments to unassign
         * @param oEvent
         */
        onPressUnassign: function (oEvent) {
            localStorage.setItem("Evo-Action-page", "ganttSplit");
            this.getOwnerComponent().assignActionsDialog.open(this.getView(), this.selectedResources, true, {
                bFromGantt: true
            });
        },
        /**
         * Resets the selected resource if selected
         */
        resetChanges: function () {
            var oModel = this.getModel();

            // reset the model changes
            if (oModel.hasPendingChanges()) {
                oModel.resetChanges();
            }
            // Resetting selected resource
            this.selectedResources = [];
            this.byId("idButtonreassign").setEnabled(false);
            this.byId("idButtonunassign").setEnabled(false);
            this.byId("idButtonCreUA").setEnabled(false);
        },

        /**
         *
         * @param aSources
         * @param oTarget
         * @param oTargetDate
         * @private
         */
        _checkAvailability: function (aSources, oTarget, oTargetDate, aGuids) {
            var oModel = this.getModel(),
                sGuid = aSources ? oModel.getProperty(aSources[0] + "/Guid") : aGuids[0];
            return new Promise(function (resolve, reject) {
                this.executeFunctionImport(oModel, {
                    ResourceGuid: oModel.getProperty(oTarget + "/ResourceGuid"),
                    StartTimestamp: oTargetDate || new Date(),
                    DemandGuid: sGuid
                }, "ResourceAvailabilityCheck", "GET").then(function (data) {
                    resolve(data);
                });
            }.bind(this));
        },
        /**
         * Formatter for the color fill
         * Based on the group type the fill the color will be rendered.
         * A -> White
         * N -> Pattern
         * @param sType
         * @return {string}
         */
        getPattern: function (sType) {
            if (sType === "N") {
                return "url(#" + this._viewId + "--unavailability)";
            } else if (sType === "A") {
                return "#FFF";
            } else if (sType === "O") {
                return "transparent";
            } else {
                return "transparent";
            }

        },
        /**
         * Format legend colors to differentiate between pattern and colors
         * @param sCode
         * @param sType
         * @return {*}
         */
        formatLegend: function (sCode, sType) {
            if (sType === "COLOUR") {
                return sCode;
            } else {
                return "url(#" + this._viewId + "--unavailability)";
            }
        },

        formatAvailType: function (sType) {
            if (sType === "N") {
                return "NA";
            } else if (sType === "A") {
                return "AV";
            } else {
                return "XX";
            }
        }
    });
});