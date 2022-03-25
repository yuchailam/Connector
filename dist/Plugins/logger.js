"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _log4js = _interopRequireDefault(require("log4js"));

var _bunyan = _interopRequireDefault(require("bunyan"));

// for logging file
// for async logging to console
var path = require("path");

var logger = /*#__PURE__*/function () {
  function logger() {
    (0, _classCallCheck2["default"])(this, logger);
  }

  (0, _createClass2["default"])(logger, [{
    key: "initLogger",
    value: function initLogger(logFileName, appender) {
      this.appender = appender;
      this.logFileName = logFileName;
      this.log = null; // file log

      this.clog = null; // console.log

      var appenderString = {};
      appenderString[appender] = {
        type: "file",
        filename: path.join(__dirname, "/../../log/".concat(this.logFileName)),
        maxLogSize: 5242880,
        backups: 1,
        layout: {
          type: 'pattern',
          pattern: '%d{ISO8601_WITH_TZ_OFFSET} %p %c %m%n'
        }
      };
      appenderString["syslog"] = {
        type: "log4js-syslog-appender",
        tag: "mcs-api",
        facility: 5,
        hostname: "localhost",
        layout: {
          type: 'pattern',
          pattern: '%d{ISO8601_WITH_TZ_OFFSET} %p %c %m%n'
        }
      };

      _log4js["default"].configure({
        appenders: appenderString,
        categories: {
          "default": {
            appenders: [appender, "syslog"],
            level: "all"
          }
        },
        pm2: true
      });

      this.log = _log4js["default"].getLogger(appender);
      this.syslog = _log4js["default"].getLogger("syslog");
      this.clog = _bunyan["default"].createLogger({
        name: "MCS-".concat(appender)
      });
    }
  }, {
    key: "info",
    value: function info(msg) {
      // info => will log to file and console
      this.clog.info(msg);
      this.log.info("Info: ".concat(msg));
    }
  }, {
    key: "warn",
    value: function warn(msg) {
      this.clog.warn(msg);
      this.log.warn("Warn: ".concat(msg));
    }
  }, {
    key: "error",
    value: function error(msg) {
      this.clog.error(msg);
      this.syslog.error("Error: ".concat(msg));
    }
  }, {
    key: "fileLocation",
    get: function get() {
      return path.join(__dirname, "/../../log/".concat(this.logFileName));
    }
  }]);
  return logger;
}();

var _default = new logger(); // Logging: error
// - Date & Time
// - Module Name/Function
// - Message


exports["default"] = _default;