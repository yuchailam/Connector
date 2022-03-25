const xmlParser = require("fast-xml-parser");
const he = require('he');
const xmlString = "<bookOn><officerUID>20001</officerUID><userCode>NPRC</userCode><lastUpdateTime>2021-05-18 08:42:00.000</lastUpdateTime><rankCode>PC</rankCode><callsign>EU$*&gt; SS81190</callsign><serverName>MCSHK</serverName></bookOn>"

const xmpOptions = {
    tagValueProcessor : (val, tagName) => he.decode(val), //default is a=>a
}
var jsonData = xmlParser.parse(xmlString, xmpOptions);

console.log(jsonData)