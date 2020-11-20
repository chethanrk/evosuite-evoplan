/*global history */
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
	"com/evorait/evoplan/model/formatter"
], function (Controller, History, Dialog, Button, Text, MessageToast, MessageBox, FormattedText, Constants,
	RowAction, RowActionItem, formatter) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.BaseController", {
		formatter: formatter,
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
		showMessageToast: function (sMsg) {
			MessageToast.show(sMsg, {
				duration: 5000
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
					jQuery.sap.log.error("Failed to parse the message header");
				}
				if (oData && oData.details.length > 0) {
					var oMessage, bContainsError;
					for (var i in oData.details) {
						if (oData.details[i].severity === "error") {
							bContainsError = true;
							oMessage = oData.details[i];
							break;
						}
					}
					if (bContainsError) {
						var sMessage = oMessage.message;
						this._showErrorMessage(sMessage, fnCallback);
					} else
						this.showMessageToast(oData.message);
				} else {
					this.showMessageToast(oData.message);
				}
			} else {
				if (oResponse) {
					try {
						oData = JSON.parse(oResponse.responseText);
					} catch (ex) {
						jQuery.sap.log.error("Failed to parse the message header");
					}
					if (oData && oData.error) {
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
				styleClass: this.getOwnerComponent().getContentDensityClass(),
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

			oViewModel.setProperty("/busy", true);
			oModel.callFunction("/" + sFuncName, {
				method: sMethod || "POST",
				urlParameters: oParams,
				refreshAfterChange: false,
				success: function (oData, oResponse) {
					//Handle Success
					if (bIsLast) {
						oViewModel.setProperty("/busy", false);
						this.showMessage(oResponse);
						this.afterUpdateOperations(mParameters);
					}
				}.bind(this),
				error: function (oError) {
					//Handle Error
					MessageToast.show(oResourceBundle.getText("errorMessage"), {
						duration: 5000
					});
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
		executeFunctionImport: function (oModel, oParams, sFuncName, sMethod) {
			var oResourceBundle = this.getResourceBundle();

			return new Promise(function (resolve, reject) {
				oModel.callFunction("/" + sFuncName, {
					method: sMethod || "POST",
					urlParameters: oParams,
					refreshAfterChange: false,
					success: function (oData, oResponse) {
						this.showMessage(oResponse);
						resolve(oData, oResponse);
					}.bind(this),
					error: function (oError) {
						//Handle Error
						MessageToast.show(oResourceBundle.getText("errorMessage"), {
							duration: 5000
						});
						reject(oError);
					}.bind(this)
				});
			}.bind(this));
		},
		/** 
		 * Method check the parameter and refreshes the required part of screen 
		 * @param {Object} mParameters contains flag which will be passed from where it is get called.
		 */
		afterUpdateOperations: function (mParameters) {
			var eventBus = sap.ui.getCore().getEventBus();

			var oParameter = mParameters || {
				bFromHome: true,
				bFromAseet: false,
				bFromPlannCal: false,
				bFromDetail: false,
				bFromGantt: false,
				bFromGanttSplit: false,
				bFromDemandSplit: false,
				bFromMap: false
			};

			if (oParameter.bFromHome) {
				eventBus.publish("BaseController", "refreshTreeTable", {});
				eventBus.publish("BaseController", "refreshDemandTable", {});
				eventBus.publish("BaseController", "refreshDemandOverview", {});
			} else if (oParameter.bFromAsset) {
				eventBus.publish("BaseController", "refreshAssetCal", {});
			} else if (oParameter.bFromPlannCal) {
				eventBus.publish("AssignInfoDialog", "RefreshCalendar", {});
				eventBus.publish("BaseController", "refreshTreeTable", {});
				eventBus.publish("BaseController", "refreshDemandTable", {});
				eventBus.publish("BaseController", "refreshDemandOverview", {});
			} else if (oParameter.bFromDetail) {
				eventBus.publish("BaseController", "refreshTreeTable", {});
				eventBus.publish("BaseController", "refreshDemandOverview", {});
				eventBus.publish("BaseController", "refreshDemandTable", {});
			} else if (oParameter.bFromGantt) {
				eventBus.publish("BaseController", "refreshGanttChart", {});
				eventBus.publish("BaseController", "refreshDemandGanttTable", {});
			} else if (oParameter.bFromMap) {
				// eventBus.publish("BaseController", "resetMapSelection", {});
				eventBus.publish("BaseController", "refreshMapTreeTable", {});
				eventBus.publish("BaseController", "refreshMapView", {});
				// eventBus.publish("BaseController", "refreshMapDemandTable", {});
			} else if (oParameter.bFromGanttSplit) {
				eventBus.publish("BaseController", "refreshGanttChart", {});
			} else if (oParameter.bFromDemandSplit) {
				eventBus.publish("BaseController", "refreshDemandGanttTable", {});
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
		 * get all selected rows from table and return to draggable helper function
		 * @param aSelectedRowsIdx
		 * @private
		 */
		_getSelectedRowPaths: function (oTable, aSelectedRowsIdx, checkAssignAllowed, aDemands) {
			var aPathsData = [],
				aNonAssignableDemands = [],
				oData, oContext, sPath;

			if (checkAssignAllowed) {
				oTable.clearSelection();
			}
			if (!aDemands) {
				for (var i = 0; i < aSelectedRowsIdx.length; i++) {
					oContext = oTable.getContextByIndex(aSelectedRowsIdx[i]);
					sPath = oContext.getPath();
					oData = this.getModel().getProperty(sPath);

					//on check on oData property ALLOW_ASSIGN when flag was given
					if (checkAssignAllowed) {
						if (oData.ALLOW_ASSIGN) {
							aPathsData.push({
								sPath: sPath,
								oData: oData,
								index: aSelectedRowsIdx[i]
							});
							oTable.addSelectionInterval(aSelectedRowsIdx[i], aSelectedRowsIdx[i]);
						} else {
							aNonAssignableDemands.push(oData.DemandDesc);
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
						aNonAssignableDemands.push(oData.Description);
						delete aDemands[j];
					}
				}
			}
			return {
				aPathsData: aPathsData,
				aNonAssignable: aNonAssignableDemands
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
		},
		/**
		 * Method checks the availability of resources
		 * @param sTargetPath : Resource path on which assignment needs to be created
		 * @return {boolean} return true is available
		 */
		isAvailable: function (sTargetPath) {
			var oModel = this.getModel(),
				oTargetObj = oModel.getProperty(sTargetPath);

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
				sPoolFunction = oModel.getProperty("/POOL_FUNCTION_ENABLED"),
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
		 * Change view horizon time at specified timestamp
		 * @param oModel {object} viewModel
		 * @param start {object} timestamp
		 * @param end {object} timestamp
		 */
		changeGanttHorizonViewAt: function (oModel, iZoomLevel) {
			var oViewModel = oModel,
				sStartDate, sEndDate;

			if (iZoomLevel >= 8) {
				sStartDate = moment().startOf("hour").toDate();
				sEndDate = moment().endOf("hour").add(1, "hour").toDate();
			} else {
				sStartDate = moment().startOf("day").subtract(1, "day").toDate();
				sEndDate = moment().endOf("day").add(1, "day").toDate();
			}
			oViewModel.setProperty("/ganttSettings/visibleStartTime", sStartDate);
			oViewModel.setProperty("/ganttSettings/visibleEndTime", sEndDate);
		},

		_setRowActionTemplate: function (oDataTable, onClickNavigation, openActionSheet) {

			var oTemplate = oDataTable.getRowActionTemplate(),
				oResourceBundle = this.getModel("i18n").getResourceBundle();
			if (oTemplate) {
				oTemplate.destroy();
				oTemplate = null;
			}
			// oTemplate = sap.ui.xmlfragment("com.evorait.evoplan.view.fragments.RowActions", this);
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
		 *	Navigates to evoOrder detail page with static url. 
		 */
		openEvoOrder: function (sOrderId, oAppInfo, oViewModel) {
			var sUri, sSemanticObject, sParameter,
				sAction,
				sAdditionInfo,
				sLaunchMode = oViewModel ? oViewModel.getProperty("/launchMode") : this.getModel("viewModel").getProperty("/launchMode");

			if (sLaunchMode === Constants.LAUNCH_MODE.FIORI) {
				sAdditionInfo = oAppInfo.Value1 || "";
				sSemanticObject = sAdditionInfo.split("\\\\_\\\\")[0];
				sAction = sAdditionInfo.split("\\\\_\\\\")[1] || "dispatch";
				sParameter = sAdditionInfo.split("\\\\_\\\\")[2];
				if (sSemanticObject && sAction) {
					this.navToApp(sSemanticObject, sAction, sParameter, sOrderId);
				}
				return;
			} else {
				sAdditionInfo = oAppInfo.Value1;
				sUri = sAdditionInfo.replace("\\place_h1\\", sOrderId);
				window.open(sUri, "_blank");
			}
		},
		navToApp: function (sSemanticObject, sAction, sParameter, sOrderId) {
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
			var sHash = oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
				target: {
					semanticObject: sSemanticObject,
					action: sAction
				}
			}) || ""; // generate the Hash to display a Notification details app

			oCrossAppNavigator.toExternal({
				target: {
					shellHash: sHash + "&/" + sParameter + "/" + sOrderId
				}
			});
		},
		clearLocalStorage: function () {
			localStorage.removeItem("Evo-Dmnd-pageRefresh");
			localStorage.removeItem("Evo-Dmnd-guid");
		},
		/**
		 * TODO to be designed 
		 */
		loadFragment: function (sPath, oController, sId) {
			// return Fragment.load({
			// 	name:sPath,
			// 	id: sId,
			// 	controller: oController
			// });
		}
		

	});

});