sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentActionsController",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment"
], function (BaseController, models, formatter, Filter, FilterOperator, Fragment) {
	"use strict";

	return BaseController.extend("com.evorait.evoplan.controller.map.MapUtilities", {

		formatter: formatter,

		init: function () {
			// alert("Nav Action Initiated..");
		},
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
		 * Return resource filters on selected resources
		 * @param aSelectedResources {Array} Selected Resources
		 * @return aResourceFilters Filters
		 * @Author: Pranav
		 */
		_getResourceFilters: function (aSelectedResources, oSelectedDate) {
			var aResources = [],
				oModel = this.getView().getModel(),
				oViewModel = this.getView().getModel("viewModel");
			var aFilters = [];

			for (var i = 0; i < aSelectedResources.length; i++) {
				var obj = oModel.getProperty(aSelectedResources[i])?oModel.getProperty(aSelectedResources[i]):oViewModel.getProperty(aSelectedResources[i]);
				var sCurrentHierarchyViewType = this.getView().getModel("viewModel").getProperty("/selectedHierarchyView");
				if (obj.NodeType === "RESOURCE" || obj.ObjectType === "RESOURCE") {
					if (obj.ResourceGuid && obj.ResourceGuid !== "") { // This check is required for POOL Node.
						aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGuid + "//" + obj.ResourceGroupGuid));
					} else {
						aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid + "//X"));
					}
				} else if (obj.NodeType === "RES_GROUP") {
					aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGroupGuid));
				} else if (obj.NodeType === sCurrentHierarchyViewType) {
					aResources.push(new Filter("ObjectId", FilterOperator.EQ, obj.ResourceGuid + "//" + obj.ResourceGroupGuid));
				}
			}

			if (aResources.length > 0) {
				aFilters.push(new Filter({
					filters: aResources,
					and: false
				}));
				if (oSelectedDate) {
					aFilters.push(new Filter("DateTo", FilterOperator.GE, oSelectedDate));
					aFilters.push(new Filter("DateFrom", FilterOperator.LE, oSelectedDate.setHours(23, 59, 59, 999)));
				} else {
					aFilters.push(new Filter("DateTo", FilterOperator.GE, this.byId("resourceTreeFilterBar").getControlByKey("StartDate").getDateValue()));
					aFilters.push(new Filter("DateFrom", FilterOperator.LE, this.byId("resourceTreeFilterBar").getControlByKey("EndDate").getDateValue()));
				}

			}
			return aFilters;
		}
	});
});