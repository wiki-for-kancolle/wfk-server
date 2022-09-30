import { LoggerOptions } from '../utils/log';
import { PoolOptions } from 'mysql2';

export class ServerEnv {
    command_line: {
        server_name: string;
        mode: 'test' | 'prod' | 'dev';
    };
    global: {
        port: number;
        mysql: PoolOptions;
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
