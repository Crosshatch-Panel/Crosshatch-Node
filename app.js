const express = require('express');
const app = express();
const http = require('http').Server(app);
const WebSocket = require('ws');
const cors = require('cors')
const { textSync } = require('figlet');
const chalk = require('chalk');
const axios = require('axios').default;
const settings = require('./settings.json');
require('express-ws')(app);
const controller = require('./controller');
const package = require("./package.json")

app.use(express.urlencoded({ extended: false }));

app.use(express.static('public'))

app.use(cors({
    origin: settings.frontend_url,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}))

axios.get('https://api.github.com/repos/JamieGrimwood/Crosshatch/releases/latest').then(function (response) {
    if (response.data.tag_name === package.version) {
        console.log(chalk.cyanBright(textSync('Crosshatch', { horizontalLayout: 'fitted' })));
        console.log(`${chalk.yellow.bold('#=============================')}${chalk.grey.bold('[')} ${chalk.cyanBright.bold('Crosshatch')} ${chalk.grey.bold(']')}${chalk.yellow.bold('=============================#')}`)
        console.log(`${chalk.yellow.bold('#')}                          ${chalk.magenta.bold('Created by: Jamie09__')}                         ${chalk.yellow.bold('#')}`);
        console.log(`${chalk.yellow.bold('#')}                   ${chalk.green(`You are running an up to date version!`)}               ${chalk.yellow.bold('#')}`);
        console.log(`${chalk.yellow.bold('#')}                          ${chalk.grey.bold(`Running on port ${settings.port}`)}                          ${chalk.yellow.bold('#')}`);
        console.log(chalk.yellow.bold('#========================================================================#'));
    } else {
        console.log(chalk.cyanBright(textSync('Crosshatch', { horizontalLayout: 'fitted' })));
        console.log(`${chalk.yellow.bold('#=============================')}${chalk.grey.bold('[')} ${chalk.cyanBright.bold('Crosshatch')} ${chalk.grey.bold(']')}${chalk.yellow.bold('=============================#')}`)
        console.log(`${chalk.yellow.bold('#')}                          ${chalk.magenta.bold('Created by: Jamie09__')}                         ${chalk.yellow.bold('#')}`);
        console.log(`${chalk.yellow.bold('#')}          ${chalk.red(`You are running an out of date version of crosshatch!`)}         ${chalk.yellow.bold('#')}`);
        console.log(`${chalk.yellow.bold('#')}                     ${chalk.red(`Please update at the link below:`)}                   ${chalk.yellow.bold('#')}`);
        console.log(`${chalk.yellow.bold('#')}          ${chalk.red(`https://github.com/JamieGrimwood/Crosshatch/releases/`)}         ${chalk.yellow.bold('#')}`);
        console.log(`${chalk.yellow.bold('#')}                          ${chalk.grey.bold(`Running on port ${settings.port}`)}                          ${chalk.yellow.bold('#')}`);
        console.log(chalk.yellow.bold('#========================================================================#'));
    }
})

app.use('*', (req, res, next) => {
    if (req.headers.password != settings.password) return res.send("Unauthorised")
    next()
})

app.use(require("./router/index"));

const wss = new WebSocket.Server({ server: http, path: "/container/exec" });

wss.on('connection', async (ws, req) => {
    const container_id = req.url.substring(req.url.indexOf('=') + 1);
    ws.send("\u001b[32m[CROSSHATCH] Connection established.\u001b[0m")
    const container = await controller.getContainer(container_id).catch(error => {
        ws.send("Invalid container ID")
        return ws.close()
    })
    ws.on('message', async function message(msg) {
        const options = {
            'AttachStdout': true,
            'AttachStderr': true,
            'Tty': true,
            Cmd: ["/bin/bash", "-c", msg]
        };
        container.exec(options, async function (err, exec) {
            if (err) {
                if (err.statusCode = 409) {
                    return ws.send("\u001b[31;1m[CROSSHATCH] Container not running. Please start it to be able to use the EXEC console.\u001b[0m")
                }
            }
            const attach_opts = { 'Detach': false, 'Tty': true, stream: true, stdin: true, stdout: true, stderr: true };
            exec.start(attach_opts, function (err, stream) {
                stream.on('data', chunk => {
                    ws.send(chunk.toString("utf8"))
                    if (ws.readyState != 1) return stream.destroy();
                })
            });
        });
    });
})

http.listen(settings.port, () => {
    console.log(`Crosshatch listening on port ${settings.port}`);
});