/**
 * webhookルーター
 * @ignore
 */

import * as createDebug from 'debug';
import * as express from 'express';
import { OK } from 'http-status';

import * as LINE from '../../line';
import * as WebhookController from '../controllers/webhook';
import authentication from '../middlewares/authentication';
import faceLogin from '../middlewares/faceLogin';

const webhookRouter = express.Router();
const debug = createDebug('kwskfs-line-assistant:router:webhook');

webhookRouter.all(
    '/',
    faceLogin,
    authentication,
    async (req, res) => {
        debug('body:', JSON.stringify(req.body));

        try {
            const event: LINE.IWebhookEvent | undefined = (req.body.events !== undefined) ? req.body.events[0] : undefined;
            if (event !== undefined) {
                switch (event.type) {
                    case 'message':
                        await WebhookController.message(event, req.user);
                        break;

                    case 'postback':
                        await WebhookController.postback(event, req.user);
                        break;

                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore next */
                    case 'follow':
                        await WebhookController.follow(event);
                        break;

                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore next */
                    case 'unfollow':
                        await WebhookController.unfollow(event);
                        break;

                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore next */
                    case 'join':
                        await WebhookController.join(event);
                        break;

                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore next */
                    case 'leave':
                        await WebhookController.leave(event);
                        break;

                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore next */
                    case 'beacon':
                        await WebhookController.postback(event, req.user);
                        break;

                    default:
                }
            }
        } catch (error) {
            debug(error);
        }

        res.status(OK).send('ok');
    });

export default webhookRouter;
