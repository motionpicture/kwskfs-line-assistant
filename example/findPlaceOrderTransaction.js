const request = require('request-promise-native');

request.post(
    'http://localhost:8080/webhook',
    {
        json: true,
        body: {
            events: [
                {
                    postback: {
                        data: 'action=searchTransactionByReserveNum&reserveNum=346168=&theater=118'
                    },
                    replyToken: '26d0dd0923a94583871ecd7e6efec8e2',
                    source: {
                        type: 'user',
                        userId: 'U28fba84b4008d60291fc861e2562b34f'
                    },
                    timestamp: 1487085535998,
                    type: 'postback'
                }
            ]
        }
    }
).then(console.log);
