sap.ui.define(["sap/uxap/BlockBase"], function (BlockBase) {
	"use strict";
	var myBlock = BlockBase.extend("com.evorait.evoplan.block.sections.AssignmentBlock", {
		metadata: {
			events: {
				onRowClick: {}
			}
		}
	});
	return myBlock;
}, true);