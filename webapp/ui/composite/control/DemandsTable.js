sap.ui.define([
    "sap/ui/core/XMLComposite"], 
    function( XMLComposite ) {
    "use strict";
    var DemandsTable = XMLComposite.extend("com.evorait.evoplan.ui.composite.control.DemandsTable", {
        metadata: {
            properties: {
                header: { type: "boolean", defaultValue: "false"}
            }
        }
    });
    return DemandsTable;
}, /* bExport= */true);