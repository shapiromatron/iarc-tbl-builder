// global session variables
Session.setDefault('showQAflags', false);
Session.setDefault('isFullScreen', false);
Session.setDefault('reorderRows', false);
Session.setDefault('referenceNewObj', null);
Session.setDefault('epiForestPlotMin', 0.05);
Session.setDefault('epiForestPlotMax', 50);
Session.setDefault('sortsAndFilters', null);

// setup global subscriptions
var tablesHandler = null;
Tracker.autorun(function() {
    tablesHandler = Meteor.subscribe('tables', Meteor.userId());
});
Tracker.autorun(function(){
    if (Roles.userIsInRole(Meteor.userId(), ['staff'])) {
        usersHandler = Meteor.subscribe('adminUsers');
    } else {
        var tblId = null;
        try {
            tblId = Session.get('tablesEditingId') || Session.get('Tbl')._id;
        } catch(err){
            // pass
        }
        usersHandler = Meteor.subscribe('tblUsers', tblId);
    }
});


// setup router
var GARouter = RouteController.extend({
        onRun: function () {
            GAnalytics.pageview();
            this.next();
        },
    }),
    TblRouterController = GARouter.extend({
        waitOn: function(){
            return tablesHandler;
        },
        data: function() {
            return Tables.findOne(this.params._id);
        },
        action: function() {
            if (this.ready()) {
                var tbl = this.data();
                Session.set('Tbl', tbl);
                Session.set('monographAgent', tbl.monographAgent);
                document.title = utilities.getHTMLTitleTbl();
                return this.render();
            } else {
                return this.render("isLoading");
            }
        },
        onStop: function() {
            Session.set('Tbl', null);
            Session.set('monographAgent', null);
            document.title = utilities.getHTMLTitleBase();
        },
    }),
    AdminRouteController = GARouter.extend({
        action: function () {
            if (Roles.userIsInRole(Meteor.userId(), ['staff'])){
                this.render();
            } else {
                this.render('404');
            }
        },
    });

Router.map(function() {

    this.route('home', {
        path: '/',
        controller: GARouter,
    });

    this.route('volumeTableList', {
        path: '/volume/:volumeNumber',
        data: function() {
            return {volumeNumber: parseInt(this.params.volumeNumber, 10)};
        },
        controller: GARouter,
    });

    this.route('epiMain', {
        path: '/epidemiology/:_id',
        controller: TblRouterController,
    });

    this.route('ntpEpiMain', {
        path: '/ntp-epidemiology/:_id',
        controller: TblRouterController,
    });

    this.route('ntpEpiRatingMain', {
        path: '/ntp-epidemiology/:_id/rating',
        controller: TblRouterController,
    });

    this.route('ntpVariablesOfConcernMain', {
        path: '/ntp-epidemiology/:_id/variables-of-concern',
        controller: TblRouterController,
    });

    this.route('epiAnalysisMain', {
        path: '/epidemiology/:_id/analysis',
        controller: TblRouterController,
    });

    this.route('mechanisticMain', {
        path: '/mechanistic/:_id/',
        controller: TblRouterController,
    });

    this.route('exposureMain', {
        path: '/exposure/:_id',
        controller: TblRouterController,
    });

    this.route('animalMain', {
        path: '/animal/:_id',
        controller: TblRouterController,
    });

    this.route('genotoxMain', {
        path: '/genotoxicity/:_id',
        controller: TblRouterController,
    });

    this.route('referencesMain', {
        path: '/references/:monographAgent/',
        data: function() {
            return {monographAgent: this.params.monographAgent};
        },
        controller: GARouter,
    });

    this.route('referenceBatchUpload', {
        path: '/references/:monographAgent/upload/',
        data: function() {
            return {monographAgent: this.params.monographAgent};
        },
        controller: GARouter,
    });

    this.route('epiOrganSiteMain', {
        path: '/epidemiology/:volumeNumber/:monographAgent/epi-site',
        data: function() {
            return {
                volumeNumber: this.params.volumeNumber,
                monographAgent: this.params.monographAgent,
            };
        },
        controller: GARouter,
    });

    this.route('profileEdit', {
        path: '/user-profile/',
        controller: GARouter,
    });

    this.route('adminMain', {
        path: '/admin/',
        controller: AdminRouteController,
    });
});

Router.configure({
    layoutTemplate: 'layout',
    notFoundTemplate: 'Http404',
    loadingTemplate: 'isLoading',
});

Router.plugin('dataNotFound', {notFoundTemplate: 'Http404'});
