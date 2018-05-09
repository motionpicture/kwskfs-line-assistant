"use strict";
/**
 * LINE webhookコントローラー
 * @namespace app.controllers.webhook
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
const querystring = require("querystring");
const request = require("request-promise-native");
const LINE = require("../../line");
const MessageController = require("./webhook/message");
const ImageMessageController = require("./webhook/message/image");
const PostbackController = require("./webhook/postback");
const debug = createDebug('kwskfs-line-assistant:controller:webhook');
/**
 * メッセージが送信されたことを示すEvent Objectです。
 */
function message(event, user) {
    return __awaiter(this, void 0, void 0, function* () {
        const userId = event.source.userId;
        try {
            if (event.message === undefined) {
                throw new Error('event.message not found.');
            }
            switch (event.message.type) {
                case LINE.MessageType.text:
                    const messageText = event.message.text;
                    switch (true) {
                        // 取引照会に必要な情報を求める
                        case /^取引照会$/.test(messageText):
                            yield MessageController.askTransactionInquiryKey(user);
                            break;
                        // 何で取引検索するか
                        case /^\d{3}-\d{1,12}|\w{24}$/.test(messageText):
                            yield MessageController.askByWhichSearchTransaction(userId, messageText);
                            break;
                        // 取引csv要求
                        case /^csv$/.test(messageText):
                            yield MessageController.askFromWhenAndToWhen(userId);
                            break;
                        // 取引csv期間指定
                        case /^\d{8}-\d{8}$/.test(messageText):
                            // tslint:disable-next-line:no-magic-numbers
                            yield MessageController.publishURI4transactionsCSV(userId, messageText.substr(0, 8), messageText.substr(9, 8));
                            break;
                        // ログアウト
                        case /^logout$/.test(messageText):
                            yield MessageController.logout(user);
                            break;
                        default:
                            // まず二段階認証フローかどうか確認
                            const postEvent = yield user.verifyMFAPass(messageText);
                            debug('postEvent from pass:', postEvent);
                            if (postEvent !== null) {
                                // postEventがあれば送信
                                yield request.post(`https://${user.host}/webhook`, {
                                    // tslint:disable-next-line:no-http-string
                                    // await request.post('http://localhost:8080/webhook', {
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    form: postEvent
                                }).promise();
                                return;
                            }
                            // 予約照会方法をアドバイス
                            yield MessageController.pushHowToUse(userId);
                    }
                    break;
                case LINE.MessageType.image:
                    yield ImageMessageController.indexFace(user, event.message.id);
                    break;
                default:
                    throw new Error(`Unknown message type ${event.message.type}`);
            }
        }
        catch (error) {
            console.error(error);
            // エラーメッセージ表示
            yield LINE.pushMessage(userId, error.toString());
        }
    });
}
exports.message = message;
/**
 * イベントの送信元が、template messageに付加されたポストバックアクションを実行したことを示すevent objectです。
 */
function postback(event, user) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = querystring.parse(event.postback.data);
        debug('data:', data);
        const userId = event.source.userId;
        try {
            switch (data.action) {
                case 'searchTransactionByOrderNumber':
                    yield PostbackController.searchTransactionByOrderNumber(userId, data.orderNumber);
                    break;
                case 'searchTransactionById':
                    yield PostbackController.searchTransactionById(userId, data.transaction);
                    break;
                // case 'searchTransactionByTel':
                //     await PostbackController.searchTransactionByTel(userId, <string>data.tel);
                //     break;
                case 'searchTransactionsByDate':
                    yield PostbackController.searchTransactionsByDate(userId, event.postback.params.date);
                    break;
                case 'startReturnOrder':
                    yield PostbackController.startReturnOrder(user, data.transaction);
                    break;
                case 'confirmReturnOrder':
                    yield PostbackController.confirmReturnOrder(user, data.transaction, data.pass);
                    break;
                default:
            }
        }
        catch (error) {
            console.error(error);
            // エラーメッセージ表示
            yield LINE.pushMessage(userId, error.toString());
        }
    });
}
exports.postback = postback;
/**
 * イベント送信元に友だち追加（またはブロック解除）されたことを示すEvent Objectです。
 */
function follow(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.follow = follow;
/**
 * イベント送信元にブロックされたことを示すevent objectです。
 */
function unfollow(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.unfollow = unfollow;
/**
 * イベントの送信元グループまたはトークルームに参加したことを示すevent objectです。
 */
function join(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.join = join;
/**
 * イベントの送信元グループから退出させられたことを示すevent objectです。
 */
function leave(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.leave = leave;
/**
 * イベント送信元のユーザがLINE Beaconデバイスの受信圏内に出入りしたことなどを表すイベントです。
 */
function beacon(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.beacon = beacon;
