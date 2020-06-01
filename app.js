const mqtt = require('mqtt');
var express = require('express');
var fs = require('fs');
var app = express();
var qs = require('querystring');
var du = require('date-utils');
var mysql = require('mysql');

var dbConn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password:'allocation1!',
  database:'codemap'
});

dbConn.connect();



const up = "msg";
const down = "msg";

const options = {
  host: 'IP',
  port: 1883,
  protocol: 'mqtt',
  username: "user",
  password: "password",
  useSSL: true,
  keepAlive: 10,
  reschedulePings: true

};

const optionsDomain = {
  host: 'Domain',
  port: 1883,
  protocol: 'mqtt',
  username: "user",
  password: "password",
  useSSL: true,
  keepAlive: 10,
  reschedulePings: true
};

const client = mqtt.connect(options);
const clientDomain = mqtt.connect(optionsDomain);

client.on('message', (topic, message, packet) => {
  if (message.indexOf('"event_type":"response"') != -1) {
    let response = JSON.parse(message);
    let node = response['ipc_id'].substr(0, 4);
    let gateType = response['ipc_id'].substr(4, 6);

    logging("MQTT", "Response Message Received. NODE : " + node + " GATE : " + gateType);
  }
});

client.on("connect", () => {
  client.subscribe('/api/ipc/message', {
    qos: 0
  });
  logging("MQTT", "connected : " + client.connected);
});

client.on("error", (error) => {
  logging("MQTT", "Can't connect : " + error);
});

clientDomain.on("connect", () => {
  logging("MQTT", "Domain Client connected : " + clientDomain.connected);
});

clientDomain.on("error", (error) => {
  logging("MQTT","Domain Client Can't connect : " + error);

});

var message_options = {
  retain: true,
  qos: 0
};


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
  next();
});

function getCurrentTimeString(){
  var newDate = new Date();
  var time2 = "[" + newDate.toLocaleDateString() + " " + newDate.toTimeString().substr(0, 8) + "] ";

  return time2;
}

function logging(who, text){
  var time = getCurrentTimeString();
  var logString = time + "[" + who + "] " + text;
  console.log(logString);
}

function gateControl(mode, nodeid, manual, addrType){

  var gateNumber;
  var msg;
  var GATE;
  var OP;
  var nodename ="-";
  // enter open
  if(mode == 0 || mode == 1){
    gateNumber = 1;
    GATE = "ENTER ";
  }
  else if(mode == 2 || mode == 3){
    gateNumber = 2;
    GATE = "EXIT "
  }
  else {
    gateNumber = manual;
    GATE = "MANUAL : " + gateNumber + " ";
  }
  if(mode % 2 == 1){
    msg = down;
    OP = "CLOSE.";
  }
  else{
    msg = up;
    OP = "OPEN.";
  }

  var topic = "/" + nodeid + "/" + gateNumber + "/b";

  dbConn.query("SELECT sitename FROM mapping WHERE prjcode = '" + nodeid + "';", function(error, results, fields){
    if(error){
      console.log(error);
    }
    else {
      if(results.length == 0)
        logging('MYSQL', 'There is no Sitename of ' + nodeid);
      else{
        nodename = results[0]['sitename'] + "(" + nodeid + ")";
      }
    }
    var logMessage;
    if(nodename == "-"){
      logMessage = nodeid + " GATE " + GATE + OP;
    }
    else {
      logMessage = nodename + " GATE " + GATE + OP;
    }
    if(addrType == 0){
      client.publish(topic, msg);
      logging("MQTT IP", logMessage);
    }
    else {
      clientDomain.publish(topic, msg);
      logging("MQTT DOMAIN", logMessage);
    }
  });
}

app.get('/', function(req, res) {
  var time2 = getCurrentTimeString();
  logging("EXPRESS", 'Index Page Initialized.');
  fs.readFile('index.html', function(error, data) {

    res.writeHead(200, {
      'Content-Type': 'text/html'
    });
    res.end(data);
  });
});

app.get('/req/enter/open', function(req, res) {
  if (req.method == "GET") {
    var nodeid = req.query.node;
    var manual = req.query.manual_node;
    var addrType = req.query.addrType;

    gateControl(0,nodeid,manual,addrType);
  }

  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  res.end("OK");

});

app.get('/req/enter/close', function(req, res) {
  if (req.method == "GET") {
    var nodeid = req.query.node;
    var manual = req.query.manual_node;
    var addrType = req.query.addrType;

    gateControl(1,nodeid,manual,addrType);
  }

  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  res.end("OK");

});

app.get('/req/exit/open', function(req, res) {
  if (req.method == "GET") {
    var nodeid = req.query.node;
    var manual = req.query.manual_node;
    var addrType = req.query.addrType;

    gateControl(2,nodeid,manual,addrType);
  }

  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  res.end("OK");

});

app.get('/req/exit/close', function(req, res) {
  if (req.method == "GET") {
    var nodeid = req.query.node;
    var manual = req.query.manual_node;
    var addrType = req.query.addrType;

    gateControl(3,nodeid,manual,addrType);
  }

  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  res.end("OK");

});

app.get('/req/manual/open', function(req, res) {
  if (req.method == "GET") {
    var nodeid = req.query.node;
    var manual = req.query.manual_node;
    var addrType = req.query.addrType;

    gateControl(4,nodeid,manual,addrType);
  }

  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  res.end("OK");

});

app.get('/req/manual/close', function(req, res) {
  if (req.method == "GET") {
    var time2 = getCurrentTimeString();
    var nodeid = req.query.node;
    var manual = req.query.manual_node;
    var addrType = req.query.addrType;

    gateControl(5,nodeid,manual,addrType);

  }

  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  res.end("OK");

});

app.listen(9875, function() {
  var time2 = getCurrentTimeString();
logging("EXPRESS", 'server start');

});
