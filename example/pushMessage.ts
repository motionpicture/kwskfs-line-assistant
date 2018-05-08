/**
 * トークにメッセージを送信する
 */
import * as createDebug from 'debug';
import * as request from 'request';

const debug = createDebug('kwskfs-linereport:*');

request.post(
    'https://api.line.me/v2/bot/message/push',
    {
        auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
        json: true,
        body: {
            to: 'U28fba84b4008d60291fc861e2562b34f', // 送信相手のuserId
            messages: [
                {
                    type: 'text',
                    text: 'なにしてるの？'
                }
            ]
        }
    },
    (err, response, body) => {
        debug(err, response.statusCode, body);
    }
);
