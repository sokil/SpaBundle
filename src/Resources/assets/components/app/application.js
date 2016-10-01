/**
 * Application
 */
var Application = Marionette.Application.extend({

    router: null,

    container: null,

    rootView: null,

    /**
     * Initialize application
     *
     * @param {object} options
     */
    initialize: function(options) {

        var self = this;

        // init options with default values
        options = _.extend({
            router: null,               // Backbone.Router
            routers: [],                // array of Backbone.Router, omitted if `router` passed
            defaultRoute: null,         // default route, used with `routers` option
            serviceDefinition: null,    // object with service definitions\]
            requireJs: null,            // requireJs configuration
            root: 'body',               // root element of SPA app
            regions: {                  // regions of root element
                content: '#content',    // region for content of app
                popup: '#popup'         // region for popup rendering
            }
        }, options);

        // set router
        if (options.router) {
            this.router = new options.router;
            if (!(this.router instanceof Backbone.Router)) {
                throw new Error('Router must extend Backbone.Router');
            }
        } else {
            if (!_.isArray(options.routers) || _.isEmpty(options.routers)) {
                throw new Error('Routes not specified');
            }

            // create router
            this.router = new Marionette.AppRouter();

            // check default route passed
            var defaultRoute = options.defaultRoute;

            // set routes
            _.each(
                options.routers,
                function(Router) {
                    var router = new Router();

                    this.router.processAppRoutes(router, router.routes);

                    // default route
                    if (_.isEmpty(defaultRoute)) {
                        defaultRoute = [router, _,values(router.routes)[0]];
                    }

                    // set default route
                    if (defaultRoute[0] === Router) {
                        this.router.route(
                            "",
                            "defaultRoute",
                            _.bind(
                                router[defaultRoute[1]],
                                router
                            )
                        )
                    }
                },
                this
            );
        }

        // set container definition
        var serviceDefinition = options.serviceDefinition || {};
        this.container = new Container(serviceDefinition);

        // requireJs config
        var requireJsConfig = {
            baseUrl: '/bundles/'   // all dependencies will be placed in assets dir
        };

        if (options.requireJs) {
            if (options.requireJs.paths) {
                requireJsConfig.paths = options.requireJs.paths;
            }
            if (options.requireJs.shim) {
                requireJsConfig.shim = options.requireJs.shim;
            }
        }

        requirejs.config(requireJsConfig);

        // configure already loaded dependencies
        define('jquery', [], function() { return jQuery; });

        // render root view
        var RootView = Marionette.LayoutView.extend({
            el: options.root,
            template: false,
            regions: options.regions
        });
        this.rootView = new RootView();
        this.rootView.render();

        // root view's content events
        this.rootView.content.on('empty', function() {
            this.$el.addClass('loading');
        });

        this.rootView.content.on('before:show', function() {
            this.$el.removeClass('loading');
        });

        // init
        this.on('start', function() {

            // start routing
            Backbone.history.start({pushState: options.pushState || false});

            // modal
            $(document).on('click', '[data-modal]', function() {
                var viewName = $(this).data('modal') + 'View';
                var view = new window[viewName]($(this).data());
                view.render();
                return false;
            });

            // handle clicks by backbone
            $(document).on('click', 'a[href^="/#"]', function() {
                var url = $(this).attr('href').substr(2);
                self.router.navigate(
                    url,
                    {trigger: true}
                );
                return false;
            });
        });
    },

    /**
     * Get translation
     *
     * @param string code
     * @returns {*}
     */
    t: function(code) {
        return i18n.getMessage(code);
    },

    /**
     * Render template
     *
     * @param string templateName
     * @param object data
     * @returns {*}
     */
    render: function(templateName, data) {
        var template = window.JST && window.JST[templateName];
        data = $.extend(data || {}, {
            t: app.t,
            app: this
        });

        return template(data);
    },

    loadCss: function (resources) {
        _.each(resources, function(url) {
            var link = document.createElement("link");
            link.type = "text/css";
            link.rel = "stylesheet";
            link.href = url;
            document.getElementsByTagName("head")[0].appendChild(link);
        });
    },

    loadImages: function (resources, callable) {
        var resourcesInQueue = resources.length;
        _.each(resources, function(url) {
            var img = document.createElement("img");
            img.onload = function() {
                resourcesInQueue--;
                if (0 === resourcesInQueue) {
                    if (typeof callback === 'function') {
                        callable();
                    }
                }
            };
            img.src = url;
        });
    },

    /**
     * Render popup
     *
     * @param string popupView
     * @returns {AbstractApplication}
     */
    popup: function(popupView) {
        this.rootView.popup.show(popupView);
        return this;
    }
});

/**
 * Allow fetch default falues for model
 * @param options
 */
Backbone.Model.prototype.fetchDefaults = function(options) {
    var self = this;

    if (this.defaults) {
        return $.Deferred()
            .resolveWith(this, this.defaults)
            .promise()
            .done(function() {
                this.trigger('syncDefaults', this, this.defaults, options);
            });
    }

    return $.get(this.urlRoot + '/new').done(function(response) {
        self.defaults = response;
        self.attributes = _.defaults({}, self.attributes, self.defaults);
        self.trigger('syncDefaults', self, response, options);
    });
};
