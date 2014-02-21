var FogAppLoader = require('./fog_app_loader');
var Scientist = require('./scientist');
var DevicesResource = require('./api_resources/devices');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var FogRuntime = module.exports = function(argo, scouts) {
  this.argo = argo;
  this.devices = [];
  this.scouts = scouts;
};
util.inherits(FogRuntime, EventEmitter);

FogRuntime.prototype.init = function(cb) {
  var self = this;

  self.argo
    .add(DevicesResource, self.devices)

  var count = 0;
  var max = this.scouts.length;
  this.scouts.forEach(function(scout) {
    scout = new scout();
    scout.init();
    scout.on('discover', function(device) {
      var machine = Scientist.configure(device);
      self.devices.push(machine);
      self.emit('deviceready', machine);
    });

    count++;
    if (count == max) {
      cb();
    }
  });

};

FogRuntime.prototype.loadApp = function(resource) {
  this.argo.add(resource);
};

FogRuntime.prototype.loadApps = function(apps, cb) {
  var self = this;
  var count = 0;
  var length = apps.length;
  apps.forEach(function(constructor) {
    var app = new constructor();
    var loader = new FogAppLoader(self);
    loader.load(app);

    count++;
    if (count === length) {
      cb();
    }
  });
};

FogRuntime.prototype.get = function(id, cb) {
  var device = this.devices.filter(function(device) {
    return device.name === id;
  });

  if(device.length) {
    setImmediate(function() { cb(null, device[0]); });
  } else {
    //cb(new Error('Device not found.'));
    this.on('deviceready', function(device){
      if(device.name === id) {
        setImmediate(function() { cb(null, device); });
      }
    });
  }
  
};
