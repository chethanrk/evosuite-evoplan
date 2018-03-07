/*global location*/
sap.ui.define([
		"com/evorait/evoplan/controller/BaseController",
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
					oViewModel = new JSONModel({
						busy : true,
						delay : 0,
						tableBusyDelay : 0
					});

				this.getRouter().getRoute("detail").attachPatternMatched(this._onObjectMatched, this);
				
				// Store original busy indicator delay, so it can be restored later on
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
				this.setModel(oViewModel, "viewModel");
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
				if(this.oForm){
					this.cancelFormHandling(this.oForm);
				}
				this.navBack();
			},
			
			navBack : function(){
				var sPreviousHash = History.getInstance().getPreviousHash();
				if (sPreviousHash !== undefined) {
					history.go(-1);
				} else {
					this.getRouter().navTo("list", {}, true);
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

				// No data for the binding
				if (!oContext) {
					this.getRouter().getTargets().display("notFound");
					return;
				}
				oViewModel.setProperty("/busy", false);
			},
			onDummy: function (oEvent) {
				var oAppointment = oEvent.getParameter("listItem");
				var oContext = oAppointment.getBindingContext();
				var oModel = oContext.getModel();
				var sPath = oContext.getPath();
				var oAppointmentData = oModel.getProperty(sPath);
				this.getOwnerComponent().assignInfoDialog.open(this.getView(), null, oAppointmentData);
			
			}

		});
	}
);