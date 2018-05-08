/**
 * 日付選択メッセージを送信する
 * @ignore
 */
const request = require('request');
const moment = require('moment');

request.post(
    'https://api.line.me/v2/bot/message/push',
    {
        auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
        json: true,
        body: {
            to: 'U28fba84b4008d60291fc861e2562b34f', // 送信相手のuserId
            messages: [
                {
                    type: 'template',
                    altText: '日付選択',
                    template: {
                        type: 'buttons',
                        text: '日付選択',
                        actions: [
                            {
                                type: 'datetimepicker',
                                label: '日付選択',
                                mode: 'date',
                                data: `action=searchTransactionsByDate`,
                                initial: moment().format('YYYY-MM-DD')
                            }
                        ]
                    }
                }
            ]
        }
    },
    (err, response, body) => {
        console.log(err, response.statusCode, body);
    }
);
