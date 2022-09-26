require('esbuild-register/dist/node').register();

// parse command line parameters
const argv = require('minimist')(process.argv.slice(2));
const server_name = argv.s ?? '';
const mode = argv.m ?? 'test';
const port = argv.p;
const yamlfile = mode === 'prod' ? '.env.prod.yaml' : '.env.test.yaml';

// read local env file
const YAML = require('yaml');
const config = YAML.parse(require('fs').readFileSync(yamlfile, 'utf8'));
const { ServerEnv } = require('./src/utils/env');
const env = {
    command_line: {
        server_name,
        mode,
        port,
    },
    global: config.global,
    server: config[server_name],
};
ServerEnv.env = env;

// init logger
require('./src/utils/log').initLogger(ServerEnv.env.server.log);
const logger = require('log4js').getLogger();
logger.info(ServerEnv.env);

// start server
require('./src/server/' + server_name);
