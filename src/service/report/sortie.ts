import koaBody from 'koa-body';
import Router from '@koa/router';
import { Logger } from 'log4js';
import { Service, parsePostData } from '../service';

export class ReportSortie implements Service {
    registRouter = (router: Router) => {
        router.post(
            '/statistic/sortie',
            async (ctx, next) => {
                ctx.request.body = await parsePostData(ctx);
                await next();
            },
            this.handle,
        );
    };

    isReady = () => true;

    handle = async (ctx, next) => {
        const logger = ctx.logger as Logger;
        if (!this.isReady()) {
            logger.warn('service is not ready');
            return;
        }
        logger.debug('post data: ', ctx.request.body);

        ctx.body = ctx.request.body;
    };
}
