
var StreamSlice = require('./lib/stream-slice');
var StreamMap = require('./lib/stream-map');
var StreamFrequency = require('./lib/stream-frequency');

var internals = {};

internals.slice = function (nitems, func, callback) {
  return new StreamSlice(nitems, func, callback);
};

internals.map = function (nitems, func, callback) {
  return new StreamMap(nitems, func, callback);
};

internals.frequency = function (nitems, func, callback) {
  return new StreamFrequency(nitems, func, callback);
};

module.exports = internals;
