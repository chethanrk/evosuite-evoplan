sap.ui.define([], function () {
	"use strict";

	var constants = {
		APPLICATION:{
			EVOPLAN:"EVOPLAN",
			EVOORDER:"EVOORDER"
		},
		LAUNCH_MODE:{
			FIORI:"LAUNCHPAD",
			BSP:"BSP"
		},
		PLANNINGCAL:{
			ABSENCE:"ABSENCE",
			ASSET_UNAVAILABILITY:"ASSETUA",
			ASSIGNMENTS:"ASSIGNMENT"
		},
		GANTT:{
			NAME:"Gantt",
			SPLIT:"GanttSplit",
			SPLITDMD:"splitDemands"
		},
		MAP: {
			JS_PROVIDERS_PATH: "com/evorait/evoplan/controller/map/"
		},
		CRITICALLYSTATES: {
			"info": {
				color: "#5E696E",
				state: "Information"
			},
			"0": {
				color: "#5E696E",
				state: "None"
			},
			"1": {
				color: "#BB0000",
				state: "Error"
			},
			"2": {
				color: "#ff0000",
				state: "Error"
			},
			"3": {
				color: "#E78C07",
				state: "Warning"
			},
			"4": {
				color: "#2B7D2B",
				state: "Success"
			},
			"5": {
				color: "#00ff00",
				state: "Success"
			}
		},
		ORIGIN: {
			HOME: "Home",
			RESOURCE_TREE: "ResourceTree",
			DEMAND_DETAILS: "DemandDetails",
			GANTT_DEMAND:"GanttDemand",
			GANTTSPLIT:"GantSplit",
			PLANNING_CALENDER:"PlanningCalender",
			RESOURCE_QUALIFICATION: "ResourcQualification",
			ASSET: "Asset",
			DETAIL: "Detail",
			GANTT: "Gantt",
			MAP: "Map",
			DEMAND_SPLIT: "DemandSplit",
			MANAGE_RESOURCE: "ManageResource",
			MANAGERESOURCE_REMOVEASSIGNMENTS: "ManageResourceRemoveAssignments",
			NEWGANTT: "NewGantt"
		},
		ANNOTATION_CONSTANTS: {
			NOTIFICATION_OBJECTSOURCETYPE: "DEM_PMNO",
			NOTIFICATION_QUALIFIER: "NotificationAssignmentDialog",
			ORDER_QUALIFIER: "OrderAssignmentDialog",
			NETWORK_OBJECTSOURCETYPE: "DEM_PSNW",
			NETWORK_QUALIFIER: "NetworkAssignmentDialog"
		}
	};

	return constants;

});