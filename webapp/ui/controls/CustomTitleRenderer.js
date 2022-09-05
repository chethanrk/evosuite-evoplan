/*!
 * Custom title for resource tree
 */

// Provides default renderer for control CustomTitle
sap.ui.define([
		"sap/ui/core/Renderer",
		"sap/ui/core/Icon",
		"sap/ui/core/IconPool",
		"sap/base/security/encodeXML"
	],
	function (Renderer, Icon, IconPool, encodeXML) {
		"use strict";

		var CustomTitleRenderer = {};
		CustomTitleRenderer.render = function (oRm, oControl) {

			var oIconInfo = IconPool.getIconInfo(oControl.getIcon());
			var oAvailabilityIcon = IconPool.getIconInfo(oControl.getAvailabilityIcon());
			var oAssoTitle = oControl._getTitle(),
				sLevel = (oAssoTitle ? oAssoTitle.getLevel() : oControl.getLevel()) || sap.ui.core.TitleLevel.Auto,
				bAutoLevel = sLevel === sap.ui.core.TitleLevel.Auto,
				sTag = bAutoLevel ? "div" : sLevel,
				isLink = oControl.getProperty("isLink"),
				titleText = oAssoTitle ? oAssoTitle.getText() : oControl.getText();
			var oResourceIcon = oControl._icon;
			var sHighlightColor = oControl.getHighlightColor();

			var oi18nModel = oControl.getModel("i18n"),
				sPlannerIconTooltip = oi18nModel.getProperty("xtit.singlePlanningCalendar");
			var oPlannerIcon = oControl._plannerIcon;
			oPlannerIcon.setSrc("sap-icon://create-entry-time");
			oPlannerIcon.setTooltip(sPlannerIconTooltip);

			// Setting icon to render which resource we are showing
			oResourceIcon.setSrc(oControl.getIcon() !== "" ? oControl.getIcon() : "sap-icon://employee");

			if ((oControl.getNodeType() === "TIMEYEAR" || oControl.getNodeType() === "TIMEQUART" || oControl.getNodeType() === "TIMEMONTH" ||
					oControl.getNodeType() === "TIMEWEEK") &&
				oControl.getNodeIconColor()) {
				oResourceIcon.setColor(oControl.getNodeIconColor());
			} else {
				oResourceIcon.setColor("");
			}
			oRm.write("<", sTag);
			oRm.writeControlData(oControl);
			oRm.addClass("sapMTitle");
			oRm.addClass("sapMTitleStyle" + (oControl.getTitleStyle() || sap.ui.core.TitleLevel.Auto));
			oRm.addClass("sapMTitleNoWrap");
			oRm.addClass("sapUiSelectable");
			oRm.addClass("TreeTitleBG");

			if (sHighlightColor) {
				oRm.addStyle("background-color", sHighlightColor + "!important");
				oRm.addClass("TreeTitleBG");
			}
			var sWidth = oControl.getWidth();
			if (!sWidth) {
				oRm.addClass("sapMTitleMaxWidth");
			} else {
				oRm.addStyle("width", sWidth);
			}

			var sTextAlign = oControl.getTextAlign();
			if (sTextAlign && sTextAlign !== sap.ui.core.TextAlign.Initial) {
				oRm.addClass("sapMTitleAlign" + sTextAlign);
			}

			if (oControl.getParent() instanceof sap.m.Toolbar) {
				oRm.addClass("sapMTitleTB");
			}

			oRm.writeAttributeEscaped("title", titleText);

			if (bAutoLevel) {
				oRm.writeAttribute("role", "heading");
			}

			//when link mode is set
			if (isLink) {
				oRm.addClass("sapUiLnk");
			}

			oRm.writeClasses();
			oRm.writeStyles();
			oRm.write(">");

			oRm.renderControl(oResourceIcon);

			if (!oControl.getIsWorkTimeEnabled()) {
				// Availability icon
				this.renderAvailabilityIcon(oRm, oIconInfo, oAvailabilityIcon, oControl);
			} else {
				if (oControl.getShowWorkTime()) {
					this.renderWorkTimeInfo(oRm, oControl);
				}
			}

			//when link mode is set
			if (isLink) {
				oRm.write("<a");
				oRm.addClass("sapMLnk");
				oRm.writeClasses();
				oRm.writeAttributeEscaped("title", titleText);
				oRm.addStyle("display", "inline");
				oRm.writeStyles();
				oRm.write(">");
			}

			//title
			oRm.write("<span");
			oRm.writeAttribute("id", oControl.getId() + "-inner");
			oRm.write(">");
			oRm.writeEscaped(titleText);
			oRm.write("</span>");

			//when link mode is set
			if (isLink) {
				oRm.write("</a>");
			}

			//add planner icon next to title
			if (oControl.getIsPlannerIconVisible()) {
				oRm.renderControl(oPlannerIcon);
			}

			oRm.write("</", sTag, ">");
		};

		/**
		 * Create the HTML Content for Availability Icon
		 *
		 * @param oRm Render manager
		 * @param oAvailabilityIcon Availability icon
		 * @param oControl Custom title
		 * @private
		 */
		CustomTitleRenderer.renderAvailabilityIcon = function (oRm, oIconInfo, oAvailabilityIcon, oControl) {
			oRm.write("<span");
			oRm.addClass("sapUiIcon");
			oRm.addClass("sapUiTinyMarginBeginEnd");
			if (oAvailabilityIcon) {
				oRm.writeAttributeEscaped("data-sap-ui-icon-content", oAvailabilityIcon.content);
				if (oIconInfo && oIconInfo.fontFamily) {
					oRm.addStyle("font-family", "'" + encodeXML(oIconInfo.fontFamily) + "'");
				} else if (oAvailabilityIcon.fontFamily) {
					oRm.addStyle("font-family", "'" + encodeXML(oAvailabilityIcon.fontFamily) + "'");
				} else {
					oRm.addStyle("font-family", "'" + encodeXML("SAP-icons") + "'");
				}
				oRm.writeAttributeEscaped("title", oControl.getIconTooltip());
				oRm.addStyle("color", oControl.getIconColor());
			}
			oRm.writeClasses();
			oRm.writeStyles();
			oRm.write("></span>");
		};
		/**
		 * Create the HTML content to show the Work time information
		 * @param oRm Render manager
		 * @param oControl Custom title
		 * @private
		 */
		CustomTitleRenderer.renderWorkTimeInfo = function (oRm, oControl) {
			oRm.write("<div");
			oRm.addClass("worktimeAvailability");
			oRm.addClass("sapUiTinyMarginBegin");
			oRm.writeAttributeEscaped("title", oControl.getIconTooltip());
			oRm.addStyle("background-color", oControl.getIconColor());
			if (oControl.getIconColor() === "") {
				oRm.addStyle("border", "#ccc 1px solid");
			} else {
				oRm.addStyle("border", "none");
			}
			oRm.writeClasses();
			oRm.writeStyles();
			oRm.write(">");
			oRm.write("<span");
			if (oControl.getIconColor() !== "") {
				oRm.addStyle("color", "#ffffff");
			} else {
				oRm.addStyle("color", "#000000");
			}
			oRm.addClass("workTimeAvailabilityText");
			oRm.writeClasses();
			oRm.writeStyles();
			oRm.write(">" + oControl.getWorkTime() + "</span>");
			oRm.write("</div>");
		};

		return CustomTitleRenderer;
	}, true);