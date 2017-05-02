'use strict';

const Readable = require('stream').Readable;
const util = require('util');

/**
 * Call original provided function for getting more results
 */
function _readNext (self, cb) {
  self._n++;
  self._readNext(self._n, function (err, items) {

    // if error
    if (err) return self.emit('error', err);

    // if end
    if (!items || (Array.isArray(items) && items.length === 0)) return self.push(null);

    const theItems = Array.isArray(items) ? items : [items];
    theItems.forEach(function (doc) {
      self.buffer.push(doc);
    });

    self._read();
  });
}


/**
 * Constructor
 */
var StreamPuller = function (func) {

  this.buffer = [];
  this._readNext = func;

  Readable.call(this, { objectMode: true });
};

util.inherits(StreamPuller, Readable);

/**
 *
 */
StreamPuller.prototype._read = function () {

  if (this.buffer.length > 0) {
    return this.push(this.buffer.shift());
  }

  // read more
  _readNext(this);
};

module.exports = StreamPuller;
