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
		_gethiddenDivPosition: function (oSpotPosition, oView) {
			var div = document.getElementById("idDivRightClick");
			//Condition check if div is availabel then change only the position 
			if (div) {
				div.style.top = oSpotPosition[1] + "px";
				div.style.left = (parseInt(oSpotPosition[0]) + 10) + "px";
			} else {
				// Creating new div in case div is getting created first time
				div = document.createElement("div");
				div.id = "idDivRightClick";
				div.style.position = "absolute";
				div.style.top = oSpotPosition[1] + "px";
				div.style.left = (parseInt(oSpotPosition[0]) + 10) + "px";
				var oGeoMapContainer = oView.byId("idMapContainer");
				var oGeoMapContainerDOM = oGeoMapContainer.getDomRef();
				oGeoMapContainerDOM.appendChild(div);
			}
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
		},
		
		/**
		 * Get Date filters from a ResourceHierarchy instance.
		 * The method returns filters from 0:00 of StartDate till 23:59 of EndDate
		 * @param {object} oResourceHierarchy - ResourceHierarchy instance. It supposed that the object represents daily or weekly node.
		 * @param {Date} [oSelectedDate] - date to get assignments for. If not specified, StartDate and EndDate of oResourceHierarchy are used.
		 * @return {sap.ui.model.Filter[]} - array of filters
		 */
		getAssignmentsFiltersWithinDateFrame: function(oResourceHierarchy, oSelectedDate) {
			
			var fnGetMsSinceMidnight = function(oDate) {
				return oDate.getUTCHours() * 3600000 + oDate.getUTCMinutes() * 60000 + oDate.getUTCSeconds() * 1000 + oDate.getUTCMilliseconds();
			};
			
			var aFilters = [];
			var oDateFrom,
				oDateTo;
			
			if(oSelectedDate) {
				oDateFrom = _.cloneDeep(oSelectedDate);
				oDateTo = _.cloneDeep(oSelectedDate);
			} else {
				oDateFrom = _.cloneDeep(oResourceHierarchy.StartDate);
				oDateTo = _.cloneDeep(oResourceHierarchy.EndDate);
			}
			
			oDateFrom.setHours(0, 0, 0, 0);
			oDateTo.setHours(23, 59, 59, 999);
			
			var oTimeFrom = {
				__edmtype: "Edm.Time",
				ms: fnGetMsSinceMidnight(oDateFrom)
			};
			var oTimeTo = {
				__edmtype: "Edm.Time",
				ms: fnGetMsSinceMidnight(oDateTo)
			};
			
			aFilters.push(new Filter("DateFrom", FilterOperator.GE, oDateFrom));
			aFilters.push(new Filter("DateTo", FilterOperator.LE, oDateTo));
			aFilters.push(new Filter("TimeFrom", FilterOperator.GE, oTimeFrom));
			aFilters.push(new Filter("TimeTo", FilterOperator.LE, oTimeTo));
			aFilters.push(new Filter("ObjectId", FilterOperator.EQ, oResourceHierarchy.ResourceGuid + "//" + oResourceHierarchy.ResourceGroupGuid));
			// aFilters.push(new Filter("ResourceGuid", FilterOperator.EQ, oResourceHierarchy.ResourceGuid));
			
			return aFilters;
		}
	});
});