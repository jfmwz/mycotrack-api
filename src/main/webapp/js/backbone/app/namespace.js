define([
  // Libs
  "jquery",
  "use!underscore",
  "use!backbone",
  "use!handlebars",

  //Plugins
  "use!layoutmanager",
  "use!bootstrapdropdown",
  "use!datejs"
],

function($, _, Backbone, Handlebars) {
  // Put application wide code here

    Handlebars.registerHelper("debug", function(optionalValue) {
      console.log("Current Context");
      console.log("====================");
      console.log(this);

      if (optionalValue) {
        console.log("Value");
        console.log("====================");
        console.log(optionalValue);
      }
    });

    Handlebars.registerHelper("currentDate", function() {
      var d = new Date();
      var resp = d.getMonth() + "-" + d.getDay() + "-" + d.getFullYear();
       console.log("Current date: " + resp);
      return resp;
    });

    Handlebars.registerHelper("formatDate", function(date, format) {
      if (!date || !format){
        console.log("Not enough params");
        return "";
      }

      var res = date.toString(format);

      console.log("Formatted date: " + res + " with format: " + format);

      return res;
    });

    Handlebars.registerHelper("prettyProductId", function(id) {
      if (!id || id.indexOf("/projects/") == -1){
        return "";
      }

      return id.replace("/projects/", "");
    });

    Backbone.LayoutManager.configure({
        paths: {
          layout: "/js/backbone/app/templates/layouts/",
          template: "/js/backbone/app/templates/"
        },

        render: function(template, context) {
          return template(context);
        },

        fetch: function(path) {
          path = path + ".html";

          var done = this.async();
          var JST = window.JST = window.JST || {};

          if (JST[path]) {
            return done(Handlebars.compile(JST[path]));
          }

          $.get(path, function(contents) {
            var tmpl = Handlebars.compile(contents);

            done(JST[path] = tmpl);
          }, "text");
        }
      });
  return {
    // This is useful when developing if you don't want to use a
    // build process every time you change a template.

    // Delete if you are using a different template loading method.
    fetchTemplate: function(path, done) {
      var JST = window.JST = window.JST || {};
      var def = new $.Deferred();

      // Should be an instant synchronous way of getting the template, if it
      // exists in the JST object.
      if (JST[path]) {
        done(JST[path]);

        return def.resolve(JST[path]);
      }

      // Fetch it asynchronously if not available from JST 
      $.get(path, function(contents) {
        var tmpl = Handlebars.compile(contents);

        // Set the global JST cache and return the template
        done(JST[path] = tmpl);

        // Resolve the template deferred
        def.resolve(JST[path]);
      }, "text");

      // Ensure a normalized return value (Promise)
      return def.promise();
    },

    // Create a custom object with a nested Views object
    module: function(additionalProps) {
      return _.extend({ Views: {} }, additionalProps);
    },

    // Keep active application instances namespaced under an app object.
    app: _.extend({}, Backbone.Events)
  };
});
