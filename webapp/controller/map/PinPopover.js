sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/base/Log",
	"sap/ui/core/Fragment",
	"com/evorait/evoplan/controller/TemplateRenderController"
], function (Controller, OverrideExecution, Log, Fragment, TemplateRenderController) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.map.PinPopover", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {
				open: {
					public: true,
					final: true
				}
			}
		},

		constructor: function (oController) {
			this.oController = oController;
			this.oView = oController.getView();
			this.oResourceBundle = oController.getResourceBundle();
			this.oModel = oController.getView().getModel();
		},

		/* =========================================================== */
		/* public methods                                              */
		/* =========================================================== */

		/**
		 * opens popover 
		 * @param {object} oSPot - spot control inside map
		 * @param {string} sType - type of pin (Demand|Resource) 
		 */
		open: function (oSpot, sType) {
			var oSpotPosition = oSpot.mClickPos,
				bIsDemand = sType === "Demand";

			this.selectedDemandPath = oSpot.getBindingContext().getPath();
			this._selectedDemands = oSpot;

			//var sQualifier = "MapDemandPin"; // fetch from CONSTANT.js
			var sQualifier = bIsDemand ? "MapDemandPin" : "MapResourcePin";
			var mParams = {
				viewName: "com.evorait.evoplan.view.templates.SpotContextMenu#" + sQualifier,
				annotationPath: "com.sap.vocabularies.UI.v1.Facets#" + sQualifier,
				entitySet: bIsDemand ? "DemandSet" : "ResourceSet",
				controllerName: "SpotContextMenu",
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
			var oModel = this.getView().getModel(),
				sPath = this.selectedDemandPath,
				oData = oModel.getProperty(sPath),
				// check if assigned
				bAlreadyAssigned = oData.NUMBER_OF_ASSIGNMENTS > 0,
				sStatus = oData.Status;
			if (bAlreadyAssigned && sStatus !== "CLSD") {
				this.planForAssignedDemands(oModel, sPath);
			} else {
				this.planForUnAssignedDemands();
			}
		},

		/**
		 * event from the context menu popover button click
		 * @param {object} oEvent - show route button click event
		 **/
		onShowRoute: function (oEvent) {

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
			var oModel = this.getView().getModel();
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
		planForAssignedDemands: function (oModel, sPath) {
			var oData = oModel.getProperty(sPath);
			if (oData.ALLOW_ASSIGN) {
				this.oPopover.setBusy(true);
				// when already assigned to resources, open "Assign New" dialog
				// first fetch the assignment information of the Demand
				oModel.read(sPath, {
					urlParameters: {
						$expand: "DemandToAssignment"
					},
					success: this.onDemandToAssignmentFetchSuccess.bind(this) // open the assign new dialog after resource data fetch
				});
			} else {
				this.oController._showAssignErrorDialog([oData.DemandDesc]);
			}
		},

		/**
		 * plan for un-assigned demands
		 * @param
		 **/
		planForUnAssignedDemands: function () {
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
		onDemandToAssignmentFetchSuccess: function (oData) {
			var oModel = this.getView().getModel(),
				sDemandGuid = oData.Guid;

			this.selectedPinsAssignment = "/DemandSet('" + sDemandGuid + "')/DemandToAssignment";
			var sAssignmentPath = "/" + oModel.getProperty(this.selectedPinsAssignment);

			this.getOwnerComponent().assignActionsDialog.open(this.getView(), [sAssignmentPath], false, {
				bFromHome: false,
				bFromSpotContextMenu: true
			});

			this.oPopover.setBusy(false);
		}
	});
});