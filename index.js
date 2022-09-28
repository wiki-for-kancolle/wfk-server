require('esbuild-register/dist/node').register();

// parse command line parameters
const argv = require('minimist')(process.argv.slice(2));
const server_name = argv.s ?? '';
const mode = argv.m ?? 'test';
const yamlfile = mode === 'prod' ? '.env.prod.yaml' : '.env.test.yaml';

// read local env file
const YAML = require('yaml');
const config = YAML.parse(require('fs').readFileSync(yamlfile, 'utf8'));
const { ServerEnv } = require('./src/server/env');
const env = {
    command_line: {
        server_name,
        mode,
    },
    global: config.global,
    server: config[server_name],
};
ServerEnv.env = env;

// init logger
require('./src/utils/log').initLogger(ServerEnv.env.server.log);

// start server
require('./src/server/' + server_name);
