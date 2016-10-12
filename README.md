Frontend Bundle
===============

Single Page Application based on Backbone, Marionette and Twitter Bootstrap.

[![Total Downloads](http://img.shields.io/packagist/dt/sokil/frontend-bundle.svg)](https://packagist.org/packages/sokil/frontend-bundle)

* [Installation](#installation)
* [Controller](#controller)
    * [Single Page Application](#single-page-application)
    * [Application data](#application-data)
* [Model](#model)
    * [Handling json requests](#handling-json-requests)
* [View](#view)
    * [Template](#template)
    * [Regions](#regions)
    * [Router](#router)
    * [Service container](#service-container)
    * [Popup](#popup)

## Installation

Add composer dependency:

```
composer require sokil/frontend-bundle
```

Add bundle to AppKernel:
```php
<?php

class AppKernel extends Kernel
{
    public function registerBundles()
    {
        $bundles = array(
            new Sokil\FrontendBundle\FrontendBundle(),
        );
    }
}
```

Build resources:
```
bower install
npm install
grunt
```

Bundle uses assetic so you need to register it in assetic config:
```yaml
assetic:
    bundles:
        - FrontendBundle
```

## Controller

### Single Page Application

We may configure pre-defined controller, responsible for rendering single page application, as service:

```yaml
acme.spa.controller:
  class: Sokil\FrontendBundle\Controller\IndexController
  arguments:
    - 'AcmeBundle:Spa:index.html.twig'
  calls:
    - [setContainer, ["@service_container"]]
```

Or use your own controller:
```php
<?php

namespace Acme\SiteBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;

class SpaController extends Controller
{
    public function indexAction(Request $request)
    {
        if (!$this->isGranted('IS_AUTHENTICATED_REMEMBERED')) {
            throw $this->createAccessDeniedException();
        }

        // render response
        return $this->render('SiteBundle:Spa:index.html.twig', [
            'applicationData' => $this->get('acme.spa.app_data')->getData(), // optional appdata
        ]);
    }
}
```

See how to convigure spa in view `SiteBundle:Spa:index.html.twig` below in [View section ](#view).

If some additional data required to be passed from backend to frontend, this may be done through `Application data`.

### Application data

Application data may be used to pass some data from backend to frontend.
Create service, responsible for obtaining application data from different sources:

```yaml
acme.spa.app_data:
    class: Sokil\FrontendBundle\Spa\ApplicationData
```

Now pass name of this service to definition of your spa action:

```yaml
acme.spa.controller:
  class: Sokil\FrontendBundle\Controller\IndexController
  arguments:
    - 'AcmeBundle:Spa:index.html.twig'
    - '@acme.spa.app_data'
  calls:
    - [setContainer, ["@service_container"]]
```

Application data generated from number of providers. provider is a servise identified by tag `frontend.spa.app_data_provider`.
Also app data service must be defined by key `app_data`, pointing to the instance of application data service.

```yaml
acme.spa.some_app_data_provider;
    class: Acme\Spa\SomeApplicationDataprovider
    tags:
        - {name: frontend.spa.app_data_provider, app_data: acme.spa.app_data}
    
```

Provider class must implement `Sokil\FrontendBundle\Spa\ApplicationDataProviderInterface`. It must implement one method `getData()`
which return map of application parameters.

## Model

### Handling json requests

Backbone models send json requests. 

To enable support, you may add FOSRestBundle, and configure serializer.
`app/AppKernel.php`:
```
new FOS\RestBundle\FOSRestBundle(),
```

`app/config/config.yml`:
```yaml
framework:
    serializer:
        enabled: true
        enable_annotations: true
```

It you don't need whole bundle, just register listener, which converts json request to array:
```
services:
    json_request_listener:
        class: Sokil\FrontendBundle\EventListener\JsonRequestListener
        tags:
            - {name: kernel.event_listener, event: kernel.request, method: onKernelRequest, priority: -255 }
```

## View

### Template

View renders `Marionette 2` application and starts it. `Bootstrap 3` used as UI framework. For adding some CSS and JS resorses 
on page, use macro from `src/Resources/views/macro.html.twig`:

```twig
{% import "@FrontendBundle/Resources/views/macro.html.twig" as frontend %}
<!DOCTYPE html>
<html>
    <head>
        {{ frontend.commonCssResources() }}
    </head>
    <body>
        <div id="content"></div>
        <div id="popup"></div>
    </body>
    {{ frontend.commonJsResources() }}
    <script type="text/javascript">
        (function() {
            // app options may be accessed through applicationData variable
            var options = {{ applicationData|json_encode|raw }};
            // router may be passed as option
            options.router = AcmeRouter;
            // container with fromtend services may be passed as option
            options.serviceDefinition = AcmeServiceDefinition;
            // root element of SPA app
            // optional, `body` used by default
            options.root = 'body';
            // regions of root app, optional
            options.regions = {
                content: '#content', // region for content of app
                popup: '#popup'      // region for popup rendering
            }
            // start app
            window.app = new Application(options);
            window.app.start();
        })();
    </script>
</html>
```

### Regions

Application refers to the root `app.rootView` view , which handles root element of the SPA application.
Root element may be configured in app options or used default value `body`. Root element holds some 
regions where different functinnality rendered. Main contebnt renders to `app.rootView.content` region, 
and popup renders to  `app.rootView.popup` region. You can pass your own regions and refers to them 
through `app.rootView`: 

### Router

Router is instance of `Backbone.Router`. Also you can use `Marionette.AppRouter`.

If you have few routes, you can pass them all in `routers` option:

```javascript
window.app = new Application({
    routers: [
        Bundle1Router,
        Bundle2Router
    ]
});
```


To set default route, use option `defaultRoute`:

```javascript
var Bundle1Router = new Backbone.Router({
    routes: {
        '/some/route': 'someRoute'
    },

    someRoute: function() {
        // ...
    }
});

window.app = new Application({
    routers: [
        Bundle1Router,
        Bundle2Router
    ],
    defaultRoute: [Bundle1Router, 'someRoute'];
});
```

### Service container

Container is a registry to build and get already built servies. Service definition is just an object with methods to build service instances, where `this`  refers to `Container` instance:

```javascript 
AcmeServiceDefinition = {
    someService: function() {
        return new SomeService(this.get('otherService'));
    },
    otherService: function() {
        return new OtherService();
    }
}
```

Definitions also may be merged and passed to container:

```javascript
options.serviceDefinitions = [
    Bundle1ServiceDefinition,
    Bundle2ServiceDefinition
];
```

Services then may be get from container:

```php
var someService = app.container.get('someService');
```

### Popup

Popups must extend `PopupView`:

```javascript,
var MyPopupView = PopupView.extend({
    
    events: {
        'click .save': 'saveButtonClickListener'
    },

    title: 'My Popup',
    
    buttons: [
        {class: 'btn-primary save', title: 'Save'}
    ]
}
```
