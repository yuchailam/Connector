"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _socketCon = _interopRequireDefault(require("./socketCon"));

var _logger = _interopRequireDefault(require("./logger"));

var _MCS_encoder = require("./MCS_encoder");

var sendToMCS_Socket = function sendToMCS_Socket(ports, nodeAddress, encodedMsg, oriMsg) {
  return _socketCon["default"].send(ports[0], nodeAddress, encodedMsg, oriMsg)["catch"](function () {
    return _socketCon["default"].send(ports[1], nodeAddress, encodedMsg, oriMsg);
  });
};

var sentToMCSBuilder = /*#__PURE__*/function () {
  function sentToMCSBuilder(ports, oriMsg, retryInterval, notificationID, radioHex, officerUID) {
    (0, _classCallCheck2["default"])(this, sentToMCSBuilder);
    this.ports = ports;
    this.oriMsg = oriMsg;
    this.retryInterval = retryInterval;
    this.notificationID = notificationID;
    this.radioHex = radioHex;
    this.officerUID = officerUID;
  }

  (0, _createClass2["default"])(sentToMCSBuilder, [{
    key: "send",
    value: function () {
      var _send = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(nodeAddress, userCode) {
        var _this = this;

        var encodedMsg;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                encodedMsg = (0, _MCS_encoder.encodeQueryResponse)("922", "2:".concat(this.radioHex, ":").concat(this.officerUID, ":1"), userCode, null, this.oriMsg);
                return _context.abrupt("return", sendToMCS_Socket(this.ports, nodeAddress, encodedMsg, this.oriMsg).then(function () {
                  return _logger["default"].info("NotificationID: ".concat(_this.notificationID, " \n Message: Operation Succeeded \n NodeAddress : ").concat(nodeAddress, " \n OriMsg: ").concat(JSON.stringify(_this.oriMsg)));
                })["catch"](function (err) {
                  var errorCounter = 0;

                  _logger["default"].error("\n                NotificationID: ".concat(_this.notificationID, " \n\n                Error Message: Server error HotHit cannot be sent: ").concat(err, ", Start re-try loop in every ").concat(_this.retryInterval, " seconds until it can be sent \n\n                NodeAddress : ").concat(nodeAddress, " \n\n                OriMsg: ").concat(_this.oriMsg));

                  var timeInterval = setInterval(function () {
                    return sendToMCS_Socket(_this.ports, nodeAddress, encodedMsg, _this.oriMsg).then(function () {
                      _logger["default"].info("NotificationID: ".concat(_this.notificationID, " \n Message: Operation Succeeded and HotHit re-try loop is terminated"));

                      return clearInterval(timeInterval);
                    })["catch"](function (err) {
                      errorCounter++;

                      _logger["default"].error("\n                        NotificationID: ".concat(_this.notificationID, " \n\n                        Error Message: Server error HotHit cannot be sent: ").concat(err, ", will try after ").concat(_this.retryInterval, " seconds \n\n                        NodeAddress : ").concat(nodeAddress, " \n\n                        OriMsg: ").concat(JSON.stringify(_this.oriMsg), " \n\n                        Count: ").concat(errorCounter));
                    });
                  }, _this.retryInterval);
                }));

              case 2:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function send(_x, _x2) {
        return _send.apply(this, arguments);
      }

      return send;
    }()
  }]);
  return sentToMCSBuilder;
}();

exports["default"] = sentToMCSBuilder;