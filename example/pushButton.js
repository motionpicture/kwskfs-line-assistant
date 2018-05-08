/**
 * トークにボタンメッセージを送信する
 * @ignore
 */
const request = require('request');

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
                    altText: 'ログインボタン',
                    template: {
                        type: 'buttons',
                        text: 'ログインしてください。',
                        actions: [
                            {
                                type: 'uri',
                                label: 'Sign In',
                                uri: 'https://example.com'
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
