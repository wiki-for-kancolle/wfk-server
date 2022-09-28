import { LoggerOptions } from '../utils/log';

export class ServerEnv {
    command_line: {
        server_name: string;
        mode: 'test' | 'prod' | 'dev';
    };
    global: {
        port: number;
    };
    server: {
        log: LoggerOptions;
    };

    static get env() {
        return __env;
    }

    static set env(env: ServerEnv) {
        __env = env;
    }
}

let __env = new ServerEnv();
