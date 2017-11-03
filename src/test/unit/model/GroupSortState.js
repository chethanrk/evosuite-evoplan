sap.ui.define([
		"com/evorait/evoplan/model/GroupSortState",
		"sap/ui/model/json/JSONModel"
	], function (GroupSortState, JSONModel) {
	"use strict";

	QUnit.module("GroupSortState - grouping and sorting", {
		beforeEach: function () {
			this.oModel = new JSONModel({});
			// System under test
			this.oGroupSortState = new GroupSortState(this.oModel, function() {});
		}
	});

	QUnit.test("Should always return a sorter when sorting", function (assert) {
		// Act + Assert
		assert.strictEqual(this.oGroupSortState.sort("MaintObjectDowntimeDuration").length, 1, "The sorting by MaintObjectDowntimeDuration returned a sorter");
		assert.strictEqual(this.oGroupSortState.sort("WorkOrder").length, 1, "The sorting by WorkOrder returned a sorter");
	});

	QUnit.test("Should return a grouper when grouping", function (assert) {
		// Act + Assert
		assert.strictEqual(this.oGroupSortState.group("MaintObjectDowntimeDuration").length, 1, "The group by MaintObjectDowntimeDuration returned a sorter");
		assert.strictEqual(this.oGroupSortState.group("None").length, 0, "The sorting by None returned no sorter");
	});


	QUnit.test("Should set the sorting to MaintObjectDowntimeDuration if the user groupes by MaintObjectDowntimeDuration", function (assert) {
		// Act + Assert
		this.oGroupSortState.group("MaintObjectDowntimeDuration");
		assert.strictEqual(this.oModel.getProperty("/sortBy"), "MaintObjectDowntimeDuration", "The sorting is the same as the grouping");
	});

	QUnit.test("Should set the grouping to None if the user sorts by WorkOrder and there was a grouping before", function (assert) {
		// Arrange
		this.oModel.setProperty("/groupBy", "MaintObjectDowntimeDuration");

		this.oGroupSortState.sort("WorkOrder");

		// Assert
		assert.strictEqual(this.oModel.getProperty("/groupBy"), "None", "The grouping got reset");
	});
});