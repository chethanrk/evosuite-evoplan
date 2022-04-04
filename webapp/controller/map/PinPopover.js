sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/OverrideExecution",
	"sap/base/Log",
	"com/evorait/evoplan/controller/TemplateRenderController"
], function (Controller, OverrideExecution, Log, TemplateRenderController) {
	"use strict";

	return Controller.extend("com.evorait.evoplan.controller.map.PinPopover", {

		metadata: {
			// extension can declare the public methods
			// in general methods that start with "_" are private
			methods: {
				open: {
					public: true,
					final: true
				},
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
			var oSpotPosition = oSpot.mClickPos;

			//var sQualifier = "MapDemandPin"; // fetch from CONSTANT.js
			var sQualifier = "MapDemandPin";
			var mParams = {
				viewName: "com.evorait.evoplan.view.templates.SpotContextMenu#" + sQualifier,
				annotationPath: "com.sap.vocabularies.UI.v1.Facets#" + sQualifier,
				entitySet: "DemandSet",
				controllerName: "SpotContextMenu",
				smartTable: null,
				sPath: this.selectedDemandPath,
				hiddenDiv: this._gethiddenDivPosition(oSpotPosition),
				oView: this.oView
			};

			if (!this.oPopover) {
				Fragment.load({
					name: "com.evorait.evoplan.view.common.fragments.SpotContextMenu",
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
			var oModel = this.getModel();
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
		}
	});
});