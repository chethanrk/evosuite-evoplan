sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/base/Log",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/model/Constants",
	"com/evorait/evoplan/controller/TemplateRenderController",
	"com/evorait/evoplan/controller/common/ResourceTreeFilterBar"
], function (Controller, OverrideExecution, Log, Fragment, Constants, TemplateRenderController, ResourceTreeFilterBar) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.map.PinPopover", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			// default is public: true, final: false, overrideExecution: OverrideExecution.Instead
			methods: {
				open: {
					public: true,
					final: true
				},
				onPlanContextMenu: {}, //default
				onShowRoute: {}, // default
				onShowAssignments: {} // default
			}
		},

		constructor: function (oController) {
			this.oController = oController;
			this.oView = oController.getView();
			this.oResourceBundle = oController.getResourceBundle();
			this.oModel = oController.getView().getModel();
			this.oRouter = oController.getRouter();
		},

		/* =========================================================== */
		/* public methods                                              */
		/* =========================================================== */

		/**
		 * opens context menu popover - right click on Pin
		 * @param {object} oSPot - spot control inside map
		 * @param {string} sType - type of pin (Demand|Resource) 
		 */
		open: function (oSpot, sType) {
			var oSpotPosition = oSpot.mClickPos,
				bIsDemand = sType === "Demand";

			this.selectedDemandPath = oSpot.getBindingContext().getPath();
			this._selectedDemands = oSpot;

			var sQualifier = bIsDemand ? Constants.ANNOTATION_CONSTANTS.MAP_DEMAND_PIN : "MapResourcePin",
				mParams = {
					viewName: "com.evorait.evoplan.view.templates.SpotContextMenu#" + sQualifier,
					annotationPath: "com.sap.vocabularies.UI.v1.Facets#" + sQualifier,
					entitySet: bIsDemand ? "DemandSet" : "ResourceSet",
					smartTable: null,
					sPath: this.selectedDemandPath,
					hiddenDiv: this._gethiddenDivPosition(oSpotPosition),
					oView: this.oView
				};

			if (!this.oPopover) {
				Fragment.load({
					name: "com.evorait.evoplan.view.map.fragments.SpotContextMenu",
					controller: this
				}).then(function (popover) {
					this.oPopover = popover;
					this.oView.addDependent(this.oPopover);
					this._setFragmentViewBinding(mParams);
				}.bind(this));
			} else {
				this._setFragmentViewBinding(mParams);
			}
		},

		/**
		 * demand pin popover - plan button click event
		 * @param {object} oEvent - Plan button click event
		 **/
		onPlanContextMenu: function (oEvent) {
			var oModel = this.oView.getModel(),
				sPath = this.selectedDemandPath,
				oData = oModel.getProperty(sPath),
				// check if assigned
				bAlreadyAssigned = oData.NUMBER_OF_ASSIGNMENTS > 0,
				sStatus = oData.Status;
			if (bAlreadyAssigned && sStatus !== "CLSD") {
				this._planForAssignedDemands(oModel, sPath);
			} else {
				this._planForUnAssignedDemands();
			}
		},

		/**
		 * event for Show Route button in Demand popover context menu
		 * @param {object} oEvent - show route button click event
		 **/
		onShowRoute: function (oEvent) {

		},

		/**
		 * event for the Show Assignments button in Resource popover context menu
		 * @param {object} oEvent - show route button click event
		 **/
		onShowAssignments: function (oEvent) {
			// from the pop-up find the resource details which needs to be passed to the filter bar in gantt
			var oModel = this.oView.getModel(),
				oSelectedResourceContext = oModel.getProperty(this.selectedDemandPath),

				sPath = "Description",
				sSelectedResorce = oSelectedResourceContext.Description;

			// form the filterBar setFilterData JSON format
			var oResourceFilter = this._formResourceFilterForGantt(sPath, sSelectedResorce);
			this.oView.getModel("viewModel").setProperty("/ganttResourceFiltersFromPin", [oResourceFilter]);

			// setBusy true and close the dialog
			this.oPopover.close();
			this.oController.setMapBusy(true);
			
			// then navigate to the gantt view
			this.oRouter.navTo("newgantt");

			// same for date range - save it in the model and apply it after the Gantt is initialised
			var ResourceTreeFilterBarController = new ResourceTreeFilterBar(),
				aDateRange = ResourceTreeFilterBarController.getDateRange();
			this.oView.getModel("viewModel").setProperty("/ganttDateRangeFromMap", aDateRange);
		},

		/* =========================================================== */
		/* Internal methods                                            */
		/* =========================================================== */

		/**
		 * creates and returns a hidden div at the same position 
		 * as the Spot on the Canvas rightclicked by user
		 * the div is added as a child to the GeoMapContainer with absolute positioning,
		 * then style top and left values are provided 
		 * from the click position returned by the spot contextmenu event
		 * @param {object} oSpotPosition - x and y values of clicked position on the geo map
		 * @ returns the div element
		 */
		_gethiddenDivPosition: function (oSpotPosition) {
			var div = document.createElement("div");
			div.style.position = "absolute";
			div.style.top = oSpotPosition[1] + "px";
			div.style.left = (parseInt(oSpotPosition[0]) + 10) + "px";
			// add as a child to the GeoMap 
			// this get by id
			var oGeoMapContainer = this.oView.byId("idMapContainer");
			var oGeoMapContainerDOM = oGeoMapContainer.getDomRef();
			oGeoMapContainerDOM.appendChild(div);
			return div;
		},

		/**
		 * creates the smartForm from template and 
		 * inserts in the popover container
		 * @param {object} mParams - required properties for template rendering
		 **/
		_setFragmentViewBinding: function (mParams) {
			var oModel = this.oView.getModel();
			var oTemplateRenderController = new TemplateRenderController();

			oTemplateRenderController.setOwnerComponent(this.getOwnerComponent());
			oTemplateRenderController.setTemplateProperties(mParams);

			oModel.getMetaModel().loaded().then(function () {
				oTemplateRenderController.insertTemplateFragment(mParams.sPath, mParams.viewName, "spotContainer", this._afterBindSuccess.bind(
					this, mParams.hiddenDiv), mParams);
			}.bind(this));
		},

		/**
		 * after the template rendering is successful 
		 * open the popover by the Spot/Hidden div
		 * @param {object} - oHiddenDiv - hidden div object 
		 **/
		_afterBindSuccess: function (oHiddenDiv) {
			this.oPopover.openBy(oHiddenDiv);
		},

		/**
		 * plan for already assigned demands
		 * @param {object} oModel - main model 
		 * @param {string} sPath - context path of the Demand/Resource
		 **/
		_planForAssignedDemands: function (oModel, sPath) {
			var oData = oModel.getProperty(sPath);
			if (oData.ALLOW_ASSIGN) {
				this.oPopover.setBusy(true);
				// when already assigned to resources, open "Assign New" dialog
				// first fetch the assignment information of the Demand
				oModel.read(sPath, {
					urlParameters: {
						$expand: "DemandToAssignment"
					},
					success: this._onDemandToAssignmentFetchSuccess.bind(this) // open the assign new dialog after resource data fetch
				});
			} else {
				this.oController._showAssignErrorDialog([oData.DemandDesc]);
			}
		},

		/**
		 * plan for un-assigned demands
		 * @param
		 **/
		_planForUnAssignedDemands: function () {
			// when not assigned to any resource filter the demand in Demand view
			this._bDemandListScroll = false; //Flag to identify Demand List row is selected and scrolled or not
			var aSelected = [this._selectedDemands],
				oViewModel = this.getView().getModel("viewModel"),
				aSelectedDemands = oViewModel.getProperty("/mapSettings/selectedDemands"),
				oContext;
			for (var i in aSelected) {
				oContext = aSelected[i].getBindingContext();
				aSelectedDemands.push(oContext.getPath());
			}
			oViewModel.setProperty("/mapSettings/selectedDemands", aSelectedDemands);
			oViewModel.setProperty("/mapSettings/routeData", []);
			oViewModel.setProperty("/mapSettings/bRouteDateSelected", false);
			this.oController._oDraggableTable.rebindTable();
		},

		/**
		 * opens the assign new dialog, before opening creates the context
		 * @param {object} oData - assignment data of the selected Demand pin
		 * 
		 **/
		_onDemandToAssignmentFetchSuccess: function (oData) {
			var oModel = this.oView.getModel(),
				sDemandGuid = oData.Guid;

			this.selectedPinsAssignment = "/DemandSet('" + sDemandGuid + "')/DemandToAssignment";
			var sAssignmentPath = "/" + oModel.getProperty(this.selectedPinsAssignment);

			this.getOwnerComponent().assignActionsDialog.open(this.getView(), [sAssignmentPath], false, {
				bFromHome: false,
				bFromSpotContextMenu: true
			});

			this.oPopover.setBusy(false);
		},

		/**
		 * forms the JSON data with Description property for filterbar.setFilterData
		 * @param {string} sPath - property for which the filter data is needed, Description in this case
		 * @param {string} sValue1 - value of the property - name of the resource to be filtered in this case
		 * @return {object} filterBar JSON Data format
		 */
		_formResourceFilterForGantt: function (sPath, sValue1) {
			var oJSONDataResourceFilter = {};
			oJSONDataResourceFilter[sPath] = {
				items: [{
					key: sValue1,
					text: sValue1
				}]
			};

			return oJSONDataResourceFilter;
		}
	});
});