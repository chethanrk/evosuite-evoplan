sap.ui.define([
	"com/evorait/evoplan/controller/BaseController",
	"com/evorait/evoplan/model/formatter",
	'sap/ui/model/Filter',
	"com/evorait/evoplan/model/Constants",
], function (BaseController, formatter, Filter, Constants) {

	return BaseController.extend("com.evorait.evoplan.controller.Scheduling.SchedulingActions", {

		_controller: undefined, //controller from where this class was initialized
		oViewModel: undefined,
		oDataModel: undefined,
		oGanttModel: undefined,
		oResourceBundle: undefined,

		/**
		 * Set here all global properties you need from other controller
		 * @param {*} controller 
		 */
		constructor: function (controller) {
			this._controller = controller;
			this.oViewModel = controller.getModel("viewModel");
			this.oAppViewModel = controller.getModel("appView");
			this.oDataModel = controller.getModel();
			this.oGanttModel = controller.getModel("ganttModel");
			this.userModel = controller.getModel("user");
			this.oResourceBundle = controller.getResourceBundle();

		},

		/* =========================================================== */
		/* Public methods                                              */
		/* =========================================================== */

		/**
		 * Function to validate rescheduling button
		 */
		validateScheduleButtons: function () {
			var oSelectedDemandItem, oScheduling;
			oScheduling = this.oViewModel.getProperty("/Scheduling");

			//TODO - check if global config is enabled for multiple demands

			if (oScheduling.selectedDemandPath) {
				oSelectedDemandItem = this.oDataModel.getProperty(oScheduling.selectedDemandPath);

				if (oScheduling.selectedResources && (oScheduling.selectedResources.length > 0)) {
					this.oViewModel.setProperty("/Scheduling/bEnableReschedule", oSelectedDemandItem.ALLOW_REASSIGN);
					this.oViewModel.setProperty("/Scheduling/bEnableAutoschedule", true);
				} else {
					this.oViewModel.setProperty("/Scheduling/bEnableReschedule", false);
					this.oViewModel.setProperty("/Scheduling/bEnableAutoschedule", false);
				}
			} else {
				this.oViewModel.setProperty("/Scheduling/bEnableReschedule", false);
				this.oViewModel.setProperty("/Scheduling/bEnableAutoschedule", false);
			}
		},

		/**
		 * Function to handle Plan Demands Operation
		 */
		handlePlanDemands: function () {

		},

		/**
		 * This method will check for the duplicate resource selected or not and display the error message
		 * @return {boolean} - 'true' if no duplicate found | 'false' if duplicate found
		 */
		checkDuplicateResource: function () {
			var oViewModel = this.oViewModel,
				oAppViewModel = this.oAppViewModel,
				oDataModel = this.oDataModel,
				oGanttModel = this.oGanttModel,
				aResourcePath = oViewModel.getProperty("/Scheduling/selectedResources"),
				aTableFilters = oViewModel.getProperty("/Scheduling/resourceTreeData/filter"),
				mParameters = {
					$select: oViewModel.getProperty("/Scheduling/resourceTreeData/select")
				},
				aResourceData = [],
				oResourceObj = {},
				aResourceGroupPromise = [],
				aFilters = [];


			//method will check for the duplicate resource
			var checkDuplicate = function (aResourceList) {
				var bValidateState = true,
					aResourceNameList = [],
					oUniqueResourceList = {};
				aResourceList.forEach(function (oResource) {
					if (oResource.ResourceGuid) {
						if (oUniqueResourceList[oResource.ResourceGuid]) {
							bValidateState = false;
							aResourceNameList.indexOf(oResource.Description) === -1 && aResourceNameList.push(oResource.Description);
						} else {
							oUniqueResourceList[oResource.ResourceGuid] = true;
						}
					}
				});
				return {
					validateState: bValidateState,
					resourceNames: aResourceNameList.join("\n")
				};
			};
			//Read all resource selected
			aResourcePath.forEach(function (sPath) {
				if (sPath.indexOf("children") === -1) {
					oResourceObj = _.clone(oDataModel.getProperty(sPath));
				} else {
					oResourceObj = _.clone(oGanttModel.getProperty(sPath));
				}

				aFilters = [];
				if (oResourceObj.ResourceGuid) {
					aResourceData.push(oResourceObj);
				} else if (oResourceObj.ResourceGroupGuid) {
					// aFilters = _.clone(aTableFilters);
					aFilters.push(new Filter("ResourceGroupGuid", "EQ", oResourceObj.NodeId));
					aResourceGroupPromise.push(this._controller.getOwnerComponent()._getData("/ResourceSet", aFilters));

				}
			}.bind(this));
			//Read all resource selected
			//Read all Resource from Resource group
			oAppViewModel.setProperty("/busy", true);
			return Promise.all(aResourceGroupPromise).then(function (aResult) {
				oAppViewModel.setProperty("/busy", false);
				aResult.forEach(function (oResult) {
					aResourceData = aResourceData.concat(oResult.results);
				});
				return checkDuplicate(aResourceData);
			}.bind(this));
			//Read all Resource from Resource group

		},
		/**
		 * This method will reset the scheduling json model
		 */
		resetSchedulingJson:function(){
			var oBj={
				sType:"",
				sScheduleDialogTitle: "",
				sScheduleTableTitle: "",
				bEnableReschedule: false,
				bEnableAutoschedule: false,
				SchedulingDialogFlags:{
					
				},
				selectedResources:null,
				selectedDemandPath:null,
				resourceTreeData: {
					filter:[],
					select:""
				}
			}
			this.oViewModel.setProperty("/Scheduling",oBj);
		}

		/**
		 * This method will validate demands and selected resource if its eligible to Auto-Schedule
		 */
		validateSelectedDemands: function (oTable, aSelectedRowsIdx) {
			var oSelectedPaths = this._checkAllowedDemands(oTable, aSelectedRowsIdx);
			this.checkDuplicateResource().then(function (oResult) {
				if (oResult.validateState) {
					if (oSelectedPaths.aNonAssignable.length > 0) {
						this._showAssignErrorDialog(oSelectedPaths.aNonAssignable, null, this.oResourceBundle.getText("ymsg.invalidSelectedDemands"));
					} else if (oSelectedPaths.aPathsData.length > 0) {
						this.oViewModel.setProperty("/Scheduling/sType", Constants.SCHEDULING.AUTOSCHEDULING);
						var mParams = {
							entitySet: "DemandSet"
						}
						this._controller.getOwnerComponent().SchedulingDialog.openSchedulingDialog(this._controller.getView(), mParams);
					}

				} else {
					this._showErrorMessage(this.oResourceBundle.getText("ymsg.DuplicateResource", oResult.resourceNames));
					if (oSelectedPaths.aNonAssignable.length > 0) {
						this._showAssignErrorDialog(oSelectedPaths.aNonAssignable, null, this.oResourceBundle.getText("ymsg.invalidSelectedDemands"));
					}
				}
			}.bind(this));
		},

		/* =========================================================== */
		/* Private methods                                              */
		/* =========================================================== */
		/**
		 * This method will check for the Allowed flag for each selected Demands
		 * @return {Object} - Array of allowed and not allowed demands in separate properties
		 */
		_checkAllowedDemands: function (oTable, aSelectedRowsIdx) {
			var aPathsData = [],
				aNonAssignableDemands = [],
				oData, oContext, sPath;

			oTable.clearSelection();

			for (var i = 0; i < aSelectedRowsIdx.length; i++) {
				oContext = oTable.getContextByIndex(aSelectedRowsIdx[i]);
				sPath = oContext.getPath();
				oData = this.oDataModel.getProperty(sPath);

				//Added condition to check for number of assignments to plan demands via scheduling
				if (oData.ALLOW_ASSIGN && oData.NUMBER_OF_CAPACITIES <= 1) {
					aPathsData.push({
						sPath: sPath,
						oData: oData,
						index: aSelectedRowsIdx[i]
					});
					oTable.addSelectionInterval(aSelectedRowsIdx[i], aSelectedRowsIdx[i]);
				} else {
					aNonAssignableDemands.push(this.getMessageDescWithOrderID(oData, null, true));
				}
			}
			return {
				aPathsData: aPathsData,
				aNonAssignable: aNonAssignableDemands,
			};
		},
	});
});