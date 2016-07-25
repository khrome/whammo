var Emitter = require('extended-emitter');

function ApplicationError(msg, type){
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
  this.code = type || 500;
  this.name = 'ApplicationError';
};
ApplicationError.prototype.__proto__ = Error.prototype;

ApplicationError.events = new Emitter();

module.exports = ApplicationError;