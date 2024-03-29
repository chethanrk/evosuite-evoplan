sap.ui.define([
	"sap/m/Title",
	"sap/ui/core/Icon",
	"sap/ui/core/IconPool"
], function (Title, Icon, IconPool) {

	var CustomTitle = Title.extend("com.evorait.evoplan.ui.controls.CustomTitle", {
		metadata: {
			properties: {
				/**
				 * Defines the URL for icon display
				 * isCapacityEnabled {String} Is capacitive mode in enable
				 * showCapacity {boolean} false value will hide the worktime information
				 */
				icon: {
					type: "sap.ui.core.URI",
					group: "Appearance",
					defaultValue: "sap-icon://employee"
				},
				isLink: {
					type: "boolean",
					group: "Misc",
					defaultValue: false
				},
				availabilityIcon: {
					type: "sap.ui.core.URI",
					group: "Appearance",
					defaultValue: null
				},
				iconTooltip: {
					type: "string",
					group: "Misc",
					defaultValue: null
				},
				iconColor: {
					type: "sap.ui.core.CSSColor",
					group: "Appearance",
					defaultValue: "orange"
				},
				workTime: {
					type: "string",
					group: "Misc",
					defaultValue: 8
				},
				isWorkTimeEnabled: {
					type: "boolean",
					group: "Misc",
					defaultValue: false
				},
				showWorkTime: {
					type: "boolean",
					group: "Misc",
					defaultValue: false
				},
				enableQualification: {
					type: "boolean",
					group: "Misc",
					defaultValue: false
				},
				highlightColor: {
					type: "string",
					group: "Misc"
				},
				plannerIcon: {
					type: "sap.ui.core.URI",
					group: "Appearance",
					defaultValue: "sap-icon://create-entry-time"
				},
				isPlannerIconVisible: {
					type: "boolean",
					group: "Misc",
					defaultValue: false
				},
				nodeType: {
					type: "string",
					group: "Misc"
				},
				nodeIconColor: {
					type: "string",
					group: "Misc"
				},
				isDuplicate: {
					type: "boolean",
					group: "Misc",
					defaultValue: false
				},
				duplicateColor: {
					type: "sap.ui.core.CSSColor",
					group: "Appearance",
					defaultValue: "orange"
				}
			},
			events: {
				/**
				 * This event is fired when click on title.
				 */
				press: {
					allowPreventDefault: true
				},
				resourceIconPress: {
					allowPreventDefault: true
				},
				plannerIconPress: {
					allowPreventDefault: true
				}
			}
		},

		init: function () {
			this._icon = new Icon({
				tooltip: "{i18n>xtit.clicktosee}",
				press: function (oEvent) {
					this.fireResourceIconPress(oEvent);
				}.bind(this)
			});

			this._plannerIcon = new Icon({
				press: function (oEvent) {
					this.firePlannerIconPress(oEvent);
				}.bind(this)
			});
			this._plannerIcon.addStyleClass("sapUiTinyMarginBegin");
		},

		onAfterRendering: function () {
			if (sap.ui.core.Control.prototype.onAfterRendering) {
				sap.ui.core.Control.prototype.onAfterRendering.apply(this, arguments);
			}
		}

	});

	CustomTitle.prototype.setIcon = function (sUrl) {
		this.setProperty("icon", sUrl);
	};

	CustomTitle.prototype.setIsLink = function (bool) {
		this.setProperty("isLink", bool);
	};

	CustomTitle.prototype._handlePress = function (oEvent) {
		if (this.getIsLink()) {
			oEvent.setMarked();
			if (!this.firePress()) { // fire event and check return value whether default action should be prevented
				oEvent.preventDefault();
			}
		}
	};

	if (sap.ui.Device.support.touch) {
		CustomTitle.prototype.ontap = CustomTitle.prototype._handlePress;
	} else {
		CustomTitle.prototype.onclick = CustomTitle.prototype._handlePress;
	}

	return CustomTitle;
});