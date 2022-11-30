sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Filter, Sorter, FilterOperator, JSONModel, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.common.ManageResourceAvailability", {

		formatter: formatter,

		_dataDirty: false,
		_isUpdate: false,

		init: function () {},
		/**
		 * init and get dialog view
		 * @returns {sap.ui.core.Control|sap.ui.core.Control[]|*}
		 */
		open: function (oView, aSelectedPaths, mParameters, sSource) {
			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					id: "TimeAllocations",
					name: "com.evorait.evoplan.view.common.fragments.TimeAllocations",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					oDialog.setEscapeHandler(this.onEscapeDialog.bind(this));
					this._oDialog = oDialog;
					this.onOpen(oDialog, oView, aSelectedPaths, mParameters, sSource);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, aSelectedPaths, mParameters, sSource);
			}
		},

		/**
		 * Sets the necessary value as global to this controller
		 * Open's the popover
		 * @param oView
		 * @param oEvent
		 */
		onOpen: function (oDialog, oView, aSelectedPaths, mParameters, sSource) {
			this._oView = oView;
			this._component = oView.getController().getOwnerComponent();
			this._oModel = this._component.getModel();
			this._calendarModel = this._component.getModel("calendarModel");
			this._ganttModel = this._component.getModel("ganttModel");
			this._oViewModel = this._component.getModel("viewModel");
			this._oUserModel = this._component.getModel("user");
			this._bShowBlockers = this._oUserModel.getProperty("/ENABLE_BLOCK_TIME");
			this._bShowAbsences = this._oUserModel.getProperty("/ENABLE_MANAGE_ABSENCE");
			this._bCreateAbsences = this._oUserModel.getProperty("/ENABLE_ABSENCE_CREATE");
			this._bChangeAbsences = this._oUserModel.getProperty("/ENABLE_ABSENCE_CHANGE");
			this._bCreateBlockers = this._oUserModel.getProperty("/ENABLE_CREATE_ASSET_TIME_ALLOC");
			this._bChangeBlockers = this._oUserModel.getProperty("/ENABLE_CHANGE_ASSET_TIME_ALLOC");
			this._mParameters = mParameters || {
				bFromHome: true
			};
			this.sSource = sSource;
			this._resourceBundle = this._oView.getController().getResourceBundle();
			this._id = "TimeAllocations";
			this._dataDirty = false;
			this._oApp = Fragment.byId(this._id, "navCon");
			this._oApp.backToTop();
			this._oSmartList = Fragment.byId(this._id, "idResourceAvailList");
			this._oList = Fragment.byId(this._id, "idResourceAvailList").getList();
			this._TimeAllocationTabBar = Fragment.byId(this._id, "idTimeAllocationIconTabBar");
			if (this._mParameters.bFromPlannCal) {
				this._resource = this._calendarModel.getProperty(aSelectedPaths[0]).ResourceGuid;
				this._aResourceGuids = this.getResourceGuids(aSelectedPaths, this._calendarModel);
			} else if (this._mParameters.bFromNewGantt) {
				this._resource = this._ganttModel.getProperty(aSelectedPaths[0] + "/ResourceGuid");
				this._aResourceGuids = this.getResourceGuids(aSelectedPaths, this._ganttModel);
			} else {
				this._resource = this._oModel.getProperty(aSelectedPaths[0] + "/ResourceGuid");
				this._aResourceGuids = this.getResourceGuids(aSelectedPaths, this._oModel);
			}

			oDialog.setTitle(this._resourceBundle.getText("xtit.timeAllocations"))
			oDialog.addStyleClass(this._component.getContentDensityClass());

			// connect dialog to view (models, lifecycle)
			oView.addDependent(oDialog);
			oDialog.open();

			//update list according to selected tab
			this.onTabSelectionChanged(null, true);
		},
		/**
		 * to get resource guids of all selected resources
		 * collection all resource names to display in title
		 * @param aSelectedPaths 
		 * @param oModel
		 */
		getResourceGuids: function (aSelectedPaths, oModel) {
			var aResourceGuids = [];

			this._resourceNames = [];
			for (var i in aSelectedPaths) {
				aResourceGuids.push(oModel.getProperty(aSelectedPaths[i] + "/ResourceGuid"));
				this._resourceNames.push(oModel.getProperty(aSelectedPaths[i] + "/Description"));
			}
			this._resourceNames = this._resourceNames.join(", ");
			return aResourceGuids;
		},
		/**
		 * Navigates to detail page on click on item
		 * @param oEvent
		 */
		onClickItem: function (oEvent) {
			var oSelectedItem = oEvent.getParameter("listItem"),
				oContext = oSelectedItem.getBindingContext(),
				oSelectedAbsence = oContext.getObject(),
				sPath = oContext.getPath(),
				bCheck = true,
				oDetail = Fragment.byId(this._id, "detail");

			this._selectedPath = sPath;
			this._oSelectedItem = oSelectedItem;
			this._oSelectedItemContext = oContext;

			oDetail.unbindElement();
			this._oDialog.setBusy(true);
			oDetail.bindElement(sPath);

			this._updateAvailBlockHour(sPath);
			this.updateButtonsVisibility("Update");

			if (oSelectedAbsence.UI_DISABLE_ABSENCE_EDIT) {
				this.showMessageToast(this._resourceBundle.getText("ymsg.updateHRAbsence"));
			} else {
				this._oApp.to(this._id + "--detail");
				this._isUpdate = true;
			}

		},
		/**
		 * On back check for data dirty
		 * if data is dirty show confirmation box, if not navigates to master page
		 * @param oEvent
		 */
		onNavBack: function (oEvent) {
			var oChanges = this._getChangedData(oEvent);
			if (!oChanges) {
				this._oApp.back();
				this.onTabSelectionChanged();
			} else {
				this._showConfirmMessageBox.call(this._oView.getController(), this._resourceBundle.getText("ymsg.confirmMsg")).then(function (data) {
					if (data === "NO") {
						//do nothing, keep on the same page.
					} else {
						this._resetChanges(oEvent);
						this._oApp.back();
						this._isUpdate = false;
						this.onTabSelectionChanged();
					}
				}.bind(this));
			}
		},
		/**
		 * Checks if data dirty if data is dirty returns the changed data
		 * if not dirty then returns undefined
		 * @param oEvent
		 * @param sProperty
		 * @return {*} if data is dirty returns the changed data
		 * if not dirty then returns undefined
		 * @private
		 */
		_getChangedData: function (oEvent, sProperty) {
			var oSource = oEvent.getSource(),
				// In case of delete action the context fetch will be different
				oContext = sProperty !== "DELETE" ? oSource.getBindingContext() :
				oEvent.getParameter("listItem").getBindingContext(),

				sPath = oContext ? oContext.getPath() : this._oSelectedItemContext.getPath(),
				oData = this._oModel.getProperty(sPath),
				aPath = sPath.split(""),
				oChanges;

			// remove the first character
			aPath.shift();
			//Getting the Value for Blocked Time for Time Allocation
			var sCurPageId = this._oApp.getCurrentPage().getId().slice(17);
			if (this.sSource === "timeAlloc" && sCurPageId === "detail" && sProperty !== "DELETE") {
				oData.BlockPercentage = Fragment.byId(this._id, "idUpdateTimeAllocSlider").getValue();
				oData.AvailType = Fragment.byId(this._id, "idTimeAllocAvailType").getSelectedKey();
				oData.Description = Fragment.byId(this._id, "idUpdateDescription").getValue();
			} else if (this.sSource === "timeAlloc" && sCurPageId === "create" && sProperty !== "DELETE") {
				oData.BlockPercentage = Fragment.byId(this._id, "idTimeAllocSlider").getValue();
				oData.AvailType = Fragment.byId(this._id, "idTimeAllocAvailType").getSelectedKey();
				oData.Description = Fragment.byId(this._id, "idCreateDescription").getValue();
			} else {
				//oData.BlockPercentage = 0;
			}
			oChanges = this._oModel.hasPendingChanges() ? this._oModel.getPendingChanges()[aPath.join("")] : undefined;
			if (oChanges && sProperty !== "DELETE") {
				oData.DateFrom = oChanges.DateFrom ? oChanges.DateFrom : oData.DateFrom;
				oData.DateTo = oChanges.DateTo ? oChanges.DateTo : oData.DateTo;
				if (this.sSource !== "timeAlloc") {
					oData.AvailType = Fragment.byId(this._id, "idManagAbsAvailType").getSelectedKey();
				}
				return oData;
			} else if (!oChanges && this._oModel.hasPendingChanges()) {
				oData.DateFrom = Fragment.byId(this._id, "idUpdateFromDate").getDateValue();
				oData.DateTo = Fragment.byId(this._id, "idUpdateToDate").getDateValue();
				if (this.sSource !== "timeAlloc") {
					oData.AvailType = Fragment.byId(this._id, "idManagAbsAvailType").getSelectedKey();
				}
				return oData;
			} else if (sProperty === "DELETE") {
				return oData;
			}
			return undefined;

		},
		/**
		 * Filter's the list by selected resource
		 * @param oEvent
		 */
		configureList: function (oEvent) {
			var oList, oBinding, aFilters = [],
				oViewFilterSettings = this._oView.getController().oFilterConfigsController || null,
				sDateControl1,
				sDateControl2,
				sSelectedTab = this._TimeAllocationTabBar.getSelectedKey(),
				oSorter;

			if (this._mParameters.bFromGantt) {
				// if we decide to keep different date range for demand view and gantt view
				sDateControl1 = this._oUserModel.getProperty("/DEFAULT_GANT_START_DATE");
				sDateControl2 = this._oUserModel.getProperty("/DEFAULT_GANT_END_DATE");
			} else if (this._mParameters.bFromNewGantt) {
				// For New Gantt fetching the Dates from DateRange Selection
				sDateControl1 = this._oView.byId("idDateRangeGantt2").getDateValue();
				sDateControl2 = this._oView.byId("idDateRangeGantt2").getSecondDateValue();
			} else {
				sDateControl1 = oViewFilterSettings.getDateRange()[0];
				sDateControl2 = oViewFilterSettings.getDateRange()[1];
			}
			this.oDate1 = sDateControl1;
			this.oDate2 = sDateControl2;

			this._oViewModel.setProperty("/timeAllocations/StartDate", new Date(sDateControl1));
			this._oViewModel.setProperty("/timeAllocations/EndDate", new Date(sDateControl2));

			oList = Fragment.byId(this._id, "idResourceAvailList").getList();
			oBinding = oList.getBinding("items");
			aFilters = this._getAvailabilityFilters(sSelectedTab, sDateControl2, sDateControl1);
			oBinding.filter(new Filter({
				filters: aFilters,
				and: true
			}));
			oSorter = new Sorter({
				path: "AVAILABILITY_GROUP_DESCR",
				descending: true,
				group: true
			});
			oBinding.sort(oSorter);
		},
		/**
		 * This Event is triggered when creating/updating the field values for Manage Absence and Time Allocation
		 * @param sProperty - To identify whether its create or update
		 * @param oChanges - Which holds Data 
		 * @param  oUpdateData - Data to be passed to backend
		 */
		_ProceedToManageAbsenceService: function (sProperty, oChanges, oUpdateData) {

			if (!this._checkMandaoryFields(oChanges, sProperty)) {
				return;
			}

			oUpdateData.StartTimestamp = oChanges.DateFrom;
			oUpdateData.EndTimestamp = oChanges.DateTo;
			if (this.sSource === "timeAlloc") {
				var oStartDate, oEndDate;
				oUpdateData.BlockPercentage = oChanges.BlockPercentage;
				oStartDate = oChanges.DateFrom;
				oStartDate.setHours(0, 0, 0); //TimeStamp to be sent as T00:00:00 for Start Date only for TimeAllocation
				oEndDate = oChanges.DateTo;
				oEndDate.setHours(23, 59, 59); //TimeStamp to be sent as T23:59:59 for End Date only for TimeAllocation
				oUpdateData.StartTimestamp = oChanges.DateFrom;
				oUpdateData.EndTimestamp = oChanges.DateTo;
				oUpdateData.Description = oChanges.Description;
			}

			if (sProperty === "SAVE") {
				oUpdateData.Guid = oChanges.Guid;
				this._callFunction(oUpdateData);
			} else if (sProperty === "CREATE") {
				oUpdateData.AvailabilityType = oChanges.AvailType;
				this._callFunction(oUpdateData, true);
			}
		},

		/**
		 * This Event is triggered when creating/updating/deleting
		 * @param oEvent
		 * @param sProperty - The event parameters passed
		 */
		onAction: function (oEvent, sProperty) {
			var oChanges = this._getChangedData(oEvent, sProperty),
				oUpdateData = {
					ResourceGuid: this._resource
				};
			if (oChanges) {
				if (sProperty === "CREATE") {
					this._ProceedToManageAbsenceService(sProperty, oChanges, oUpdateData);
				} else {
					oUpdateData.Guid = oChanges.Guid;
					oUpdateData.ResourceGuid = oChanges.ResourceGuid;
					if (sProperty === "SAVE") {
						this._ProceedToManageAbsenceService(sProperty, oChanges, oUpdateData);
					} else {
						this._deleteUnavailability(oUpdateData);
					}
				}
				if (!this._checkMandaoryFields(oChanges, sProperty)) {
					return;
				}
				this._resetChanges(oEvent, sProperty);
				this._oApp.back();
			} else {
				this._dataDirty = false;
				this.showMessageToast(this._resourceBundle.getText("No Changes"));
			}
		},
		/**
		 * validates the dates entered
		 * from date should be less than the to date
		 */
		_validateDates: function (oData) {
			if (oData.dateFrom !== "" && oData.dateTo !== "" && oData.availType !== "") {
				if (oData.dateFrom.getTime() >= oData.dateTo.getTime()) {
					this.showMessageToast(this._resourceBundle.getText("ymsg.datesInvalid"));
					return false;
				}
				return true;
			}
			return false;
		},
		/**
		 * Checks madatory fields 
		 */
		_checkMandaoryFields: function (oChanges, sProperty) {
			var bCheck = false;
			if (sProperty === "DELETE")
				return;
			// Check necessary condition common for Manage Absence & Time Allocation
			if (oChanges.DateFrom !== "" && oChanges.DateTo !== "" && oChanges.AvailType !== "") {
				bCheck = true;
			}

			//Checking End Date is greater than Start Date 
			if (oChanges.DateTo < oChanges.DateFrom) {
				bCheck = false;
				this.showMessageToast(this._resourceBundle.getText("ymsg.datesInvalid"));
				return false;
			}

			//Check for Time Allocation & Manage Absence validation
			if (bCheck && (this.sSource === "timeAlloc" && oChanges.BlockPercentage !== 0)) {
				return true;
			} else if (bCheck && this.sSource !== "timeAlloc") {
				return true;
			}
			this.showMessageToast(this._resourceBundle.getText("formValidateErrorMsg"));
			return false;
		},
		/**
		 * Resets changed values and resource tree selection
		 * @param oEvent
		 * @param sProperty
		 * @private
		 */
		_resetChanges: function (oEvent, sProperty) {
			Fragment.byId(this._id, "detail").unbindElement();
			Fragment.byId(this._id, "create").setBindingContext(null);
			var oEventBus = sap.ui.getCore().getEventBus();
			if (this._mParameters.bFromGantt || this._mParameters.bFromNewGantt) {
				//to reset "Time Allocations" btn enable/disable
				this._oView.byId("idButtonreassign").setEnabled(false);
				this._oView.byId("idButtonunassign").setEnabled(false);
				this._oView.byId("idButtonTimeAllocNew").setEnabled(false);

				Fragment.byId(this._id, "idTimeAllocSlider").setValue(0);
				Fragment.byId(this._id, "idCreateDescription").setValue("");
			} else if (this._mParameters.bFromHome || this._mParameters.bFromMap) {
				oEventBus.publish("ManageAbsences", "ClearSelection", {});
			}
		},
		/**
		 * Method triggered to create the unavailability
		 * @param oEvent
		 */
		onCreateUnAvail: function (oEvent) {
			var sAvailType = this._oUserModel.getProperty("/DEFAULT_ABSENCE_TYPE").split(";");
			this._oModel.metadataLoaded().then(function () {
				var oContext = this._oModel.createEntry("/ResourceAvailabilitySet", {
					properties: {
						DateFrom: moment().startOf("day").toDate(),
						DateTo: moment().endOf("day").toDate(),
						AvailabilityTypeGroup: "N",
						AvailType: sAvailType[0],
						Description: sAvailType[1],
						ResourceDescription: this._resourceNames
					}
				});
				this._oSelectedItemContext = oContext;
				var oDetail = Fragment.byId(this._id, "create");
				oDetail.setBindingContext(oContext);
				this._oApp.to(this._id + "--create");
			}.bind(this));

			//Enabling/Disabling the form for Time Allocation & Manage Absence
			Fragment.byId(this._id, "idMangAbsAllocation").setVisible(true);
			Fragment.byId(this._id, "idTimeAllocation").setVisible(false);
			this.sSource = "";
			this.updateButtonsVisibility("CreateAbsence");

		},
		/**
		 * Method triggered to create the unavailability
		 * @param oEvent
		 */
		onCreateTimeAlloc: function (oEvent) {
			var sAvailType = this._oUserModel.getProperty("/DEFAULT_ABSENCE_TYPE").split(";"),
				oEndDate = new Date();
			this._oModel.metadataLoaded().then(function () {
				var oContext = this._oModel.createEntry("/ResourceAvailabilitySet", {
					properties: {
						DateFrom: moment().startOf("day").toDate(),
						DateTo: moment().endOf("day").toDate(),
						AvailabilityTypeGroup: "L",
						AvailType: sAvailType[0],
						Description: sAvailType[1],
						ResourceDescription: this._resourceNames
					}
				});
				this._oSelectedItemContext = oContext;
				var oDetail = Fragment.byId(this._id, "create");
				oDetail.setBindingContext(oContext);
				this._oApp.to(this._id + "--create");
			}.bind(this));

			//Enabling/Disabling the form for Time Allocation & Manage Absence
			Fragment.byId(this._id, "idTimeAllocation").setVisible(true);
			Fragment.byId(this._id, "idMangAbsAllocation").setVisible(false);
			Fragment.byId(this._id, "idTimeAllocSlider").setValue(0);
			this.sSource = "timeAlloc";
			this._getMultiResourceAvailability(new Date(), oEndDate.setHours(23, 59, 59));
			this.updateButtonsVisibility("CreateBlocker");
		},
		/**
		 * Deletes the absences 
		 */
		_deleteUnavailability: function (oUpdateData) {
			this._showConfirmMessageBox.call(this._oView.getController(), this._resourceBundle.getText("ymsg.confirmDel")).then(function (data) {
				if (data === "YES") {
					this._callFunction(oUpdateData);
				} else {
					return;
				}
			}.bind(this));
		},
		/**
		 * Calls the respective function import
		 * @param oData
		 * @private
		 */
		_callFunction: function (oData, bIsCreate) {
			var aPromises = [];
			this._oDialog.setBusy(true);
			this._dataDirty = true;

			// condition to call service for single/multiple resource
			if (!bIsCreate || this._aResourceGuids.length === 1) {
				new Promise(function (resolve, reject) {
					this.executeFunctionImport.call(this._oView.getController(), this._oModel, oData, "ManageAbsence", "POST").then(function (data) {
						this._refreshList();
					}.bind(this));
				}.bind(this));
			} else {
				for (var i in this._aResourceGuids) {
					oData.ResourceGuid = this._aResourceGuids[i];
					aPromises.push(this.executeFunctionImport.call(this._oView.getController(), this._oModel, oData, "ManageAbsence", "POST", true));
				}
				Promise.all(aPromises).then(function (aPromiseAllResults, oResponse, bContainsError) {
					if (aPromiseAllResults && aPromiseAllResults.length) {
						var oMessages = [];
						for (var i in aPromiseAllResults) {
							oMessages.push(JSON.parse(aPromiseAllResults[i][1].headers["sap-message"]));
						}
						this._oViewModel.setProperty("/oResponseMessages", oMessages);
						this.showResponseMessagePopup.call(this._oView.getController());
						this._refreshList();
					}
				}.bind(this));
			}
		},
		/**
		 * Calls the respective function import
		 * @param oData
		 * @private
		 */
		_callFunctionGetResourceAvailability: function (oData) {
			this._oDialog.setBusy(true);
			this._dataDirty = true;
			new Promise(function (resolve, reject) {
				this.executeFunctionImport.call(this._oView.getController(), this._oModel, oData, "GetResourceAvailability", "GET").then(
					function (data) {
						Fragment.byId(this._id, "idTimeAllocSlider").setValue(data.BlockPercentage);
						Fragment.byId(this._id, "idUpdateAvailablHour").setValue(data.AVAILABLE_HOURS);
						this.AVAILABLE_HOURS = data.AVAILABLE_HOURS;
						this.BLOCKED_HOURS = data.BLOCKED_HOURS;
						if (this._isUpdate) {
							this._updateBlockdHour();
						}
						this._oDialog.setBusy(false);
					}.bind(this));
			}.bind(this));
		},
		/**
		 * Refresh's the List
		 * @param data
		 * @private
		 */
		_refreshList: function (data) {
			this._oDialog.setBusy(false);
			this._oSmartList.rebindList();
			this.onTabSelectionChanged();
		},
		/**
		 * On Close check for data dirty
		 * if data is dirty show confirmation box, if not close the dialog
		 * @param oEvent
		 */
		onClose: function (oEvent) {
			this._oModel.resetChanges();
			this._refreshTreeGantt(oEvent);

			//to reset "Time Allocation" btn enable/disable
			if (!this._mParameters.bFromNewGantt) {
				this._oView.getController().selectedResources = [];
			}

			this._oView.byId("idButtonreassign").setEnabled(false);
			this._oView.byId("idButtonunassign").setEnabled(false);
			this._oView.byId("idButtonTimeAllocNew").setEnabled(false);

			if (this._mParameters.bFromMap) {
				this._oView.byId("showRoute").setEnabled(false);
				this._oView.byId("showPlanCalendar").setEnabled(false);
				this._oView.byId("assignedDemands").setEnabled(false);
			}
		},
		/**
		 * If any absence are created/updated/deleted the resource tree/ gantt will refreshed
		 * based on the parameter
		 * @param oEvent
		 * @private
		 */
		_refreshTreeGantt: function (oEvent) {
			var eventBus = sap.ui.getCore().getEventBus();
			if (this._dataDirty && this._mParameters.bFromGantt) {
				eventBus.publish("BaseController", "refreshGanttChart", {});
			} else if (this._dataDirty && this._mParameters.bFromHome) {
				eventBus.publish("BaseController", "refreshTreeTable", {});
			} else if (this._dataDirty && this._mParameters.bFromNewGantt) {
				eventBus.publish("BaseController", "refreshAvailabilities", {
					resource: this._resource
				});
			} else if (this._mParameters.bFromNewGantt && !this._dataDirty) {
				eventBus.publish("BaseController", "resetSelections", {});
			}
			this._dataDirty = false;
			this._oDialog.setBusy(false);
			this._oDialog.close();
		},
		/**
		 *	After DataRecieved, HR Absences item delete mode icon will be hidden
		 *  @Author Chethan RK
		 *	@private
		 */
		onRemoveDeleteMode: function () {
			if (this._oView.getModel("user").getProperty("/ENABLE_ABSENCE_DELETE")) {
				var aItems = this._oList.getItems();
				for (var d in aItems) {
					if (aItems[d].getBindingContext() && aItems[d].getBindingContext().getObject().UI_DISABLE_ABSENCE_DELETE) {
						aItems[d].getDeleteControl() ? aItems[d].getDeleteControl().setVisible(false) : "";
					} else {
						aItems[d].getDeleteControl() ? aItems[d].getDeleteControl().setVisible(true) : "";
					}
				}
			} else {
				this._oList.setMode("None");
			}
		},

		/**
		 * handle slider changes for calculting blocker hours
		 * @param oEvent
		 */
		onSliderChange: function (oEvent) {
			var iUpdatedBlockPer = oEvent.getParameters().value,
				aAvailabilityData,
				iActualAvailHours,
				iUpdatedAvailableHour;
			// iActualAvailHour = this.AVAILABLE_HOURS,
			// iUpdatedAvailableHour;
			this._oViewModel.setProperty("/timeAllocations/createData", _.clone(this._oViewModel.getProperty("/timeAllocations/createDataCopy")));

			aAvailabilityData = this._oViewModel.getProperty("/timeAllocations/createData");
			if (iUpdatedBlockPer) {
				for (var i in aAvailabilityData) {
					iActualAvailHours = aAvailabilityData[i].AVAILABLE_HOURS;
					iActualAvailHours = iActualAvailHours.includes(",") ? iActualAvailHour.replace(",", ".") : iActualAvailHours;
					if (iUpdatedBlockPer) {
						iUpdatedAvailableHour = iActualAvailHours * (100 - iUpdatedBlockPer) * 0.01;
						aAvailabilityData[i].BLOCKED_HOURS = parseFloat(iActualAvailHours - iUpdatedAvailableHour).toFixed(1);
					} else {
						aAvailabilityData[i].BLOCKED_HOURS = 0
					}
				}
			}
			this._oViewModel.refresh();
		},

		/**
		 * updating slider changes for calculting blocker hours
		 * @param oEvent
		 */
		onUpdateSliderChange: function (oEvent) {
			var iUpdatedBlockPer = oEvent.getParameters().value,
				iActualAvailHour = Fragment.byId(this._id, "idUpdateAvailablHour").getValue(),
				iUpdatedAvailableHour;

			//replacing comma with dot as this property is getting used in calculations 	
			if (iActualAvailHour.includes(",")) {
				iActualAvailHour = iActualAvailHour.replace(",", ".");
			}
			if (iUpdatedBlockPer) {
				iUpdatedAvailableHour = iActualAvailHour * (100 - iUpdatedBlockPer) * 0.01;
				Fragment.byId(this._id, "idUpdateBlockdHour").setValue(iActualAvailHour - iUpdatedAvailableHour);
			} else {
				Fragment.byId(this._id, "idUpdateAvailablHour").setValue(this.AVAILABLE_HOURS);
				Fragment.byId(this._id, "idUpdateBlockdHour").setValue(0);
			}
		},

		/**
		 * reading blocker data to display in update form
		 * @param oEvent
		 */
		handleChange: function (oEvent) {
			var oStartDate = Fragment.byId(this._id, "idFromDate").getDateValue(),
				oEndDate = Fragment.byId(this._id, "idToDate").getDateValue();
			this._getMultiResourceAvailability(oStartDate, oEndDate.setHours(23, 59, 59));
		},

		/**
		 * reading blocker data to display in update form
		 * @param oEvent
		 */
		handleUpdateChange: function (oEvent) {
			var oEndDate = Fragment.byId(this._id, "idUpdateToDate").getDateValue();
			var oData = {
				ResourceGuid: this._resource,
				StartTimestamp: Fragment.byId(this._id, "idUpdateFromDate").getDateValue(),
				EndTimestamp: oEndDate.setHours(23, 59, 59)
			};
			this._callFunctionGetResourceAvailability(oData);
		},

		/**
		 *updating latest changes of block hours to blocker from backend read
		 * @param sPath
		 */
		_updateBlockdHour: function () {
			var iUpdateBlockPercentag = Fragment.byId(this._id, "idUpdateTimeAllocSlider").getValue(),
				iUpdateActualAvailHour = this.AVAILABLE_HOURS,
				iUpdateBlockHr;

			//replacing comma with dot as this property is getting used in calculations
			if (iUpdateActualAvailHour.includes(",")) {
				iUpdateActualAvailHour = iUpdateActualAvailHour.replace(",", ".");
			}
			if (iUpdateBlockPercentag == 0) {
				Fragment.byId(this._id, "idUpdateBlockdHour").setValue(0);
			} else if (iUpdateBlockPercentag == 100) {
				Fragment.byId(this._id, "idUpdateBlockdHour").setValue(this.AVAILABLE_HOURS);
			} else {
				iUpdateBlockHr = iUpdateActualAvailHour - (iUpdateBlockPercentag * iUpdateActualAvailHour) * 0.01;
				Fragment.byId(this._id, "idUpdateBlockdHour").setValue(iUpdateBlockHr);
			}
		},

		/**
		 *updating latest changes of available block hours to blocker from backend read
		 * @param sPath
		 */
		_updateAvailBlockHour: function (sPath) {
			this._oModel.read(sPath, {
				method: "GET",
				success: function (rData) {
					Fragment.byId(this._id, "idUpdateBlockdHour").setValue(rData.BLOCKED_HOURS);
					Fragment.byId(this._id, "idUpdateAvailablHour").setValue(rData.AVAILABLE_HOURS);
					this._oDialog.setBusy(false);
				}.bind(this),
				error: function () {
					this._oDialog.setBusy(false);
				}.bind(this)
			});
		},

		/**
		 * close Dialog by escape key
		 * @param escapeHandler
		 */
		onEscapeDialog: function (escapeHandler) {
			Fragment.byId(this._id, "idCreateCancel").firePress();

		},

		/**
		 * handle tab selection
		 * @param oEvent
		 * @param bInitial
		 * since Release/2301.1
		 */
		onTabSelectionChanged: function (oEvent, bInitial) {
			var sSelectedTab = this._TimeAllocationTabBar.getSelectedKey();

			this.updateButtonsVisibility("List");
			if (!bInitial) {
				this.configureList();
			}
		},

		/**
		 * set Footer Buttons visibility based on selected view list/update/create
		 * @param sSourceView
		 * since Release/2301.1
		 */
		updateButtonsVisibility: function (sSourceView) {
			var sSelectedTab = this._TimeAllocationTabBar.getSelectedKey(),
				oBtnCreateBlocker = Fragment.byId(this._id, "idCreateTimeAlloc"),
				oBtnCreateAbsence = Fragment.byId(this._id, "idCreateAbsence"),
				oBtnBack = Fragment.byId(this._id, "idBack"),
				oBtnSave = Fragment.byId(this._id, "idSaveAvail"),
				oBtnCreate = Fragment.byId(this._id, "idCreateSaveAvail");

			if (sSourceView === "List") {
				this._oViewModel.setProperty("/timeAllocations/enableTabs", true);
				oBtnBack.setVisible(false);
				oBtnSave.setVisible(false);
				oBtnCreate.setVisible(false);

				if (sSelectedTab === "Blockers") {
					oBtnCreateAbsence.setVisible(false);
					this._bShowBlockers && this._bCreateBlockers ? oBtnCreateBlocker.setVisible(true) : oBtnCreateBlocker.setVisible(false);
				} else if (sSelectedTab === "Absences") {
					oBtnCreateBlocker.setVisible(false);
					this._bShowAbsences && this._bCreateAbsences ? oBtnCreateAbsence.setVisible(true) : oBtnCreateAbsence.setVisible(false);
				} else {
					this._bShowBlockers && this._bCreateBlockers ? oBtnCreateBlocker.setVisible(true) : oBtnCreateBlocker.setVisible(false);
					this._bShowAbsences && this._bCreateAbsences ? oBtnCreateAbsence.setVisible(true) : oBtnCreateAbsence.setVisible(false);
				}
			} else if (sSourceView === "Update") {
				this._oViewModel.setProperty("/timeAllocations/enableTabs", false);
				oBtnBack.setVisible(true);
				oBtnSave.setVisible(false);

				oBtnCreateBlocker.setVisible(false);
				oBtnCreateAbsence.setVisible(false);

				if (this._oSelectedItemContext.getProperty("AvailabilityTypeGroup") === "L") {
					Fragment.byId(this._id, "idUpdateMangAbs").setVisible(false);
					Fragment.byId(this._id, "idUpdateTimeAllocation").setVisible(true);
					this._bChangeBlockers ? oBtnSave.setVisible(true) : null;
					this.sSource = "timeAlloc";
				} else {
					this.sSource = "";
					this._bChangeAbsences ? oBtnSave.setVisible(true) : null;
					Fragment.byId(this._id, "idUpdateMangAbs").setVisible(true);
					Fragment.byId(this._id, "idUpdateTimeAllocation").setVisible(false);
				}
			} else if (sSourceView === "CreateAbsence" || sSourceView === "CreateBlocker") {
				this._oViewModel.setProperty("/timeAllocations/enableTabs", false);
				oBtnCreateBlocker.setVisible(false);
				oBtnCreateAbsence.setVisible(false);
				oBtnBack.setVisible(true);
				if ((sSourceView === "CreateBlocker" && this._bCreateBlockers) || (sSourceView === "CreateAbsence" && this._bCreateAbsences)) {
					oBtnCreate.setVisible(true);
				}
			}
		},

		/**
		 * returns filters to generate list based on selected tab
		 * @param sSelectedTab 
		 * @param sResourceGuid
		 * @param oDateFrom
		 * @param oDateTo
		 * since Release/2301.1
		 */
		_getAvailabilityFilters: function (sSelectedTab, oDateFrom, oDateTo) {
			var aFilters = [],
				aResourceFilters = [];

			if (this._aResourceGuids.length > 1) {
				for (var i in this._aResourceGuids) {
					aResourceFilters.push(new Filter("ResourceGuid", FilterOperator.EQ, this._aResourceGuids[i]));
				}
				aFilters.push(new Filter({
					filters: aResourceFilters,
					and: false
				}));
			} else {
				aFilters.push(new Filter("ResourceGuid", FilterOperator.EQ, this._aResourceGuids[0]));
			}

			if (sSelectedTab === "Blockers") {
				aFilters.push(new Filter("DateFrom", FilterOperator.LE, oDateFrom));
				aFilters.push(new Filter("DateTo", FilterOperator.GE, oDateTo));
				aFilters.push(new Filter("AvailabilityTypeGroup", FilterOperator.EQ, "L"));

			} else
			if (sSelectedTab === "Absences") {
				aFilters.push(new Filter("DateFrom", FilterOperator.LE, oDateFrom));
				aFilters.push(new Filter("DateTo", FilterOperator.GE, oDateTo));
				aFilters.push(new Filter("AvailabilityTypeGroup", FilterOperator.EQ, "N"));
			} else {
				aFilters.push(new Filter("DateFrom", FilterOperator.LE, oDateFrom));
				aFilters.push(new Filter("DateTo", FilterOperator.GE, oDateTo));

				if (this._bShowBlockers && this._bShowAbsences) {
					aFilters.push(new Filter({
						filters: [new Filter("AvailabilityTypeGroup", FilterOperator.EQ, "L"), new Filter("AvailabilityTypeGroup", FilterOperator.EQ,
							"N")],
						and: false
					}))
				} else if (this._bShowBlockers) {
					aFilters.push(new Filter("AvailabilityTypeGroup", FilterOperator.EQ, "L"));
				} else {
					aFilters.push(new Filter("AvailabilityTypeGroup", FilterOperator.EQ, "N"));
				}
			}
			return aFilters;
		},
		/**
		 * method call after reloading the list
		 * since Release/2301.1
		 */
		afterListRefresh: function () {
			this.onRemoveDeleteMode();
			this.handleRefreshTabCounts();
		},

		/**
		 * Calculte counts base on selected tab
		 * since Release/2301.1
		 */
		handleRefreshTabCounts: function () {
			var nCountAll = 0,
				nCountBlockers = 0,
				nCountAbsenses = 0,
				sUri = "/ResourceAvailabilitySet",
				aFilters,
				oComponent = this._oView.getController().getOwnerComponent();

			aFilters = this._getAvailabilityFilters(null, this.oDate2, this.oDate1);
			oComponent.readData(sUri, aFilters).then(function (oData) {
				oData = oData.results;
				nCountAll = oData.length;
				for (var i in oData) {
					if (oData[i].AvailabilityTypeGroup === "L") {
						nCountBlockers++;
					}
					if (oData[i].AvailabilityTypeGroup === "N") {
						nCountAbsenses++;
					}
				}
				this.updateTabCounts(nCountAll, nCountBlockers, nCountAbsenses);
			}.bind(this));
		},

		/**
		 * update Tab counts after loading or completion of any operation
		 * @param nAll 
		 * @param nBlockers
		 * @param nAbsenses
		 * since Release/2301.1
		 */
		updateTabCounts: function (nAll, nBlockers, nAbsenses) {
			this._oViewModel.setProperty("/timeAllocations/countAll", nAll);
			this._oViewModel.setProperty("/timeAllocations/countBlockers", nBlockers);
			this._oViewModel.setProperty("/timeAllocations/countAbsences", nAbsenses);
			this._oViewModel.refresh();
		},

		/**
		 * get available hours for selected resources for given date range
		 * @param oStartDate
		 * @param oEndDate
		 * since Release/2301.2
		 */
		_getMultiResourceAvailability: function (oStartDate, oEndDate) {
			var aPromises = [],
				oData = {
					ResourceGuid: "",
					StartTimestamp: oStartDate,
					EndTimestamp: oEndDate
				};
			this._oDialog.setBusy(true);
			this._dataDirty = true;
			for (var i in this._aResourceGuids) {
				oData.ResourceGuid = this._aResourceGuids[i];
				aPromises.push(this.executeFunctionImport.call(this._oView.getController(), this._oModel, oData, "GetResourceAvailability", "GET",
					true));
			}
			Promise.all(aPromises).then(function (aPromiseAllResults) {
				if (aPromiseAllResults && aPromiseAllResults.length) {
					oData = [];
					for (var i in aPromiseAllResults) {
						oData.push({
							ResourceDescription: aPromiseAllResults[i][0].ResourceDescription,
							AVAILABLE_HOURS: aPromiseAllResults[i][0].AVAILABLE_HOURS,
							BLOCKED_HOURS: 0,
							BlockPercentage: 0
						});
					}
					this._oViewModel.setProperty("/timeAllocations/createData", oData);
					this._oViewModel.setProperty("/timeAllocations/createDataCopy", _.clone(oData));
					this._oDialog.setBusy(false);
				}
			}.bind(this));
		}
	});
});