"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bookOffData = exports.bookOnData = void 0;

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _rankCodeMapping = _interopRequireDefault(require("../../config/rankCode-mapping.json"));

var _regionUserCodeMapping = _interopRequireDefault(require("../../config/region-userCode-mapping.json"));

var _userCodeDivisionMapping = _interopRequireDefault(require("../../config/userCode-division-mapping.json"));

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

var basicData = /*#__PURE__*/function () {
  function basicData(data) {
    (0, _classCallCheck2["default"])(this, basicData);
    this.officerUID = data.officerUID;
    this.lastUpdateTime = data.lastUpdateTime;
    this.rankCode = data.rankCode;
    this.callsign = data.callsign;
    this.finalRankCode = this._getRankCode();
    this.finalCallSign = this._getCallsign();
  }

  (0, _createClass2["default"])(basicData, [{
    key: "_getRankCode",
    value: function _getRankCode() {
      var _this = this;

      var rankGroup = _rankCodeMapping["default"].find(function (rm) {
        return rm.rankCode === _this.rankCode;
      });

      return rankGroup ? rankGroup.displayCode : this.rankCode;
    }
  }, {
    key: "_getCallsign",
    value: function _getCallsign() {
      if (this.callsign) {
        var callSignSplit = this.callsign.split(" ");
        callSignSplit[callSignSplit.length - 1] = "".concat(this.finalRankCode).concat(this.officerUID);
        return callSignSplit.join(" ");
      } else {
        return "";
      }
    }
  }]);
  return basicData;
}();

var bookOnData = /*#__PURE__*/function (_basicData) {
  (0, _inherits2["default"])(bookOnData, _basicData);

  var _super = _createSuper(bookOnData);

  function bookOnData(data) {
    var _this2;

    (0, _classCallCheck2["default"])(this, bookOnData);
    _this2 = _super.call(this, data);
    _this2.serverName = data.serverName;
    _this2.userCode = data.userCode;
    return _this2;
  }

  (0, _createClass2["default"])(bookOnData, [{
    key: "_getRegion",
    value: function _getRegion() {
      var _this3 = this;

      var rum = _regionUserCodeMapping["default"].find(function (rum) {
        return rum.userCode.includes(_this3.userCode);
      });

      return rum ? rum.region : "";
    }
  }, {
    key: "_getDivision",
    value: function _getDivision() {
      var _this4 = this;

      var udm = _userCodeDivisionMapping["default"].find(function (udm) {
        return udm.userCode === _this4.userCode;
      });

      return udm ? udm.division : "";
    }
  }, {
    key: "getServerName",
    value: function getServerName() {
      return this.serverName || "";
    }
  }, {
    key: "getFinalData",
    value: function getFinalData() {
      return {
        officerUID: this.officerUID,
        rankCode: this.finalRankCode,
        callsign: this.finalCallSign,
        division: this._getDivision(),
        lastUpdateTime: this.lastUpdateTime,
        userCode: this.userCode,
        region: this._getRegion()
      };
    }
  }]);
  return bookOnData;
}(basicData);

exports.bookOnData = bookOnData;

var bookOffData = /*#__PURE__*/function (_basicData2) {
  (0, _inherits2["default"])(bookOffData, _basicData2);

  var _super2 = _createSuper(bookOffData);

  function bookOffData(data) {
    (0, _classCallCheck2["default"])(this, bookOffData);
    return _super2.call(this, data);
  }

  (0, _createClass2["default"])(bookOffData, [{
    key: "getFinalData",
    value: function getFinalData() {
      return {
        officerUID: this.officerUID,
        rankCode: this.finalRankCode,
        callsign: this.finalCallSign,
        lastUpdateTime: this.lastUpdateTime,
        userCode: "",
        region: ""
      };
    }
  }]);
  return bookOffData;
}(basicData);

exports.bookOffData = bookOffData;