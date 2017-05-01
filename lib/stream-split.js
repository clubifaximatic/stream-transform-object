'use strict';

const Transform = require('stream').Transform;
const util = require('util');

const debug = require('debug')('sto:split');

/**
 * [write description]
 * @param  {[type]}   doc [description]
 * @param  {Function} cb  [description]
 * @return {[type]}       [description]
 */
function write (doc, cb) {
  // push if needed
  const stream = this.nextStream();

  console.log('write', stream._name);

  stream.write(doc, cb);
}

/**
 * 
 */
function StreamSplit (streams) {

  // input
  this.targetStreamIndex = 0;
  this.targetStreams = streams || [];
  this.nitems = this.targetStreams.length;

  this.targetStreams.forEach((d, n) => d._name = '#number' + n);

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

  // this.on('end', function () {
  //   debug('- end', { started: this.started, running: this.running, finished: this.finished });
  //   if (this.consume) this.cb(undefined, { started: this.started, running: this.running, finished: this.finished });
  // });

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
  if(this.targetStreams.length === 0) return null;

  this.targetStreamIndex++;
  if (this.targetStreamIndex >= this.targetStreams.length) {
    this.targetStreamIndex = 0;
  }

  return this.targetStreams[this.targetStreamIndex];
}

/**
 * _flush
 */
StreamSplit.prototype._flush = function (cb) {
  debug ('- _flush', 'running?', this.running);

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

  // if not enough items, continue
  if (this.running < this.nitems) {
    cb();
    return write.call(this, chunk);
  }

  write.call(this, chunk, cb);
};


module.exports = StreamSplit;
