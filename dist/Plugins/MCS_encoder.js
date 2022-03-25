"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeQueryResponse = exports.decodeErrorResponse = void 0;

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var EOT = "\x0004";
var ETX = String.fromCharCode(parseInt("0003", 16));
var FS = String.fromCharCode(parseInt("001c", 16));
var SOH = String.fromCharCode(parseInt("0001", 16));
var STX = String.fromCharCode(parseInt("0002", 16));
var TS = ";"; // <SOH>998<FS>transactionID<STX>FaultMsg=900<FS>FaultType=1<FS>FaultField=RecordCount<FS>FaultValue=<FS><ETX>?<EOT>

var decodeErrorResponse = function decodeErrorResponse(bufMsg) {
  var rawHex = Buffer.from(bufMsg, "utf8");
  var fsIndex = 1;
  var newFsIndex = rawHex.indexOf(FS);
  var errCode = rawHex.subarray(fsIndex, newFsIndex).toString();
  fsIndex = newFsIndex + 1;
  newFsIndex = rawHex.indexOf(FS, rawHex.indexOf(FS) + 1);
  var secondPart = rawHex.subarray(fsIndex, rawHex.indexOf(FS, newFsIndex));
  var transactionID = secondPart.subarray(0, secondPart.indexOf(STX)).toString();
  var faultMsg = secondPart.subarray(secondPart.indexOf(STX) + 1, secondPart.length).toString();
  fsIndex = newFsIndex + 1;
  newFsIndex = rawHex.indexOf(FS, newFsIndex + 2);
  var FaultType = rawHex.subarray(fsIndex, rawHex.indexOf(FS, newFsIndex)).toString();
  fsIndex = newFsIndex + 1;
  newFsIndex = rawHex.indexOf(FS, newFsIndex + 3);
  var FaultField = rawHex.subarray(fsIndex, rawHex.indexOf(FS, newFsIndex)).toString();
  fsIndex = newFsIndex + 1;
  newFsIndex = rawHex.indexOf(FS, newFsIndex + 4);
  var FaultValue = rawHex.subarray(fsIndex, newFsIndex).toString().split("&#xD;&#xA;"); //&#xD(Cr) &#xA(Cf)

  return {
    errCode: errCode,
    transactionID: transactionID,
    faultMsg: faultMsg,
    FaultType: FaultType,
    FaultField: FaultField,
    FaultValue: FaultValue
  };
};

exports.decodeErrorResponse = decodeErrorResponse;

var encodeQueryResponse = function encodeQueryResponse(msgID, transactionID, dest, form, request) {
  //<SOH>922<FS>1234<STX>To=WCHRC;MKHRC<FS>Subject=Subject<FS>Msg=Hot Hit<FS><ETX>?<EOT>
  var message = []; // byte

  var subject = "Subject=".concat(UnicodeToHtml(request.subject));
  var msg = "Msg=Hot Hit: ".concat(UnicodeToHtml(request.msg));
  message.push(SOH, // Packer prefix
  msgID, //Header=> "922"
  FS, transactionID, //Header=>  (2:5B8D81:11001)  <client type>:<Radio ID in hex>:<User Name>:transactionID
  STX, //Header=> endCode
  "To=", dest, //data=> HotHit Group UserCode (WCHRC)
  FS, subject, FS, msg, FS); // Add end of message seperator

  message.push(ETX);
  return message.join("").concat("\x7e", "\x04");
};

exports.encodeQueryResponse = encodeQueryResponse;

var UnicodeToHtml = function UnicodeToHtml(oString) {
  if (!oString) {
    return oString;
  }

  var asciiEnd = String.fromCharCode(parseInt("00ff", 16));
  var finalStr = [];
  (0, _toConsumableArray2["default"])(oString).forEach(function (_char) {
    // if is chinese or "&" or "|" char => convert it to utf-16
    if (" " > _char || _char > asciiEnd || _char === "&" || _char === "|") {
      var rawBufferHexArray = (0, _toConsumableArray2["default"])(Buffer.from(_char, "utf16le").toString("hex"));
      var hexString = "".concat(rawBufferHexArray[2]).concat(rawBufferHexArray[3]).concat(rawBufferHexArray[0]).concat(rawBufferHexArray[1]);
      finalStr.push("&#x".concat(hexString, ";"));
    } else {
      finalStr.push(_char);
    }
  });
  return finalStr.join("");
};