import Koa from 'koa';
import Router from '@koa/router';
import { getLogger, Logger } from 'log4js';
import { v4 as uuidv4 } from 'uuid';
import { forEach } from 'lodash';
import { ServerEnv } from './env';
import { Service } from '../service/service';
import { getIp } from '../utils/tools';
import { dbPoolInit } from '../model/db_pool';
import { ossInit } from '../utils/res';

export class Server {
    private app: Koa;
    private router: Router;

    constructor() {
        this.app = new Koa();
        this.router = new Router();

        // trace id
        this.app.use(async (ctx, next) => {
            const traceId = ctx.get('X-Request-Id') || uuidv4();
            if (!ctx.logger) ctx.logger = getLogger(traceId);
            ctx.logger.addContext('ip', getIp(ctx.req));
            ctx.logger.addContext('trace', traceId);
            ctx.logger.addContext('path', ctx.path);
            await next();
        });

        // add logger
        this.app.use(async (ctx, next) => {
            const logger = ctx.logger as Logger;
            logger.info(ctx.url, getIp(ctx.req));
            const startTime = Date.now();
            await next();
            const endTime = Date.now();
            logger.info('cost time: %dms', endTime - startTime);
        });
    }

    public registServices(service: Array<Service>) {
        forEach(service, s => {
            s.registRouter(this.router);
        });
        this.app.use(this.router.routes());
        this.app.use(async (ctx, next) => {
            const logger = ctx.logger as Logger;
            logger.warn('Unsupport request: ', ctx.method, ctx.path);
        });
    }

    public initialize() {
        dbPoolInit(ServerEnv.env?.global?.mysql);
        ossInit(ServerEnv.env?.global?.oss);
    }

    public start() {
        const port = ServerEnv.env?.global?.port;
        this.app.listen(port);
        getLogger().info('server started');
    }
}
