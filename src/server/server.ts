import Koa from 'koa';
import koaBody from 'koa-body';
import { getLogger, Logger } from 'log4js';
import { v4 as uuidv4 } from 'uuid';
import { ServerEnv } from './env';

export class Server {
    private app: Koa;

    constructor() {
        this.app = new Koa();

        // trace id
        this.app.use(async (ctx, next) => {
            if (!ctx.logger) ctx.logger = getLogger();
            const traceId = ctx.get('X-Request-Id') || uuidv4();
            ctx.logger.addContext('trace', traceId);
            ctx.logger.addContext('path', ctx.path);
            await next();
        });

        // add logger
        this.app.use(async (ctx, next) => {
            const startTime = Date.now();
            await next();
            const endTime = Date.now();
            ctx.logger.info('cost time: %dms', endTime - startTime);
        });

        // parse body, supported:
        //  multipart/form-data
        //  application/x-www-form-urlencoded
        //  application/json
        //  application/json-patch+json
        //  application/vnd.api+json
        //  application/csp-report
        //  text/xml
        this.app.use(
            koaBody({
                jsonLimit: '10mb',
            }),
        );

        this.app.use(async ctx => {
            ctx.body = ctx.method === 'POST' ? ctx.request.body : ctx.query;

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
