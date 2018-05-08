"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * トークにメッセージを送信する
 */
const createDebug = require("debug");
const request = require("request");
const debug = createDebug('kwskfs-linereport:*');
request.post('https://api.line.me/v2/bot/message/push', {
    auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
    json: true,
    body: {
        to: 'U28fba84b4008d60291fc861e2562b34f',
        messages: [
            {
                type: 'text',
                text: 'なにしてるの？'
            }
        ]
    }
}, (err, response, body) => {
    debug(err, response.statusCode, body);
});
