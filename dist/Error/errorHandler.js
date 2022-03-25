"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.errorClinetHandle = exports.errorLogHandle = void 0;

var _logger = _interopRequireDefault(require("../Plugins/logger"));

function errString(method, URL, errMsg, stack) {
  return "Method: ".concat(method, "; API URL: ").concat(URL, "; \nerrMsg: ").concat(errMsg, "; \nstack: ").concat(stack);
}

var errorLogHandle = function errorLogHandle(err, req, res, next) {
  if (err.status === 500) {
    var errLog = errString(req.method, req.originalUrl, err.message, err.stack);

    _logger["default"].error(errLog);
  }

  next(err);
};

exports.errorLogHandle = errorLogHandle;

var errorClinetHandle = function errorClinetHandle(err, req, res, next) {
  return res.status(err.status || 500).json({
    message: [{
      code: err.status,
      message: err.message
    }]
  });
};

exports.errorClinetHandle = errorClinetHandle;