"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = _default;

var crypto = require("crypto");

var ENCRYPTION_KEY = "p@ssw0Rdp@ssw0Rdp@ssw0Rdp@ssw0Rd";

function _default(text) {
  var textParts = text.split(":");
  var iv = Buffer.from(textParts.shift(), "hex");
  var encryptedText = Buffer.from(textParts.join(":"), "hex");
  var decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  var decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher["final"]()]);
  return decrypted.toString();
}