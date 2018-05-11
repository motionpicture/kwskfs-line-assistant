"use strict";
/**
 * webhookルーター
 * @ignore
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const createDebug = require("debug");
const express = require("express");
const http_status_1 = require("http-status");
const WebhookController = require("../controllers/webhook");
const authentication_1 = require("../middlewares/authentication");
const faceLogin_1 = require("../middlewares/faceLogin");
const webhookRouter = express.Router();
const debug = createDebug('kwskfs-line-assistant:router:webhook');
webhookRouter.all('/', faceLogin_1.default, authentication_1.default, (req, res) => __awaiter(this, void 0, void 0, function* () {
    debug('body:', JSON.stringify(req.body));
    try {
        const event = (req.body.events !== undefined) ? req.body.events[0] : undefined;
        if (event !== undefined) {
            switch (event.type) {
                case 'message':
                    yield WebhookController.message(event, req.user);
                    break;
                case 'postback':
                    yield WebhookController.postback(event, req.user);
                    break;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                case 'follow':
                    yield WebhookController.follow(event);
                    break;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                case 'unfollow':
                    yield WebhookController.unfollow(event);
                    break;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                case 'join':
                    yield WebhookController.join(event);
                    break;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                case 'leave':
                    yield WebhookController.leave(event);
                    break;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                case 'beacon':
                    yield WebhookController.postback(event, req.user);
                    break;
                default:
            }
        }
    }
    catch (error) {
        debug(error);
    }
    res.status(http_status_1.OK).send('ok');
}));
exports.default = webhookRouter;
