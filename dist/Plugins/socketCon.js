"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _net = _interopRequireDefault(require("net"));

var _logger = _interopRequireDefault(require("../Plugins/logger"));

var util = require("util");

var socketCient = /*#__PURE__*/function () {
  function socketCient() {
    (0, _classCallCheck2["default"])(this, socketCient);
  }

  (0, _createClass2["default"])(socketCient, null, [{
    key: "send",
    value: function send(port, address, message, rawMsg) {
      _logger["default"].info("Start send socket message to ".concat(address, ":").concat(port, ", with data: ").concat(util.inspect(rawMsg)));

      return new Promise(function (resolve, reject) {
        var socket = new _net["default"].Socket();
        socket.connect(port, address, function () {
          socket.write(message, function (err) {
            if (err) {
              return reject(new Error("Socket cannot send to ".concat(address, ":").concat(port)));
            }

            _logger["default"].info("Socket message was sent to ".concat(address, ":").concat(port, " successfully"));

            socket.destroy();
            return resolve();
          });
        });
        socket.on("data", function (data) {
          _logger["default"].info("Receive data from ".concat(address, ":").concat(port, ", data: ").concat(data));
        });
        socket.on("error", function (err) {
          _logger["default"].error("Socket message was sent to ".concat(address, ":").concat(port, " failed, with err: ").concat(err));

          socket.destroy();
          return reject(err);
        }); //   socket.on("close", () => {
        //     console.log("socket Close");
        //   });
      });
    }
  }]);
  return socketCient;
}();

exports["default"] = socketCient;