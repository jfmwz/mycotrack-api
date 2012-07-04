require([
  "namespace",

  // Libs
  "jquery",
  "use!underscore",
  "use!backbone",
  "modelbinding",
  "use!base64",

  // Modules
  "modules/mt-layout",
  "modules/mt-context",
  "modules/views/navbar",
  "modules/models/project",
  "modules/models/species",
  "modules/models/culture",
  "modules/models/general_aggregation",
  "modules/views/aggregation",
  "modules/views/base",
  "modules/views/species",
  "modules/models/user",
  "modules/views/login",

  //plugins
  "use!bootstrapdatepicker",
  "use!gx",
  "use!h5validate",
  "use!jquerycookies"
],

function(namespace, jQuery, _, Backbone, ModelBinding, Base64, Mycotrack, Context, Navbar, Project, Species, Culture, GeneralAggregation, Aggregation, BaseView, SpeciesView, User, Login) {

    var context = new Context.Model();


  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    initialize: function() {
        //alert($.cookies.test());
        var userCookie = $.cookies.get('mt_sess') == null ? false : true;
        var userHash = $.cookies.get('mt_sess') == null ? {} : $.cookies.get('mt_sess');
        console.log("Need cookies: " + JSON.stringify(userHash));
//        console.log("Need cookies");
        namespace.app.user = new User.Model(userHash);
        namespace.app.userState = {};
        context.main = new Backbone.LayoutManager({
                template: "base"
        });

        context.loginForm = new Navbar.Views.LoginForm({
            context: context,
            model: namespace.app.user
        });

        context.navBarView = new Navbar.Views.Navbar({
            context: context,
            userState: namespace.app.userState
        });
        if (!userCookie) {
            context.navBarView.insertView("#loginanchor", context.loginForm);
        }

        context.generalAggregationView = new Aggregation.Views.GeneralAggregation({
            context: context
        });

        context.homeView = new BaseView.Home({
            views: {
                "#aggregationDetail": context.generalAggregationView
            }
        });

        context.speciesView = new SpeciesView.List();

        context.speciesBaseView = new BaseView.Species({
            views: {
                "#detail": context.speciesView
            }
        });

        context.projectView = new Mycotrack.Views.ProjectList({
            context: context
          });

        context.projectBaseView = new BaseView.Project({
            views: {
                "#projectList": context.projectView
            }
        });

        context.newProjectView = new BaseView.NewProject();
        context.spawnProjectView = new BaseView.SpawnProject();
        context.newCultureView = new BaseView.NewCulture();
        context.newUserView = new BaseView.NewUser();

        context.cultureView = new Mycotrack.Views.CultureList({
            context: context
          });

        context.cultureBaseView = new BaseView.Culture({
            views: {
                "#cultureList": context.cultureView
            }
        });

        context.selectedProjectView = new Mycotrack.Views.SelectedProjectView({context: context});

        context.main = new Backbone.LayoutManager({
            template: "base",
            views: {
                "#mtnav": context.navBarView
            }
          });

        context.on('project:save', function(eventName){
            console.log('Refreshing project view');
            context.get('selectedProjectView').render();
          });

          context.on('project:new', function(eventName){
            console.log('Should display new project');
          });

          context.on('auth:required', function(eventName){
            console.log('Login necessary!');
          });

          namespace.app.on('login:submit', function(eventName){
            namespace.app.user.fetch({
                success: function(){
                    var expiration = new Date();
                    expiration.setDate(expiration.getDate() + 7);
                    $.cookies.set('mt_sess', namespace.app.user.toJSON(), {path : '/'});
                    namespace.app.userState.loggedIn = true;

                    context.loginForm.removeView();
                    context.navBarView.render();
                },
                error: function(){
                    namespace.app.userState.loggedIn = false;

                    context.navBarViewinsertView("#loginanchor", context.loginForm);
                    context.navBarView.render();
                }
            });

        });
        namespace.app.on('user:logOut', function(eventName){
            console.log("Logging out");
            $.cookies.del('mt_sess', {path : '/'});
            namespace.app.userState.loggedIn = false;
            context.navBarView.insertView("#loginanchor", context.loginForm);
            context.navBarView.render();
        });
        if (userCookie){
            namespace.app.trigger("login:submit");
        }

        context.main.render(function(el) {
            console.log('Rendering main');
            $("#main").html(el);
            ModelBinding.bind(context.loginForm);
        });

        console.log("Finished init");
    },

    routes: {
      "": "index",
      "projects": "mtlayout",
      "projects/:id": "mtlayout",
      "culture_list": "cultureLayout",
      "species_list": "speciesLayout",
      "new_project": "newProject",
      "spawn_project": "spawnProject",
      "new_culture": "newCulture",
      "new_user": "newUser",
      "login": "login"
    },

    index: function() {
        console.log("Starting route function");
        var route = this;

        var generalAggregation = new GeneralAggregation.Model();

        generalAggregation.fetch({
            success: function(){
                namespace.app.trigger('generalagg:fetch');
            }
        });

        console.log('Rendering general agg1');
        context.generalAggregationView.model=generalAggregation;
        console.log('Rendering general agg2');
        namespace.app.on('generalagg:fetch', function(eventName){
            console.log('Rendering general agg3');
            context.main.setView("#contentAnchor", context.homeView);
            context.homeView.render();
        });
    },

    login: function() {

    },

    mtlayout: function(id) {
        if (id){
            console.log("ID = " + id);
        }
      var route = this;
      var projects = new Project.Collection();
      var cultures = new Culture.Collection();

      cultures.fetch({
        data: {
            includeProjects: "true"
        },
        success: function(){
            projects.trigger('projects:fetch');
        }
      });

      context.projectView.collection = cultures;

      context.main.setView("#contentAnchor", context.projectBaseView);

      projects.on('projects:fetch', function(eventName){
            console.log('Rendering project view');
            context.projectBaseView.render();
        });

      namespace.app.on('project:selected', function(eventName){

        var selectedProject = context.get('selectedProject');
        var selectedProjectCulture = new Culture.Model({});
        selectedProjectCulture.id = selectedProject.get('cultureUrl');

        context.selectedProjectView.options.project = selectedProject;
        context.selectedProjectView.options.culture = selectedProjectCulture;
//        console.log(selectedProject );
//        console.log(selectedProjectCulture );
        selectedProjectCulture.fetch({success: function(){
            context.main.setView("#detail", context.selectedProjectView);
            console.log('Should refresh with: ' + JSON.stringify(context.selectedProjectView.model));
            context.selectedProjectView.render();
        }});
      });
    },

    newProject: function(hash) {
      var route = this;
      var newProject = new Project.Model({});
      if (namespace.app.parentProject){
        newProject.set('parent', namespace.app.parentProject.id);
      }
      var cultures = new Culture.Collection();

      cultures.fetch({success: function(){
        cultures.trigger('cultures:fetch');
      }});

      context.main.setView("#contentAnchor", context.newProjectView);
      cultures.on('cultures:fetch', function(eventName){

        context.newProjectView.model = newProject;
        context.newProjectView.model.set('cultureList', cultures.toJSON());

        context.newProjectView.bind();
        context.newProjectView.render();
        console.log("DATEPICKING");
        $("#dp1").datepicker();
      });
    },

    spawnProject: function() {
          var route = this;
          var newProject = new Project.Model({});
          newProject.set('parent', namespace.app.parentProject.id);

          context.main.setView("#contentAnchor", context.spawnProjectView);

          context.spawnProjectView.model = newProject;

          context.spawnProjectView.render();
          ModelBinding.bind(context.spawnProjectView);
          console.log("DATEPICKING");
          $("#dp1").datepicker();
        },

    newCulture: function(hash) {
      var route = this;
      var newCulture = new Culture.Model({});
      var species = new Species.Collection();
      console.log('Rendering new culture');

      species.fetch({success: function(){
        species.trigger('species:fetch');
      }});

      context.main.insertView("#contentAnchor", context.newCultureView);
      species.on('species:fetch', function(eventName){

        context.newCultureView.model = newCulture;
        context.newCultureView.model.set('speciesList', species.toJSON());

        //ModelBinding.bind(selectedProjectView);
        context.newCultureView.render();
      });
    },

    newUser: function(hash) {
          var route = this;
          var newUser = new User.Model({});

          context.newUserView.model = newUser;
          context.main.setView("#contentAnchor", context.newUserView);
          $.when(context.newUserView.render()).then(function() {
            console.log("validating");
            console.log($('#mtnav'));
            $('#newUserForm').h5Validate();
          });

        },

    cultureLayout: function(hash) {
      var route = this;
      var cultures = new Culture.Collection();

      cultures.fetch({success: function(){
        cultures.trigger('cultures:fetch');
      }});

      context.cultureView.collection = cultures;

      context.main.setView("#contentAnchor", context.cultureBaseView);

      cultures.on('cultures:fetch', function(eventName){
            console.log('Rendering culture view');
            context.cultureBaseView.render();
        });

      context.on('culture:selected', function(eventName){

        console.log("Selected culture");
      });
    },

    speciesLayout: function(hash) {
      var route = this;
      var species = new Species.Collection();

      species.fetch({success: function(){
        species.trigger('species:fetch');
      }});

      context.speciesView.collection = species;

      context.main.setView("#contentAnchor", context.speciesBaseView);

      species.on('species:fetch', function(eventName){
            console.log('Rendering species view');
            context.speciesBaseView.render();
        });
    }
  });

  // Shorthand the application namespace
  var app = namespace.app;

  // Treat the jQuery ready function as the entry point to the application.
  // Inside this function, kick-off all initialization, everything up to this
  // point should be definitions.
  jQuery(function($) {
    $.ajaxSetup({
        beforeSend: function (xhr) {
            if (namespace.app.user.get('email')) {
                console.log("Before sending!");
                var authString = namespace.app.user.get('email') + ":" + namespace.app.user.get('password');
                 var encodedAuthString = "Basic " + Base64.encode(authString);

                 console.log("Authorizing with: " + authString + "with encoded: " + encodedAuthString);

                xhr.setRequestHeader('Authorization', encodedAuthString);
            }
            return xhr;
	    },
        statusCode: {
            401: function(){
                console.log("HANDLED 401");
                context.trigger('auth:required');

            },
            403: function(){
                console.log("HANDLED 403");
                context.trigger('auth:required');

            }
        }
      });

      // Define your master router on the application namespace and trigger all
    // navigation from this instance.
      app.router = new Router();

      // Trigger the initial route and enable HTML5 History API support
      Backbone.history.start({ pushState: true });
  });

  // All navigation that is relative should be passed through the navigate
  // method, to be processed by the router.  If the link has a data-bypass
  // attribute, bypass the delegation completely.
  $(document).on("click", "a:not([data-bypass])", function(evt) {
    // Get the anchor href and protcol
    var href = $(this).attr("href");
    var protocol = this.protocol + "//";

    // Ensure the protocol is not part of URL, meaning its relative.
    if (href && href.slice(0, protocol.length) !== protocol &&
        href.indexOf("javascript:") !== 0) {
      // Stop the default event to ensure the link will not cause a page
      // refresh.
      evt.preventDefault();

      // This uses the default router defined above, and not any routers
      // that may be placed in modules.  To have this work globally (at the
      // cost of losing all route events) you can change the following line
      // to: Backbone.history.navigate(href, true);
      app.router.navigate(href, true);
    }
  });

});
