import Router from '@koa/router';
import { Logger } from 'log4js';
import { isObject } from 'lodash';
import { Service, parsePostData } from '../../utils/service';
import { db } from '../../utils/db_pool';
import { time } from 'console';

export class XcBill implements Service {
    registRouter = (router: Router) => {
        router.post(
            '/xc/bill',
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

        // this.insert(ctx);
        // this.select(ctx);
    };

    insert = async ctx => {
        const logger = ctx.logger as Logger;
        const result = await db('test')
            .ignoreNull(false)
            .i({
                key: Math.floor(Math.random() * 10),
                // name: new Date().toString(),
                name: null,
            });
        logger.debug('insert result: ', result);
    };

    select = async ctx => {
        const logger = ctx.logger as Logger;
        // const result = await db('test').as('t').f(['t.id', 't.key as k']).wnbt('id', [5, 6]).s();
        // const result = await db('test').as('t').j('test_2 t2', ['t.id = t2.id', 't.key = t2.key']).f('t.id, t2.id').w('id', 1).ssql();
        // const result = await db('test').as('t').group('t.key').f('t.key, count(*) as c').having('t.key > 2').ssql();
        const result = await db('test').distinct().field('key').column('key');
        logger.debug('select result: ', result);
    };
}
