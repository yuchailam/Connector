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

var _mssql = _interopRequireDefault(require("mssql"));

var _events = require("events");

var dbPools = /*#__PURE__*/function () {
  function dbPools() {
    (0, _classCallCheck2["default"])(this, dbPools);
    this.pools = {};
    this.em = new _events.EventEmitter();
  }

  (0, _createClass2["default"])(dbPools, [{
    key: "connect",
    value: function connect(config) {
      var _this = this;

      var dbConfig = {
        user: config.user,
        password: config.password,
        server: config.server,
        // You can use 'localhost\\instance' to connect to named instance
        database: config.database,
        stream: false,
        options: {
          encrypt: false,
          // Use this if you're on Windows Azure
          enableArithAbort: true,
          trustedConnection: true
        },
        port: 1433
      }; // Name, pool name
      // ======= create Pool
      // eslint-disable-next-line no-async-promise-executor

      return new Promise( /*#__PURE__*/function () {
        var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(resolve, reject) {
          var conPool;
          return _regenerator["default"].wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  if (Object.prototype.hasOwnProperty.call(_this.pools, config.name)) {
                    _context.next = 14;
                    break;
                  }

                  conPool = new _mssql["default"].ConnectionPool(dbConfig);
                  _context.prev = 2;
                  _context.next = 5;
                  return conPool.connect();

                case 5:
                  _this.pools[config.name] = _context.sent;
                  return _context.abrupt("return", resolve(_this.pools[config.name]));

                case 9:
                  _context.prev = 9;
                  _context.t0 = _context["catch"](2);
                  return _context.abrupt("return", reject(_context.t0));

                case 12:
                  _context.next = 15;
                  break;

                case 14:
                  return _context.abrupt("return", reject(new Error("The pool ( ".concat(config.name, " ) already connected, the connection wasn't completed"))));

                case 15:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, null, [[2, 9]]);
        }));

        return function (_x, _x2) {
          return _ref.apply(this, arguments);
        };
      }());
    }
  }, {
    key: "query",
    value: function query(name, queryString) {
      if (Object.prototype.hasOwnProperty.call(this.pools, name)) {
        return this.pools[name].request().query(queryString);
      } else {
        throw new Error("The pool ( ".concat(name, " ) hasn't been created, if you want to create a pool, use connect() "));
      }
    }
  }, {
    key: "queryAll",
    value: function () {
      var _queryAll = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(queryString) {
        var _this2 = this;

        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                return _context2.abrupt("return", Promise.all(Object.keys(this.pools).map(function (name) {
                  return _this2.pools[name].request().query(queryString).then(function (result) {
                    return {
                      name: name,
                      data: result
                    };
                  });
                })).then(function (result) {
                  return result.map(function (node) {
                    return {
                      status: "sucess",
                      dbNode: node.name,
                      record: node.data.recordset,
                      numOfRecord: parseInt(node.data.rowsAffected.toString())
                    };
                  });
                }));

              case 1:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function queryAll(_x3) {
        return _queryAll.apply(this, arguments);
      }

      return queryAll;
    }()
  }, {
    key: "closeAll",
    value: function () {
      var _closeAll = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
        var _this3 = this;

        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                return _context3.abrupt("return", Promise.all(Object.values(this.pools).map(function (pool) {
                  return pool.close();
                })).then(function () {
                  _this3.pools = null;
                  return true;
                })["catch"](function (err) {
                  throw err;
                }));

              case 1:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function closeAll() {
        return _closeAll.apply(this, arguments);
      }

      return closeAll;
    }()
  }]);
  return dbPools;
}();

var _default = new dbPools();

exports["default"] = _default;