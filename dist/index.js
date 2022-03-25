"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.channelQueueNames = exports.channelStatus = exports.rmqChannels = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _app = _interopRequireDefault(require("./app"));

var _log4js = _interopRequireDefault(require("log4js"));

var _http = _interopRequireDefault(require("http"));

var _logger = _interopRequireDefault(require("./Plugins/logger"));

var _loadConfig = require("./loadConfig");

var _dbConnect = _interopRequireDefault(require("./Plugins/dbConnect"));

var _rmq_consumer = require("./Plugins/rmq_consumer");

var _cluster = _interopRequireDefault(require("cluster"));

var _os = _interopRequireDefault(require("os"));

var _process = _interopRequireDefault(require("process"));

var cpus = _os["default"].cpus().length;

_logger["default"].initLogger(_loadConfig.env.logFileName, _loadConfig.env.Node_env); // Must be global variable => let worker can access


var rmqChannels = {};
exports.rmqChannels = rmqChannels;
var channelStatus = {
  bookOn: true,
  bookOff: true,
  userUpdate: true
};
exports.channelStatus = channelStatus;
var channelQueueNames = {
  bookOn: "bookOn",
  bookOff: "bookOff",
  userUpdate: "userUpdate"
};
exports.channelQueueNames = channelQueueNames;

var main = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
    var i, server, rmqConfig;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!_cluster["default"].isMaster) {
              _context.next = 14;
              break;
            }

            _logger["default"].info("========================= MCS server started ========================= ");

            _logger["default"].info("Master ".concat(_process["default"].pid, " is running"));

            _logger["default"].info("Log file has been created at Path (".concat(_logger["default"].fileLocation, ")"));

            _logger["default"].info("Config file has been loaded { envName: ".concat(_loadConfig.env.Node_env, "; URL: http://").concat(_loadConfig.env.Host, ":").concat(_loadConfig.env.Port, " }"));

            _logger["default"].info("There are ".concat(cpus, " threads running")); // Signal Events
            //have default handlers on non-Windows platforms that reset the terminal mode before exiting with code 128 + signal number. If one of these signals has a listener installed, its default behavior will be removed (Node.js will no longer exit)


            _process["default"].once("SIGINT", function () {
              // await cleanUp();
              _logger["default"].error("MCS will be closed, due to SIGINT <Ctrl>+C / pm2 deletion process");

              _log4js["default"].shutdown(function () {
                _process["default"].exit(0);
              });
            }); //enerated with <Ctrl>+C


            _process["default"].once("SIGTERM", function (code) {
              // await cleanUp();
              _logger["default"].error("MCS will be closed, due to SIGTERM");

              _log4js["default"].shutdown(function () {
                _process["default"].exit(0);
              });
            });

            _process["default"].once("uncaughtException", function (err, origin) {
              _logger["default"].error("UncaughtException, MCS will be closed: ".concat(err, ", ").concat(origin));

              _log4js["default"].shutdown(function () {
                _process["default"].exit(0);
              });
            });

            for (i = 0; i < cpus; i++) {
              _cluster["default"].fork();
            }

            _cluster["default"].on("fork", function (worker) {
              worker.on('message', function (msg) {
                if (msg.rmqChannelControl) {
                  eachWorker(function (worker) {
                    return worker.send({
                      rmqChannel: msg.rmqChannelControl
                    });
                  });
                }
              });

              _logger["default"].info("Worker ".concat(worker.process.pid, " is running"));
            });

            _cluster["default"].on("exit", function (worker) {
              _logger["default"].info("Worker ".concat(worker.process.pid, " just died"));

              _cluster["default"].fork(); // fork a new worker

            });

            _context.next = 31;
            break;

          case 14:
            // --------- Database connection await
            server = _http["default"].Server(_app["default"]);
            rmqConfig = {
              hostname: _loadConfig.env.Rab_exchangeIP,
              username: _loadConfig.env.Rab_user,
              password: _loadConfig.env.Rab_password,
              heartbeat: 15
            };
            _context.prev = 16;
            _context.next = 19;
            return connectDB(_loadConfig.dbConfig);

          case 19:
            _context.next = 21;
            return (0, _rmq_consumer.rmqConnect)(rmqConfig);

          case 21:
            exports.rmqChannels = rmqChannels = _context.sent;
            (0, _rmq_consumer.startAllRmqChannels)(rmqChannels);

            _process["default"].on('message', function (msg) {
              if (msg.rmqChannel) {
                channelHandler(msg.rmqChannel);
              }
            });

            server.listen(_loadConfig.env.Port, _loadConfig.env.Host, function () {
              return _process["default"].nextTick(function () {
                return _logger["default"].info("Service is online and running at http://".concat(_loadConfig.env.Host, ":").concat(_loadConfig.env.Port));
              });
            });
            _context.next = 31;
            break;

          case 27:
            _context.prev = 27;
            _context.t0 = _context["catch"](16);

            _logger["default"].error(_context.t0);

            _logger["default"].error("MCS-Server is encountering error(s), please shut down MCS service by typing  pm2 delete 0 ");

          case 31:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[16, 27]]);
  }));

  return function main() {
    return _ref.apply(this, arguments);
  };
}();

var connectDB = /*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(dbConfig) {
    var dbArray;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            dbArray = dbConfig.map(function (dbInfo) {
              return _dbConnect["default"].connect(dbInfo).then(function (pool) {
                return pool;
              });
            });
            return _context2.abrupt("return", Promise.all(dbArray)["catch"](function (err) {
              throw err;
            }));

          case 2:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));

  return function connectDB(_x) {
    return _ref2.apply(this, arguments);
  };
}();

var eachWorker = function eachWorker(callback) {
  for (var id in _cluster["default"].workers) {
    return callback(_cluster["default"].workers[id]);
  }

  return true;
};

var channelHandler = function channelHandler(action) {
  switch (action) {
    case '/stopBookOn':
      (0, _rmq_consumer.closeChannel)(rmqChannels.bookOn, channelQueueNames.bookOn);
      channelStatus.bookOn = false;

      _logger["default"].warn("BookOn service has been stopped -- disconnect bookOn queue");

      break;

    case '/stopBookOff':
      (0, _rmq_consumer.closeChannel)(rmqChannels.bookOff, channelQueueNames.bookOff);
      channelStatus.bookOff = false;

      _logger["default"].warn("BookOff service has been stopped -- disconnect BookOff queue");

      break;

    case '/stopUserUpdate':
      (0, _rmq_consumer.closeChannel)(rmqChannels.userUpdate, channelQueueNames.userUpdate);
      channelStatus.userUpdate = false;

      _logger["default"].warn("BookOff service has been stopped -- disconnect BookOff queue");

      break;

    case '/startBookOn':
      (0, _rmq_consumer.startBookOn)(rmqChannels.bookOn, channelQueueNames.bookOn);
      channelStatus.bookOn = true;

      _logger["default"].warn("BookOn service has been started -- listening to bookOn queue");

      break;

    case '/startBookOff':
      (0, _rmq_consumer.startBookOff)(rmqChannels.bookOff, channelQueueNames.bookOff);
      channelStatus.bookOff = true;

      _logger["default"].warn("BookOff service has been started -- listening BookOff queue");

      break;

    case '/startUserUpdate':
      (0, _rmq_consumer.startUserUpdate)(rmqChannels.userUpdate, channelQueueNames.userUpdate);
      channelStatus.userUpdate = true;

      _logger["default"].warn("BookOff service has been started -- listening BookOff queue");

      break;

    default:
      break;
  }

  return;
};

main();