sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment"
], function (BaseController, MessageBox, MessageToast, Fragment) {
	var sAssignmentsPath = "/manageResourcesSettings/Assignments",
		sRemovedIndicesPath = "/manageResourcesSettings/removedIndices",
		sOperationTypePath = "/manageResourcesSettings/operationType";
	return BaseController.extend("com.evorait.evoplan.controller.manageResources.ManageResourceActionsController", {

		onInitResourceActionController: function () {
			this._oEventBus = sap.ui.getCore().getEventBus();
			this._oEventBus.subscribe("ManageResourcesActionsController", "refreshAssignmentDialog", this._refreshAssignmentDialog, this);
		},
		/**
		 * Delete Resource
		 * @param {Object} aModel 
		 * @param {Object} sPath 
		 * 
		 */
		doDeleteResource: function (oModel, sPath, bIsMoved) {
			return new Promise(function (resolved, rejected) {
				oModel.remove(sPath, {
					groupId: "Delete_Resource",
					method: "DELETE",
					success: function (oData, oResponse) {
						var sSeverity = JSON.parse(oResponse.headers["sap-message"]).severity;
						if (bIsMoved && sSeverity !== "error") {
							resolved(oResponse);
						} else {
							this.showMessage(oResponse);
						}
					}.bind(this),
					error: function (oError) {
						rejected(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Create Resource
		 * @param {Object} aModel 
		 * @param {Object} sPath 
		 * @param {Object} aPayload 
		 * 
		 */
		doCreateResource: function (oModel, sPath, aPayload) {
			return new Promise(function (resolved, rejected) {
				oModel.create(sPath, aPayload, {
					groupId: "Create_Resource",
					method: "POST",
					refreshAfterChange: false,
					success: function (oData, oResponse) {
						this.showMessage(oResponse);
						resolved(oResponse);
					}.bind(this),
					error: function (oError) {
						rejected(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Update Group/Resource
		 * @param {Object} aModel 
		 * @param {Object} sPath 
		 * @param {Object} aPayload 
		 * 
		 */
		doUpdateResource: function (oModel, sPath, aPayload) {
			return new Promise(function (resolved, rejected) {
				oModel.update(sPath, aPayload, {
					groupId: "Update_Resource",
					method: "PUT",
					success: function (oData, oResponse) {
						this.showMessage(oResponse);
						resolved(oResponse);
					}.bind(this),
					error: function (oError) {
						rejected(oError);
					}
				});
			}.bind(this));
		},

		/**
		 * Validate resource assignment before deleting the resource
		 * @param {Object} Selected Resource's context 
		 */
		showResourceAssignments: function (oSelectedResourceContext) {
			this._oSelectedResourceContext = oSelectedResourceContext;
			var oView = this.getView();
			if (!this._oAssignmentsDialog) {
				this._oAssignmentsDialog = Fragment.load({
					id: oView.getId(),
					name: "com.evorait.evoplan.view.manageResources.fragments.ResourceAssignmentList",
					controller: this
				}).then(function (oAssignmentsDialog) {
					oView.addDependent(oAssignmentsDialog);
					oAssignmentsDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					return oAssignmentsDialog;
				}.bind(this));
			}
			this._oAssignmentsDialog.then(function (oAssignmentsDialog) {
				this._oViewModel.refresh(true);
				oAssignmentsDialog.open();
			}.bind(this));
		},
		/**
		 * Close assignment Dialog
		 * @param 
		 */
		onCloseAssignmentDialog: function () {
			this._oAssignmentsDialog.then(function (oAssignmentsDialog) {
				oAssignmentsDialog.close();
			}.bind(this));
		},
		/**
		 * Handle selection of assignments in Assignment Dialog
		 * @param {Object} oEvent
		 */
		onSelectionChangeAssignments: function (oEvent) {
			var oParameters = oEvent.getParameters(),
				oSelectedContexts = oEvent.getSource().getSelectedContexts(),
				sSelectedPath,
				oItem = oEvent.getParameter("listItem"),
				oUnassignBtn = this.getView().byId("idUnassignBtn");

			if (oParameters.selectAll) {
				for (var i in oSelectedContexts) {
					oItem = oSelectedContexts[i].getObject();
					if (!oItem.AllowUnassign) {
						oItem.IsSelected = false;
					}
				}
			} else if (oItem.isSelected()) {
				sSelectedPath = oItem.getBindingContextPath();
				oItem = this._oViewModel.getProperty(sSelectedPath);
				if (!oItem.AllowUnassign) {
					oItem.IsSelected = false;
				}
			}
			this.getView().byId("idResourceAssignmentsTable").getModel("viewModel").refresh()
			oSelectedContexts = oEvent.getSource().getSelectedContexts()
			if (oSelectedContexts && oSelectedContexts.length) {
				oUnassignBtn.setEnabled(true);
			} else {
				oUnassignBtn.setEnabled(false);
			}

		},
		/**
		 * unassign the assignments in Assignment Dialog
		 * @param {Object} oEvent
		 */
		onPressUnassign: function () {
			var aContextPaths = this.getView().byId("idResourceAssignmentsTable").getSelectedContextPaths(),
				oParams, sAssignmentGuid, bIsLast, aRemovedIndices = [],
				sMsg,
				mParameters = {
					bFromManageResourceRemoveAssignments: true
				};

			if (!aContextPaths.length) {
				sMsg = this.getResourceBundle().getText("ymsg.selectMinAssignment");
				MessageToast.show(sMsg);
				return;
			}
			for (var i in aContextPaths) {
				sAssignmentGuid = this._oViewModel.getProperty(aContextPaths[i] + "/Guid");
				aRemovedIndices.push(aContextPaths[i].split("/")[aContextPaths[i].split("/").length - 1]); // getting index of selected row
				oParams = {
					AssignmentGUID: sAssignmentGuid
				};
				if (parseInt(i, 10) === aContextPaths.length - 1) {
					bIsLast = true;
					this._oViewModel.setProperty(sRemovedIndicesPath, aRemovedIndices);
				}
				this.callFunctionImport(oParams, "DeleteAssignment", "POST", mParameters, bIsLast);
			}
		},
		/**
		 * Refresh Assignment Dialog after every delete operation
		 * @param 
		 */
		_refreshAssignmentDialog: function () {
			var aRemovedIndices = this._oViewModel.getProperty(sRemovedIndicesPath),
				aAssignmentData = this._oViewModel.getProperty(sAssignmentsPath),
				aNewAssignmentData = [],
				sOperationType = this._oViewModel.getProperty(sOperationTypePath);

			for (var i in aAssignmentData) {
				if (!aRemovedIndices.includes(i.toString())) {
					aNewAssignmentData.push(aAssignmentData[i]);
				}
			}
			this._oViewModel.setProperty(sAssignmentsPath, aNewAssignmentData);
			// commenting this code to separate the Proceed functionality from unassgin button
			if (!aNewAssignmentData.length && sOperationType === "updateResource" && this._bIsUpdateProceed) {
				// MessageToast.show("Update");
				this._aPayLoad.Start = this._oDateFormat.format(new Date(new Date(this._aPayLoad.Start).setHours(0, 0, 0)));
				this._aPayLoad.End = this._oDateFormat.format(new Date(new Date(this._aPayLoad.End).setHours(23, 59, 59)));
				this.proceedToUpdate(this._oSelectedNodeContext.getPath(), this._aPayLoad);
				this._bIsUpdateProceed = false;

			} else if (!aNewAssignmentData.length) {
				this._updateContext(this._oSelectedResourceContext.getObject());
			}
			this._oViewModel.refresh(true);
			this.getView().byId("idResourceAssignmentsTable").setSelectedContextPaths([]);
			this.getView().byId("idUnassignBtn").setEnabled(false);

		},
		/**
		 * Preceed to delete if Resource can be deleted in Assignment Dialog
		 * @param 
		 */
		onPressProceedBtn: function () {
			this.onCloseAssignmentDialog();
			var sOperationType = this._oViewModel.getProperty(sOperationTypePath),
				sPath = this._oSelectedResourceContext.getPath(),
				sEntitySetName = sPath.split("(")[0];

			if (sOperationType === "moveResource") {
				this.doDeleteResource(this._oModel, sPath, true).then(function (oResponse) {
					this.doCreateResource(this._oModel, sEntitySetName, this._aPayLoad).then(function (oResponse) {}.bind(this));
				}.bind(this));
			} else if (sOperationType === "deleteResource") {
				this.doDeleteResource(this._oModel, sPath).then(function () {
					this._oEventBus.publish("ManageResourcesController", "refreshManageResourcesView", {});
				}.bind(this));
			} else if (sOperationType === "updateResource") {
				this.getView().byId("idResourceAssignmentsTable").selectAll()
				var aContextPaths = this.getView().byId("idResourceAssignmentsTable").getSelectedContextPaths();
				if (aContextPaths.length) {
					this._bIsUpdateProceed = true;
					this.onPressUnassign();
				} else {
					this._aPayLoad.Start = this._oDateFormat.format(new Date(new Date(this._aPayLoad.Start).setHours(0, 0, 0)));
					this._aPayLoad.End = this._oDateFormat.format(new Date(new Date(this._aPayLoad.End).setHours(23, 59, 59)));
					this.proceedToUpdate(this._oSelectedNodeContext.getPath(), this._aPayLoad);
				}
			}
		},
		/**
		 * Final Update Call after completing all validations
		 * @param 
		 */
		proceedToUpdate: function (sSelectedPath, oUpdatedRow) {
			this.doUpdateResource(this._oModel, sSelectedPath, oUpdatedRow).then(function (oResponse) {
				this._updateContext(oUpdatedRow);
			}.bind(this));
		},

		/**
		 * Applying updated changes without refreshing the table.
		 */
		_updateContext: function (oUpdatedRow) {
			var sNodeType = this._oSelectedContext ? this._oSelectedContext.getProperty("NodeType") : this._oSelectedResourceContext.getProperty(
					"NodeType"),
				sPath = this._oSelectedContext ? this._oSelectedContext.getPath() : this._oSelectedResourceContext.getPath(),
				oRow = this._oModel.getProperty(sPath);
			if (sNodeType === "RES_GROUP") {
				oRow.Description = oUpdatedRow.Description;
			} else {
				this.getOwnerComponent()._getData(sPath).then(function (result) {
					oRow.Start = result.Start;
					oRow.End = result.End;
					oRow.AssignmentCount = result.AssignmentCount;
				}.bind(this));
			}
			this.getOwnerComponent()._getData(sPath.split("(")[0]).then(function (result) {}.bind(this));
		},
		/**
		 * destroy contents on Exit
		 * @param 
		 */
		onExitResourceActionController: function () {
			this._oEventBus.unsubscribe("ManageResourcesActionsController", "refreshAssignmentDialog", this._refreshAssignmentDialog, this);
		}

	});
});