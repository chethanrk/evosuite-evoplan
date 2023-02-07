sap.ui.define(["sap/ui/core/ComponentContainer", "sap/base/util/UriParameters"], function(ComponentContainer, UriParameters) {

    // Fetching Url parameters and setting as componentData
    var mParams = UriParameters.fromQuery(window.location.search),
        aKeys = Array.from(mParams.keys()),
        oStartupParameters = {};

    aKeys.forEach(function(sKey){
        oStartupParameters[sKey] = [mParams.get(sKey)];
    });

    sap.ui.component({
        name: "com.evorait.evoplan",
        async: true,
        settings: {
            componentData: { startupParameters: oStartupParameters }
        }
    }).then(function(oComponent) {
        new ComponentContainer({
            component: oComponent,
            height: "100%",
            width: "100%"
        }).placeAt("content");
    });

});