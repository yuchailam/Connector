"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startAllRmqChannels = exports.startUserUpdate = exports.startBookOff = exports.startBookOn = exports.closeChannel = exports.rmqConnect = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _logger = _interopRequireDefault(require("./logger"));

var _loadConfig = require("../loadConfig");

var _index = require("../index");

var _data_rephrase = require("./data_rephrase");

var util = require("util");

var amqp = require("amqplib/callback_api");

var axios = require("axios");

var xmlParser = require("fast-xml-parser");

var he = require('he');

var xmpOptions = {
  tagValueProcessor: function tagValueProcessor(val, tagName) {
    return he.decode(val);
  } //default is a=>a

}; // port 5672

var rmqConnect = function rmqConnect(config) {
  return new Promise(function (resolve, reject) {
    amqp.connect(config, function (err0, connection) {
      if (err0) {
        _logger["default"].info("RabbitMQ Connection Error, system will try next re-connection in 30 sconds");

        return setTimeout(function () {
          return rmqConnect(config);
        }, 30000);
      }

      _logger["default"].info("RabbitMQ connected");

      connection.on('close', function () {
        _logger["default"].error("RabbitMQ is closed, system will try next re-connection in 30 sconds");

        return setTimeout(function () {
          return rmqConnect(config);
        }, 30000);
      });
      connection.on('error', function (err) {
        _logger["default"].error("RabbitMQ" + err.message);
      });
      var bookOnQueue = new Promise(function (resolve, reject) {
        return connection.createChannel(function (err1, channel) {
          if (err1) return reject(err1);
          return resolve(channel);
        });
      });
      var bookOffQueue = new Promise(function (resolve, reject) {
        return connection.createChannel(function (err1, channel) {
          if (err1) return reject(err1);
          return resolve(channel);
        });
      });
      var userUpdateQueue = new Promise(function (resolve, reject) {
        return connection.createChannel(function (err1, channel) {
          if (err1) return reject(err1);
          return resolve(channel);
        });
      });
      return Promise.all([bookOnQueue, bookOffQueue, userUpdateQueue]).then(function (result) {
        var channels = {
          bookOn: result[0],
          bookOff: result[1],
          userUpdate: result[2]
        };
        return resolve(channels);
      })["catch"](function (err) {
        return reject(err);
      });
    });
  });
};

exports.rmqConnect = rmqConnect;

var sendData = function sendData(url, data) {
  return axios.post(url, data, {
    headers: {
      "content-type": "application/json"
    }
  });
};

var sendBookOn = function sendBookOn(bookOnData) {
  var bookOnUrl = _loadConfig.env.BookOnApi;
  var userID = bookOnData.officers[0].officerUID;

  _logger["default"].info("Sending BookOn message to ".concat(bookOnUrl, " wtih data:  ").concat(util.inspect(bookOnData)));

  return sendData(bookOnUrl, bookOnData).then(function () {
    return _logger["default"].info("the user ".concat(userID, " bookOn has been sent"));
  })["catch"](function (error) {
    return sendDataErrorHander(error, userID, bookOnUrl, bookOnData, "BookOn");
  });
};

var sendBookOff = function sendBookOff(bookOffData) {
  var bookOffUrl = _loadConfig.env.BookOffApi;

  _logger["default"].info("Send BookOff message to ".concat(bookOffUrl, " wtih data:  ").concat(util.inspect(bookOffData)));

  return sendData(bookOffUrl, bookOffData).then(function () {
    return _logger["default"].info("bookOff has been sent");
  })["catch"](function (error) {
    return sendDataErrorHander(error, "", bookOffUrl, bookOffData, "BookOff");
  });
};

