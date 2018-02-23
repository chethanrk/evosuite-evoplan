sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
    "sap/ui/model/json/JSONModel",
	"com/evorait/evoplan/model/models",
	"com/evorait/evoplan/controller/ErrorHandler",
    "com/evorait/evoplan/controller/AssignInfoDialog",
    "com/evorait/evoplan/controller/AssignTreeDialog",
    "com/evorait/evoplan/controller/StatusSelectDialog"
], function(
	UIComponent,
	Device,
	JSONModel,
	models,
	ErrorHandler,
	AssignInfoDialog,
	AssignTreeDialog,
    StatusSelectDialog) {

	"use strict";

	return UIComponent.extend("com.evorait.evoplan.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this function, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// handle the main oData model based on the environment
			// the path for mobile applications depends on the current information from
			// the logon plugin - if it's not running as hybrid application then the initialization
			// of the oData service happens by the entries in the manifest.json which is used
			// as metadata reference
			var oModel;
			var appContext;
			var externalURL;

			if (com.evorait.evoplan.dev.devapp.externalURL) {
				externalURL = com.evorait.evoplan.dev.devapp.externalURL;
			}

			if (com.evorait.evoplan.dev.devapp.devLogon) {
				appContext = com.evorait.evoplan.dev.devapp.devLogon.appContext;
			}

			if (window.cordova && appContext && !window.sap_webide_companion && !externalURL) {
				var url = appContext.applicationEndpointURL + "/";
				var oHeader = {
					"X-SMP-APPCID": appContext.applicationConnectionId
				};

				// this would allow to pass basic authentication from the user registration to the
				// backend request - do not do this yet
				/**
				if (appContext.registrationContext.user) {
					oHeader.Authorization = "Basic " + btoa(appContext.registrationContext.user + ":" + appContext.registrationContext.password);
				}
				**/
				// set the central model (default model has no name)
				oModel = new sap.ui.model.odata.ODataModel(url, true, null, null, oHeader);
				this.setModel(oModel);
			}

			// initialize the error handler with the component
			this._oErrorHandler = new ErrorHandler(this);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

            var oViewModel = new JSONModel({
                treeSet: "ResourceHierarchySet",
                subFilterEntity: "Demand",
                subTableSet: "DemandSet",
                tableBusyDelay : 0,
                persistencyKeyTable: "evoPlan_ui",
                persistencyKeyTree: "evoPlan_resource",
                counterResourceFilter: ""
            });
            this.setModel(oViewModel, "viewModel");
            
            //creates the Information model and sets to the component
			this.setModel(models.createInformationModel(this),"InformationModel");
			//create the user information model
			this._getUserInfo();
			
            this._initDialogs();

			//Creating the Global message model from MessageManager
			var oMessageModel = new JSONModel();
			oMessageModel.setData([]);
			this.setModel(oMessageModel, "MessageModel");

			// create the views based on the url/hash
			this.getRouter().initialize();
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ErrorHandler is destroyed.
		 * @public
		 * @override
		 */
		destroy: function() {
			this._oErrorHandler.destroy();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function() {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (Device.support.touch && this._isMobile()) { // apply "compact" mode if touch is not supported
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				} else {
					//sapUiSizeCompact
					this._sContentDensityClass = "sapUiSizeCompact";
				}
			}
			return this._sContentDensityClass;
		},

        /**
		 * check if device or browser is mobile
         * @returns {*|boolean}
         * @private
         */
		_isMobile: function () {
            var Uagent = navigator.userAgent||navigator.vendor||window.opera;
            return(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(Uagent)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(Uagent.substr(0,4)));
        },

        /**
		 * init different global dialogs with controls
         * @private
         */
        _initDialogs: function () {
			//display and change assignment dialog
            this.assignInfoDialog = new AssignInfoDialog();
            this.assignInfoDialog.init();
            //select resource from tree for assigning dialog
            this.assignTreeDialog = new AssignTreeDialog();
            this.assignTreeDialog.init();
            //change status of demand
            this.statusSelectDialog = new StatusSelectDialog();
            this.statusSelectDialog.init();
        },

        /**
         * Extract messages from a the MessageModel.
         *
         * @Author Rahul
         * @param {object} oData data of MessageModel
         * @return
         * @function
         * @public
         */
        createMessages : function(){
            var aMessages = [];
            var iCountError = 0, iCountWarning = 0, iCountSuccess = 0, iCounter = 0, iCountInfo = 0;
            var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
            var oData= oMessageModel.getData();
            var oResourceBundle = this.getModel("i18n").getResourceBundle();

            if(oData.length === 0){
                oMessageModel.setData([]);
                return;
            }

            for( var i = 0; i < oData.length; i++){
                var item = {};
                if (oData[i].type === "Error"){
                    item.title = oResourceBundle.getText("xtit.errorMsg");
                    iCountError = iCountError + 1;
                    iCounter = iCountError;
                }
                if (oData[i].type === "Warning"){
                    item.title = oResourceBundle.getText("xtit.warningMsg");
                    iCountWarning = iCountWarning + 1;
                    iCounter = iCountWarning;
                }
                if (oData[i].type === "Success"){
                    item.title = oResourceBundle.getText("xtit.successMsg");
                    iCountSuccess = iCountSuccess + 1;
                    iCounter = iCountSuccess;
                }
                if (oData[i].type === "Information"){
                    item.title = oResourceBundle.getText("xtit.informationMsg");
                    iCountInfo = iCountInfo + 1;
                    iCounter = iCountInfo;
                }
                item.type = oData[i].type;
                item.description = oData[i].message;
                item.subtitle = oData[i].message;
                item.counter = iCounter;

                aMessages.push(item);
            }
            this.getModel("MessageModel").setData(aMessages);
            oMessageModel.setData([]);
        },
        _getUserInfo: function(){
        	if(sap.ui2 && sap.ui2.shell){
                var oUser = sap.ui2.shell.getUser();
                oUser.load({}, function(){
                        oUser = {
                            username: oUser.getFullName(),
                            user: oUser.getId()
                        };
                        console.log('you are loggin in with ' + oUser.username);
                        this.setModel(models.createUserModel(oUser), "user");
                    },
                    function(sError){
                        console.log('user fetching failed ' + sError );
                    });
            }else{
                var oModel = this.getModel(),
                	sUser = oModel.sUser,
                    oUser = {
                        username: sUser
                    };
               this.setModel(models.createUserModel(oUser), "user");
            }
        }
	});
});