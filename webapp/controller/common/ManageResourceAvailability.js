sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment"
], function (BaseController, formatter, Filter, FilterOperator, JSONModel, Fragment) {
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
		open: function (oView, aSelectedPath, mParameters, sSource) {
			// create dialog lazily
			if (!this._oDialog) {
				oView.getModel("appView").setProperty("/busy", true);
				Fragment.load({
					id: "ManageAbsense",
					name: "com.evorait.evoplan.view.common.fragments.ManageResourceAvailability",
					controller: this
				}).then(function (oDialog) {
					oView.getModel("appView").setProperty("/busy", false);
					oDialog.setEscapeHandler(this.onEscapeDialog.bind(this));
					this._oDialog = oDialog;
					this.onOpen(oDialog, oView, aSelectedPath, mParameters, sSource);
				}.bind(this));
			} else {
				this.onOpen(this._oDialog, oView, aSelectedPath, mParameters, sSource);
			}
		},

		/**
		 * Sets the necessary value as global to this controller
		 * Open's the popover
		 * @param oView
		 * @param oEvent
		 */
		onOpen: function (oDialog, oView, aSelectedPath, mParameters, sSource) {
			// var oDialog = this.getDialog(oView);
			this._oView = oView;
			this._component = oView.getController().getOwnerComponent();
			this._oModel = this._component.getModel();
			this._calendarModel = this._component.getModel("calendarModel");
			this._ganttModel = this._component.getModel("ganttModel");
			this._mParameters = mParameters || {
				bFromHome: true
			};
			this.sSource = sSource;
			this._resourceBundle = this._oView.getController().getResourceBundle();
			this._id = "ManageAbsense";
			this._dataDirty = false;
			this._oApp = Fragment.byId(this._id, "navCon");
			this._oApp.backToTop();
			this._oSmartList = Fragment.byId(this._id, "idResourceAvailList");
			this._oList = Fragment.byId(this._id, "idResourceAvailList").getList();
			if (this._mParameters.bFromPlannCal) {
				this._resource = this._calendarModel.getProperty(aSelectedPath[0]).ResourceGuid;
			} else if (this._mParameters.bFromNewGantt) {
				this._resource = this._ganttModel.getProperty(aSelectedPath[0] + "/ResourceGuid");
				this._resourceName = this._ganttModel.getProperty(aSelectedPath[0] + "/Description");

			} else {
				this._resource = this._oModel.getProperty(aSelectedPath[0] + "/ResourceGuid");
				this._resourceName = this._oModel.getProperty(aSelectedPath[0] + "/Description");
			}

			oDialog.setTitle(this._resourceName);
			oDialog.addStyleClass(this._component.getContentDensityClass());

			// Header for Manage Absence / Create Time Allocation
			var sHeaderAbsence = this._oView.getModel("i18n").getResourceBundle().getText("xtit.absences"),
				sHeaderTimeBloc = this._oView.getModel("i18n").getResourceBundle().getText("xtit.blockers");

			// connect dialog to view (models, lifecycle)
			oView.addDependent(oDialog);
			oDialog.open();

			//Setting header & Enabling/Disabling Create button for manage Absence & Time Allocatio
			if (this.sSource === "timeAlloc") {
				Fragment.byId(this._id, "idCreateTimeAlloc").setVisible(true);
				Fragment.byId(this._id, "idCreateAbsence").setVisible(false);
				Fragment.byId(this._id, "idUpdateTimeAllocation").setVisible(true);
				Fragment.byId(this._id, "idUpdateMangAbs").setVisible(false);
				//setting header
				Fragment.byId(this._id, "idResourceAvailList").setHeader(sHeaderTimeBloc);
			} else {
				Fragment.byId(this._id, "idCreateTimeAlloc").setVisible(false);
				Fragment.byId(this._id, "idCreateAbsence").setVisible(true);
				Fragment.byId(this._id, "idUpdateMangAbs").setVisible(true);
				Fragment.byId(this._id, "idUpdateTimeAllocation").setVisible(false);
				//setting header
				Fragment.byId(this._id, "idResourceAvailList").setHeader(sHeaderAbsence);
			}
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
			oDetail.unbindElement();
			this._oDialog.setBusy(true);
			oDetail.bindElement(sPath);
			this._updateAvailBlockHour(sPath);
			/*	oDetail.bindElement({
				path: sPath,
				events: {
					change: function () {
						if(bCheck)
						{
						var oElementBinding = oDetail.getElementBinding();
						oElementBinding.refresh();
						bCheck=false;
						}
					}.bind(this),
					 dataReceived: function(rData){
        		Fragment.byId(this._id, "idUpdateBlockdHour").setValue(rData.mParameters.data.BLOCKED_HOURS);
                Fragment.byId(this._id, "idUpdateAvailablHour").setValue(rData.mParameters.data.AVAILABLE_HOURS);
                this._oDialog.setBusy(false);
    			}.bind(this)
				}});*/
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
			} else {
				this._showConfirmMessageBox.call(this._oView.getController(), this._resourceBundle.getText("ymsg.confirmMsg")).then(function (data) {
					if (data === "NO") {
						//do nothing, keep on the same page.
					} else {
						this._resetChanges(oEvent);
						this._oApp.back();
						this._isUpdate = false;
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
				sPath = oContext.getPath(),
				oData = this._oModel.getProperty(sPath),
				aPath = sPath.split(""),
				oChanges;

			// remove the first character
			aPath.shift();
			//Getting the Value for Blocked Time for Time Allocation
			var sCurPageId = this._oApp.getCurrentPage().getId().slice(15);
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
			var oList, oBinding, aFilters,
				oViewFilterSettings = this._oView.getController().oFilterConfigsController || null,
				sDateControl1,
				sDateControl2,
				oUserModel = this._component.getModel("user");

			if (this._mParameters.bFromGantt) {
				// if we decide to keep different date range for demand view and gantt view
				sDateControl1 = oUserModel.getProperty("/DEFAULT_GANT_START_DATE");
				sDateControl2 = oUserModel.getProperty("/DEFAULT_GANT_END_DATE");
			} else if (this._mParameters.bFromNewGantt) {
				// For New Gantt fetching the Dates from DateRange Selection
				sDateControl1 = this._oView.byId("idDateRangeGantt2").getDateValue();
				sDateControl2 = this._oView.byId("idDateRangeGantt2").getSecondDateValue();
			} else {
				sDateControl1 = oViewFilterSettings.getDateRange()[0];
				sDateControl2 = oViewFilterSettings.getDateRange()[1];
			}

			oList = Fragment.byId(this._id, "idResourceAvailList").getList();
			oBinding = oList.getBinding("items");
			if (this.sSource === "timeAlloc") {
				aFilters = [
					new Filter("ResourceGuid", FilterOperator.EQ, this._resource),
					new Filter("DateFrom", FilterOperator.LE, sDateControl2),
					new Filter("DateTo", FilterOperator.GE, sDateControl1),
					new Filter("AvailabilityTypeGroup", FilterOperator.EQ, "L")
				];
			} else {
				aFilters = [
					new Filter("ResourceGuid", FilterOperator.EQ, this._resource),
					new Filter("DateFrom", FilterOperator.LE, sDateControl2),
					new Filter("DateTo", FilterOperator.GE, sDateControl1),
					new Filter("AvailabilityTypeGroup", FilterOperator.EQ, "N")
				];
			}
			oBinding.filter(new Filter({
				filters: aFilters,
				and: true
			}));
		},

		/**
		 * This Event is triggered when creating/updating the field values for Manage Absence and Time Allocation
		 * @param sProperty - To identify whether its create or update
		 * @param oChanges - Which holds Data 
		 * @param  oUpdateData - Data to be passed to backend
		 */
		_ProceedToManageAbsenceService: function (sProperty, oChanges, oUpdateData) {

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
			} else if (sProperty === "CREATE") {
				oUpdateData.AvailabilityType = oChanges.AvailType;
			}

			if (this._checkMandaoryFields(oChanges, sProperty)) {
				this._callFunction(oUpdateData);
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
				if (sProperty === "SAVE" || sProperty === "CREATE") {
					this._ProceedToManageAbsenceService(sProperty, oChanges, oUpdateData);
				} else {
					oUpdateData.Guid = oChanges.Guid;
					this._deleteUnavailability(oUpdateData);
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
			var oEventBus = sap.ui.getCore().getEventBus();
			if (this._mParameters.bFromGantt || this._mParameters.bFromNewGantt) {
				//	this._oModel.resetChanges();

				//to reset "Manage absence" btn enable/disable
				// this._oView.getController().selectedResources = [];
				this._oView.byId("idButtonreassign").setEnabled(false);
				this._oView.byId("idButtonunassign").setEnabled(false);
				this._oView.byId("idButtonCreUA").setEnabled(false);
				if (this._mParameters.bFromGantt || this._mParameters.bFromNewGantt) {
					this._oView.byId("idButtonTimeAlloc").setEnabled(false);
				}
				if (this._mParameters.bFromMap) {
					this._oView.byId("showRoute").setEnabled(false);
				}

				Fragment.byId(this._id, "idTimeAllocSlider").setValue(0);
				Fragment.byId(this._id, "idCreateDescription").setValue("");
			} else if (this._mParameters.bFromHome) {
				oEventBus.publish("ManageAbsences", "ClearSelection", {});
			}
		},
		/**
		 * Method triggered to create the unavailability
		 * @param oEvent
		 */
		onCreateUnAvail: function (oEvent) {
			var oUserModel = this._component.getModel("user"),
				sAvailType = oUserModel.getProperty("/DEFAULT_ABSENCE_TYPE").split(";");
			this._oModel.metadataLoaded().then(function () {
				var oContext = this._oModel.createEntry("/ResourceAvailabilitySet", {
					properties: {
						DateFrom: moment().startOf("day").toDate(),
						DateTo: moment().endOf("day").toDate(),
						AvailabilityTypeGroup: "N",
						AvailType: sAvailType[0],
						Description: sAvailType[1],
						ResourceDescription: this._resourceName
					}
				});
				var oDetail = Fragment.byId(this._id, "create");
				oDetail.setBindingContext(oContext);
				this._oApp.to(this._id + "--create");
			}.bind(this));
			//Enabling/Disabling the form for Time Allocation & Manage Absence
			Fragment.byId(this._id, "idMangAbsAllocation").setVisible(true);
			Fragment.byId(this._id, "idTimeAllocation").setVisible(false);
		},
		/**
		 * Method triggered to create the unavailability
		 * @param oEvent
		 */
		onCreateTimeAlloc: function (oEvent) {
			var oUserModel = this._component.getModel("user"),
				sAvailType = oUserModel.getProperty("/DEFAULT_ABSENCE_TYPE").split(";"),
				oEndDate = new Date();
			this._oModel.metadataLoaded().then(function () {
				var oContext = this._oModel.createEntry("/ResourceAvailabilitySet", {
					properties: {
						DateFrom: moment().startOf("day").toDate(),
						DateTo: moment().endOf("day").toDate(),
						AvailabilityTypeGroup: "L",
						AvailType: sAvailType[0],
						Description: sAvailType[1],
						ResourceDescription: this._resourceName
					}
				});
				var oDetail = Fragment.byId(this._id, "create");
				oDetail.setBindingContext(oContext);
				this._oApp.to(this._id + "--create");
			}.bind(this));
			//Enabling/Disabling the form for Time Allocation & Manage Absence
			if (this.sSource === "timeAlloc") {
				Fragment.byId(this._id, "idTimeAllocation").setVisible(true);
				Fragment.byId(this._id, "idMangAbsAllocation").setVisible(false);
			}
			var oData = {
				ResourceGuid: this._resource,
				StartTimestamp: new Date(),
				EndTimestamp: oEndDate.setHours(23, 59, 59)
			};

			this._callFunctionGetResourceAvailability(oData);
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
		_callFunction: function (oData) {
			this._oDialog.setBusy(true);
			this._dataDirty = true;
			new Promise(function (resolve, reject) {
				this.executeFunctionImport.call(this._oView.getController(), this._oModel, oData, "ManageAbsence", "POST").then(function (data) {
					this._refreshList();
				}.bind(this));
			}.bind(this));
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
						Fragment.byId(this._id, "idAvailablHour").setValue(data.AVAILABLE_HOURS);
						Fragment.byId(this._id, "idBlockdHour").setValue(data.BLOCKED_HOURS);
						Fragment.byId(this._id, "idTimeAllocSlider").setValue(data.BlockPercentage);
						Fragment.byId(this._id, "idUpdateAvailablHour").setValue(data.AVAILABLE_HOURS);
						//	this._oModel.setProperty(this._selectedPath+"/AVAILABLE_HOURS",data.AVAILABLE_HOURS);
						//Fragment.byId(this._id, "idUpdateBlockdHour").setValue(data.BLOCKED_HOURS);
						//	Fragment.byId(this._id, "idUpdateTimeAllocSlider").setValue(data.BlockPercentage);
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
		},
		/**
		 * On Close check for data dirty
		 * if data is dirty show confirmation box, if not close the dialog
		 * @param oEvent
		 */
		onClose: function (oEvent) {
			this._oModel.resetChanges();
			this._refreshTreeGantt(oEvent);

			//to reset "Manage absence" btn enable/disable
			// this._oView.getController().selectedResources = [];
			this._oView.byId("idButtonreassign").setEnabled(false);
			this._oView.byId("idButtonunassign").setEnabled(false);
			this._oView.byId("idButtonCreUA").setEnabled(false);
			if (this._mParameters.bFromGantt || this._mParameters.bFromNewGantt) {
				this._oView.byId("idButtonTimeAlloc").setEnabled(false);
			} else {
				this._oView.getController().selectedResources = [];
			}
			if (this._mParameters.bFromMap) {
				this._oView.byId("showRoute").setEnabled(false);
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
					if (aItems[d].getBindingContext().getObject().UI_DISABLE_ABSENCE_DELETE) {
						aItems[d].getDeleteControl().setVisible(false);
					} else {
						aItems[d].getDeleteControl().setVisible(true);
					}
				}
			} else {
				this._oList.setMode("None");
			}
		},
		onSliderChange: function (oEvent) {
			var iUpdatedBlockPer = oEvent.getParameters().value,
				iActualAvailHour = this.AVAILABLE_HOURS,
				iUpdatedAvailableHour;

			//replacing comma with dot as this property is getting used in calculations 	
			if (iActualAvailHour.includes(",")) {
				iActualAvailHour = iActualAvailHour.replace(",", ".");
			}
			if (iUpdatedBlockPer) {
				iUpdatedAvailableHour = iActualAvailHour * (100 - iUpdatedBlockPer) * 0.01;
				Fragment.byId(this._id, "idBlockdHour").setValue(iActualAvailHour - iUpdatedAvailableHour);
			} else {
				Fragment.byId(this._id, "idBlockdHour").setValue(this.BLOCKED_HOURS);
			}
		},
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
		handleChange: function (oEvent) {
			var oEndDate = Fragment.byId(this._id, "idToDate").getDateValue();
			var oData = {
				ResourceGuid: this._resource,
				StartTimestamp: Fragment.byId(this._id, "idFromDate").getDateValue(),
				EndTimestamp: oEndDate.setHours(23, 59, 59)
			};

			this._callFunctionGetResourceAvailability(oData);
		},
		handleUpdateChange: function (oEvent) {
			var oEndDate = Fragment.byId(this._id, "idUpdateToDate").getDateValue();
			var oData = {
				ResourceGuid: this._resource,
				StartTimestamp: Fragment.byId(this._id, "idUpdateFromDate").getDateValue(),
				EndTimestamp: oEndDate.setHours(23, 59, 59)
			};
			this._callFunctionGetResourceAvailability(oData);
		},
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
		onEscapeDialog: function (escapeHandler) {
			Fragment.byId(this._id, "idCreateCancel").firePress();

		}
	});
});