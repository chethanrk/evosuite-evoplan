sap.ui.define([], function () {
	"use strict";

	var constants = {
		APPLICATION: {
			EVOEQUIP: "EVOEQUIP",
			EVOORDER: "EVOORDER",
			EVOFLOC: "EVOFLOC",
			EVONOTIFY: "EVONOTIFY",
			EVORELATE: "EVORELATE",
			EVORES: "EVORES",
			EVOTIME: "EVOTIME",
			GUI1: "GUI1",
			GUI2: "GUI2"
		},
		PROPERTY: {
			EVOORDER: "ORDERID",
			EVONOTIFY: "NOTIFICATION",
			EVOEQUIP: "EQUIPMENT",
			EVOFLOC: "FUNCTIONAL_LOCATION"
		},
		LAUNCH_MODE: {
			FIORI: "LAUNCHPAD",
			BSP: "BSP",
			ITS: "ITS"
		},
		PLANNINGCAL: {
			ABSENCE: "ABSENCE",
			ASSET_UNAVAILABILITY: "ASSETUA",
			ASSIGNMENTS: "ASSIGNMENT"
		},
		GANTT: {
			NAME: "Gantt",
			SPLIT: "GanttSplit",
			SPLITDMD: "splitDemands"
		},
		MAP: {
			JS_PROVIDERS_PATH: "com/evorait/evoplan/controller/mapProvider/",
			SCHEDULING_JS_PROVIDERS_PATH: "com/evorait/evoplan/controller/scheduling/mapProvider/"
		},
		CRITICALLYSTATES: {
			info: {
				color: "#5E696E",
				state: "Information"
			},
			0: {
				color: "#5E696E",
				state: "None"
			},
			1: {
				color: "#BB0000",
				state: "Error"
			},
			2: {
				color: "#ff0000",
				state: "Error"
			},
			3: {
				color: "#E78C07",
				state: "Warning"
			},
			4: {
				color: "#2B7D2B",
				state: "Success"
			},
			5: {
				color: "#00ff00",
				state: "Success"
			}
		},
		ORIGIN: {
			HOME: "Home",
			RESOURCE_TREE: "ResourceTree",
			DEMAND_DETAILS: "DemandDetails",
			GANTT_DEMAND: "GanttDemand",
			GANTTSPLIT: "GantSplit",
			PLANNING_CALENDER: "PlanningCalender",
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
			NETWORK_QUALIFIER: "NetworkAssignmentDialog",
			GANTT_POP_OVER_QUALIFIER: "GanttAssignmentPopOver",
			MAP_DEMAND_PIN: "MapDemandPin",
			PRT_TOOLS_ASSIGN_DIALOG: "ToolAssignmentDialogResource"
		},
		SCHEDULING: {
			AUTOSCHEDULING: "AutoScheduling",
			RESCHEDULING: "ReScheduling"
		},
		DATEFORMATS: {
			1: "dd.MM.YYYY",
			2: "MM/dd/YYYY",
			3: "MM-dd-YYYY",
			4: "YYYY.MM.dd",
			5: "YYYY/MM/dd",
			6: "YYYY-MM-dd",
			7: "GYY.MM.dd",
			8: "GYY/MM/dd",
			9: "GYY-MM-dd",
			A: "YYYY/MM/dd",
			B: "YYYY/MM/dd",
			C: "YYYY/MM/dd"
		},
		TIMEFORMATS: {
			0: "HH:mm:ss",
			1: "KK:mm:ss a",
			2: "KK:mm:ss a",
			3: "KK:mm:ss a",
			4: "KK:mm:ss a"
		}
	};

	return constants;

});