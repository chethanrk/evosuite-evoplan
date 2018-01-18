sap.ui.define(
    ['sap/ui/comp/variants/VariantManagement'],
    function(VariantManagement) {
        var CustomVariantManagement = VariantManagement.extend("com.evorait.evoplan.ui.controls.CustomVariantManagement",{
            metadata: {
                properties: {
                    /**
                     * Key used to access personalization data.
                     */
                    persistencyKey: {
                        type: "string",
                        group: "Misc",
                        defaultValue: null
                    }
                },
                aggregations: {
                    /**
                     * Variant items displayed by the <code>VariantManagement</code> control.
                     * @since 1.26.0
                     */
                    variantItems: {
                        type: "sap.ui.comp.variants.VariantItem",
                        multiple: true,
                        singularName: "variantItem"
                    }
                }
            },
            renderer: function(oRm, oControl) {
                VariantManagement.getMetadata().getRenderer().render(oRm, oControl);
            }
        });

        CustomVariantManagement.addFilterField = function (oControl) {

        };

        return CustomVariantManagement;
    }
);