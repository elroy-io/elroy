var Scientist = require('../../scientist');
var Nightlight = require('./nightlight');

var HelloApp = module.exports = function() {
  this.name = 'hello';
};

HelloApp.prototype.init = function(elroy) {
  /*elroy.get('joes-office-photosensor', function(err, photosensor) {
    elroy.get('joes-office-led', function(err, led) {
      photosensor.on('change', function(value) {
        if (value < 100) {
          led.call('turn-on');
        } else {
          led.call('turn-off');
        }
      });

      elroy.expose(led);
      elroy.expose(photosensor);
    });
  });*/

  elroy.observe('type="led"').subscribe(function(err, led) {
    elroy.expose(led);
  });
};
