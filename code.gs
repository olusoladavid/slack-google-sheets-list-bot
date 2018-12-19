var EMAIL_COL = 0;
var NUM_COL = 1;

var actions = {
  'check': {
    'requiredArgsCount': 1,
    'helpText': [{ 'text': 'Type `/listbot check <youremail>` to check your status' }],
    'args': {
      0: [/\w+@\w+\.com$/, 'Oops. It appears you did not supply an email. Please check']
    },
    'execute': getUserWaitStatus
  }
};

function doPost(e){
  var req = null;
  try {
    req = queryStringToJSON(e.postData.contents);
    /* Extract the action from the request text */
    var action = getAction(req);
    if (!actionIsValid(action)) throw 'Hi. You sent an invalid command';
    /* Extract the action arguments from the request text */
    var args = getActionArgs(req);
    args.forEach(function(arg, index) {
      if (!actionParamIsValid(arg, index, action)){
        throw actions[action].args[index][1];
      }
    });
    /* The result of the handler for any action is assigned to resText */
    var resText = actions[action].execute(args);
    /* The response is composed and sent here */
    var res = composeResponse(resText);
    return quickResponse(res);
  } catch (error) {
    Logger.log("New Error: " + error + ' from ' + e.postData.contents);
    if (!req || !req['text']) {
      return quickResponse(composeResponse('Hey! You called me', actions.check.helpText));
    }
    var errorMessage = composeResponse(error, actions.check.helpText);
    return quickResponse(errorMessage);
  }
}

function getAction(req) {
  var payload = req['text'];
  var action = payload.split('+')[0];
  return action
}

function actionIsValid(action) {
  var actionList = Object.keys(actions);
  if (actionList.indexOf(action) > -1) return true;
  return false;
}

function getActionArgs(req) {
  var payload = req['text'];
  var payloadObjects = payload.split('+', 2);
  var action = payloadObjects[0];
  if (!payloadObjects[1]) {
    throw 'Oops. You sent an incomplete command. Please type /listbot '+action+' for autocomplete options';
  }
  var argCount = actions[action].requiredArgsCount;
  var args = payloadObjects[1].split('+', argCount);
  return args;
}

function actionParamIsValid(param, paramIndex, action) {
  var pattern = actions[action].args[paramIndex][0];
  return pattern.test(param);
}

function composeResponse(text, attachments) {
  var res = {
    "response_type": "ephemeral",
    "text": text,
    "attachments": attachments || []
  };
  return res;
}

function findValueInSheet(key, keyColumn, valueColumn, _sheet) {
  var sheet = _sheet;
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  var selectedRow = null;

  for (var i = 0; i < values.length; i++)
  {
    if (values[i][keyColumn] === key)
    {
      selectedRow = i;
      break;
    }
  }
  if (!selectedRow) throw 'Oops. Our records show that you are not on the list. Please reach out to facilities for more info';
  return values[selectedRow][valueColumn];
}

function getUserWaitStatus(args) {
  var userEmail = args[0];
  var numberOnList = findValueInSheet(userEmail, EMAIL_COL, NUM_COL, SpreadsheetApp.getActiveSheet());
  if (!numberOnList) {
    throw 'Hey! It appears you already have a space. Reach out to facilities for more info';
  }
  return "You are number " + numberOnList + " on the list";
}

function quickResponse(res) {
  var resString = JSON.stringify(res);
  var JSONOutput = ContentService.createTextOutput(resString);
  JSONOutput.setMimeType(ContentService.MimeType.JSON);
  return JSONOutput;
}

function queryStringToJSON (queryString) {
  if (!(queryString.indexOf('=') > -1)) return {};
  var queryStr = queryString.split('&');
  var queryJSON = {};
  queryStr.forEach(function(keyValue) {
    var keyValArr = keyValue.split('=');
    queryJSON[keyValArr[0]] = decodeURIComponent(keyValArr[1] || '');
  });
  return queryJSON;
}
