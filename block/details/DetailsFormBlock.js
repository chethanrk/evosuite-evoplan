sap.ui.define(["sap/uxap/BlockBase"], function (BlockBase) {
	"use strict";
	var myBlock = BlockBase.extend("com.evorait.evoplan.block.details.DetailsFormBlock", {
		metadata: {
			events: {
				"editPress": {}
			},
			views: {
				Collapsed: {
					viewName: "com.evorait.evoplan.block.details.DetailsFormBlock",
					type: "XML"
				},
				Expanded: {
					viewName: "com.evorait.evoplan.block.details.DetailsFormBlock",
					type: "XML"
				}
			}
		}
	});
	return myBlock;
}, true);