import Koa from 'koa';
import { getLogger, Logger } from 'log4js';
import { v4 as uuidv4 } from 'uuid';
import { ServerEnv } from '../utils/env';

export class Server {
    private app: Koa;

    constructor() {
        this.app = new Koa();

        this.app.use(async (ctx, next) => {
            if (!ctx.logger) ctx.logger = getLogger();
            const traceId = ctx.get('X-Request-Id') || uuidv4();
            ctx.logger.addContext('trace', traceId);
            ctx.logger.addContext('path', ctx.path);
            await next();
        });

        this.app.use(async (ctx, next) => {
            const startTime = Date.now();
            await next();
            const endTime = Date.now();
            ctx.logger.info('cost time: %dms', endTime - startTime);
        });

        this.app.use(async ctx => {
            ctx.body = ctx.body ?? 'Hello World';

            const logger = ctx.logger as Logger;
            logger.debug(ctx.url, ctx.body);
        });
    }

    public start() {
        const port = ServerEnv.env?.global?.port;
        this.app.listen(port);
        getLogger().info('server started');
    }
}
