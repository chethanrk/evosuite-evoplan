sap.ui.define([
    "com/evorait/evoplan/controller/AssignmentActionsController",
    "sap/ui/model/json/JSONModel",
    "com/evorait/evoplan/model/formatter",
    "com/evorait/evoplan/model/ganttFormatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (AssignmentActionsController, JSONModel, formatter, ganttFormatter, Filter, FilterOperator) {
    "use strict";

    return AssignmentActionsController.extend("com.evorait.evoplan.controller.Gantt", {

        formatter: formatter,

        ganttFormatter: ganttFormatter,

        _treeTable: null,

        _oEventBus: null,

        _oAssignementModel: null,


        /**
         * controller life cycle on init event
         */
        onInit: function () {
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._oAssignementModel = this.getModel("assignment");

            //set gantt chart view range
            var defDateRange = formatter.getDefaultDateRange(),
                oEventBus = sap.ui.getCore().getEventBus();

            this._setGanttTimeHorizon(defDateRange);
            // oViewModel = this.getModel("viewModel");
            //oViewModel.setProperty("/ganttSettings/totalStartTime", defDateRange.dateFrom);
            //oViewModel.setProperty("/ganttSettings/totalEndTime", defDateRange.dateTo);

            // oViewModel.setProperty("/ganttSettings/totalStartTime", moment().startOf("month").subtract(2, "months").toDate());
            // oViewModel.setProperty("/ganttSettings/totalEndTime", moment().endOf("month").add(2, "months").toDate());
            // oViewModel.setProperty("/ganttSettings/visibleStartTime", moment().startOf("month").toDate()); 	// start of month
            // oViewModel.setProperty("/ganttSettings/visibleEndTime", moment().endOf("month").toDate()); 		// end of month

            //route matched
            this.getRouter().getRoute("gantt").attachPatternMatched(this._onObjectMatched, this);
            this._oEventBus.subscribe("BaseController", "refreshGanttChart", this._refreshGanttChart, this);

            //set on first load required filters
            this._treeTable = this.getView().byId("ganttResourceTreeTable");
        },

        /**
         * after page rendering
         */
        onAfterRendering: function () {

        },

        /**
         * on page exit
         */
        onExit: function () {

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
         * when routing was matched
         * @private
         */
        _onObjectMatched: function () {

        },

        /**
         * set default filters for tree table
         * @private
         */
        _setDefaultTreeDateRange: function (mParameters) {
            var defDateRange = mParameters || formatter.getDefaultDateRange(),
                aFilters = [];

            aFilters.push(new Filter("StartDate", FilterOperator.LE, formatter.date(defDateRange.dateTo)));
            aFilters.push(new Filter("EndDate", FilterOperator.GE, formatter.date(defDateRange.dateFrom)));
            aFilters.push(new Filter("NodeType", FilterOperator.GE, "TIMENONE"));

            var binding = this.getView().byId("ganttResourceTreeTable").getBinding("rows");
            binding.filter(aFilters, "Application");
        },
        /**
         * On Drop on the resource call the function import for
         * @Author Rahul
         * @since 3.0
         *
         */
        onDropOnResource: function (oEvent) {
            var oDraggedControl = oEvent.getParameter("draggedControl"),
                oDroppedControl = oEvent.getParameter("droppedControl"),
                oDragContext = oDraggedControl.getBindingContext(),
                oDropContext = oDroppedControl.getBindingContext(),
                oPromise,
                oResourceBundle = this.getResourceBundle(),
                sMessage = oResourceBundle.getText("ymsg.availability");

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
        },
        /**
         * Calls the respective function import to create assignments
         * @param aSources Demand paths
         * @param oTarget Resource Path
         * @private
         */
        _assignDemands: function (aSources, oTarget) {
            var oPromise = this.assignedDemands(aSources, oTarget);
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
                oTreeBinding = oTreeTable.getBinding("rows");

            if (oTreeBinding) {
                oTreeBinding._restoreTreeState().then(function () {
                    // Scrolled manually to fix the rendering
                    var oScrollContainer = oTreeTable._getScrollExtension();
                    var iScrollIndex = oScrollContainer.getRowIndexAtCurrentScrollPosition();
                    if (iScrollIndex === 0) {
                        oTreeTable._getScrollExtension().updateVerticalScrollPosition(33);
                    } else {
                        oTreeTable._getScrollExtension().scrollVertically(1);
                    }

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
            this._setGanttTimeHorizon({dateTo: oTo, dateFrom: oFrom});
        },
        /**
         * Set Time Horizon for Gantt chart
         * @since 3.0
         * @param defDateRange
         */
        _setGanttTimeHorizon: function (defDateRange) {
            var oViewModel = this.getModel("viewModel");

            oViewModel.setProperty("/ganttSettings/totalStartTime", defDateRange.dateFrom);
            oViewModel.setProperty("/ganttSettings/totalEndTime", defDateRange.dateTo);
            oViewModel.setProperty("/ganttSettings/visibleStartTime", moment().startOf("month").toDate()); 	// start of month
            oViewModel.setProperty("/ganttSettings/visibleEndTime", moment().endOf("month").toDate());
        },
        /**
         * on press link of assignment in resource tree row
         * get parent row path and bind this path to the dialog or showing assignment information
         * @param oEvent
         */
        onPressAssignmentLink: function (oEvent) {
            var oSource = oEvent.getSource(),
                oRowContext = oSource.getParent().getBindingContext();

            if (oRowContext) {
                this.assignmentPath = oRowContext.getPath();
                this.getOwnerComponent().assignInfoDialog.open(this.getView(), this.assignmentPath, null, {bFromGantt: true});
            } else {
                var msg = this.getResourceBundle().getText("notFoundContext");
                this.showMessageToast(msg);
            }
        },
        /**
         * Event triggered when right clicked on gantt shape,
         * The context menu showing un-assign button will be shown.
         * @param oEvent
         */
        onShapeContextMenu: function (oEvent) {
            var oShape = oEvent.getParameter("shape");
            if (oShape) {
                this._selectedShapeContext = oShape.getBindingContext();
                if (!this._menu) {
                    this._menu = sap.ui.xmlfragment(
                        "com.evorait.evoplan.view.fragments.shapeContextMenu",
                        this
                    );
                    this.getView().addDependent(this._menu);
                }
                var eDock = sap.ui.core.Popup.Dock;
                this._menu.open(false, oShape, eDock.BeginTop, eDock.endBottom, oShape);
            }
        },
        /**
         * Calls the delete assignment method when you select un-assign button
         * @param oEvent
         */
        handleMenuItemPress: function (oEvent) {
            var oModel = this._selectedShapeContext.getModel(),
                sPath = this._selectedShapeContext.getPath(),
                sAssignGuid = oModel.getProperty(sPath).AssignmentGuid;

            this.deleteAssignment(oModel, sAssignGuid).then(this._refreshAreas.bind(this));
        },
        /**
         * Refresh the Gantt tree and Demand table of Gantt view.
         * @param data
         * @param oResponse
         * @private
         */
        _refreshAreas: function (data, oResponse) {
            var oEventBus = sap.ui.getCore().getEventBus();
            this.showMessage(oResponse);
            this._refreshGanttChart();
            oEventBus.publish("BaseController", "refreshDemandGanttTable", {});
        },

        /**
         * get shape binding path
         * from dragged data object
         * @param sShapeUid
         * @private
         */
        _getShapeBindingContextPath: function (sShapeUid) {
            var oParsedUid = sap.gantt.misc.Utility.parseUid(sShapeUid);
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

                if (!oAssignmentData) {
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
                draggedShape = oParams.draggedShapeDates;

            if (!oParams.targetRow) {
                var msg = this.getResourceBundle().getText("msg.ganttShapeDropError");
                this.showMessageToast(msg);
                return;
            }

            var targetContext = oParams.targetRow.getBindingContext(),
                targetData = targetContext.getObject(),
                draggedShape = oParams.draggedShapeDates;

            Object.keys(draggedShape).forEach(function (sShapeUid) {
                var sourcePath = this._getShapeBindingContextPath(sShapeUid),
                    sourceData = this.getModel().getProperty(sourcePath),
                    isReassign = sourceData.NodeId !== targetData.NodeId;

                var oSourceStartDate = moment(draggedShape[sShapeUid].time),
                    oSourceEndDate = moment(draggedShape[sShapeUid].endTime),
                    duration = oSourceEndDate.diff(oSourceStartDate, "seconds"),
                    newEndDate = moment(oParams.newDateTime).add(duration, "seconds");

                this._updateAssignmentModel(sourceData.AssignmentGuid).then(function (oAssignmentObj) {
                    oAssignmentObj.DateFrom = oParams.newDateTime;
                    oAssignmentObj.DateTo = newEndDate.toDate();
                    oAssignmentObj.NewAssignPath = targetContext.getPath();

                    if (targetData.NodeType === "ASSIGNMENT" && isReassign) {
                        //assign with new date times to parent node
                        oAssignmentObj.NewAssignPath = "/" + this.getModel().createKey("ResourceHierarchySet", {
                            NodeId: targetData.ParentNodeId
                        });
                    }
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
                oData = this.getModel().getProperty(oRowContext.getPath());

            this._updateAssignmentModel(oData.AssignmentGuid).then(function (oAssignmentObj) {
                oAssignmentObj.DateFrom = oParams.newTime[0];
                oAssignmentObj.DateTo = oParams.newTime[1];

                this._oAssignementModel.setData(oAssignmentObj);
                this.updateAssignment(false, {bFromGantt: true});
            }.bind(this));
        },

        /**
         * double click on a shape
         * open assignment detail dialog
         * @param oEvent
         */
        onShapeDoubleClick: function (oEvent) {
            var oParams = oEvent.getParameters();
            var oRowContext = oParams.shape.getBindingContext();

            if (oRowContext) {
                this.getOwnerComponent().assignInfoDialog.open(this.getView(), oRowContext.getPath());
            } else {
                var msg = this.getResourceBundle().getText("notFoundContext");
                this.showMessageToast(msg);
            }
        }

    });
});