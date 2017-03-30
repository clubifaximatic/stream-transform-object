'use strict';

var StreamSlice = require('./lib/stream-slice');
var StreamMap = require('./lib/stream-map');
var StreamFrequency = require('./lib/stream-frequency');
var StreamPuller = require('./lib/stream-puller');
var StreamDrain = require('./lib/stream-drain');

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

internals.puller = function (func) {
  return new StreamPuller(func);
};

internals.drain = function (callback) {
  return new StreamDrain(callback);
};

module.exports = internals;
