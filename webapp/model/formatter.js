sap.ui.define([
	"sap/ui/core/format/DateFormat",
	"com/evorait/evoplan/model/utilities",
	"com/evorait/evoplan/model/Constants"
], function (DateFormat, utilities, Constants) {
	"use strict";

	var mCriticallyStates = Constants.CRITICALLYSTATES;

	var resourceFormats = utilities.getResourceFormats(),
		resourceAvailability = utilities.getResourceAvailability();

	return {
		/**
		 * Rounds the currency value to 2 digits
		 *
		 * @public
		 * @param {string} sValue value to be formatted
		 * @returns {string} formatted currency value with 2 digits
		 */
		currencyValue: function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},

		/**
		 * default date range for resource tree ind Demands and Gantt view
		 */
		getDefaultDateRange: function () {
			return {
				dateFrom: new Date("01/01/2010"),
				dateTo: moment().endOf("year").add(5, "years").toDate()
			};
		},
		/**
		 * default date range for resource tree ind Demands and Gantt view
		 */
		getDefaultGanttDateRange: function () {
			return {
				dateFrom: moment().startOf("year").toDate(),
				dateTo: moment().endOf("year").toDate()
			};
		},

		/**
		 * return right path of logo for every system
		 */
		getLogoImageLink: function () {
			var path = sap.ui.require.toUrl("com/evorait/evoplan/assets/img/evoplan_h50px.png");
			return path;
		},

		/**
		 * format date in format yyyy-MM-dd
		 * @param date
		 */
		date: function (date) {
			var d = new Date(date);
			var oDateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var dateString = oDateFormat.format(d);
			return dateString;
		},

		/**
		 * format to YYYY-MM-ddT00:00:00
		 * @param date
		 * @returns {*}
		 */
		formatFilterDate: function (date) {
			var oDateFormat = DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-ddT00:00:00"
			});
			return oDateFormat.format(new Date(date));
		},

		/**
		 * merge given date and time to datetime and format
		 * @param date
		 * @param time
		 */
		mergeDateTime: function (date, time) {
			var offsetMs = new Date(0).getTimezoneOffset() * 60 * 1000,
				dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
					pattern: "yyyy-MM-dd"
				}),
				timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
					pattern: "HH:mm:ss"
				});

			var dateStr = dateFormat.format(new Date(date.getTime() + offsetMs));
			var timeStr = timeFormat.format(new Date(time.ms + offsetMs));

			return new Date(dateStr + "T" + timeStr);
		},

		/**
		 * Identifies the Target Type
		 * @public
		 * @param {string} sValue value of Node Type of Resource
		 * @returns {boolean} true,if Target is either Resource or Resource Group else false(target is POOL) 
		 */
		isMainResource: function (sValue) {
			if (sValue === "RESOURCE" || sValue === "RES_GROUP") {
				return true;
			}
			return false;
		},

		/**
		 * Identifies the Title Type
		 * @public
		 * @param {string} sValue index for the format
		 * @returns {string} Auto,if title formats is unavailable in Resource Formats else whatever format specified in Resource Formats 
		 */
		formatResourceTitle: function (sValue) {
			var titleFormat = resourceFormats[sValue];
			if (titleFormat) {
				return titleFormat.title || "Auto";
			}
			return "Auto";
		},

		/**
		 * Provide the resource icon based on resource Type
		 * @public
		 * @param {string} sValue Resource Type 
		 * @param {string} sStatusIcon icon for Status 
		 * @param {string} sResourceIcon icon for Status Resource
		 * @returns {string} icon for Resource base on Given Parameters
		 */
		getResourceIcon: function (sValue, sStatusIcon, sResourceIcon, bPRT, sPRTIcon) {
			var iconFormat = resourceFormats[sValue];
			if (sValue === "RESOURCE") {
				return sResourceIcon;
			} else if (bPRT) {
				if (sPRTIcon) {
					return sPRTIcon;
				}
				return sStatusIcon;
			} else if (sStatusIcon) {
				return sStatusIcon;
			} else {
				if (iconFormat) {
					return iconFormat.icon || "";
				}
			}
			return "";
		},

		/**
		 * Provides resource Format
		 * @public
		 * @param {string} sValue Resource Type
		 * @returns {string} formate specified for given ResourceType
		 */
		getResourceFormatByKey: function (sValue) {
			return resourceFormats[sValue];
		},

		/**
		 * Identifies whether its Assignment or not
		 * @public
		 * @param {string} sValue Operation Type
		 * @returns {Boolean} true,if operation is 'Assignment' else false
		 */
		isAssignmentorTool: function (sValue) {
			if (sValue === "ASSIGNMENT") {
				return true;
			}
			return false;
		},

		/**
		 * @Author Rahul
		 * format the calendar view
		 * @param sValue
		 * @returns calendarView respective calendar view
		 */
		getCalendarView: function (sValue) {
			var sView = resourceFormats[sValue];
			if (sView) {
				return sView.calendarView || "One Month";
			}
			return "One Month";
		},
		/**
		 * @Author Rahul
		 * format the icon acording availability
		 * @param sValue
		 */
		getAvailabilityIcon: function (sValue) {
			if (sValue && sValue !== "") {
				return resourceAvailability[sValue].icon;
			}
			return "";
		},
		/**
		 * @Author Sagar
		 * format the Object Status state acording to Material_Status
		 * @param sValue
		 */
		getDemandState: function (sValue) {
			if (sValue) {
				return sValue;
			}
			return "None";
		},
		/**
		 * @Author Rahul
		 * format the icon acording availability
		 * @param sValue
		 */
		formatIconColor: function (sValue) {
			if (sValue && sValue !== "") {
				return resourceAvailability[sValue].color;
			}
			return "";
		},
		/**
		 * @Author Rahul
		 * format the color acording availability
		 * @param sValue
		 */
		formatIconTooltip: function (sValue) {
			var oComponent = this._component,
				oBundle;
			if (oComponent) {
				oBundle = oComponent.getModel("i18n").getResourceBundle();
			} else {
				oBundle = this.getResourceBundle();
			}
			if (sValue && sValue !== "") {
				return oBundle.getText(resourceAvailability[sValue].tooltip);
			} else {
				return oBundle.getText("xtit.available");
			}
		},

		/**
		 * format the Message Box Criticality
		 * @param sValue
		 * @returns Message Type based on given Value
		 */
		formatCriticality: function (sValue) {
			if (sValue === 1) {
				return sap.ui.core.MessageType.Error;
			} else if (sValue === 2) {
				return sap.ui.core.MessageType.Warning;
			} else if (sValue === 3) {
				return sap.ui.core.MessageType.Success;
			} else {
				return sap.ui.core.MessageType.Information;
			}
		},

		/**
		 * Specifies the Color for Status Icon
		 * @param sValue
		 * @returns Color code based on given Value
		 */
		formatStatusIconColor: function (sValue, sColor) {
			if (sColor && sColor !== "") {
				return sColor;
			}
			if (sValue === 1) {
				return "#BB0000";
			} else if (sValue === 2) {
				return "#E78C07";
			} else if (sValue === 3) {
				return "#2B7D2B";
			} else {
				return "#5E696E";
			}
		},
		/**
		 * Specifies the text fot Material Status
		 * @param sValue
		 * @returns Material Status on given Value
		 */
		formatMaterialStatus: function (sValue) {
			var oView = this._oView ? this._oView : this.getView();
			var oBundle = oView.getModel("i18n").getResourceBundle();
			if (sValue === "1") {
				return oBundle.getText("xtit.available");
			} else if (sValue === "2") {
				return oBundle.getText("xtit.partialAvailable");
			} else if (sValue === "3") {
				return oBundle.getText("xtit.notAvailable");
			} else {
				return "Pending";
			}
		},
		formatMaterialStatusIcon: function (sValue) {
			if (sValue === "1") {
				return "sap-icon://message-success";
			} else if (sValue === "2") {
				return "sap-icon://message-warning";
			} else if (sValue === "3") {
				return "sap-icon://message-error";
			} else {
				return "sap-icon://pending";
			}
		},
		formatMaterialState: function (sValue) {
			if (sValue === "1") {
				return "Success";
			} else if (sValue === "2") {
				return "Warning";
			} else if (sValue === "3") {
				return "Error";
			} else {
				return "Information";
			}
		},
		formatMatStatusTooltip: function (sValue) {
			var oBundle = this.getResourceBundle();
			if (sValue === "1") {
				return oBundle.getText("xtit.available");
			} else if (sValue === "2") {
				return oBundle.getText("xtit.partialAvailable");
			} else if (sValue === "3") {
				return oBundle.getText("xtit.notAvailable");
			} else {
				return oBundle.getText("xtit.refreshTooltip");
			}
		},
		formatComponentExist: function (bComponentExist) {
			return bComponentExist;
		},
		/**
		 * Configure the tree table with basic configuration
		 * @Author Rahul
		 * @since 2.1
		 * @param {oAssetTree : TreeTable}
		 */
		getAssetIcon: function (sValue) {
			var sIcon;
			switch (sValue) {
			case "FLOC":
				sIcon = "sap-icon://functional-location";
				break;
			case "EQUI":
				sIcon = "sap-icon://technical-object";
				break;
			default:
				sIcon = "sap-icon://functional-location";
			}
			return sIcon;
		},
		/**
		 * Differentiate the planning data as demands and unavailability
		 * @param sValue
		 */
		formatAppointMent: function (sValue) {
			if (sValue === "D") {
				return sap.ui.unified.CalendarDayType.Type01;
			} else if (sValue === "A") {
				return sap.ui.unified.CalendarDayType.Type06;
			} else {
				return sap.ui.unified.CalendarDayType.Type01;
			}
		},
		/**
		 * Save button must not visible for if planning dat guid is present that indicate the update
		 * @param sValue
		 * @return {boolean}
		 */
		formatSaveButton: function (sValue) {
			if (sValue) {
				return false;
			}
			return true;
		},
		/**
		 * Update button must not visible for if planning dat guid is present that indicate the create
		 * @param sValue
		 * @return {boolean}
		 */
		formatUpdateButton: function (sValue) {
			if (!sValue) {
				return false;
			}
			return true;
		},
		/**
		 * Concatenate status and description
		 * @param sDesc
		 * @param sStatusDesc
		 * @return {*}
		 */
		formatDemandTooltip: function (sDesc, sStatusDesc) {
			if (sStatusDesc && sStatusDesc !== "") {
				return sDesc + " : " + sStatusDesc;
			} else {
				return sDesc;
			}
		},
		/**
		 * Checks the is it Resource or not. And return true if the node type Resource and date node.
		 * @param sValue
		 * @return {boolean}
		 */
		isResource: function (sValue) {
			var oComponent = this._component,
				oUser;
			if (oComponent) {
				oUser = oComponent.getModel("user");
			} else {
				oUser = this.getModel("user");
			}
			if (oUser && oUser.getProperty("/ENABLE_CUMULATIVE_CAPACITY")) {
				if (sValue !== "ASSIGNMENT") {
					return true;
				} else {
					return false;
				}
			} else {
				if (sValue !== "RES_GROUP" && sValue !== "ASSIGNMENT") {
					return true;
				}
				return false;
			}
			return false;
		},
		/**
		 * Format percentage value of progress bar based the utilization value
		 * @param sValue
		 */

		formatProgress: function (data) {
			var iValue = parseInt(data, 10);
			if (iValue > 100) {
				return 100;
			} else {
				return iValue;
			}
		},
		/**
		 * Format state of progress bar based the utilization value
		 * @param sValue
		 */
		formatProgressState: function (data) {
			var iValue = parseInt(data, 10);
			if (iValue <= 50) {
				return sap.ui.core.ValueState.Success;
			} else if (iValue > 50 && iValue <= 70) {
				return sap.ui.core.ValueState.Warning;
			} else {
				return sap.ui.core.ValueState.Error;
			}
		},
		/**
		 * Format state of progress bar based on REMAIN_WORK_UTIL_COLOR
		 * @param sValue
		 */
		formatRemainingWorkProgressState: function (sValue) {
			if (sValue) {
				return sValue;
			}
			return "None";
		},
		/**
		 *
		 * @param isCapacity
		 * @param sSelectedView
		 * @returns
		 */
		formatProgressBarVisibility: function (isCapacity, sSelectedView) {
			if (isCapacity === true && sSelectedView !== "TIMENONE") {
				return true;
			}
			return false;
		},
		formatCapacityProgressBarVisibility: function (isCapacity, sSelectedView) {
			if (isCapacity === true && sSelectedView !== "TIMENONE") {
				return true;
			}
			return false;
		},
		formatRemainingWorkProgressBarVisibility: function (isCapacity, isRemainingWork, sSelectedView) {
			if (isCapacity === true && isRemainingWork === true && sSelectedView !== "TIMENONE") {
				return true;
			}
			return false;
		},
		/**
		 *
		 * @param isCapacity
		 * @param sSelectedView
		 * @returns
		 */
		formatGanttProgressBarVisibility: function (isCapacity, sSelectedView) {
			if (isCapacity === true && sSelectedView !== "TIMENONE") {
				return false;
			}
			return false;
		},
		/**
		 *
		 * @param sNodeType
		 * @param sSelectedView
		 * @returns
		 */
		formatWorkTimesVisibility: function (sNodeType, sSelectedView) {
			if (sNodeType !== "RES_GROUP" && sNodeType !== "ASSIGNMENT" && sSelectedView !== "TIMENONE") {
				return true;
			}
			return false;
		},

		formatRemainingWorkVisibility: function (userCapacity, userRemainingWork, isCapacity, sSelectedView) {
			if (userCapacity && userRemainingWork && isCapacity && sSelectedView !== "TIMENONE") {
				return true;
			}
			return false;
		},

		/**
		 *
		 * @param sNodeType
		 * @param sSelectedView
		 * @returns
		 */
		formatCapacityView: function (sNodeType, sSelectedView) {
			if (sSelectedView !== "TIMENONE") {
				return true;
			}
			return false;
		},

		/**
		 * @Author Rahul
		 * format the calendar view
		 * @param sValue
		 * @returns calendarView respective calendar view
		 */
		formatViewKey: function (sValue) {
			for (var i in resourceFormats) {
				if (resourceFormats[i].calendarView === sValue) {
					return i;
				}
			}
			return "TIMENONE";
		},
		/**
		 *
		 * @param bEnableDragDrop
		 * @param bEnableResize
		 * @return {*}
		 */
		formatResizeEnable: function (bEnableDragDrop, bEnableResize, sObjectType, bAuthCheck) {
			if (sObjectType === "ASSET") {
				return false;
			}
			return Boolean(bEnableResize && bAuthCheck);
		},
		/**
		 *
		 */
		formatDragAndDropEnable: function (bDragDrop, sObjectType, bAuthCheck) {
			if (bDragDrop && sObjectType !== "ASSET") {
				return bAuthCheck;
			}
			return false;
		},

		/**
		 * Formats the color of Icon for sync status
		 * @param sStatus
		 * @returns
		 */
		formatSyncIconColor: function (sStatus) {
			if (sStatus === "E") {
				return "Negative";
			} else if (sStatus === "Q") {
				return "Critical";
			} else if (sStatus === "S") {
				return "Positive";
			} else {
				return "Default";
			}
		},
		/**
		 *
		 * @param sStatus Sync status
		 * @return {*}
		 */
		formatSyncTooltip: function (sStatus) {
			var oBundle = this.getResourceBundle();
			if (sStatus === "E") {
				return oBundle.getText("syncFail");
			} else if (sStatus === "Q") {
				return oBundle.getText("stuckQueue");
			} else if (sStatus === "S") {
				return oBundle.getText("sync");
			} else {
				return "Default";
			}
		},
		/**
		 * Format Sync Icon in demand view based on sync status of demand
		 * @param sStatus
		 * @return {string}
		 */
		formatSyncIcon: function (sStatus) {
			if (sStatus === "E") {
				return "sap-icon://decline";
			} else if (sStatus === "Q") {
				return "sap-icon://project-definition-triangle-2";
			} else if (sStatus === "S") {
				return "sap-icon://connected";
			} else {
				return "sap-icon://circle-task-2";
			}
		},
		/**
		 * If the avail type is RES_INACT showing the Grey color appointment
		 */
		formatAvailType: function (sType) {
			if (sType === "RES_INACT") {
				return "#A9A9A9";
			} else {
				return "";
			}
		},
		/**
		 * Format tooltip according to values in the parts
		 * Added the dynamic code to generate the tooltip based on binding
		 * @Author Rahul
		 *
		 */
		formatAsnToolTip: function (orderId, demandDesc, opId, operaton, status, remTimelabel, id, desc, operationId, oparationDesc, statusDesc,
			remTime) {
			var iArg = arguments.length,
				sToolTip = "";
			// changed by @rahul in order to handle dynamic arguments
			for (var i = 0; i < iArg / 2; i++) {
				if (i === iArg / 2) {
					sToolTip = sToolTip + (arguments[iArg / 2 + i] ? arguments[i] + ":" + arguments[iArg / 2 + i] : "");
				} else {
					if (arguments[i].indexOf("unit-of-measure") !== -1) {
						sToolTip = sToolTip.substring(0, sToolTip.lastIndexOf("\n"));
						sToolTip = sToolTip + " " + arguments[iArg / 2 + i] + "\n";
					} else {
						sToolTip = sToolTip + (arguments[iArg / 2 + i] ? arguments[i] + ":" + arguments[iArg / 2 + i] : "") + "\n";
					}
				}
			}
			return sToolTip;
		},
		/**
		 * formatter formats the visibility of reassign button based on the two flags
		 * 1. Allow change
		 * 2. Allow reassign
		 */
		formartVisibleReassign: function (bChange, bAssign) {
			return bChange && bAssign;
		},
		/**
		 * formatter formats the visibility of create unavailability button based on the two flags
		 * 1. Allow create in PC
		 * 2. Absences are visualized in PC or not
		 */
		formatCrtABFromPC: function (bAllowCreate, bShowInPC) {
			return bAllowCreate && bShowInPC;
		},
		/**
		 * set scale on the basis of selected/deselected
		 */
		getSpotScale: function (spot) {
			if (spot) {
				return "1.4;1.4;1.4";
			} else {
				return "1;1;1";
			}
		},
		/**
		 * set spot color on the basis of selected/deselected
		 */
		getSpotType: function (sValue, bIsChecked) {
			if (bIsChecked) {
				return sap.ui.vbm.SemanticType.Default;
			}
			if (sValue === 1) {
				return sap.ui.vbm.SemanticType.Error;
			} else if (sValue === 2) {
				return sap.ui.vbm.SemanticType.Warning;
			} else if (sValue === 3) {
				return sap.ui.vbm.SemanticType.Success;
			} else {
				return sap.ui.vbm.SemanticType.Information;
			}
		},
		getGroupHeader: function (oGroup) {
			return new sap.m.GroupHeaderListItem({
				title: oGroup.key,
				upperCase: false
			});
		},
		/*
		 * Visibility of Qualification Icon
		 * @param REQUIREMENT_PROFILE_ID
		 * @param bEnableQualification: Global Config
		 * @returns
		 */
		formatQualificationIcon: function (sReqProfileID, bEnableQualification) {
			if (sReqProfileID && sReqProfileID !== "00000000" && bEnableQualification) {
				return true;
			} else {
				return false;
			}
		},

		/*
		 * To Specify Qualification Fullfilled value in Yes/No base
		 * @param bFulfilled 
		 * @returns Yes/NO based on give Boolean value 
		 */
		getQualificationFulfilled: function (bFulfilled) {
			var oBundle = this.getResourceBundle();
			if (bFulfilled) {
				return oBundle.getText("xbut.yes");
			} else {
				return oBundle.getText("xbut.no");
			}
		},

		/*
		 * To Specify Qualification Button visibilty 
		 * @param bType Dialog type
		 * @returns Boolean based on given Given Dialog type 
		 */
		getQualificationBtnVisibilty: function (bType) {
			if (bType === "W") {
				return true;
			} else {
				return false;
			}
		},
		/**
		 * Person number is only visible if its exists 
		 */
		formartResourcePNo: function (sName, iNumber) {
			if (sName && iNumber !== 0) {
				return sName + " - " + iNumber;
			}
			return "";
		},
		/* 
		 Hiding Map Spots when Latitude and Longitude both are zero
		 */
		formatMapSpot: function (oLatitude, oLongitude) {
			if (oLatitude && oLongitude) {
				if (oLatitude === "0.000000000000" && oLongitude === "0.000000000000") {
					return "0;0;0";
				} else {
					return oLatitude + ";" + oLongitude + ";0";
				}
			}
		},
		formatHighlighter: function (sDes) {
			if (sDes) {
				return sDes;
			}
			return "";
		},

		setVisibilityDeleteButton: function (sNodeType) {
			if (sNodeType === "RES_GROUP") {
				return false;
			} else {
				return true;
			}
		},
		setDateFormatResourceTree: function (oDate) {
			if (oDate) {
				var d = new Date(oDate);
				var oDateFormat = DateFormat.getDateInstance({
					pattern: "yyyy-MM-dd"
				});
				var dateString = oDateFormat.format(d, true);
				return dateString;
			} else {
				return "";
			}

		},

		/**
		 * Resource Management: set visibility for Proceed Button to delete from Assignment Dialog
		 */
		setVisibilityProceedToDeleteBtn: function (aData) {
			for (var i in aData) {
				if (!aData[i].AllowUnassign) {
					return false;
				}
			}
			return true;
		},

		/**
		 * Resource Management: set visibility for Proceed Button to delete from Assignment Dialog
		 */
		setHeaderMsgAssignmentDialog: function (aManageResourceData) {
			var sOperation = aManageResourceData.operationType,
				sMsgTypeText = "",
				aData = aManageResourceData.Assignments,
				sResourceName = this._oSelectedNodeContext.getProperty("Description");
			switch (sOperation) {
			case "deleteResource":
				sMsgTypeText = "Removable";
				break;
			case "moveResource":
				sMsgTypeText = "Movable";
				break;
			case "updateResource":
				sMsgTypeText = "Update";
				break;
			}

			if (aData && aData.length) {

				for (var i in aData) {
					if (!aData[i].AllowUnassign) {
						return sResourceName + this._oResourceBundle.getText("ymsg.resourceNot" + sMsgTypeText); //Unassignable
					}
				}
				return sResourceName + this._oResourceBundle.getText("ymsg.resource" + sMsgTypeText); //not Unassignable
			}
			return sResourceName + this._oResourceBundle.getText("ymsg.resource" + sMsgTypeText);

		},
		setManageResourceSwitchEnabled: function (sAction) {
			if (sAction === "ALL") {
				return true;
			}
			return false;
		},
		setManageResourceSwitchState: function (sAction) {
			if (sAction === "MOVE") {
				return false;
			}
			return true;
		},

		formatStatusState: function (sValue, isInNavLinks) {
			if (mCriticallyStates.hasOwnProperty(sValue)) {
				return mCriticallyStates[sValue].state;
			} else if (isInNavLinks === "true") {
				return mCriticallyStates["info"].state;
			} else {
				return mCriticallyStates["0"].state;
			}
		},

		onDisplayOperationTimes: function (oDate, oTimes) {
			var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "dd MMM yyyy hh:mm:ss a"
			});
			if (oDate) {
				oDate = new Date(oDate);
				var sTZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000,
					oOperationTime = new Date(oTimes.ms + sTZOffsetMs);

				oDate.setHours(oOperationTime.getHours());
				oDate.setMinutes(oOperationTime.getMinutes());
				oDate.setSeconds(oOperationTime.getSeconds());

				return oDateFormat.format(oDate);
			}
		},

		/**
		 * Inlin Edit Demands: Response Messages: to set the Icon for the message
		 */
		responseMessageStatusIcon: function (sStatus) {
			if (sStatus === "success" || sStatus === "info") {
				return "sap-icon://message-success";
			} else if (sStatus === "error" || sStatus === "warning") {
				return "sap-icon://message-error";
			} else {
				return "";
			}
		},

		/**
		 * Inlin Edit Demands: Response Messages: to set the Icon Color for the message
		 */
		responseMessageStatusIconColor: function (sStatus) {
			if (sStatus === "success" || sStatus === "info") {
				return "#008000";
			} else if (sStatus === "error" || sStatus === "warning") {
				return "#FF0000";
			} else {
				return "#0854a0";
			}
		},

		/**
		 * Inlin Edit Demands: Response Messages: to set the Text for the message
		 */
		responseMessageStatusText: function (sStatus) {
			if (sStatus) {
				if (sStatus === "info") {
					return "Success";
				}
				if (sStatus === "warning") {
					return "Error";
				}
				return sStatus.substr(0, 1).toUpperCase() + sStatus.substr(1, sStatus.length);
			}
			return "";
		},
		/**
		 * Visibility of Change Status Button in Demand Footer
		 * @Author Chethan
		 * @since 2205
		 * @param bDemandStatus
		 * @param bAssignmentStatus
		 * @returns boolean
		 */
		setVisibilityChangeStatusButton: function (bDemandStatus, bAssignmentStatus) {
			if (bDemandStatus && !bAssignmentStatus) {
				return true;
			}
			return false;
		},

		/**
		 * 
		 * @param {*} bSelected 
		 * @param {*} bGlobalConfigFlag 
		 * @returns 
		 */
		setVisibilityScheduleBtn: function(bSelected, bGlobalConfigFlag){
			return bSelected && bGlobalConfigFlag;
		},

		/**
		 * Visibility of Assignment Status Button's in Assignment Status Popover based on Allow Fields 
		 * @Author Chethan
		 * @since 2205
		 * @param sFunction
		 * @returns boolean
		 */
		showAssignmentStatusButtons: function (sFunction) {
			if (!this._oAssignmentTable && !this.aSelectedAssignments[0].oData["ALLOW_" + sFunction]) {
				return false;
			}
			return true;
		},

		/**
		 * Displaying Assignment Description in Resource Tree Title for Child Nodes
		 * @since 2205
		 * @param sNodeType
		 * @returns sDescription
		 * @returns sDemandDesc
		 */
		formatGanttResourceTitle: function (sNodeType, sDescription, sDemandDesc) {
			//	if (sNodeType === "ASSIGNMENT") {
			if (sDemandDesc) {
				return sDemandDesc;
			}
			return sDescription;
		},
		/*
		 * Customizing remaining work label
		 * @since 2205
		 * Author Bhumika
		 * @param sText
		 * @returns Label string
		 */
		RemainingWorkLabel: function (sText) {
			var oComponent = this._component,
				oBundle;
			if (oComponent) {
				oBundle = oComponent.getModel("i18n").getResourceBundle();
			} else {
				oBundle = this.getResourceBundle();
			}
			if (sText) { // Remaning Work
				return oBundle.getText("xtit.remainingWork");
			} else { // Progress
				return oBundle.getText("xtit.progress");
			}
		},

		/*
		 * Handling visibility of Save button in assignment dialog 
		 * @since 2209
		 * Author Bhumika
		 * @param bChange
		 * @param bReassign
		 * @returns boolean
		 */
		formartVisibleSaveBtn: function (bChange, bReassign) {
			return bChange || bReassign;
		},

		/**
		 * Visibility of toggle button for displying a route for resource
		 * @Author Valerii
		 * @since 2205
		 * @param sNodeType
		 * @returns boolean
		 */
		formatDisplayRouteVisibility: function (sNodeType) {
			var oComponent = this._component,
				oUserModel,
				oViewModel;

			var oGlobalPropertiesMapping = {
				TIMEDAY: "/ENABLE_MAP_ROUTE_DAILY",
				TIMEWEEK: "/ENABLE_MAP_ROUTE_WEEKLY"
			};

			if (oComponent) {
				oUserModel = oComponent.getModel("user");
				oViewModel = oComponent.getModel("viewModel");
			} else {
				oUserModel = this.getModel("user");
				oViewModel = this.getModel("viewModel");
			}

			var bGlobalVisibility = oUserModel.getProperty(oGlobalPropertiesMapping[sNodeType]);

			if (bGlobalVisibility && sNodeType === oViewModel.getProperty("/selectedHierarchyView")) {
				return true;
			}

			return false;
		},

		/**
		 * decides the visibility of the planner icon
		 * currently visible only in daily view, for the date nodes and only in map resource tree
		 * @param {sNodeType}
		 * @param {sViewType}
		 */
		decidePlannerIconVisiblity: function (sNodeType, bIsMapResourceTree) {
			if (bIsMapResourceTree && sNodeType === "TIMEDAY") {
				return true;
			}
		},
		/**
		 * @Author Rakesh
		 * format the node icon according to availability for weekly/Monthly view
		 * @param sValue
		 */
		formatNodeIconColor: function (sValue) {
			if (sValue && sValue === "P") {
				return resourceAvailability[sValue].color;
			}
			return "";
		},
		/**
		 * @Author Manik
		 * format the 
		 * @param mParam1 {string}
		 * @param mParam2 {string}
		 */
		formatSchedulingBtn:function(mParam1,mParam2){
			if(mParam1 ==="DEMANDS" || mParam1 ==="NEWGANTT" || mParam1 ==="DEMANDS"){
				if(mParam2){
					return true
				}
			}
			return false;
		},

		/**
		 * @Author Bhumika
		 * Decide the visibility of edit button in Demand list
		 * @param sEdit, bAuthCheck
		 * @return {Boolean}
		 */
		editBtnVisibility: function (sEdit, bAuthCheck) {
			return Boolean(sEdit && bAuthCheck);
		},

		getDialogTitle: function (bIsPrt) {
			var oComponent = this._component,
				oBundle;
			if (oComponent) {
				oBundle = oComponent.getModel("i18n").getResourceBundle();
			} else {
				oBundle = this.getResourceBundle();
			}
			if (bIsPrt) {
				return oBundle.getText("xtit.reassignToolTitle");
			} else {
				return oBundle.getText("xtit.assignModalTitle");
			}
		}
	};
});