var sendDataErrorHander = function sendDataErrorHander(error, userID, URL, data, actionName) {
  if (error.response && error.response.status) {
    _logger["default"].error("".concat(actionName, " response: ") + error);

    var errCode = error.response.status;

    if (errCode === 400) {
      return _logger["default"].error("".concat(actionName, " resonse data: ") + util.inspect(error.response.data));
    } else if (errCode >= 500 && errCode <= 504) {
      return retrySendData(userID, URL, data, actionName);
    } else {
      return _logger["default"].error("".concat(actionName, " response data: ") + error.response.data);
    }
  } else if (error.request) {
    // No response – Network Error
    _logger["default"].error("".concat(actionName, " request (No response \u2013 Network Error): ") + error);

    return retrySendData(userID, URL, data, actionName);
  } else {
    return _logger["default"].error("".concat(actionName, " error code: ").concat(error.code, " \n error message: ").concat(error.message));
  }
};

var retrySendData = function retrySendData(userID, URL, data, actionName) {
  var extraDelay = getTimeDelay();
  var time = _loadConfig.env.BookOnOffRetryInterval * 1000 + extraDelay;

  _logger["default"].info("System now re-send the ".concat(userID, " ").concat(actionName, " request to ").concat(URL, " in ").concat(_loadConfig.env.BookOnOffRetryInterval, " seconds + ").concat(extraDelay, " ms delay"));

  var timeInterval = setInterval(function () {
    sendData(URL, data).then(function () {
      _logger["default"].info("The ".concat(userID, " ").concat(actionName, " request has been sent & stop re-send"));

      return clearInterval(timeInterval);
    })["catch"](function (err) {
      return _logger["default"].error("System now re-send the ".concat(userID, " ").concat(actionName, " request to ").concat(URL, " in ").concat(_loadConfig.env.BookOnOffRetryInterval, " seconds + ").concat(extraDelay, " ms delay \nError message: ").concat(err));
    });
  }, time);
};

var getTimeDelay = function getTimeDelay() {
  return _loadConfig.env.base_timeDelay + Math.floor(Math.random() * Math.floor(_loadConfig.env.addOn_timeDelay));
};

var closeChannel = function closeChannel(channel, channelName) {
  channel.cancel(channelName, function (err, ok) {
    if (err) _logger["default"].error("".concat(channelName, " close channel : ").concat(err));
    if (ok) _logger["default"].info("".concat(channelName, " close channel : Succeeded"));
  });
};

exports.closeChannel = closeChannel;

var startBookOn = function startBookOn(channel, queue) {
  // var queue = "bookOn";
  channel.assertQueue(queue, {
    durable: true
  });
  channel.consume(queue, /*#__PURE__*/function () {
    var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(msg) {
      var jsonData, finalData;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.prev = 0;
              jsonData = xmlParser.parse(msg.content.toString(), xmpOptions);

              if (jsonData) {
                _context.next = 5;
                break;
              }

              _logger["default"].info("Received 'Null' BookOn message from MCS database");

              return _context.abrupt("return", channel.ack(msg));

            case 5:
              if (!jsonData.bookOn) {
                _context.next = 9;
                break;
              }

              finalData = Array.isArray(jsonData.bookOn) ? jsonData.bookOn : [jsonData.bookOn];
              _context.next = 9;
              return sendBookOn({
                officers: finalData.map(function (data) {
                  return new _data_rephrase.bookOnData(data).getFinalData();
                })
              });

            case 9:
              _context.next = 14;
              break;

            case 11:
              _context.prev = 11;
              _context.t0 = _context["catch"](0);

              _logger["default"].error(_context.t0);

            case 14:
              return _context.abrupt("return", channel.ack(msg));

            case 15:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, null, [[0, 11]]);
    }));

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }(), {
    noAck: false,
    consumerTag: queue
  });
};

exports.startBookOn = startBookOn;

