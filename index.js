'use strict';

const StreamSlice = require('./lib/stream-slice');
const StreamMap = require('./lib/stream-map');
const StreamFrequency = require('./lib/stream-frequency');
const StreamPuller = require('./lib/stream-puller');
const StreamDrain = require('./lib/stream-drain');
const StreamSplit = require('./lib/stream-split');

const internals = {};
module.exports = internals;

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

internals.split = function (streams) {
  return new StreamSplit(streams);
};

