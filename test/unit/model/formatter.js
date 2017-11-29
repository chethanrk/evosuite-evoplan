sap.ui.define([
		"sap/m/Text",
		"com/evorait/evoplan/model/formatter"
	], function (Text, formatter) {
		"use strict";

		QUnit.module("formatter - Currency value");

		function currencyValueTestCase(assert, sValue, fExpectedNumber) {
			// Act
			var fCurrency = formatter.currencyValue(sValue);

			// Assert
			assert.strictEqual(fCurrency, fExpectedNumber, "The rounding was correct");
		}

		QUnit.test("Should round down a 3 digit number", function (assert) {
			currencyValueTestCase.call(this, assert, "3.123", "3.12");
		});

		QUnit.test("Should round up a 3 digit number", function (assert) {
			currencyValueTestCase.call(this, assert, "3.128", "3.13");
		});

		QUnit.test("Should round a negative number", function (assert) {
			currencyValueTestCase.call(this, assert, "-3", "-3.00");
		});

		QUnit.test("Should round an empty string", function (assert) {
			currencyValueTestCase.call(this, assert, "", "");
		});

		QUnit.test("Should round a zero", function (assert) {
			currencyValueTestCase.call(this, assert, "0", "0.00");
		});

		//*****************************************************************************
		//  statusIcon
		//****************************************************************************/
		QUnit.module("formatter - statusIcon");

		QUnit.test("should return the icon string 'bell' for the INIT status.", function (assert) {
			assert.strictEqual(formatter.statusIcon("INIT"), "bell");
		});

		QUnit.test("should return the icon string 'acitivity-individual' for the RELE status", function (assert) {
			assert.strictEqual(formatter.statusIcon("RELE"), "activity-individual");
		});

		QUnit.test("should return the icon string 'process' for the INPR status", function (assert) {
			assert.strictEqual(formatter.statusIcon("INPR"), "process");
		});
		QUnit.test("should return the icon string 'undo' for the INTM status", function (assert) {
			assert.strictEqual(formatter.statusIcon("INTM"), "undo");
		});
		QUnit.test("should return the icon string 'accept' for the CMPL status", function (assert) {
			assert.strictEqual(formatter.statusIcon("CMPL"), "accept");
		});
		/////////////////////////////////////////////////////////////////////////////*/
		//  END statusIcon
		/////////////////////////////////////////////////////////////////////////////*/

		//*****************************************************************************
		//  getStatusText
		//****************************************************************************/
		QUnit.module("formatter - getStatusText");

		QUnit.test("should translate INIT to 'Open'", function (assert) {
			assert.strictEqual(formatter.getStatusText("INIT"), "Open");
		});
		/////////////////////////////////////////////////////////////////////////////*/
		//  END getStatusText
		/////////////////////////////////////////////////////////////////////////////*/

		//*****************************************************************************
		//  priorityToState
		//****************************************************************************/
		QUnit.module("formatter - priorityToState");

		QUnit.test("should translate P1 to 'Error'", function (assert) {
			assert.strictEqual(formatter.priorityToState("P1"), "Error");
		});

		QUnit.test("should translate undefined to 'None'", function (assert) {
			assert.strictEqual(formatter.priorityToState(), "None");
		});

		QUnit.test("should translate any other value to 'None'", function (assert) {
			assert.strictEqual(formatter.priorityToState("sdfoigjksmdf"), "None");
		});
		/////////////////////////////////////////////////////////////////////////////*/
		//  END priorityToState
		/////////////////////////////////////////////////////////////////////////////*/


	}
);