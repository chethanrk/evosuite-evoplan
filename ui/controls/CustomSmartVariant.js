sap.ui.define(
    ['sap/ui/comp/smartvariants/SmartVariantManagement'],
    function(SmartVariantManagement) {
        var CustomSmartVariant = SmartVariantManagement.extend("com.evorait.evoplan.ui.controls.CustomSmartVariant",{
            metadata: {
                events: {
                    beforeSave: {}
                }
            },
            renderer: {}
        });

        CustomSmartVariant.prototype.addPersonalizableControl = function (oCurrentControlInfo) {
            var sControlId = oCurrentControlInfo.getControl();
            var oControl = sap.ui.getCore().byId(sControlId);

            if(oControl){
                console.log(oControl);
            }

            SmartVariantManagement.prototype.addPersonalizableControl.apply( this, arguments );
        };

        CustomSmartVariant.prototype._save = function (bNewVariant) {
            this.fireEvent("beforeSave");

            this._addCustomFilterValues();

            SmartVariantManagement.prototype._save.apply( this, arguments );
        };

        CustomSmartVariant.prototype._addCustomFilterValues = function () {

        };

        return CustomSmartVariant;
    }
);