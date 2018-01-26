sap.ui.define([
    "sap/ui/comp/smartvariants/SmartVariantManagement",
    "sap/ui/fl/Persistence",
    "sap/m/Token",
    "sap/ui/core/format/DateFormat"
    ], function(SmartVariantManagement, Persistence, Token, DateFormat) {

        var CustomVariantManagement = SmartVariantManagement.extend("com.evorait.evoplan.ui.controls.CustomVariantManagement",{
            metadata: {
                properties: {
                    /**
                     * Key used to access personalization data.
                     */
                    persistencyKey: {
                        type: "string",
                        group: "Misc",
                        defaultValue: null
                    },
                    entitySet: {
                        type: "string",
                        group: "Misc",
                        defaultValue: null
                    }
                },
                events: {
                    /**
                     * This event is fired when the VariantManagement control is initialized.
                     */
                    initialise: {}
                }
            },
            renderer: {}
        });

        /**
         * init standard variant managment
         * with additional global parameters
         */
        CustomVariantManagement.prototype.init = function() {
            SmartVariantManagement.prototype.init.apply( this, arguments );

            this.aFilterControls = [];
            this._oVariant = {};
        };

        /**
         * @param fCallback
         * @param oPersoControl
         */
        CustomVariantManagement.prototype.initialise = function(mVariants) {
            var oDefaultContent, that = this, sKey, bFlag, parameter = {
                variantKeys: []
            };

            try {
                if (this._oControlPromise) {
                    this._oControlPromise.then(function(mVariants) {
                        if (that._bIsBeingDestroyed) {
                            return;
                        }

                        if (!that._bIsInitialized) {
                            that._bIsInitialized = true;
                            parameter.variantKeys = that._createVariantEntries(mVariants);

                            bFlag = that._getExecuteOnSelectOnStandardVariant();
                            if (bFlag !== null) {
                                that._executeOnSelectForStandardVariantByUser(bFlag);
                            }

                            sKey = that._getDefaultVariantKey();
                            if (sKey) {
                                oDefaultContent = that._getChangeContent(sKey);
                                if (oDefaultContent) {
                                    that.setDefaultVariantKey(sKey); // set the default variant
                                    that.setInitialSelectionKey(sKey); // set the current selected variant
                                }
                            }

                            if (that.getStandardVariantKey() === sKey) {
                                //set standard variant content global
                                that._setStandardVariant(oDefaultContent);
                            }

                        }
                        that._initialize(parameter);

                    }, function(args) {
                        var sError = "'getChanges' failed:";
                        if (args && args.message) {
                            sError += (' ' + args.messages);
                        }

                        that._errorHandling(sError);
                    });

                } else {
                    this._errorHandling("'initialise' no personalizable component available");
                }

            } catch (ex) {
                this._errorHandling("'getChanges' throws an exception");
            }
        };

        /**
         * Eventhandler for the save event of the <code>SmartVariantManagement</code> control.
         * @param {object} oVariantInfo Describes the variant to be saved
         */
        CustomVariantManagement.prototype.fireSave = function(oVariantInfo) {
            var bSave = false, bNewVariant = true;
            var oEvent = {};

            if (oVariantInfo) {
                if (oVariantInfo.hasOwnProperty("tile")) {
                    oEvent.tile = oVariantInfo.tile;
                }

                if (oVariantInfo.overwrite) {
                    if (this._isIndustrySolutionModeAndVendorLayer() || (oVariantInfo.key !== this.getStandardVariantKey())) { // Prohibit save on
                        // standard variant
                        this.fireEvent("save", oEvent);

                        if (oVariantInfo.key === this.STANDARDVARIANTKEY) {
                            this._newVariant(oVariantInfo);
                        } else {
                            this._updateVariant(oVariantInfo);
                            bNewVariant = false;
                        }
                        bSave = true;
                    }
                } else {
                    this.fireEvent("save", oEvent);
                    this._newVariant(oVariantInfo);
                    bSave = true;
                }

                if (bSave) {
                    this._save(bNewVariant);
                }
            }
        };



        /**
         * public function
         * add filter controls to array
         * @param oControl
         */
        CustomVariantManagement.prototype.addFilter = function (oControl) {
            this.aFilterControls.push(oControl);
        };


        /**
         * create persitency of this variant management
         * @param oControl
         * @private
         */
        CustomVariantManagement.prototype._addPersistenceController = function(oControl) {
            if (oControl) {
                this._oPersoControl = oControl;
                this._oControlPersistence = new Persistence(oControl, "persistencyKey");
                this._handleGetChanges(oControl);
            }
        };

        /**
         * set persistency key of control
         * @param sKey
         */
        CustomVariantManagement.prototype.setPersistencyKey = function (sKey) {
            this.setProperty("persistencyKey", sKey);
            this._addPersistenceController(this);
        };

        /**
         * set entitySet
         * @param sKey
         */
        CustomVariantManagement.prototype.setEntitySet = function (sKey) {
            this.setProperty("entitySet", sKey);
        };


        CustomVariantManagement.prototype._initialize = function(parameter) {
            var sKey, oContent = null;
            sKey = this.getSelectionKey();

            if (sKey && (sKey !== this.getStandardVariantKey())) {
                oContent = this._getChangeContent(sKey);
            } else if (this._oAppStdContent) {
                oContent = this._oAppStdContent;
            }


            oContent = this._fetchVariant();
            if (oContent) {
                oContent = jQuery.extend(true, {}, oContent);
            }

            if (oContent) {
                //init apply
                this._applyControlVariant(oContent, true);
            }

            this.fireEvent("initialise", parameter);
        };

        CustomVariantManagement.prototype._setStandardVariant = function(oContent) {
            if(!oContent){
                oContent = this._fetchVariant();
            }
            if (oContent) {
                this._oAppStdContent = jQuery.extend(true, {}, oContent);
            }
        };

        CustomVariantManagement.prototype._getStandardVariant = function() {
            return this._oAppStdContent;
        };

        CustomVariantManagement.prototype._triggerSelectVariant = function(sVariantKey, sContext) {
            var oContent, oHandler = this._checkForSelectionHandler(sVariantKey);

            if (oHandler) {
                oContent = this._triggerSpecialSelectVariant(sVariantKey, sContext, oHandler);
            } else {
                oContent = this._triggerGeneralSelectVariant(sVariantKey, sContext);
            }

            if(this.getStandardVariantKey() === sVariantKey){
                oContent = this._getStandardVariant();
            }
            if(oContent){
                this._applyControlVariant(oContent, false);
            }
        };

        CustomVariantManagement.prototype._applyControlVariant = function (oContent, bInitial) {
            var aFilterInfo = oContent.filterbar || {};
            var oFilterData = null;

            try{
                oFilterData = JSON.parse(oContent.filterBarVariant);
            }catch(e){}

            if(oFilterData){
                for (var i = 0; i < aFilterInfo.length; i++) {
                    this._applyFilterContent(aFilterInfo[i], oFilterData);
                }
            }
        };

        CustomVariantManagement.prototype._applyFilterContent = function (oFilterInfo, oFilterData) {
            for (var j = 0; j < this.aFilterControls.length; j++) {
                var oControl = this.aFilterControls[j];

                if(oControl){
                    var oControlName = this._getControlName(oControl);
                    if(oControlName === oFilterInfo.name){
                        var oFilter = oFilterData[oControlName];

                        try{
                            oControl.setEnabled(oFilterInfo.enabled);
                        }catch(e){};

                        if(oFilter){
                            this._setFilterValues(oControl, oFilter.value, oFilterInfo.type);
                        }
                    }
                }
            }
        };

        CustomVariantManagement.prototype._newVariant = function(oVariantInfo) {
            var sId, oContent, oChange, bIsStandardVariant = false;

            if (oVariantInfo && this._oControlPersistence) {
                var oTypeDataSource = {
                    type: "page",
                    dataService: this.getEntitySet()
                };
                var bUserDependent = !oVariantInfo.global;
                var sPackage = oVariantInfo.lifecyclePackage || "" ;
                var sTransportId = oVariantInfo.lifecycleTransportId || "";

                sId = this._oControlPersistence.isVariantDownport() ? oVariantInfo.key : null;
                if (this._isIndustrySolutionModeAndVendorLayer() && (this.getStandardVariantKey() === this.STANDARDVARIANTKEY)) {
                    if (sTransportId && (oVariantInfo.name === this.oResourceBundle.getText("VARIANT_MANAGEMENT_STANDARD"))) {
                        this.setStandardVariantKey(sId);
                        bIsStandardVariant = true;
                    }
                }

                oContent = this._fetchVariant();
                if (oContent) {
                    oContent = jQuery.extend(true, {}, oContent);
                }
                if (oContent) {
                    oContent.version = "V2";

                    if (oVariantInfo.exe) {
                        oContent.executeOnSelection = oVariantInfo.exe;
                    }
                    if (oVariantInfo.tile) {
                        oContent.tile = oVariantInfo.tile;
                    }

                    if (oContent.standardvariant !== undefined) {
                        delete oContent.standardvariant;
                    }
                    if (bIsStandardVariant) {
                        oContent.standardvariant = true;
                    }
                }

                var mParams = {
                    type: oTypeDataSource.type,
                    ODataService: oTypeDataSource.dataService,
                    texts: {
                        variantName: oVariantInfo.name
                    },
                    content: oContent,
                    isVariant: true,
                    packageName: sPackage,
                    isUserDependent: bUserDependent,
                    id: sId
                };

                sId = this._oControlPersistence.addChange(mParams);
                this.replaceKey(oVariantInfo.key, sId);
                this.setInitialSelectionKey(sId);

                if (this._isIndustrySolutionModeAndVendorLayer() && ((oVariantInfo.key === this.STANDARDVARIANTKEY) || this._isVariantDownport())) {
                    this.setStandardVariantKey(sId);
                }

                oChange = this._getChange(sId);
                if (oChange) {
                    oChange.setRequest(sTransportId);

                    var oItem = this.getItemByKey(sId);
                    if (oItem) {
                        oItem.setNamespace(oChange.getNamespace());
                    }
                }

                if (oVariantInfo.def === true) {
                    this._oControlPersistence.setDefaultVariantIdSync(sId);
                }
            }
        };

        CustomVariantManagement.prototype._updateVariant = function(oVariantInfo) {
            if(!oVariantInfo){
                return;
            }

            if (this._isIndustrySolutionModeAndVendorLayer() || oVariantInfo.key !== this.getStandardVariantKey()) {
                var oChange = this._getChange(oVariantInfo.key);

                if (oVariantInfo && oChange) {
                    oChange.setRequest(oVariantInfo.lifecycleTransportId);
                }

                var oContent = this._fetchVariant();
                if (oContent) {
                    oContent = jQuery.extend(true, {}, oContent);
                }

                if (oContent && oChange) {
                    oContent.version = "V2";
                    var oItem = this.getItemByKey(oVariantInfo.key);
                    if (oItem) {
                        oContent.executeOnSelection = oItem.getExecuteOnSelection();
                    }

                    if (oContent.standardvariant !== undefined) {
                        delete oContent.standardvariant;
                    }

                    if (this._isIndustrySolutionModeAndVendorLayer() && (oVariantInfo.key === this.getStandardVariantKey())) {
                        oContent.standardvariant = true;
                    }
                    oChange.setContent(oContent);
                }
            }
        };

        CustomVariantManagement.prototype._save = function (bNewVariant) {
            SmartVariantManagement.prototype._save.apply(this, arguments);
        };

        CustomVariantManagement.prototype._fetchVariant = function () {
            var aFiltersInfo = [], oVariant = {}, oFiltersData = {};

            for (var i = 0; i < this.aFilterControls.length; i++) {
                var oControl = this.aFilterControls[i];
                if(oControl){
                    var oControlData = this._getFilterData(oControl);
                    var oControlInfo = this._getFilterInfos(oControl, oControlData.type);
                    aFiltersInfo.push(oControlInfo);
                    oFiltersData[oControlInfo.name] = { value: oControlData.value || "" };
                }
            }

            oVariant.version = "V2";
            oVariant.filterbar = aFiltersInfo;
            oVariant.filterBarVariant = JSON.stringify(oFiltersData);

            if (this._oVariant && this._oVariant.content) {
                this._oVariant.content = oVariant;
            }
            return oVariant;
        };

        /**
         * get filter value and type
         * @param oControl
         * @returns {{value: string, type: string}}
         * @private
         */
        CustomVariantManagement.prototype._getFilterData = function (oControl) {
            var sValue = "", sType = "";

            try{
                sValue = oControl.getValue();
                sType = "Text"
            }catch (e){}
            try{
                sValue = oControl.getDateValue();
                sType = "Date"
            }catch (e){}
            try{
                sValue = oControl.getKey();
                sType = "Key"
            }catch (e){}
            try{
                var items = oControl.getItems();
                for (var i = 0; i < items.length; i++) {
                    if(items[i].getSelected()){
                        sValue = items[i].getKey();
                        sType = "ItemsKey";
                        break;
                    }
                }
            }catch (e){}
            try{
                var items = oControl.getTokens();
                sType = "Token";
                sValue = [];
                for (var j = 0; j < items.length; j++) {
                    sValue.push(items[j].getKey());
                }
            }catch (e){}

            return {
                value: sValue,
                type: sType
            }
        };

        /**
         * get common filter input information like enabled, type ect.
         * @param oControl
         * @param type
         * @returns {{name, type: *|string, partOfCurrentVariant: boolean, enabled: boolean}}
         * @private
         */
        CustomVariantManagement.prototype._getFilterInfos = function (oControl, type) {
            var oFilter = {
                name: this._getControlName(oControl),
                type: type || "",
                partOfCurrentVariant: true,
                enabled: true
            };
            try{
                if(!type || type === ""){
                    oFilter.type = oControl.getType();
                }
            }catch (e){}
            try{
                oFilter.enabled = oControl.getEnabled();
            }catch (e){}
            return oFilter;
        };

        /**
         *
         * @param oControl
         * @private
         */
        CustomVariantManagement.prototype._handleGetChanges = function(oControl) {
            var that = this;
            if (oControl && this._oControlPersistence) {
                this._oControlPromise = {};
                this._oControlPromise = new Promise(function(resolve, reject) {
                    that._oControlPersistence.getChanges().then(function(mVariants) {
                        resolve(mVariants);
                        that.initialise();
                    }, function(args) {
                        reject(args);
                    });

                });
            }
        };

        /**
         *
         * @param sErrorText
         * @param fCallback
         * @param oPersoControl
         * @private
         */
        CustomVariantManagement.prototype._errorHandling = function(sErrorText, fCallback, oPersoControl) {
            var parameter = {
                variantKeys: []
            };

            this._setErrorValueState(this.oResourceBundle.getText("VARIANT_MANAGEMENT_READ_FAILED"), sErrorText);

            if (fCallback && oPersoControl) {
                fCallback.call(oPersoControl);
            } else {
                this.fireEvent("initialise", parameter);
            }

            if (oPersoControl.variantsInitialized) {
                oPersoControl.variantsInitialized();
            }
        };

        /**
         * gets name or id of added filter control
         * @param oControl
         * @private
         */
        CustomVariantManagement.prototype._getControlName = function (oControl) {
            var name = oControl.getId();
            try{
                name = oControl.getName();
                if(!name || name === ""){
                    name = oControl.getId();
                }
            }catch (e){}
            return name;
        };

        CustomVariantManagement.prototype._setFilterValues = function (oControl, sValue, sType) {
            switch(sType){
                case "Text":
                    this._setControlText(oControl, sValue);
                    break;

                case "Date":
                    this._setControlDate(oControl, sValue);
                    break;

                case "Key":
                    this._setControlKey(oControl, sValue);
                    break;

                case "ItemsKey":
                    this._setControlItemsKey(oControl, sValue);
                    break;

                case "Token":
                    this._setControlToken(oControl, sValue);
                    break;
            }
        };

        CustomVariantManagement.prototype._setControlText = function (oControl, sValue) {
            try{
                oControl.setValue(sValue);
            }catch(e){
                console.error("setValue in _setControlText not working!");
            };
        };

        CustomVariantManagement.prototype._setControlDate = function (oControl, sValue) {
            try{
                var oDateFormat = DateFormat.getDateTimeInstance({pattern: "YYYY-MM-dd"});
                var d = oDateFormat.format(new Date(sValue));
                if(d){
                    oControl.setValue(d);
                }
            }catch(e){
                console.error("setValue in _setControlDate not working!");
            };
        };

        CustomVariantManagement.prototype._setControlKey = function (oControl, sValue) {
            try{
                oControl.setKey(sValue);
            }catch(e){
                console.error("setKey in _setControlKey not working!");
            }
        };

        /**
         * set key of filter groups like radio button
         * @param oControl
         * @param sValue
         * @private
         */
        CustomVariantManagement.prototype._setControlItemsKey = function (oControl, sValue) {
            try{
                var items = oControl.getItems();
                for (var k = 0; k < items.length; k++) {
                    if(items[k].getKey() === sValue){
                        items[k].setSelected(true);
                    }else{
                        items[k].setSelected(false);
                    }
                }
            }catch(e){
                console.error("set itemsKey in _setControlItemsKey not working!");
            };
        };

        /**
         * sets token for multiInput
         * @param oControl
         * @param aValues
         * @private
         */
        CustomVariantManagement.prototype._setControlToken = function(oControl, aValues){
            try{
                var aTokens = [];
                oControl.removeAllTokens();
                if(aValues instanceof Array){
                    for (var l = 0; l < aValues.length; l++) {
                        aTokens.push(new Token({key: aValues[l], text: aValues[l]}));
                    }
                    oControl.setTokens(aTokens);
                }
            }catch(e){
                console.error("set token in _setControlToken not working!");
            };
        };

        CustomVariantManagement.prototype.exit = function() {
            SmartVariantManagement.prototype.exit.apply(this, arguments);

            this.aFilterControls = [];
            this._oVariant = {};
        };

        return CustomVariantManagement;
    }
);