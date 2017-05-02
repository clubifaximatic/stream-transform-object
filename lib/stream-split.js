'use strict';

const Transform = require('stream').Transform;
const util = require('util');

const debug = require('debug')('sto:split');

var crypto = require('crypto');

/**
 *
 */
function StreamSplit (streams) {

  // input
  this.targetStreamIndex = 0;
  this.targetStreams = streams || [];
  this.nitems = this.targetStreams.length;

  // statistics
  this.started = 0;
  this.running = 0;
  this.finished = 0;

  if (!(this instanceof StreamSplit))
    return new StreamSplit(this.options);
  Transform.call(this, { objectMode: true });

  this.on('finish', function () {
    debug('- finish', { started: this.started, running: this.running, finished: this.finished });
    this.targetStreams.forEach(function (stream) {
      stream.end();
    });
  });

  this.on('error', function (err) {
    debug('- error', err);
    this.targetStreams.forEach(function (stream) {
      stream.emit('error', err);
    });
  });
}

// hierarchy
util.inherits(StreamSplit, Transform);

/**
 * [nextStream description]
 * @return {[type]} [description]
 */
StreamSplit.prototype.nextStream = function () {
  if (this.targetStreams.length === 0) return null;

  this.targetStreamIndex++;
  if (this.targetStreamIndex >= this.targetStreams.length) {
    this.targetStreamIndex = 0;
  }

  return this.targetStreams[this.targetStreamIndex];
};

/**
 * _flush
 */
StreamSplit.prototype._flush = function (cb) {
  debug('- _flush', 'running?', this.running);

  if (!this.running) {
    this.push(null);
    return cb();
  }

  // end
  this.endingFunc = cb;
};

/**
 * _transform
 * read items until the queue is full, then call transformation
 */
StreamSplit.prototype._transform = function (chunk, encoding, cb) {

  this.running++;

  debug('- _transform', this.started, 'running', this.running);

  //if not enough items, continue
  if (this.running < this.nitems) {
    cb();
    return this.nextStream().write(chunk, () => this.running--);
  }

  this.nextStream().write(chunk, () => {
    this.running--;
    cb();
  });
};

module.exports = StreamSplit;
