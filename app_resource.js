var querystring = require('querystring');
var url = require('url');

var buildActions = exports.buildActions = function(machine) {
  var actions = null;

  Object.keys(machine.transitions).forEach(function(type) {
    var transition = machine.transitions[type];
    var fields = transition.fields ? [].concat(transition.fields) : [];
    fields.push({ name: 'action', type: 'hidden', value: type });

    var action = {
      name: type,
      method: 'POST',
      href: null,
      fields: fields
    };

    if (!actions) {
      actions = [];
    }

    actions.push(action);
  });

  return actions;
};

var buildEntity = exports.buildEntity = function buildEntity(loader, env, machine, actions, selfPath) {
  machine.update();
  selfPath = selfPath || env.helpers.url.current();

  var entity = {
    class: [machine.type],
    properties: machine.properties,
    entities: undefined,
    actions: actions,
    links: [{ rel: ['self'], href: selfPath },
            { rel: ['index'], href: env.helpers.url.path(loader.path) }]
  };

  if (machine._devices.length) {
    entity.entities = machine._devices.filter(function(device) {
      var path = env.helpers.url.join(device.name);

      if (loader.exposed[url.parse(path).path]) {
        return device;
      }
    }).map(function(device) {
      var path = env.helpers.url.join(device.name);
      return buildEntity(env, device, null, path)
    });
  }

  if (entity.actions) {
    entity.actions.forEach(function(action) {
      action.href = env.helpers.url.current();
    });

    entity.actions = entity.actions.filter(function(action) {
      var allowed = machine.allowed[machine.state];
      if (allowed && allowed.indexOf(action.name) > -1) {
        return action;
      }
    });
  }

  return entity;
};

exports.create = function(loader) {

  var AppResource = function() {
    this.path = loader.path;
  };


  AppResource.prototype.init = function(config) {
    config.path(this.path)
      .produces('application/vnd.siren+json')
      .consumes('application/x-www-form-urlencoded')
      .get('/', this.home)
      .get('/{splat: (.*)}', this.show)
      .post('/{splat: (.*)}', this.action)
  };

  AppResource.prototype.home = function(env, next) {
    var entity = {
      class: ['app'],
      properties: {
        name: loader.app.name
      },
      entities: [],
      links: [ { rel: ['self'], href: env.helpers.url.path(this.path) } ]
    };

    Object.keys(loader.exposed).forEach(function(path) {
      var machine = loader.exposed[path];
      entity.entities.push({
        class: ['machine'],
        rel: ['http://rels.elroy.io/machine'],
        properties: machine.properties,
        links: [ { rel: ['self'], href: env.helpers.url.path(path) } ]
      })
    });

    env.response.body = entity;
    next(env);
  };

  AppResource.prototype.show = function(env, next) {
    // match path
    // load machine
    // build representation
    // don't forget subdevices

    var machine = loader.exposed[this.path + '/' + env.route.params.splat];

    if (!machine) {
      // return 404
      env.response.statusCode = 404;
      return next(env);
    }

    var actions = buildActions(machine);

    env.response.body = buildEntity(loader, env, machine, actions);
    next(env);
  };

  AppResource.prototype.action = function(env, next) {
    var machine = loader.exposed[this.path + '/' + env.route.params.splat];

    if (!machine) {
      env.response.statusCode = 404;
      return next(env);
    }

    var actions = buildActions(machine);

    env.request.getBody(function(err, body) {
      body = querystring.parse(body.toString());

      if (!body.action) {
        env.response.statusCode = 400;
        return next(env);
      }

      var action = actions.filter(function(action) {
        return (action.name === body.action);
      });

      if (!action || !action.length) {
        env.response.statusCode = 400;
        return next(env);
      }

      action = action[0];

      var args = [action.name];

      if (action.fields && action.fields.length) {
        action.fields.forEach(function(field) {
          if (field.name !== 'action') {
            args.push(body[field.name]);
          }
        });
      }

      var cb = function(err) {
        if (err) {
          env.response.statusCode = 500;
        } else {
          var entity = buildEntity(loader, env, machine, actions);
          env.response.body = entity;
        }

        next(env);
      };

      args.push(cb);

      machine.call.apply(machine, args);

    });
  };

  return AppResource;
};
