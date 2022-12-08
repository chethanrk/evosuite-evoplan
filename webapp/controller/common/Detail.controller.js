sap.ui.define([
	"com/evorait/evoplan/controller/common/AssignmentsController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"com/evorait/evoplan/model/formatter",
	"com/evorait/evoplan/controller/TemplateRenderController"

], function (
	BaseController,
	JSONModel,
	History,
	formatter,
	TemplateRenderController
) {
	"use strict";
	return TemplateRenderController.extend("com.evorait.evoplan.controller.common.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var iOriginalBusyDelay,
				oViewModel = this.getOwnerComponent().getModel("viewModel");

			this._eventBus = sap.ui.getCore().getEventBus();
			//event registration for refreshing the context in case any change in the view
			this._eventBus.subscribe("BaseController", "refreshDemandOverview", this._triggerRefreshDemand, this);

			this.getRouter().getRoute("detail").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("assetDemandDetail").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("ganttDemandDetails").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("splitDemandDetails").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("splitGanttDetails").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("mapDemandDetails").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
				// Restore original busy indicator delay for the object view
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

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
		onNavBack: function () {
			this.navBack();
		},

		navBack: function () {
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
		_onObjectMatched: function (oEvent) {
			var sGuid = oEvent.getParameter("arguments").guid,
				oDataModel = this.getModel(),
				sRouteName = oEvent.getParameter("name"),
				oResourceBundle = this.getResourceBundle(),
				iContentLength = this.getView().byId("ObjectPageWrapper").getContent().length;

			// setting the bread crum value xtit.itemListTitle
			if (sRouteName === "detail") {
				this.getModel("viewModel").setProperty("/detailPageBreadCrum", oResourceBundle.getText("xbut.pageDemands"));
			} else if (sRouteName === "ganttDemandDetails") {
				this.getModel("viewModel").setProperty("/detailPageBreadCrum", oResourceBundle.getText("xbut.pageGanttChart"));
			} else if (sRouteName === "splitDemandDetails" || sRouteName === "splitGanttDetails") {
				this.getModel("viewModel").setProperty("/detailPageBreadCrum", oResourceBundle.getText("xbut.pageGanttChartSplit"));
			} else if (sRouteName === "mapDemandDetails") {
				this.getModel("viewModel").setProperty("/detailPageBreadCrum", oResourceBundle.getText("xbut.pageMap"));
			} else {
				this.getModel("viewModel").setProperty("/detailPageBreadCrum", oResourceBundle.getText("xbut.pageAssetManager"));
			}

			oDataModel.metadataLoaded().then(function () {
				var sPath = this.getModel().createKey("/DemandSet", {
					Guid: sGuid
				});
				this._bindView(sPath);
				//setting up the templates for the Sections
				if (!iContentLength) {
					this.insertTemplateFragment(sPath, this.getView(), "ObjectPageWrapper", null, null, this);
				}
			}.bind(this));
		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
		_bindView: function (sObjectPath) {
			var oViewModel = this.getModel("viewModel"),
				oDataModel = this.getModel();

			this.getView().bindElement({
				path: sObjectPath,
				parameters: {
					expand: "DemandToAssignment,DemandToQualification,DemandToComponents"
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
			if (this.getView().getElementBinding()) {
				this.getView().getElementBinding().refresh();
			}
		},
		/**
		 * When ever binding changes the view should be busy and Bindings are refreshed. 
		 */
		_onBindingChange: function () {
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
		/**
		 * Opens the AssignInfo dialog to update the assignment
		 * @Author Rahul
		 * @return
		 * @param oEvent
		 */
		onRowClick: function (oEvent) {
			var oAssignment = oEvent.getParameter("listItem"),
				oContext = oAssignment.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oAssignmentData = oModel.getProperty(sPath);

			localStorage.setItem("Evo-Action-page", "DemandDetails");
				
			var mParams = {
					viewName: "com.evorait.evoplan.view.templates.AssignInfoDialog#AssignmentDialog",
					annotationPath: "com.sap.vocabularies.UI.v1.Facets#AssignmentDialog",
					entitySet: "AssignmentSet",
					controllerName: "AssignInfo",
					title: "xtit.assignInfoModalTitle",
					type: "add",
					smartTable: null,
					sPath: sPath,
					sDeepPath: "Demand",
					oDialogController:this.getOwnerComponent().assignInfoDialog,
					refreshParameters:{
						bFromDetail: true
					}
					
				};
				this.getOwnerComponent().DialogTemplateRenderer.open(this.getView(), mParams, this._afterDialogLoad.bind(this));
			
		},
		_afterDialogLoad: function(oDialog, oView, sPath, data, mParams){
			this.getOwnerComponent().assignInfoDialog.open(oDialog, oView, null, null, mParams.refreshParameters, sPath, data);
			
		},
		/**
		 * Opens the AssignDialog to assign the demand to resources
		 * @Author Rahul
		 * @return
		 * @param oEvent
		 */
		onClickAssign: function (oEvent) {
			var oSource = oEvent.getSource(),
				oContext = oSource.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oData = oModel.getProperty(sPath),
				oSelectedData = [{
					sPath: sPath,
					oData: oData
				}];
			if (oData.ALLOW_ASSIGN) {
				localStorage.setItem("Evo-Action-page", "DemandDetails");
				this.getOwnerComponent().assignTreeDialog.open(this.getView(), false, oSelectedData, false, {
					bFromDetail: true
				});
			} else {
				this._showAssignErrorDialog([oData.DemandDesc]);
			}
		},
		/**
		 * Opens the StatusDialog to change status
		 * @Author Rahul
		 * @return
		 * @param oEvent
		 */
		onClickStatus: function (oEvent) {
			var oSource = oEvent.getSource(),
				sBindingPath = oEvent.getSource().getBinding("visible").getPath(),
				sFunctionKey = sBindingPath.slice(sBindingPath.indexOf("_") + 1),
				oContext = oSource.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oData = oModel.getProperty(sPath),
				oSelectedData = [{
					sPath: sPath,
					oData: oData
				}];

			this._eventBus.publish("StatusSelectDialog", "changeStatusDemand", {
				selectedPaths: oSelectedData,
				functionKey: sFunctionKey,
				parameters: {
					bFromDetail: true
				}
			});
		},
		/**
		 * This method required when user directly open the demand overview page
		 * and change status or assignment actions are performed
		 * Refresh the binding to ensure that the data shown is updated.
		 * @Author Rahul
		 * @return
		 */
		_triggerRefreshDemand: function () {
			this.getView().getElementBinding().refresh();
		},
		/**
		 * open's a action sheets with possible statuses. 
		 */
		onClickAction: function (oEvent) {
			localStorage.setItem("Evo-Action-page", "DemandDetails");
			sap.ui.getCore().byId("idStatusActionSheet").openBy(oEvent.getSource());
		},
		getVisible: function (a, b, c, d) {
			return a && !b && c !== "COMP" && d;
		},
		
		getSetFunction: function (a, b, c, d) {
			return a && !b && c !== "COMP" && d;
		},
			/**
		 * Opens the StatusDialog to set status for demand 
		 * @Author Chethan
		 * @return
		 * @param oEvent
		 */
		onClickSetFunction: function (oEvent) {
			var oSource = oEvent.getSource(),
				oContext = oSource.getBindingContext(),
				oModel = oContext.getModel(),
				sPath = oContext.getPath(),
				oData = oModel.getProperty(sPath),
				oSelectedData = [{
					sPath: sPath,
					oData: oData
				}];
			this.getOwnerComponent().statusSelectDialog.open(this.getView(), oSelectedData, {
					bFromDetail: true
				});	
				
		},

		/**
		 * View life cycle methods when view gets destroy 
		 */
		onExit: function () {
			this._eventBus.unsubscribe("BaseController", "refreshDemandOverview", this._triggerRefreshDemand, this);
		}

	});
});