/*global location*/
sap.ui.define([
		"com/evorait/evoplan/controller/AssignmentsController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/History",
		"com/evorait/evoplan/model/formatter"
	], function (
		BaseController,
		JSONModel,
		History,
		formatter
	) {
		"use strict";

		return BaseController.extend("com.evorait.evoplan.controller.Detail", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			/**
			 * Called when the worklist controller is instantiated.
			 * @public
			 */
			onInit : function () {
				// Model used to manipulate control states. The chosen values make sure,
				// detail page is busy indication immediately so there is no break in
				// between the busy indication for loading the view's meta data
				var iOriginalBusyDelay,
				oViewModel = this.getOwnerComponent().getModel("viewModel");

                var eventBus = sap.ui.getCore().getEventBus();
                //event registration for refreshing the context in case any change in the view
                eventBus.subscribe("BaseController", "refreshDemandOverview", this._triggerRefreshDemand, this);


                this.getRouter().getRoute("detail").attachPatternMatched(this._onObjectMatched, this);
                this.getRouter().getRoute("assetDemandDetail").attachPatternMatched(this._onObjectMatched, this);
				
				// Store original busy indicator delay, so it can be restored later on
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
				this.getOwnerComponent().getModel().metadataLoaded().then(function () {
						// Restore original busy indicator delay for the object view
						oViewModel.setProperty("/delay", iOriginalBusyDelay);
					}
				);
				
			},
			
			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */


			/**
			 * Event handler  for navigating back.
			 * It there is a history entry we go one step back in the browser history
			 * If not, it will replace the current entry of the browser history with the worklist route.
			 * @public
			 */
			onNavBack : function() {
				this.navBack();
			},
			
			navBack : function(){
				var sPreviousHash = History.getInstance().getPreviousHash();
				if (sPreviousHash !== undefined) {
					history.go(-1);
				} else {
					this.getRouter().navTo("demands", {}, true);
				}
			},
			

			/* =========================================================== */
			/* internal methods                                            */
			/* =========================================================== */

			/**
			 * Binds the view to the object path.
			 * @function
			 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
			 * @private
			 */
			_onObjectMatched : function (oEvent) {
				var sGuid =  oEvent.getParameter("arguments").guid,
					oDataModel = this.getModel();
					
				oDataModel.metadataLoaded().then( function() {
						var sPath = this.getModel().createKey("DemandSet", {
							Guid :  sGuid
						});
						this._bindView("/" + sPath);
				}.bind(this));
			},

			/**
			 * Binds the view to the object path.
			 * @function
			 * @param {string} sObjectPath path to the object to be bound
			 * @private
			 */
			_bindView : function (sObjectPath) {
				var oViewModel = this.getModel("viewModel"),
					oDataModel = this.getModel();
					
				this.getView().bindElement({
					path: sObjectPath,
                    parameters:{
						expand:"DemandToAssignment"
					},
					events: {
						change: this._onBindingChange.bind(this),
						dataRequested: function () {
							oDataModel.metadataLoaded().then(function () {
								oViewModel.setProperty("/busy", true);
							});
						},
						dataReceived: function () {
							oViewModel.setProperty("/busy", false);
						}
					}
				});
			},

			_onBindingChange : function () {
				var oView = this.getView(),
					oViewModel = this.getModel("viewModel"),
					oElementBinding = oView.getElementBinding(),
					oContext = oElementBinding.getBoundContext();

                // refreshing the binding
				oElementBinding.refresh();

				// No data for the binding
				if (!oContext) {
					this.getRouter().getTargets().display("notFound");
					return;
				}
				oViewModel.setProperty("/busy", false);
			},
			/**
			 * Opens the AssignInfo dialog to update the assignment
			 * @Author Rahul
			 * @return
			 * @param oEvent
			 */
			onRowClick: function (oEvent) {
				var oAssignment = oEvent.getParameter("listItem");
				var oContext = oAssignment.getBindingContext();
				var oModel = oContext.getModel();
				var sPath = oContext.getPath();
				var oAssignmentData = oModel.getProperty(sPath);
				this.getOwnerComponent().assignInfoDialog.open(this.getView(), null, oAssignmentData,{bFromDetail:true});
			
			},
			/**
			 * Opens the AssignDialog to assign the demand to resources
			 * @Author Rahul
			 * @return
			 * @param oEvent
			 */
			onClickAssign:function(oEvent){
				var oSource = oEvent.getSource();
				var oContext = oSource.getBindingContext();
				var oModel = oContext.getModel();
				var sPath = oContext.getPath();
				var oData = oModel.getProperty(sPath);
				var oSelectedData = [{sPath:sPath,oData:oData}];
				if(oData.ALLOW_ASSIGN){
					 this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedData,false,{bFromDetail:true});
				}else{
                	this._showAssignErrorDialog([oData.DemandDesc]);
				}
			},
			/**
			 * Opens the StatusDialog to change status
			 * @Author Rahul
			 * @return
			 * @param oEvent
			 */
			onClickStatus:function(oEvent){
				var oSource = oEvent.getSource(),
                 eventBus = sap.ui.getCore().getEventBus(),
                 sBindingPath = oEvent.getSource().getBinding("visible").getPath(),
				 sFunctionKey =  sBindingPath.slice(sBindingPath.indexOf("_")+1),
                 oContext = oSource.getBindingContext(),
                 oModel = oContext.getModel(),
                 sPath = oContext.getPath(),
                 oData = oModel.getProperty(sPath),
                 oSelectedData = [{sPath:sPath,oData:oData}];

                eventBus.publish("StatusSelectDialog", "changeStatusDemand", {
                    selectedPaths: oSelectedData,
                    functionKey: sFunctionKey,
                    parameters:{bFromDetail:true}
                });



                // this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedData);

			},
            /**
			 * This method required when user directly open the demand overview page
			 * and change status or assignment actions are performed
             * Refresh the binding to ensure that the data shown is updated.
             * @Author Rahul
             * @return
             */
            _triggerRefreshDemand:function () {
                this.getView().getElementBinding().refresh();
            },
            onClickAction: function(oEvent) {
                if (!this._oActionSheet) {
                    this._oActionSheet = sap.ui.xmlfragment(this.getView().getId(), "com.evorait.evoplan.view.fragments.StatusActionSheet", this);
                    this.getView().addDependent(this._oActionSheet);
                }
                this._oActionSheet.openBy(oEvent.getSource());
            },
            getVisible:function(a,b,c){
            	return a && !b && c !== "COMP";
			}

		});
	}
);