var startBookOff = function startBookOff(channel, queue) {
  // let queue = "bookOff";
  var dataBlockSize = 100; // max data in array in each packet

  channel.assertQueue(queue, {
    durable: true
  });
  channel.consume(queue, /*#__PURE__*/function () {
    var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(msg) {
      var jsonData, finalData, blockSize, promiseTask, i, startIndex, dataBlock;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              jsonData = xmlParser.parse(msg.content.toString(), xmpOptions);

              if (jsonData) {
                _context2.next = 4;
                break;
              }

              _logger["default"].info("Received 'Null' BookOff message from MCS database, reason maybe triggered twice resync function, nothing is happened");

              return _context2.abrupt("return", channel.ack(msg));

            case 4:
              if (jsonData.bookOff) {
                _context2.next = 7;
                break;
              }

              _logger["default"].info("Book Off has been completed, the BookOff event was triggered before");

              return _context2.abrupt("return", channel.ack(msg));

            case 7:
              finalData = Array.isArray(jsonData.bookOff) ? jsonData.bookOff : [jsonData.bookOff];
              blockSize = finalData.length / dataBlockSize;

              if (!(blockSize > 1)) {
                _context2.next = 16;
                break;
              }

              promiseTask = [];

              for (i = 0; i < blockSize; i++) {
                startIndex = i * dataBlockSize;
                dataBlock = finalData.slice(startIndex, startIndex + dataBlockSize);
                promiseTask.push(sendBookOff({
                  officers: dataBlock.map(function (data) {
                    return new _data_rephrase.bookOffData(data).getFinalData();
                  })
                }));
              }

              _context2.next = 14;
              return Promise.all(promiseTask);

            case 14:
              _context2.next = 18;
              break;

            case 16:
              _context2.next = 18;
              return sendBookOff({
                officers: finalData.map(function (data) {
                  return new _data_rephrase.bookOffData(data).getFinalData();
                })
              });

            case 18:
              return _context2.abrupt("return", channel.ack(msg));

            case 19:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));

    return function (_x2) {
      return _ref2.apply(this, arguments);
    };
  }(), {
    noAck: false,
    consumerTag: queue
  });
};

exports.startBookOff = startBookOff;

var startUserUpdate = function startUserUpdate(channel, queue) {
  // var queue = "userUpdate";
  channel.assertQueue(queue, {
    durable: true
  });
  channel.consume(queue, /*#__PURE__*/function () {
    var _ref3 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(msg) {
      var jsonData, updateData, oldUserData;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              jsonData = xmlParser.parse(msg.content.toString(), xmpOptions);

              if (jsonData) {
                _context3.next = 4;
                break;
              }

              _logger["default"].info("Received 'Null' userUpdate message from MCS database, nothing is updated");

              return _context3.abrupt("return", channel.ack(msg));

            case 4:
              updateData = jsonData.userUpdate;

              _logger["default"].info("Received 'userUpdate' from MCS database: " + util.inspect(updateData)); // -------------Handle BookOff data


              oldUserData = {
                officerUID: updateData.officerUID,
                rankCode: updateData.oldRankCode,
                callsign: updateData.oldCallsign,
                lastUpdateTime: updateData.lastUpdateTime
              };
              _context3.next = 9;
              return sendBookOff({
                officers: [new _data_rephrase.bookOffData(oldUserData).getFinalData()]
              });

            case 9:
              _logger["default"].info("userUpdate -> officerUID: ".concat(updateData.officerUID, " has been booked off"));

              _context3.next = 12;
              return sendBookOn({
                officers: [new _data_rephrase.bookOnData(updateData).getFinalData()]
              });

            case 12:
              _logger["default"].info("userUpdate -> officerUID: ".concat(updateData.officerUID, " has been booked on"));

              return _context3.abrupt("return", channel.ack(msg));

            case 14:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3);
    }));

    return function (_x3) {
      return _ref3.apply(this, arguments);
    };
  }(), {
    noAck: false,
    consumerTag: queue
  });
};

exports.startUserUpdate = startUserUpdate;

var startAllRmqChannels = function startAllRmqChannels(channels) {
  startBookOn(channels.bookOn, _index.channelQueueNames.bookOn);
  startBookOff(channels.bookOff, _index.channelQueueNames.bookOff);
  startUserUpdate(channels.userUpdate, _index.channelQueueNames.userUpdate);
};

exports.startAllRmqChannels = startAllRmqChannels;