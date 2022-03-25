let EOT = "\x0004";
let ETX = String.fromCharCode(parseInt("0003", 16));
let FS = String.fromCharCode(parseInt("001c", 16));
let SOH = String.fromCharCode(parseInt("0001", 16));
let STX = String.fromCharCode(parseInt("0002", 16));
let TS = ";";

// <SOH>998<FS>transactionID<STX>FaultMsg=900<FS>FaultType=1<FS>FaultField=RecordCount<FS>FaultValue=<FS><ETX>?<EOT>
export const decodeErrorResponse = (bufMsg) => {
  let rawHex = Buffer.from(bufMsg, "utf8");

  let fsIndex = 1;
  let newFsIndex = rawHex.indexOf(FS);

  let errCode = rawHex.subarray(fsIndex, newFsIndex).toString();
  fsIndex = newFsIndex + 1;
  newFsIndex = rawHex.indexOf(FS, rawHex.indexOf(FS) + 1);

  let secondPart = rawHex.subarray(fsIndex, rawHex.indexOf(FS, newFsIndex));
  let transactionID = secondPart.subarray(0, secondPart.indexOf(STX)).toString();
  let faultMsg = secondPart.subarray(secondPart.indexOf(STX) + 1, secondPart.length).toString();

  fsIndex = newFsIndex + 1;
  newFsIndex = rawHex.indexOf(FS, newFsIndex + 2);

  let FaultType = rawHex.subarray(fsIndex, rawHex.indexOf(FS, newFsIndex)).toString();
  fsIndex = newFsIndex + 1;
  newFsIndex = rawHex.indexOf(FS, newFsIndex + 3);

  let FaultField = rawHex.subarray(fsIndex, rawHex.indexOf(FS, newFsIndex)).toString();
  fsIndex = newFsIndex + 1;
  newFsIndex = rawHex.indexOf(FS, newFsIndex + 4);

  let FaultValue = rawHex.subarray(fsIndex, newFsIndex).toString().split("&#xD;&#xA;");

  //&#xD(Cr) &#xA(Cf)
  return {
    errCode: errCode,
    transactionID: transactionID,
    faultMsg: faultMsg,
    FaultType: FaultType,
    FaultField: FaultField,
    FaultValue: FaultValue,
  };
};
export const encodeQueryResponse = (msgID, transactionID, dest, form, request) => {
  //<SOH>922<FS>1234<STX>To=WCHRC;MKHRC<FS>Subject=Subject<FS>Msg=Hot Hit<FS><ETX>?<EOT>
  let message = []; // byte
  let subject = `Subject=${UnicodeToHtml(request.subject)}`;
  let msg = `Msg=Hot Hit: ${UnicodeToHtml(request.msg)}`;

  message.push(
    SOH, // Packer prefix
    msgID, //Header=> "922"
    FS,
    transactionID, //Header=>  (2:5B8D81:11001)  <client type>:<Radio ID in hex>:<User Name>:transactionID
    STX, //Header=> endCode
    "To=",
    dest, //data=> HotHit Group UserCode (WCHRC)
    FS,
    subject,
    FS,
    msg,
    FS
  );
  // Add end of message seperator
  message.push(ETX);
  return message.join("").concat("\x7e", "\x04");
};

const UnicodeToHtml = (oString) => {
  if (!oString) {
    return oString;
  }
  let asciiEnd = String.fromCharCode(parseInt("00ff", 16));
  let finalStr = [];
  [...oString].forEach((char) => {
    // if is chinese or "&" or "|" char => convert it to utf-16
    if (" " > char || char > asciiEnd || char === "&" || char === "|") {
      let rawBufferHexArray = [...Buffer.from(char, "utf16le").toString("hex")];
      let hexString = `${rawBufferHexArray[2]}${rawBufferHexArray[3]}${rawBufferHexArray[0]}${rawBufferHexArray[1]}`;
      finalStr.push(`&#x${hexString};`);
    } else {
      finalStr.push(char);
    }
  });
  return finalStr.join("");
};
