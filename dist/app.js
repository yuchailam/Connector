"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _express = _interopRequireDefault(require("express"));

var _expressRateLimit = _interopRequireDefault(require("express-rate-limit"));

var _mobileAPI = _interopRequireDefault(require("./Router/mobileAPI"));

var _controlAPI = _interopRequireDefault(require("./Router/controlAPI"));

var _helmet = _interopRequireDefault(require("helmet"));

var _errorHandler = require("./Error/errorHandler");

var app = (0, _express["default"])(); //----------------- express config

app.use(_express["default"].json());
app.use(_express["default"].urlencoded({
  extended: false
})); //----------------- Security
// DDoS attack

var limiter = (0, _expressRateLimit["default"])({
  windowMs: 1 * 60 * 1000,
  // 1 minute
  max: 100 // limit each IP to 100 requests per windowMs

});
app.use(limiter); // apply to all requests
// HTTP header attack

app.use((0, _helmet["default"])()); //----------------- Routes

app.use("/duty", _mobileAPI["default"]);
app.use("/control", _controlAPI["default"]); // app.use(express.static(__dirname + "/dev/dist/"));
// app.get(/.*/, (req, res) => res.sendFile(__dirname + "/index.html"));
// heartbeat checking for HAProxy health check 

app.get('/heartbeat', function (req, res) {
  return res.status(200).end();
}); //----------------- Middele
// JWT ?

app.use(function (req, res, next) {
  next(); // next(createError(404))
}); //----------------- Error Handle

app.use(_errorHandler.errorLogHandle);
app.use(_errorHandler.errorClinetHandle);
module.exports = app;