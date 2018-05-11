"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * LINE webhook messageコントローラー
 */
const kwskfs = require("@motionpicture/kwskfs-domain");
const createDebug = require("debug");
const moment = require("moment");
const request = require("request-promise-native");
const LINE = require("../../../line");
const debug = createDebug('kwskfs-line-assistant:controller:webhook:message');
/**
 * 使い方を送信する
 * @export
 */
function pushHowToUse(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line:no-multiline-string
        const text = `Information
----------------
メニューから操作もできるようになりました。
期限切れステータスの取引詳細を照会することができるようになりました。`;
        yield LINE.pushMessage(userId, text);
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'How to use',
                        template: {
                            type: 'buttons',
                            text: '何をしましょうか？',
                            actions: [
                                {
                                    type: 'message',
                                    label: '取引照会',
                                    text: '取引照会'
                                },
                                {
                                    type: 'message',
                                    label: '取引CSVダウンロード',
                                    text: 'csv'
                                },
                                {
                                    type: 'uri',
                                    label: '顔を登録する',
                                    uri: 'line://nv/camera/'
                                },
                                {
                                    type: 'message',
                                    label: 'ログアウト',
                                    text: 'logout'
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.pushHowToUse = pushHowToUse;
function askTransactionInquiryKey(user) {
    return __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line:no-multiline-string
        yield LINE.pushMessage(user.userId, `次のいずれかを入力してください。
1. 注文番号
例:001-3949-123231-6998

2. 取引ID
例:5a7b2ed6c993250364388acd`);
    });
}
exports.askTransactionInquiryKey = askTransactionInquiryKey;
/**
 * 何で取引検索するかを質問する
 */
function askByWhichSearchTransaction(userId, message) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(userId, message);
        // キュー実行のボタン表示
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'aaa',
                        template: {
                            type: 'buttons',
                            text: 'どちらで検索する？',
                            actions: [
                                {
                                    type: 'postback',
                                    label: '取引ID',
                                    data: `action=searchTransactionById&transaction=${message}`
                                },
                                {
                                    type: 'postback',
                                    label: '注文番号',
                                    data: `action=searchTransactionByOrderNumber&orderNumber=${message}`
                                }
                                // {
                                //     type: 'postback',
                                //     label: '電話番号',
                                //     data: `action=searchTransactionByTel&tel=${message}`
                                // }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.askByWhichSearchTransaction = askByWhichSearchTransaction;
/**
 * 日付選択を求める
 * @export
 */
function askFromWhenAndToWhen(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        // await LINE.pushMessage(userId, '期間をYYYYMMDD-YYYYMMDD形式で教えてください。');
        yield request.post('https://api.line.me/v2/bot/message/push', {
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId,
                messages: [
                    {
                        type: 'template',
                        altText: '日付選択',
                        template: {
                            type: 'buttons',
                            text: '日付を選択するか、期間をYYYYMMDD-YYYYMMDD形式で教えてください。',
                            actions: [
                                {
                                    type: 'datetimepicker',
                                    label: '日付選択',
                                    mode: 'date',
                                    data: 'action=searchTransactionsByDate',
                                    initial: moment().format('YYYY-MM-DD')
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.askFromWhenAndToWhen = askFromWhenAndToWhen;
/**
 * 取引CSVダウンロードURIを発行する
 * @export
 */
function publishURI4transactionsCSV(userId, dateFrom, dateThrough) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, `${dateFrom}-${dateThrough}の取引を検索しています...`);
        const startFrom = moment(`${dateFrom}T00:00:00+09:00`, 'YYYYMMDDThh:mm:ssZ');
        const startThrough = moment(`${dateThrough}T00:00:00+09:00`, 'YYYYMMDDThh:mm:ssZ').add(1, 'day');
        const csv = yield kwskfs.service.transaction.placeOrder.download({
            startFrom: startFrom.toDate(),
            startThrough: startThrough.toDate()
        }, 'csv')({ transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection) });
        yield LINE.pushMessage(userId, 'csvを作成しています...');
        const sasUrl = yield kwskfs.service.util.uploadFile({
            fileName: `kwskfs-line-assistant-transactions-${moment().format('YYYYMMDDHHmmss')}.csv`,
            text: csv
        })();
        yield LINE.pushMessage(userId, `download -> ${sasUrl} `);
    });
}
exports.publishURI4transactionsCSV = publishURI4transactionsCSV;
function logout(user) {
    return __awaiter(this, void 0, void 0, function* () {
        yield request.post({
            simple: false,
            url: LINE.URL_PUSH_MESSAGE,
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'Log out',
                        template: {
                            type: 'buttons',
                            text: '本当にログアウトしますか？',
                            actions: [
                                {
                                    type: 'uri',
                                    label: 'Log out',
                                    uri: `https://${user.host}/logout?userId=${user.userId}`
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.logout = logout;
