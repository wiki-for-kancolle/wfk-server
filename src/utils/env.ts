import { DbOptions } from './db_pool';
import { LoggerOptions } from './log';
import { QiniuOptions } from './qiniu';

export class ServerEnv {
    command_line: {
        server_name: string;
        mode: 'test' | 'prod' | 'dev';
    };
    global: {
        port: number;
        mysql: DbOptions[];
        oss?: QiniuOptions[];
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
