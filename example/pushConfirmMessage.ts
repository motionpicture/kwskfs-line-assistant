/**
 * 確認タイプのテンプレートメッセージをトークに送信する
 */
import * as createDebug from 'debug';
import * as request from 'request';

const debug = createDebug('kwskfs-linereport:*');

request.post(
    'https://api.line.me/v2/bot/message/multicast',
    {
        auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
        json: true,
        body: {
            to: [ // 複数人に送信する場合
                'U28fba84b4008d60291fc861e2562b34f',
                'U530ab5b70e9c494215c5e923c4d75d59',
                'U146f3509cf1b6f580e873c2d22d24749',
                'U3a6154392cb2c455f460f3c9386a6a84',
                'Uddf155b9769f4c3a79f770ca7b25811f',
                'Uf981be84e2af6533afc6a74493dab68a',
                'Uf981be84e2af6533afc6a74493dab68a',
                'Ua0a93bb39a1a21710c53b43110a3d962',
                'Ue42fdb2827c4e27f2ffd8bb49cd8f0b0',
                'Uf37e1f99dfd73d3862532264648921ae'
            ],
            messages: [
                {
                    type: 'template',
                    altText: '座席予約確認',
                    template: {
                        type: 'confirm',
                        text: '座席予約しないの?',
                        actions: [
                            {
                                type: 'message',
                                label: 'する',
                                text: '予約'
                            },
                            {
                                type: 'message',
                                label: 'しない',
                                text: '...'
                            }
                        ]
                    }
                }
            ]
        }

    },
    (err, response, body) => {
        debug(err, response.statusCode, body);
    }
);
