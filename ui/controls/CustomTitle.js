sap.ui.define([
    "sap/m/Title",
    "sap/ui/core/Icon",
    "sap/ui/core/IconPool"
], function(Title, Icon, IconPool) {

    var CustomTitle = Title.extend("com.evorait.evoplan.ui.controls.CustomTitle",{
        metadata: {
            properties: {
                /**
                 * Defines the URL for icon display
                 */
                icon : {type : "sap.ui.core.URI", group : "Appearance", defaultValue : null}
            }
        },
        renderer: function(oRm, oControl){
            //sap.m.TitleRenderer.render(oRm, oControl);
            var oIconInfo = IconPool.getIconInfo(oControl.getIcon());
            var oAssoTitle = oControl._getTitle(),
                sLevel = (oAssoTitle ? oAssoTitle.getLevel() : oControl.getLevel()) || sap.ui.core.TitleLevel.Auto,
                bAutoLevel = sLevel == sap.ui.core.TitleLevel.Auto,
                sTag = bAutoLevel ? "div" : sLevel;

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

            var sTooltip = oAssoTitle ? oAssoTitle.getTooltip_AsString() : oControl.getTooltip_AsString();
            if (sTooltip) {
                oRm.writeAttributeEscaped("title", sTooltip);
            }

            if (bAutoLevel) {
                oRm.writeAttribute("role", "heading");
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
            }
            if (oIconInfo && !oIconInfo.suppressMirroring) {
                oRm.addClass("sapUiIconMirrorInRTL");
            }

            oRm.writeClasses();
            oRm.writeStyles();
            oRm.write("></span>");

            //title
            oRm.write("<span");
            oRm.writeAttribute("id", oControl.getId() + "-inner");
            oRm.write(">");
            oRm.writeEscaped(oAssoTitle ? oAssoTitle.getText() : oControl.getText());
            oRm.write("</span></", sTag, ">");
        }
    });

    CustomTitle.prototype.setIcon = function(sUrl){
        this.setProperty("icon", sUrl);
    };

    return CustomTitle;
});