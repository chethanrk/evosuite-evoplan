
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/m/FormattedText",
	"com/evorait/evoplan/model/Constants",
	"sap/ui/table/RowAction",
	"sap/ui/table/RowActionItem",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/core/Fragment",
	"sap/base/Log",
	"sap/m/library",
	"sap/ui/util/Storage"
], function (Controller, History, Dialog, Button, Text, MessageToast, MessageBox, FormattedText, Constants,
	RowAction, RowActionItem, formatter, Fragment, Log, MobileLibrary, Storage) {
	"use strict";

	var ButtonType = MobileLibrary.ButtonType,
		DialogType = MobileLibrary.DialogType,
		Label = MobileLibrary.Label,
		VBox = MobileLibrary.VBox;

	return Controller.extend("com.evorait.evoplan.controller.BaseController", {
		formatter: formatter,

		localStorage: new Storage(Storage.Type.local, "EvoPlan"),
		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName, oView) {
			if (oView) {
				return oView.getModel(sName);
			}
			if (!this.getView().getModel(sName)) {
				return this.getOwnerComponent().getModel(sName);
			}
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash();
			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getRouter().navTo("demands", {}, true);
			}
		},

		/**
		 * Convenience method
		 * @returns {object} the application controller
		 */
		getApplication: function () {
			return this.getGlobalModel().getProperty("/application");
		},

		/** 
		 * Shows the toast message on the screen
		 * @param sMsg Messgae to be shown
		 */
		showMessageToast: function (sMsg, mParams) {
			MessageToast.show(sMsg, {
				duration: 5000,
				width: mParams ? mParams.width : '15rem',
				of: mParams ? mParams.source : window
			});
		},

		/**
		 * Helper method to show the error and success information on the scree
		 * @param {oResponse} Response object of success or error callback of oData service
		 * @returns
		 */
		showMessage: function (oResponse, fnCallback) {
			var oData;
			if (oResponse && oResponse.headers["sap-message"]) {
				try {
					oData = JSON.parse(oResponse.headers["sap-message"]);
				} catch (ex) {
					Log.error("Failed to parse the message header");
				}
				if (oData && oData.details.length > 0) {
					var oMessage, bContainsError;
					for (var i in oData.details) {
						if (oData.details[i].severity === "error" && oData.details[i].message !== "No XML messages are generated") {
							//hardcoded the error message for temporary use as it is blocking the msg toasts
							bContainsError = true;
							oMessage = oData.details[i];
							break;
						}
					}
					if (bContainsError) {
						var sMessage = oMessage.message;
						this._showErrorMessage(sMessage, fnCallback);
					} else {
						this.showMessageToast(oData.message);
					}

				} else if (oData && oData.severity === "error") {
					this._showErrorMessage(oData.message, fnCallback);
				} else {
					this.showMessageToast(oData.message);
				}
			} else {
				if (oResponse) {
					try {
						oData = JSON.parse(oResponse.responseText);
					} catch (ex) {
						Log.error("Failed to parse the message header");
					}
					if (oData && oData.error) {
						bContainsError = true;
						this._showErrorMessage(oData.error.message.value, fnCallback);
					}
				}
			}
			return bContainsError;
		},

		/** 
		 * Shows the error message 
		 * @constructor 
		 * @param sMessage The message to be shown
		 * @param fnCallback A callback function when user close the dialog
		 * @returns
		 */
		_showErrorMessage: function (sMessage, fnCallback) {
			var oOwnerComponent = this._controller ? this._controller.getOwnerComponent() : this.getOwnerComponent();
			var fnClose = function () {
				this._bMessageOpen = false;
			}.bind(this);

			if (fnCallback) {
				fnClose = fnCallback;
			}
			if (!fnCallback) {
				if (this._bMessageOpen) {
					return;
				}
				this._bMessageOpen = true;
			}

			MessageBox.error(sMessage, {
				styleClass: oOwnerComponent.getContentDensityClass(),
				actions: [MessageBox.Action.CLOSE],
				onClose: fnClose
			});
		},

		/**
		 * send oData request of FunctionImport
		 * @param oParams Data to passed to function import
		 * @param sFuncName Function name of the function import
		 * @param sMethod method of http operation ex: GET/POST/PUT/DELETE
		 */
		callFunctionImport: function (oParams, sFuncName, sMethod, mParameters, bIsLast) {
			var oModel = this.getModel(),
				oViewModel = this.getModel("appView"),
				oResourceBundle = this.getResourceBundle();

			if (mParameters === undefined || (mParameters && !mParameters.bCustomBusy)) {
				oViewModel.setProperty("/busy", true);
			}

			oModel.callFunction("/" + sFuncName, {
				method: sMethod || "POST",
				urlParameters: oParams,
				refreshAfterChange: false,
				success: function (oData, oResponse) {
					//Handle Success
					if (bIsLast) {
						oViewModel.setProperty("/busy", false);
						// if (mParameters) {
						// 	mParameters.bContainsError = 
						// }
						this.showMessage(oResponse);
						this.afterUpdateOperations(mParameters, oParams, oData);
					}
				}.bind(this),
				error: function (oError) {
					//set first dragged index to set initial
					this.getModel("viewModel").setProperty("/iFirstVisibleRowIndex", -1);
					//Handle Error
					this.showMessageToast(oResourceBundle.getText("errorMessage"));
				}.bind(this)
			});
		},
		/**
		 * @Athour Rahul
		 * @since 3.0
		 * 
		 * send oData request of FunctionImport
		 * @param oParams Data to passed to function import
		 * @param sFuncName Function name of the function import
		 * @param sMethod method of http operation ex: GET/POST/PUT/DELETE
		 */
		executeFunctionImport: function (oModel, oParams, sFuncName, sMethod, bFromMultiTimeAlloc) {
			var oResourceBundle = this.getResourceBundle();

			return new Promise(function (resolve, reject) {
				oModel.callFunction("/" + sFuncName, {
					method: sMethod || "POST",
					urlParameters: oParams,
					refreshAfterChange: false,
					success: function (oData, oResponse) {
						if (bFromMultiTimeAlloc) {
							resolve([oData, oResponse]);
						} else {
							var bContainsError = this.showMessage(oResponse);
							resolve(oData, oResponse, bContainsError);
						}

					}.bind(this),
					error: function (oError) {
						//Handle Error
						this.showMessageToast(oResourceBundle.getText("errorMessage"));
						reject(oError);
					}.bind(this)
				});
			}.bind(this));
		},
		/** 
		 * Method check the parameter and refreshes the required part of screen 
		 * @param {Object} mParameters contains flag which will be passed from where it is get called.
		 */
		afterUpdateOperations: function (mParameters, oSourceData, oResultData) {
			var eventBus = sap.ui.getCore().getEventBus();

			var oParameter = mParameters || {
				bFromHome: true,
				bFromAseet: false,
				bFromPlannCal: false,
				bFromDetail: false,
				bFromGantt: false,
				bFromGanttSplit: false,
				bFromDemandSplit: false,
				bFromMap: false,
				bFromNewGantt: false
			};
			var oData = {
				mParams: oParameter,
				oSourceData: oSourceData,
				oResultData: oResultData
			};

			if (oParameter.bFromHome) {
				eventBus.publish("BaseController", "refreshTreeTable", {});
				if (!oParameter.bIsFromPRTAssignmentInfo) {
					eventBus.publish("BaseController", "refreshDemandTable", {});
					eventBus.publish("BaseController", "refreshDemandOverview", {});
				}

				if (oParameter.bFromResourcQualification) {
					eventBus.publish("ResourceQualificationDialog", "refreshQualificationDemandsTable", {});
				}
			} else if (oParameter.bFromAsset) {
				eventBus.publish("BaseController", "refreshAssetCal", {});
			} else if (oParameter.bFromPlannCal) {
				eventBus.publish("AssignInfoDialog", "RefreshCalendar", {});
			} else if (oParameter.bFromDetail) {
				eventBus.publish("BaseController", "refreshTreeTable", {});
				eventBus.publish("BaseController", "refreshDemandOverview", {});
				eventBus.publish("BaseController", "refreshDemandTable", {});
			} else if (oParameter.bFromGantt) {
				eventBus.publish("BaseController", "refreshGanttChart", oData);
				eventBus.publish("BaseController", "refreshDemandGanttTable", {});
			} else if (oParameter.bFromMap) {
				eventBus.publish("BaseController", "refreshMapTreeTable", {});
				eventBus.publish("BaseController", "refreshMapView", {});
			} else if (oParameter.bFromGanttSplit) {
				eventBus.publish("BaseController", "refreshGanttChart", oData);
			} else if (oParameter.bFromDemandSplit) {
				eventBus.publish("BaseController", "refreshDemandGanttTable", {});
			} else if (oParameter.bFromManageResource) {
				eventBus.publish("ManageResourcesController", "refreshManageResourcesView", {});
			} else if (oParameter.bFromManageResourceRemoveAssignments) {
				eventBus.publish("ManageResourcesActionsController", "refreshAssignmentDialog", {});
			} else if (oParameter.bFromNewGantt) {
				eventBus.publish("BaseController", "refreshAssignments", oData);
				eventBus.publish("BaseController", "refreshDemandGanttTable", {});
				eventBus.publish("BaseController", "refreshCapacity", {});
			} else if (oParameter.bFromNewGanttSplit) {
				eventBus.publish("BaseController", "refreshAssignments", oData);
				eventBus.publish("BaseController", "refreshCapacity", {});
			} else if (oParameter.bFromDemandTools) {
				eventBus.publish("BaseController", "refreshTreeTable", {});
				if (!oParameter.bIsFromPRTAssignmentInfo) {
					eventBus.publish("BaseController", "refreshToolsTable", {});
				}
			} else if (oParameter.bFromGanttTools) {
				eventBus.publish("GanttChart", "refreshDroppedContext", oData);
				if (!oParameter.bIsFromPRTAssignmentInfo) {
					eventBus.publish("BaseController", "refreshToolsTable", {});
				}
			}

		},
		/**
		 * device orientation with fallback of window resize
		 * important for drag and drop functionality
		 */
		getOrientationEvent: function () {
			return window.onorientationchange ? "orientationchange" : "resize";
		},

		/**
		 * On Material Info Button press event 
		 * 
		 */
		onMaterialInfoButtonPress: function () {
			var oSelectedPaths = this._getSelectedRowPaths(this._oDataTable, this._aSelectedRowsIdx, false);
			var iMaxSelcRow = this.getModel("user").getProperty("/DEFAULT_MAX_DEM_SEL_MAT_LIST");
			if (oSelectedPaths.aPathsData.length > 0 && iMaxSelcRow >= this._aSelectedRowsIdx.length) {
				this.getOwnerComponent().materialInfoDialog.open(this.getView(), false, oSelectedPaths.aPathsData);
			} else {
				var msg = this.getResourceBundle().getText("ymsg.selectMaxItemMaterialInfo", [iMaxSelcRow]);
				this.showMessageToast(msg);
			}
		},
		/**
		 * On Refresh Status Button press in Demand Table 
		 * 
		 */
		onMaterialStatusPress: function (oEvent) {
			var oViewModel = this.getModel("appView"),
				sDemandPath;
			oViewModel.setProperty("/busy", true);
			for (var i = 0; i < this._aSelectedRowsIdx.length; i++) {
				sDemandPath = this._oDataTable.getContextByIndex(this._aSelectedRowsIdx[i]).getPath();
				this.getOwnerComponent()._getData(sDemandPath).then(function (result) {
					oViewModel.setProperty("/busy", false);
				}.bind(this));
			}
		},

		/**
		 * get all selected rows from table and return to draggable helper function
		 * @param aSelectedRowsIdx
		 * @private
		 */
		_getSelectedRowPaths: function (oTable, aSelectedRowsIdx, checkAssignAllowed, aDemands, bIsForScheduling) {
			var aPathsData = [],
				aNonAssignableDemands = [],
				aUnAssignableDemands = [],
				aAssignmentWithDemands = [],
				oData, oContext, sPath;

			if (checkAssignAllowed) {
				oTable.clearSelection();
			}
			if (!aDemands) {
				for (var i = 0; i < aSelectedRowsIdx.length; i++) {
					oContext = oTable.getContextByIndex(aSelectedRowsIdx[i]);
					sPath = oContext.getPath();
					oData = this.getModel().getProperty(sPath);

					//on Check on oData property ALLOW_UNASSIGN for mass unassign from Demand View
					if (this.getModel("user").getProperty("/ENABLE_DEMAND_UNASSIGN") && oData.ALLOW_UNASSIGN) {
						aUnAssignableDemands.push({
							sPath: sPath,
							oData: oData,
							index: aSelectedRowsIdx[i]
						});
					}

					//Checking if Assignments are present or/not for selected Demands for mass Assignment Status Change #since 2205
					if (this.getModel("user").getProperty("/ENABLE_ASSIGNMENT_STATUS") && oData.NUMBER_OF_ASSIGNMENTS > 0) {
						aAssignmentWithDemands.push({
							sPath: sPath,
							oData: oData,
							index: aSelectedRowsIdx[i]
						});
					}

					//on check on oData property ALLOW_ASSIGN when flag was given
					if (checkAssignAllowed) {
						//Added condition to check for number of assignments to plan demands via scheduling
						if ((!bIsForScheduling && oData.ALLOW_ASSIGN) || (bIsForScheduling && oData.ALLOW_ASSIGN && oData.NUMBER_OF_CAPACITIES <= 1)) {
							aPathsData.push({
								sPath: sPath,
								oData: oData,
								index: aSelectedRowsIdx[i]
							});
							oTable.addSelectionInterval(aSelectedRowsIdx[i], aSelectedRowsIdx[i]);
						} else {
							aNonAssignableDemands.push(this.getMessageDescWithOrderID(oData, null, bIsForScheduling));
						}
					} else {
						aPathsData.push({
							sPath: sPath,
							oData: oData,
							index: aSelectedRowsIdx[i]
						});
					}
				}

			} else {
				for (var j in aDemands) {
					oContext = aDemands[j].getBindingContext();
					sPath = oContext.getPath();
					oData = this.getModel().getProperty(sPath);
					if (oData.ALLOW_ASSIGN) {
						aPathsData.push({
							sPath: sPath,
							oData: oData
						});
					} else {
						aDemands[j].setSelected(false);
						aNonAssignableDemands.push(this.getMessageDescWithOrderID(oData, oData.Description));
						delete aDemands[j];
					}
				}
			}
			return {
				aPathsData: aPathsData,
				aNonAssignable: aNonAssignableDemands,
				aUnAssignDemands: aUnAssignableDemands,
				aAssignmentDemands: aAssignmentWithDemands
			};
		},

		/**
		 * show error dialog for demands which are not assignable or for which status transition
		 * is not possible
		 * @param aDemands {object} array of demand descriptions
		 * @private
		 */
		_showAssignErrorDialog: function (aDemands, isStatus, msg) {
			if (!msg) {
				if (isStatus) {
					msg = this.getResourceBundle().getText("changeStatusNotPossible");
				} else {
					msg = this.getResourceBundle().getText("assignmentNotPossible");
				}
			}

			var dialog = new Dialog({
				title: "Error",
				type: "Message",
				state: "Error",
				content: new FormattedText({
					htmlText: "<strong>" + msg + "</strong><br/><br/>" + aDemands.join(",<br/>")
				}),
				beginButton: new Button({
					text: "OK",
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
		},

		/**
		 * Clears the Message Model
		 * @param
		 * @public
		 */
		clearMessageModel: function () {
			sap.ui.getCore().getMessageManager().removeAllMessages();
			this.getModel("MessageModel").setData([]);
		},
		/**
		 * Method checks the availability of resources
		 * @param sTargetPath : Resource path on which assignment needs to be created
		 * @return {boolean} return true is available
		 */
		isAvailable: function (sTargetPath, oTargetObj) {
			if (sTargetPath) {
				oTargetObj = this.getModel().getProperty(sTargetPath);
			}
			// If the Resource is Not/Partially available
			if (oTargetObj.IS_AVAILABLE !== "A") {
				return false;
			}
			return true;
		},
		/**
		 * Method checks the validity of resources
		 * @param sTargetPath : Resource path on which assignment needs to be created
		 * @return {boolean} return true is valid
		 */
		isTargetValid: function (sTargetPath) {
			var oModel = this.getModel(),
				oTargetObj = oModel.getProperty(sTargetPath),
				startDate = oTargetObj.StartDate ? oTargetObj.StartDate.getTime() : new Date(formatter.date(new Date())).getTime(),
				resAsgnStartDate = oTargetObj.RES_ASGN_START_DATE ? oTargetObj.RES_ASGN_START_DATE.getTime() : null,
				endDate = oTargetObj.EndDate ? oTargetObj.EndDate.getTime() : new Date(formatter.date(new Date())).getTime(),
				resAsgnEndDate = oTargetObj.RES_ASGN_END_DATE ? oTargetObj.RES_ASGN_END_DATE.getTime() : null,
				bValid = startDate === resAsgnStartDate && oTargetObj.StartTime.ms === oTargetObj.RES_ASGN_START_TIME.ms && endDate ===
					resAsgnEndDate && oTargetObj.EndTime.ms === oTargetObj.RES_ASGN_END_TIME.ms;
			return bValid;
		},
		/**
		 * @Athour Rahul
		 * @since 3.0
		 * Checks the Demand is assignable or not by validating the ALLOW_ASSIGN frag in demand object
		 */
		isDemandAssignable: function (sTargetPath) {
			var oModel = this.getModel(),
				oTargetObj = oModel.getProperty(sTargetPath);

			return oTargetObj.ALLOW_ASSIGN;
		},

		/**
		 * Validates pool function configuration to check possibility of assignment
		 * on group node.
		 * @param mParameters - object containing the data of target object
		 * @return {boolean}
		 */
		isAssignable: function (mParameters) {
			var oModel = this.getModel("user"),
				sPoolFunction = oModel.getProperty("/ENABLE_POOL_FUNCTION"),
				oResource = mParameters.data,
				oResourceBundle = this.getResourceBundle();
			if (oResource === undefined) {
				oResource = this.getModel().getProperty(mParameters.sPath);
			}
			if (oResource.NodeType === "RES_GROUP" && !sPoolFunction) {
				this.showMessageToast(oResourceBundle.getText("ymsg.notassignable"));
				return false;
			}
			return true;
		},
		/**
		 * Shows the confirmation Box.
		 *
		 * @Athour Rahul
		 * @version 2.1
		 * @deprecated
		 */
		showConfirmMessageBox: function (message, fnCallback) {
			var oController = this;
			MessageBox.confirm(
				message, {
				styleClass: oController.getOwnerComponent().getContentDensityClass(),
				icon: sap.m.MessageBox.Icon.CONFIRM,
				title: this.getResourceBundle().getText("xtit.confirm"),
				actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
				onClose: fnCallback
			}
			);
		},

		/**
		 * Shows the confirmation Box.
		 * New Confirm box which return Promise object
		 * Promise resolve when Message box will get close.
		 *
		 * @Athour Rahul
		 * @version 3.0
		 */
		_showConfirmMessageBox: function (message) {
			var oController = this;
			return new Promise(function (resolve, reject) {
				MessageBox.confirm(
					message, {
					styleClass: oController.getOwnerComponent().getContentDensityClass(),
					icon: sap.m.MessageBox.Icon.CONFIRM,
					title: oController.getResourceBundle().getText("xtit.confirm"),
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
					onClose: function (oEvent) {
						resolve(oEvent);
					}
				}
				);
			});
		},
		/**
		 * Shows the confirmation Box.
		 * New Confirm box for Effort Validation
		 *
		 */
		_showEffortConfirmMessageBox: function (message) {
			var oController = this,
				oComponent = oController._component;
			if (!oComponent) {
				oComponent = this.getOwnerComponent();
			}
			return new Promise(function (resolve, reject) {
				MessageBox.confirm(
					message, {
					styleClass: oComponent.getContentDensityClass(),
					icon: sap.m.MessageBox.Icon.CONFIRM,
					title: oComponent.getModel("i18n").getResourceBundle().getText("xtit.confirm"),
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
					onClose: function (oEvent) {
						resolve(oEvent);
					}
				}
				);
			});
		},
		/**
		 * Change view horizon time at specified timestamp
		 * @param oModel {object} viewModel
		 * @param start {object} timestamp
		 * @param end {object} timestamp
		 */
		changeGanttHorizonViewAt: function (oModel, iZoomLevel, oAxisTimeStrategy) {
			var oViewModel = oModel,
				sStartDate, sEndDate;

			if (iZoomLevel >= 8) {
				sStartDate = moment().startOf("hour").toDate();
				sEndDate = moment().endOf("hour").add(1, "hour").toDate();
			} else {
				sStartDate = moment().startOf("day").subtract(1, "day").toDate();
				sEndDate = moment().endOf("day").add(1, "day").toDate();
			}

			//Setting VisibleHorizon for Gantt for supporting Patch Versions (1.71.35)
			if (oAxisTimeStrategy) {
				oAxisTimeStrategy.setVisibleHorizon(new sap.gantt.config.TimeHorizon({
					startTime: sStartDate,
					endTime: sEndDate
				}));
			} else {
				oViewModel.setProperty("/ganttSettings/visibleStartTime", sStartDate);
				oViewModel.setProperty("/ganttSettings/visibleEndTime", sEndDate);
			}
		},

		_setRowActionTemplate: function (oDataTable, onClickNavigation, openActionSheet) {
			var oTemplate = oDataTable.getRowActionTemplate(),
				oResourceBundle = this.getModel("i18n").getResourceBundle();
			if (oTemplate) {
				oTemplate.destroy();
				oTemplate = null;
			}

			oTemplate = new RowAction({
				items: [
					new RowActionItem({
						type: "Navigation",
						tooltip: oResourceBundle.getText("xtol.details"),
						press: onClickNavigation
					})
				]
			});
			if (this.getModel("navLinks").getProperty("/").length > 0) {
				oTemplate.addItem(new RowActionItem({
					icon: "sap-icon://action",
					text: oResourceBundle.getText("xtol.navigate"),
					press: openActionSheet
				}));
			}
			oDataTable.setRowActionTemplate(oTemplate);
			oDataTable.setRowActionCount(oTemplate.getItems().length);
		},
		/**
		 * OnPress of Order, Notification, Equipment etc Links
		 * in Demand Details screen and AssignInfo Dialog
		 * @param oEvent
		 */
		onPressSmartField: function (oEvent) {
			var oSource = oEvent.getSource(),
				sAppName = oSource.getUrl(),
				aNavlinks = this.getModel("templateProperties").getData().navLinks,
				sLaunchMode = this.getModel("viewModel").getProperty("/launchMode"),
				sServicePath = "https://" + this.getModel("user").getProperty("/ServerPath"),
				sAppId = aNavlinks[sAppName].ApplicationId,
				oAppInfo = this._getAppInfoById(sAppId),
				sParamValue = oSource.getValue(),
				sAdditionInfo, sSemanticObject, sAction, sParameter, sUri;

			// if there is no configuration maintained in the backend
			if (oAppInfo === null) {
				return;
			}

			if (sLaunchMode === Constants.LAUNCH_MODE.FIORI) {
				sAdditionInfo = oAppInfo.Value1 || "";
				sSemanticObject = sAdditionInfo.split("\\\\_\\\\")[0];
				sAction = sAdditionInfo.split("\\\\_\\\\")[1] || "Display";
				sParameter = sAdditionInfo.split("\\\\_\\\\")[2];
				if (sSemanticObject && sAction) {
					this.navToApp(sSemanticObject, sAction, sParameter, sParamValue);
				}
			} else {
				sAdditionInfo = oAppInfo.Value1;
				sUri = oAppInfo.ISABSOLUTE ? sAdditionInfo.replace("\\\\place_h1\\\\", sParamValue) : sServicePath + sAdditionInfo.replace(
					"\\\\place_h1\\\\", sParamValue);
				this.navigateToApps(sUri);
			}

		},

		/**
		 * Navigate to other apps as BSP Apps 
		 * @param sUri
		 */
		navigateToApps: function (sUri) {
			window.open(sUri, "_blank");
		},

		/**
		 * Navigate to other apps in Fiori Launchpad 
		 * @param sSemanticObject
		 * @param sAction
		 * @param sParameter
		 * @param sParamValue
		 */
		navToApp: function (sSemanticObject, sAction, sParameter, sParamValue) {
			var sHash, sUrl,
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"),
				mParams = {};
			mParams[sParameter] = [sParamValue];
			sHash = oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
				target: {
					semanticObject: sSemanticObject,
					action: sAction
				},
				params: mParams
			}) || "", // generate the Hash to display a Notification details app

				sUrl = window.location.href.split('#')[0] + sHash;
			window.open(sUrl, "_blank");

		},

		clearLocalStorage: function () {
			this.localStorage.remove("Evo-Dmnd-pageRefresh");
			this.localStorage.remove("Evo-Dmnd-guid");
		},

		/**
		 * Load fragment async
		 * @param sPath
		 * @param oController
		 * @param sId
		 * @return Promise
		 */
		loadFragment: function (sPath, oController, sId) {
			return Fragment.load({
				name: sPath,
				controller: oController || this,
				type: "XML",
				id: sId
			}).then(function (oFragment) {
				return oFragment;
			});
		},

		/**
		 * Calculating effort time difference after assignment resizing 
		 * 
		 */
		getEffortTimeDifference: function (oDateFrom, oDateTo) {
			var oTimeStampFrom = oDateFrom.getTime(),
				oTimeStampTo = oDateTo.getTime(),
				iDifference = oTimeStampTo - oTimeStampFrom,
				iEffort = (((iDifference / 1000) / 60) / 60);
			return iEffort;
		},

		/**
		 *	Handle visibility of warning msg displayed when demand selection changes in FInd Technician 
		 */
		showWarningMsgResourceTree: function (bFlag) {
			var oViewModel = this.getModel("viewModel");
			if (oViewModel.getProperty("/CheckRightTechnician")) {
				oViewModel.setProperty("/WarningMsgResourceTree", bFlag);
			}
		},
		/**
		 *	Display Response Message for OData call
		 */
		showResponseMessage: function (sMessage, sType) {
			if (sType === 'S' || !sType) {
				MessageBox.success(sMessage);
			} else if (sType === 'E') {
				MessageBox.error(sMessage);
			} else if (sType === 'I') {
				MessageBox.information(sMessage);
			} else if (sType === 'W') {
				MessageBox.warning(sMessage);
			}

		},
		/**
		 * Open the Qualification dialog for Gantt demand
		 * @param oEvent
		 */
		onDemandQualificationIconPress: function (oEvent) {
			var oRow = oEvent.getSource().getParent(),
				oContext = oRow.getBindingContext(),
				sPath = oContext.getPath(),
				oModel = oContext.getModel(),
				oResourceNode = oModel.getProperty(sPath),
				sDemandGuid = oResourceNode.Guid,
				oComponent = this._oView ? this._oView.getController().getOwnerComponent() : this.getOwnerComponent(),
				oView = this._oView ? this._oView : this.getView();

			oComponent.DemandQualifications.open(oView, sDemandGuid);

		},
		/**
		 * Copying Cell Data onClick of Cell in Demand Table
		 * @param oEvent
		 * @Author Chethan RK
		 */
		onCopyDemandCellData: function (oEvent) {
			var oParams = oEvent.getParameters(),
				oColumnId = oParams.columnId,
				oRowContext = oParams.rowBindingContext,
				sPath = oRowContext.getPath(),
				sColumnName = oColumnId.split("-"),
				sColumnValue = sColumnName[sColumnName.length - 1],
				sCopiedData = this.getModel().getProperty(sPath + "/" + sColumnValue);

			if (window.clipboardData) { // Internet Explorer
				window.clipboardData.setData("Text", sCopiedData);
			} else {
				navigator.clipboard.writeText(sCopiedData);
			}
		},
		/**
		 * Handle the Edit Mode toggle for Demand Table
		 * @param oEvent
		 */
		onEditToggledDemandTable: function (oEvent) {
			var bEditableMode = oEvent.getParameter("editable"),
				oModel = this.getModel();

			if (!bEditableMode && oModel.hasPendingChanges()) {
				this._showConfirmMessageBox(this.getResourceBundle().getText("ymsg.saveDemandChanges")).then(function (resolve) {
					if (sap.m.MessageBox.Action.YES === resolve) {
						this.submitDemandTableChanges();
					} else {
						oModel.resetChanges();
					}
				}.bind(this));
			}
		},
		submitDemandTableChanges: function () {
			var oModel = this.getModel();
			this.bFromTable = true;
			return new Promise(function (resolve, reject) {
				oModel.submitChanges({
					success: function (oData, oResponse) {
						resolve(oData, oResponse);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			}.bind(this)).then(this.handleResponsesToShowMessages.bind(this)).catch(function (oError) {
				oModel.resetChanges();
			}.bind(this));
		},

		/**
		 * Handle the response Message on Edit of Demand Table
		 * and in the time allocation controller
		 * @param oData
		 */
		handleResponsesToShowMessages: function (oData, bFromTimeAllocations) {
			var aMultiResponses, aMessages = [],
				oDetails, oResponseItem;
			aMultiResponses = oData.length ? oData : oData.__batchResponses[0].__changeResponses;
			for (var i in aMultiResponses) {
				oResponseItem = aMultiResponses[i][1] ? aMultiResponses[i][1] : aMultiResponses[i];
				oDetails = JSON.parse(oResponseItem.headers["sap-message"]).details;
				if (bFromTimeAllocations) {
					aMessages.push(JSON.parse(oResponseItem.headers["sap-message"]));
				} else {
					if (oDetails && oDetails.length) {
						for (var j in oDetails) {
							if (JSON.stringify(aMessages).indexOf(JSON.stringify(oDetails[j].message)) === -1) {
								aMessages.push(oDetails[j]);
							}
						}
					} else {
						aMessages.push(JSON.parse(oResponseItem.headers["sap-message"]));
					}
				}
			}
			this.getModel("viewModel").setProperty("/oResponseMessages", aMessages);
			if (this.bFromTable) {
				this.bFromTable = false;
				this.showResponseMessageToast(); //used for showing in MessageToast
			} else {
				this.showResponseMessagePopup(); //used to show in Messagebox
			}

			this.getModel().resetChanges();
		},

		/**
		 * Display the response Message on Edit of Demand Table
		 */
		showResponseMessagePopup: function () {
			if (!this.oResponseMessagePopup) {
				Fragment.load({
					id: "idResponseMessagePopup",
					name: "com.evorait.evoplan.view.common.fragments.showResponseMessages",
					controller: this
				}).then(function (oDialog) {
					this.getView().addDependent(oDialog);
					this.oResponseMessagePopup = oDialog;
					this.oResponseMessagePopup.open();
				}.bind(this));
			} else {
				this.oResponseMessagePopup.open();
			}
		},

		/**
		 * Display the messages after inline edit success in Message Toast;
		 * */
		showResponseMessageToast: function () {
			var sMessages = this.getModel("viewModel").getProperty("/oResponseMessages");
			sMessages = sMessages.map(function (item) {
				return item.message;
			}).join("\n");
			this.showMessageToast(sMessages);
		},

		/**
		 * On close the response Message Pop up
		 */
		onCloseResponseMessagePopup: function () {
			this.oResponseMessagePopup.close();
			this.getModel("viewModel").setProperty("/oResponseMessages", []);
		},

		/**
		 * to show warning msg while navigating to other page while demand table is in edit mode
		 * since 2201, by Rakesh Sahu
		 * @param oEvent
		 */
		showDemandEditModeWarningMessage: function () {
			var oResourceBundle = this.getResourceBundle(),
				sMessage = oResourceBundle.getText("ymsg.navigationWarning"),
				sDiscard = oResourceBundle.getText("xbut.discard&Nav"),
				sSave = oResourceBundle.getText("xbut.buttonSave"),
				sCancel = oResourceBundle.getText("xbut.buttonCancel");

			return new Promise(function (resolve, reject) {
				MessageBox.warning(sMessage, {
					actions: [sDiscard, sCancel, sSave],
					styleClass: this.getOwnerComponent().getContentDensityClass(),
					onClose: function (sAction) {
						resolve(sAction);
					}
				});
			}.bind(this));
		},

		/**
		 * Used for clearing the drag session
		 * @param {object}
		 * @Author Giri
		 */
		clearDragSession: function (oView) {
			oView.getModel("viewModel").setProperty("/dragSession", null);
		},

		/**
		 * Fetching selected Assignments Path and Context for Assignment Status Change
		 * @param [aSelectedAssignments]
		 * @returns []
		 * Since 2205
		 * @Author Chethan RK
		 */
		_getAssignmentStatus: function (aSelectedAssignments) {
			var aAssignmentStatus = [];
			for (var a in aSelectedAssignments) {
				var oAssignmentStautus = {
					sPath: aSelectedAssignments[a].getBindingContext().getPath(),
					oData: aSelectedAssignments[a].getBindingContext().getObject()
				};
				aAssignmentStatus.push(oAssignmentStautus);
			}
			return aAssignmentStatus;
		},

		/**
		 * Setting time to date for fixed appointment operation
		 * @param oDate
		 * @param oTimes
		 * @returns oDate 
		 * Since 2205
		 * @Author Rakesh Sahu
		 */
		setCustomDateTime: function (oDate, oTimes) {
			if (oDate) {
				oDate = new Date(oDate);
				var sTZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000,
					oOperationTime = new Date(oTimes.ms + sTZOffsetMs);
				oDate.setHours(oOperationTime.getHours());
				oDate.setMinutes(oOperationTime.getMinutes());
				oDate.setSeconds(oOperationTime.getSeconds());
				return oDate;
			}
		},

		/**
		 * get Availability intervals of resource for a week/month/quarter/year
		 * @param oNode
		 * Since 2209
		 * @Author Rakesh Sahu
		 */
		getResourceAvailabilityInfo: function (oNode) {
			var oModel = this.getModel(),
				oParams = {
					ResourceGroupGuid: oNode.ResourceGroupGuid,
					ResourceGuid: oNode.ResourceGuid,
					StartTimestamp: oNode.StartDate,
					EndTimestamp: oNode.EndDate
				};
			return new Promise(function (resolve, reject) {
				this.getModel("appView").setProperty("/busy", true);
				//Calling Function Import to get Resource availability intervals for Weekly/Monthly view
				this.executeFunctionImport(oModel, oParams, "GetResourceAssignmentInfo", "GET").then(function (oData, response) {
					this.getModel("appView").setProperty("/busy", false);
					// Condition to Check if function import returns any result or Empty
					if (oData.results && oData.results.length) {
						resolve(oData.results);
					} else {
						this.showMessageToast(this.getResourceBundle().getText("ymsg.noAvailability"));
						reject();
					}
				}.bind(this));
			}.bind(this));
		},
		/**
		 * check to show Availability intervals of resource for a week/month/quarter/year
		 * @param oNode
		 * Since 2209
		 * @Author Rakesh Sahu
		 */
		checkToShowAvailabilities: function (oNode) {
			return (oNode.NodeType === "TIMEMONTH" || oNode.NodeType === "TIMEWEEK" || oNode.NodeType === "TIMEQUART" || oNode.NodeType ===
				"TIMEYEAR") && oNode.RES_ASGN_AVAILABILITY_FLAG ===
				"P";
		},

		/**
		 * open the Single Time Allocation dialog Blockers and Manage Absence for selected resource
		 * @param oEvent
		 * Since 2301.1.0
		 * @Author Rakesh Sahu
		 */
		onNewTimeAllocPress: function (oEvent) {
			var oResourceBundle = this.getResourceBundle();
			if (this.selectedResources.length === 0 || this.removeSelectedPoolnResourceGroups()) {
				this.showMessageToast(oResourceBundle.getText("ymsg.selectRow"));
				return;
			}

			// to identify the action done on respective page
			this.localStorage.put("Evo-Action-page", "ganttSplit");
			this.getOwnerComponent().TimeAllocations.open(this.getView(), this.selectedResources, this._mParameters, "timeAlloc");

		},

		/* concatinate demand description with OrderID/Notification to display in error message dialog 
		 * @param oData
		 * @param Desc
		 * Since 2301.4.0
		 * @Author Rakesh Sahu
		 */
		getMessageDescWithOrderID: function (oData, Desc, bIsForScheduling) {
			Desc = Desc ? Desc : oData.DemandDesc;
			// Condition to add number of assignments to display in error dialog
			if (bIsForScheduling) {
				return oData.ORDER_TYPE + ", " + oData.ORDERID + ", " + Desc + ", " + oData.OPERATIONID + ", " + oData.OPERATION_DESC + ", " + oData.Status + ", " + oData.NUMBER_OF_CAPACITIES;;
			}
			if (oData.ORDERID) {
				return oData.ORDERID + " / " + oData.OPERATIONID + "  " + Desc
			} else {
				return oData.NOTIFICATION + "  " + Desc;
			}
		},

		/**
		 * from relase 2301
		 * to check if any Assignment is done to a Resources who is unavailabe
		 * method called during Split assignments scenario to find unavailability
		 * example: if assignment is of 20 hours and resource is available for only 8 hours, 
		 * the method returns Unavailable: true
		 * based on this multiple assignments are created for the resource on different days
		 * 
		 * @params {array} aAssignments - array of assingments for which resource availability needs to be checked
		 * @returns {array} aDemandsForSplitAssignment - resloves array of assignments for which Split should happen
		 *
		 */
		checkResourceUnavailabilty: function (aAssignments, mParameters, sResourceNodeType) {
			var oModel = this.getModel(),
				aUnavailabilityChecks = [],
				aDemandsForSplitAssignment = [],
				sSelectedHierarchyView = this.getModel("viewModel").getProperty("/selectedHierarchyView"),
				oResourceAvailabiltyResponse = {
					arrayOfDemands: aAssignments,
					arrayOfDemandsToSplit: [],
					splitConfirmation: "NO",
					mParameters: mParameters,
					nodeType: sResourceNodeType
				};

			var oUnavailabilityPromise = new Promise(function (finalResolve, finalReject) {

				for (var i = 0; i < aAssignments.length; i++) {
					if (aAssignments[i].ResourceGuid) {
						aUnavailabilityChecks.push(new Promise(function (resolve, reject) {
							var oAvailabilityCheckObject = {
								ResourceGuid: aAssignments[i].ResourceGuid,
								StartTimestamp: aAssignments[i].DateFrom,
								DemandGuid: aAssignments[i].DemandGuid,
								DailyView: sSelectedHierarchyView === "TIMEDAY"
							};
							if (aAssignments[i].DateTo) {
								oAvailabilityCheckObject.EndTimestamp = aAssignments[i].DateTo;
							}
							this.executeFunctionImport(oModel, oAvailabilityCheckObject, "ResourceAvailabilityCheck", "GET").then(
								function (oAvailabilityData, oResponse) {
									// if resource unavailable for this demand push the demand to aDemandsForSplitAssignment
									// else push it to aNormalAssignmentArray
									if (oAvailabilityData.Unavailable) {
										aDemandsForSplitAssignment.push(oAvailabilityData.DemandGuid);
									}
									resolve(oAvailabilityData.Unavailable);
								});
						}.bind(this)));
					}
				}

				this.getModel("appView").setProperty("/busy", true);
				Promise.all(aUnavailabilityChecks).then(function (aPromiseAllResults) {
					this.getModel("appView").setProperty("/busy", false);

					if (aPromiseAllResults.includes(true)) {
						oResourceAvailabiltyResponse.arrayOfDemandsToSplit = aDemandsForSplitAssignment;
						finalResolve(oResourceAvailabiltyResponse);
					} else {
						finalResolve(oResourceAvailabiltyResponse);
					}
				}.bind(this));
			}.bind(this));

			return oUnavailabilityPromise;

		},

		/**
		 * show dialog to confirm the split for demands which have work more than the resource availability
		 * on resolve/OK split create assignment and on reject/Cancel normal create assignment is triggered to backend
		 * 
		 * @param {array} aDemandsForSplitAssignment 
		 * @param {promise resolve} finalResolve 
		 * @param {promise reject} finalReject 
		 */
		showSplitConfirmationDialog: function (oResourceAvailabiltyResponse) {
			var oViewModel = this.getModel("viewModel"),
				oi18nModel = this.getModel("i18n"),
				sDisplayDemandInfo, sCancelResponse, aDraggedDemands = [],

				aDemandsForSplitAssignment = oResourceAvailabiltyResponse.arrayOfDemandsToSplit,
				bShowSplitConfirmationDialog, sDemandSourceType;
			sDemandSourceType = this.getObjectSourceType(aDemandsForSplitAssignment);
			bShowSplitConfirmationDialog = this.getModel("user").getProperty("/ENABLE_SPLIT_STRETC_ASGN_POPUP") && (sDemandSourceType === "DEM_PMWO");

			return new Promise(function (resolve, reject) {

				this.dialogResolve = resolve;
				this.dialogReject = reject;
				this.resourceAvailabiltyResponse = oResourceAvailabiltyResponse;

				if (aDemandsForSplitAssignment.length > 0 && bShowSplitConfirmationDialog) {
					sDisplayDemandInfo = this.getDemandDetailsWithDesciption(aDemandsForSplitAssignment);
					oViewModel.setProperty("/splitConfirmationDialogInfo", sDisplayDemandInfo);

					if (!this.oConfirmDialog) {
						this.oConfirmDialog = new Dialog({
							type: DialogType.Message,
							title: oi18nModel.getProperty("xtit.confirmSplit"),
							content: [
								new VBox({
									items: [
										new Label({
											wrapping: true,
											text: oi18nModel.getProperty("xmsg.confirmSplit")
										}),
										new Label({
											text: ""
										}), // empty space
										new Label({
											design: "Bold",
											wrapping: true,
											text: "{viewModel>/splitConfirmationDialogInfo}"
										})
									]
								})
							],
							buttons: [
								new Button({
									type: ButtonType.Emphasized,
									text: oi18nModel.getProperty("xbut.splitConfirmDialogYes"),
									press: function () {
										this.oConfirmDialog.close();
										// resolve the aDemandsForSplitAssignment
										this.resourceAvailabiltyResponse.splitConfirmation = "YES";
										this.dialogResolve(this.resourceAvailabiltyResponse);
									}.bind(this)
								}),
								new Button({
									text: oi18nModel.getProperty("xbut.splitConfirmDialogNo"),
									press: function () {
										this.oConfirmDialog.close();
										// resolve the aDemandsForSplitAssignment
										this.resourceAvailabiltyResponse.splitConfirmation = "NO";
										this.resourceAvailabiltyResponse.arrayOfDemandsToSplit = [];
										this.dialogResolve(this.resourceAvailabiltyResponse);
									}.bind(this)
								}),
								new Button({
									text: oi18nModel.getProperty("xbut.splitConfirmDialogCancel"),
									press: function () {
										this.oConfirmDialog.close();
										aDraggedDemands = this.resourceAvailabiltyResponse && this.resourceAvailabiltyResponse.arrayOfDemands;
										sCancelResponse = aDraggedDemands.length > 1 ? "Cancel_Multi" : "Cancel";
										this.dialogReject(sCancelResponse);
									}.bind(this)
								})
							]
						});

						this.getView().addDependent(this.oConfirmDialog);
					}

					this.oConfirmDialog.open();
				} else if (aDemandsForSplitAssignment.length > 0 && !bShowSplitConfirmationDialog) {
					// scenario where split global config is enabled and user dont want to see confirmation for split,
					// always consider split by default
					this.resourceAvailabiltyResponse.splitConfirmation = "YES";
					this.dialogResolve(this.resourceAvailabiltyResponse);
				} else {
					this.dialogResolve(this.resourceAvailabiltyResponse);
				}
			}.bind(this));

		},

		/**
		 * method returns a message to be shown to the user
		 * asking for confirmation to continue with splits or not
		 * message includes orderid, operationId, demand description
		 * 
		 * @param {array} aDemandsForSplitAssignment demands which are marked for split
		 * @returns 
		 */
		getDemandDetailsWithDesciption: function (aDemandsForSplitAssignment) {
			var oModel = this.getModel(),
				sDisplayDemandInfo, sDemandDescriptionWithOrderOperation,
				aDemandObjectsFromLocalStorage = JSON.parse(this.localStorage.get("Evo-Dmnd-guid"));

			for (var iIndex = 0; iIndex < aDemandsForSplitAssignment.length; iIndex++) {
				var sDemandPath = "/DemandSet('" + aDemandsForSplitAssignment[iIndex] + "')",
					oDemandDetails = oModel.getProperty(sDemandPath);

				// in case of gantt split scenarios when the DemandContext is not found from model
				// fetch it from the local storgae data
				if (!oDemandDetails && aDemandObjectsFromLocalStorage.length > 0) {
					oDemandDetails = this._getDemandObjectSplitPage(sDemandPath);
				}

				var sDemandDescription = oDemandDetails.DemandDesc ? oDemandDetails.DemandDesc : "",
					sOrderId = oDemandDetails.ORDERID ? oDemandDetails.ORDERID : "",
					sOperationId = oDemandDetails.OPERATIONID ? oDemandDetails.OPERATIONID : "";
				sDemandDescriptionWithOrderOperation = sOrderId + " - " + sOperationId + " - " + sDemandDescription;
				sDisplayDemandInfo = sDisplayDemandInfo ? sDisplayDemandInfo + "\n \n" + sDemandDescriptionWithOrderOperation :
					sDemandDescriptionWithOrderOperation;
			}
			return sDisplayDemandInfo;
		},

		/**
		 * getting Demand objects form local model coming from gantt split
		 * @param sPath
		 * @since 2205
		 */
		_getDemandObjectSplitPage: function (sPath) {
			var aDragSessionData = JSON.parse(this.localStorage.get("Evo-Dmnd-guid"));
			for (var i = 0; i < aDragSessionData.length; i++) {
				if (aDragSessionData[i].sPath === sPath) {
					return aDragSessionData[i].oDemandObject;
				}
			}
		},

		/**
		 * catch for the split assignment method prmomises
		 * 
		 * @param {string} sResponse
		 */
		handlePromiseChainCatch: function (sResponse) {
			if (sResponse === "Cancel" && this.rejectAssignment) {
				this.rejectAssignment();
			} else if (sResponse === "Cancel_Multi" && this.rejectMultiAssign) {
				this.rejectMultiAssign();
			}
		},

		/**
		 * Checks if the passed assignment is part of split or not
		 * 
		 * @param {object} oModel main model evoplan service
		 * @param {string} sAssignGuid assignment guid
		 * @returns boolean if the selected assignment is part of a split
		 */
		checkIfAssignmentPartOfSplit: function (oModel, sAssignGuid) {
			var sAssignmentPath = "/AssignmentSet('" + sAssignGuid + "')",
				sAssignmentObject = oModel.getProperty(sAssignmentPath);

			if (sAssignmentObject && sAssignmentObject.SPLIT_INDEX > 0 && sAssignmentObject.SPLIT_COUNTER > 0) {
				return true;
			}
			return false;
		},

		/**
		 * remove the selection of resource group and pool resources on press of time allocation button 
		 * time allocation dialog does not work for resource Group and pool resource
		 * it works for multiple resources only
		 */
		removeSelectedPoolnResourceGroups: function () {
			var oModel,
				aRemoveItems = [];
			oModel = this._mParameters.bFromHome || this._mParameters.bFromMap ? this.getModel() : this.getModel("ganttModel");
			for (var i in this.selectedResources) {
				if (oModel.getProperty(this.selectedResources[i] + "/NodeType") === "RES_GROUP" || oModel.getProperty(this.selectedResources[i] +
					"/ResourceGuid") === "") {
					aRemoveItems.push(this.selectedResources[i]);
				}
			}
			for (i in aRemoveItems) {
				this.selectedResources.splice(this.selectedResources.indexOf(aRemoveItems[i]), 1);
				oModel.setProperty(aRemoveItems[i] + "/IsSelected", false);
			}
			if (this.selectedResources.length) {
				return false;
			} else {
				this.resetResourceTreeSelection(aRemoveItems);
				return true;
			}
		},

		/**
		 * deselect the Resource group which are removed from selection on press of time allocation button 
		 */
		resetResourceTreeSelection: function (aRemoveItems) {
			if (this._mParameters.bFromHome || this._mParameters.bFromMap) {
				this._eventBus.publish("ManageAbsences", "ClearSelection", {});
			} else {
				this._oEventBus.publish("BaseController", "resetSelections", {});
			}
		},

		/**
		 * get respective navigation details
		 * @param sAppID
		 */
		_getAppInfoById: function (sAppID) {
			var aNavLinks = this.getModel("templateProperties").getProperty("/navLinks");
			for (var i in aNavLinks) {
				if (aNavLinks.hasOwnProperty(i)) {
					if (aNavLinks[i].ApplicationId === sAppID) {
						return aNavLinks[i];
					}
				}
			}
			return null;
		},

		/**
		 * method returns a demand object source type
		 * asking to display the confirmation pop up to continue with splits or not
		 * 
		 * @param {array} aDemandsForSplitAssignment demands which are marked for split
		 * @returns 
		 */
		getObjectSourceType: function (aDemandsForSplitAssignment) {
			var oModel = this.getModel(),
				sDisplayObjectSourceType,
				aDemandObjectsFromLocalStorage = JSON.parse(this.localStorage.get("Evo-Dmnd-guid"));

			for (var iIndex = 0; iIndex < aDemandsForSplitAssignment.length; iIndex++) {
				var sDemandPath = "/DemandSet('" + aDemandsForSplitAssignment[iIndex] + "')",
					oDemandDetails = oModel.getProperty(sDemandPath);
				if (!oDemandDetails && aDemandObjectsFromLocalStorage.length > 0) {
					oDemandDetails = this._getDemandObjectSplitPage(sDemandPath);
				}
				sDisplayObjectSourceType = oDemandDetails.OBJECT_SOURCE_TYPE;
			}
			return sDisplayObjectSourceType;
		},

		/**
		* Storing the updated Resources Info in Demand and Map View
		* @param oViewModel
		* @param oResObj
		*/
		_updatedDmdResources: function (oViewModel, oResObj) {
			var oUpdatedResObj,
				aUpdatedResources = oViewModel.getProperty("/aUpdatedResources"),
				sNodeId = oResObj.ResourceGuid + "//" + oResObj.ResourceGroupGuid;
			//Considering as Pool Resources when Dropped on Resource Group
			if (oResObj.NodeType === "RES_GROUP" || oResObj.ResourceGuid === "") {
				sNodeId = "POOL:" + oResObj.ResourceGroupGuid;
			}
			oUpdatedResObj = {
				ResourceGuid: oResObj.ResourceGuid,
				ResourceGroupGuid: oResObj.ResourceGroupGuid,
				NodeId: sNodeId
			};
			aUpdatedResources.push(oUpdatedResObj);
		}

	});

});