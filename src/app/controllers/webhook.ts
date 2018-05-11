/**
 * LINE webhookコントローラー
 * @namespace app.controllers.webhook
 */

import * as createDebug from 'debug';
import * as querystring from 'querystring';
import * as request from 'request-promise-native';

import * as LINE from '../../line';
import User from '../user';
import * as MessageController from './webhook/message';
import * as ImageMessageController from './webhook/message/image';
import * as PostbackController from './webhook/postback';

const debug = createDebug('kwskfs-line-assistant:controller:webhook');

/**
 * メッセージが送信されたことを示すEvent Objectです。
 */
export async function message(event: LINE.IWebhookEvent, user: User) {
    const userId = event.source.userId;

    try {
        if (event.message === undefined) {
            throw new Error('event.message not found.');
        }

        switch (event.message.type) {
            case LINE.MessageType.text:
                const messageText = <string>event.message.text;

                switch (true) {
                    // 取引照会に必要な情報を求める
                    case /^取引照会$/.test(messageText):
                        await MessageController.askTransactionInquiryKey(user);
                        break;

                    // 何で取引検索するか
                    case /^\d{3}-\d{1,12}|\w{24}$/.test(messageText):
                        await MessageController.askByWhichSearchTransaction(userId, messageText);
                        break;

                    // 取引csv要求
                    case /^csv$/.test(messageText):
                        await MessageController.askFromWhenAndToWhen(userId);
                        break;

                    // 取引csv期間指定
                    case /^\d{8}-\d{8}$/.test(messageText):
                        // tslint:disable-next-line:no-magic-numbers
                        await MessageController.publishURI4transactionsCSV(userId, messageText.substr(0, 8), messageText.substr(9, 8));
                        break;

                    // ログアウト
                    case /^logout$/.test(messageText):
                        await MessageController.logout(user);
                        break;

                    default:
                        // まず二段階認証フローかどうか確認
                        const postEvent = await user.verifyMFAPass(messageText);
                        debug('postEvent from pass:', postEvent);
                        if (postEvent !== null) {
                            // postEventがあれば送信
                            await request.post(`https://${user.host}/webhook`, {
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
                        await MessageController.pushHowToUse(userId);
                }

                break;

            case LINE.MessageType.image:
                await ImageMessageController.indexFace(user, event.message.id);

                break;

            default:
                throw new Error(`Unknown message type ${event.message.type}`);
        }
    } catch (error) {
        console.error(error);
        // エラーメッセージ表示
        await LINE.pushMessage(userId, error.toString());
    }
}

/**
 * イベントの送信元が、template messageに付加されたポストバックアクションを実行したことを示すevent objectです。
 */
export async function postback(event: LINE.IWebhookEvent, user: User) {
    const data = querystring.parse(event.postback.data);
    debug('data:', data);
    const userId = event.source.userId;

    try {
        switch (data.action) {
            case 'searchTransactionByOrderNumber':
                await PostbackController.searchTransactionByOrderNumber(userId, <string>data.orderNumber);
                break;

            case 'searchTransactionById':
                await PostbackController.searchTransactionById(userId, <string>data.transaction);
                break;

            // case 'searchTransactionByTel':
            //     await PostbackController.searchTransactionByTel(userId, <string>data.tel);
            //     break;

            case 'searchTransactionsByDate':
                await PostbackController.searchTransactionsByDate(userId, <string>event.postback.params.date);
                break;

            case 'startReturnOrder':
                await PostbackController.startReturnOrder(user, <string>data.transaction);
                break;

            case 'confirmReturnOrder':
                await PostbackController.confirmReturnOrder(user, <string>data.transaction, <string>data.pass);
                break;

            default:
        }
    } catch (error) {
        console.error(error);
        // エラーメッセージ表示
        await LINE.pushMessage(userId, error.toString());
    }
}

/**
 * イベント送信元に友だち追加（またはブロック解除）されたことを示すEvent Objectです。
 */
export async function follow(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベント送信元にブロックされたことを示すevent objectです。
 */
export async function unfollow(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベントの送信元グループまたはトークルームに参加したことを示すevent objectです。
 */
export async function join(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベントの送信元グループから退出させられたことを示すevent objectです。
 */
export async function leave(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベント送信元のユーザがLINE Beaconデバイスの受信圏内に出入りしたことなどを表すイベントです。
 */
export async function beacon(event: LINE.IWebhookEvent) {
    debug('event is', event);
}
