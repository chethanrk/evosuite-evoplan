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
                    defaultValue: null
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
				isWorkTimeEnabled:{
                    type: "boolean",
                    group: "Misc",
                    defaultValue: false
				},
				showWorkTime: {
                    type: "boolean",
                    group: "Misc",
                    defaultValue: false
				}
            },
            events: {
                /**
                 * This event is fired when click on title.
                 */
                press: {
                    allowPreventDefault: true
                }
            }
        },
        renderer: function (oRm, oControl) {
            var oIconInfo = IconPool.getIconInfo(oControl.getIcon());
            var oAvailabilityIcon = IconPool.getIconInfo(oControl.getAvailabilityIcon());
            var oAssoTitle = oControl._getTitle(),
                sLevel = (oAssoTitle ? oAssoTitle.getLevel() : oControl.getLevel()) || sap.ui.core.TitleLevel.Auto,
                bAutoLevel = sLevel == sap.ui.core.TitleLevel.Auto,
                sTag = bAutoLevel ? "div" : sLevel,
                isLink = oControl.getProperty("isLink"),
                titleText = oAssoTitle ? oAssoTitle.getText() : oControl.getText();

            oRm.write("<", sTag);
            oRm.writeControlData(oControl);
            oRm.addClass("sapMTitle");
            oRm.addClass("sapMTitleStyle" + (oControl.getTitleStyle() || sap.ui.core.TitleLevel.Auto));
            oRm.addClass("sapMTitleNoWrap");
            oRm.addClass("sapUiSelectable");

            var sWidth = oControl.getWidth();
            if (!sWidth) {
                oRm.addClass("sapMTitleMaxWidth");
            } else {
                oRm.addStyle("width", sWidth);
            }

            var sTextAlign = oControl.getTextAlign();
            if (sTextAlign && sTextAlign != sap.ui.core.TextAlign.Initial) {
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

            //icon
            oRm.write("<span");
            oRm.addClass("sapUiIcon");
            oRm.addClass("sapUiTinyMarginEnd");

            if (oIconInfo) {
                oRm.writeAttributeEscaped("data-sap-ui-icon-content", oIconInfo.content);
                oRm.addStyle("font-family", "'" + jQuery.sap.encodeHTML(oIconInfo.fontFamily) + "'");
                if (oIconInfo && !oIconInfo.suppressMirroring) {
                    oRm.addClass("sapUiIconMirrorInRTL");
                }
                oRm.writeClasses();
                oRm.writeStyles();
                oRm.write(">");

                if(!oControl.getIsWorkTimeEnabled()) {
                    // Availability icon
                    oControl._renderAvailabilityIcon(oRm, oIconInfo, oAvailabilityIcon,oControl);
                }else {
                	if(oControl.getShowWorkTime()){
                	    oControl._renderWorkTimeInfo(oRm, oControl);
                    }
                }
            }
            oRm.write("</span>");

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

            oRm.write("</", sTag, ">");
        },
        /**
         * Create the HTML Content for Availability Icon
         *
         * @param oRm Render manager
         * @param oAvailabilityIcon Availability icon
         * @param oControl Custom title
         * @private
         */
        _renderAvailabilityIcon : function (oRm, oIconInfo, oAvailabilityIcon, oControl) {
            oRm.write("<span");
            oRm.addClass("sapUiIcon");
            oRm.addClass("sapUiTinyMarginBegin");
            if (oAvailabilityIcon) {
                oRm.writeAttributeEscaped("data-sap-ui-icon-content", oAvailabilityIcon.content);
                oRm.addStyle("font-family", "'" + jQuery.sap.encodeHTML(oIconInfo.fontFamily) + "'");
                oRm.writeAttributeEscaped("title", oControl.getIconTooltip());
                oRm.addStyle("color", oControl.getIconColor());
            }
            oRm.writeClasses();
            oRm.writeStyles();
            oRm.write("></span>");
        },
        /**
         * Create the HTML content to show the Work time information
         * @param oRm Render manager
         * @param oControl Custom title
         * @private
         */
        _renderWorkTimeInfo : function (oRm, oControl) {
            oRm.write("<div");
            oRm.addClass("worktimeAvailability");
            oRm.addClass("sapUiTinyMarginBegin");
            oRm.addStyle("display", "inline-block");
            oRm.writeAttributeEscaped("title", oControl.getIconTooltip());
            oRm.addStyle("background-color", oControl.getIconColor());
            if(oControl.getIconColor() === ""){
                oRm.addStyle("border", "#ccc 1px solid");
            }else{
                oRm.addStyle("border", "none");
            }
            oRm.writeClasses();
            oRm.writeStyles();
            oRm.write(">");
            oRm.write("<span");
            if(oControl.getIconColor() !== ""){
                oRm.addStyle("color", "#ffffff");
            }else{
                oRm.addStyle("color", "#000000");
            }
            oRm.addClass("workTimeAvailabilityText");
            oRm.writeClasses();
            oRm.writeStyles();
            oRm.write(">"+oControl.getWorkTime()+"</span>");
            oRm.write("</div>");
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