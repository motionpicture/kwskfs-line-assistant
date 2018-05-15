/**
 * LINE webhook messageコントローラー
 */
import * as kwskfs from '@motionpicture/kwskfs-domain';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as request from 'request-promise-native';

import * as LINE from '../../../line';
import User from '../../user';

const debug = createDebug('kwskfs-line-assistant:controller:webhook:message');

/**
 * 使い方を送信する
 * @export
 */
export async function pushHowToUse(userId: string) {
    // tslint:disable-next-line:no-multiline-string
    const text = `Information
----------------
メニューから操作もできるようになりました。
期限切れステータスの取引詳細を照会することができるようになりました。`;

    await LINE.pushMessage(userId, text);

    await request.post({
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
}

export async function askTransactionInquiryKey(user: User) {
    // tslint:disable-next-line:no-multiline-string
    await LINE.pushMessage(user.userId, `次のいずれかを入力してください。
1. 注文番号
例:001-3949-123231-6998

2. 取引ID
例:5a7b2ed6c993250364388acd`);
}

/**
 * 何で取引検索するかを質問する
 */
export async function askByWhichSearchTransaction(userId: string, message: string) {
    debug(userId, message);

    // キュー実行のボタン表示
    await request.post({
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
}

/**
 * 日付選択を求める
 * @export
 */
export async function askFromWhenAndToWhen(userId: string) {
    // await LINE.pushMessage(userId, '期間をYYYYMMDD-YYYYMMDD形式で教えてください。');
    await request.post(
        'https://api.line.me/v2/bot/message/push',
        {
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId, // 送信相手のuserId
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
        }
    ).promise();

}

/**
 * 取引CSVダウンロードURIを発行する
 * @export
 */
export async function publishURI4transactionsCSV(userId: string, dateFrom: string, dateThrough: string) {
    await LINE.pushMessage(userId, `${dateFrom}-${dateThrough}の取引を検索しています...`);

    const startFrom = moment(`${dateFrom}T00:00:00+09:00`, 'YYYYMMDDThh:mm:ssZ');
    const startThrough = moment(`${dateThrough}T00:00:00+09:00`, 'YYYYMMDDThh:mm:ssZ').add(1, 'day');

    const csv = await kwskfs.service.transaction.placeOrder.download(
        {
            startFrom: startFrom.toDate(),
            startThrough: startThrough.toDate()
        },
        'csv'
    )({
        action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
        order: new kwskfs.repository.Order(kwskfs.mongoose.connection),
        ownershipInfo: new kwskfs.repository.OwnershipInfo(kwskfs.mongoose.connection),
        transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
    });

    await LINE.pushMessage(userId, 'csvを作成しています...');

    const sasUrl = await kwskfs.service.util.uploadFile({
        fileName: `kwskfs-line-assistant-transactions-${moment().format('YYYYMMDDHHmmss')}.csv`,
        text: csv
    })();

    await LINE.pushMessage(userId, `download -> ${sasUrl} `);
}

export async function logout(user: User) {
    await request.post({
        simple: false,
        url: LINE.URL_PUSH_MESSAGE,
        auth: { bearer: <string>process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
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
}
