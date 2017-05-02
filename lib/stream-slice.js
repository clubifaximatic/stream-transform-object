'use strict';

const Transform = require('stream').Transform;
const util = require('util');

const debug = require('debug')('sto:slice');


/**
 * process
 */
function doTransformation (cb) {

  this.startedChunks++;

  // copy objects
  var theQueue = this.queue;
  this.queue = [];
  this.running++;

  // if no function then stream all documents
  if (!this.func) {
    // no transformation, push if needed
    if (!this.consume) {
      theQueue.forEach(function (doc) {
        this.push(docs);
      });
    }

    this.finished += theQueue.length;
    this.running--;

    debug(' doTransformation (nofunc) running:', this.running);
    cb();
  }

  // call transformation function
  var _this = this;
  this.func.call(this, theQueue, function (err, docs) {

      // check if error
      if (err) {
        return _this.emit('error', err);
      }

      // push if needed (we do not consume)
      if (!_this.consume && docs) {
        docs.forEach(function (doc) {
          _this.push(doc);
        });
      }

      _this.finished += theQueue.length;
      _this.running--;

      debug(' doTransformation running:', _this.running);
      cb();
    },

    this.startedChunks
  );
}

/**
 * The transformation function is called with a group of `nitems` objects
 * If a callback is provided, the stream is not propagated further
 */
function StreamSlice (nitems, func, callback) {

  debug('new StreamSlice');

  // input
  this.nitems = nitems || 10;
  this.func = func ? func.bind(this) : func;
  this.cb = callback;

  // statistics
  this.started = 0;
  this.finished = 0;
  this.running = 0;

  // control
  this.startedChunks = 0;
  this.queue = [];
  this.consume = callback ? true : false;
  this.endFunc = null;

  if (!(this instanceof StreamSlice))
    return new StreamSlice(this.options);
  Transform.call(this, { objectMode: true });

  this.on('finish', function () {
    debug('- finish', { started: this.started, running: this.running, finished: this.finished });
  });

  this.on('end', function () {
    debug('- end', { started: this.started, running: this.running, finished: this.finished });
    if (this.consume) this.cb(undefined, { started: this.started, running: this.running, finished: this.finished });
  });

  this.on('error', function (err) {
    debug('- error', err);
    if (this.consume) this.cb(err, { started: this.started, running: this.running, finished: this.finished });
  });

  // if we do not consume the stream, do nothing else
  if (!this.consume) {
    return;
  }

  this.on('readable', function () {
    debug('- readable');
    while (this.read());
  });
}

// hierarchy
util.inherits(StreamSlice, Transform);

/**
 * _flush
 */
StreamSlice.prototype._flush = function (cb) {
  debug('- _flush', 'queue?', this.queue.length, 'running:', this.running);

  // if no element in the queue, we finished
  if (this.queue.length === 0) {
    this.push(null);
    return cb();
  }

  // last call with remaining elements
  var _this = this;
  doTransformation.call(this, function () {
    _this.push(null);
    cb();
  });
};

/**
 * _transform
 * read items until the queue is full, then call transformation
 */
StreamSlice.prototype._transform = function (chunk, encoding, cb) {

  this.started++;
  this.queue.push(chunk);

  debug('- _transform', this.started, 'queue?', this.queue.length, 'running?', this.running);

  // if not enough items, continue
  if (this.queue.length < this.nitems) {
    return cb();
  }

  doTransformation.call(this, cb);
};

module.exports = StreamSlice;
