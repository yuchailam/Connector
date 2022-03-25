"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _logger = _interopRequireDefault(require("../Plugins/logger"));

var _index = require("../index");

var router = _express["default"].Router();

var validateUser = function validateUser(req, res, next) {
  var apiLogin = {
    username: "admin",
    password: "motoAdmin123"
  };
  var username = req.body.username;
  var password = req.body.password;

  if (!username || !password) {
    // console.error("No Firebase ID token was passed as a Bearer token in the Authorization header");
    return res.status(401).end("The username or password is missing");
  }

  if (username === apiLogin.username && password === apiLogin.password) {
    //valid user
    return next();
  } else {
    // username or password error
    return res.status(401).end("The username or password is incorrect");
  }
}; // login checking name and password


router.use(validateUser);
router.post("/stopBookOn", function (req, res, next) {
  _logger["default"].warn("Received a /stopBookOn post request");

  if (_index.channelStatus.bookOn) {
    process.send({
      rmqChannelControl: '/stopBookOn'
    });
  } else {
    return res.status(400).end("BookOn service has been stopped -- request failed");
  }

  return res.status(200).end();
});
router.post("/stopBookOff", function (req, res, next) {
  _logger["default"].warn("Received a /stopBookOff post request");

  if (_index.channelStatus.bookOff) {
    process.send({
      rmqChannelControl: '/stopBookOff'
    });
  } else {
    return res.status(400).end("BookOff service has been stopped -- request failed");
  }

  return res.status(200).end(rmqChannels.bookOff);
});
router.post("/stopUserUpdate", function (req, res, next) {
  _logger["default"].warn("Received a /stopUserUpdate post request");

  if (_index.channelStatus.userUpdate) {
    process.send({
      rmqChannelControl: '/stopUserUpdate'
    });
  } else {
    return res.status(400).end("UserUpdate service has been stopped -- request failed");
  }

  return res.status(200).end(rmqChannels.bookOff);
});
router.post("/startBookOn", function (req, res, next) {
  _logger["default"].warn("Received a /startBookOn post request");

  if (_index.channelStatus.bookOn) {
    return res.status(400).end("BookOn service has been started -- request failed");
  } else {
    process.send({
      rmqChannelControl: '/startBookOn'
    });
  }

  return res.status(200).end();
});
router.post("/startBookOff", function (req, res, next) {
  _logger["default"].warn("Received a /startBookOff post request");

  if (_index.channelStatus.bookOff) {
    return res.status(400).end("BookOff service has been started -- request failed");
  } else {
    process.send({
      rmqChannelControl: '/startBookOff'
    });
  }

  return res.status(200).end();
});
router.post("/startUserUpdate", function (req, res, next) {
  _logger["default"].warn("Received a /startBookOff post request");

  if (_index.channelStatus.userUpdate) {
    return res.status(400).end("userUpdate service has been started -- request failed");
  } else {
    process.send({
      rmqChannelControl: '/startUserUpdate'
    });
  }

  return res.status(200).end();
});
var _default = router;
exports["default"] = _default;