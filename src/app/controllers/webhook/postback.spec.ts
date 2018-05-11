// tslint:disable:no-implicit-dependencies

/**
 * postback test
 * @ignore
 */

import * as assert from 'assert';
import * as HTTPStatus from 'http-status';
import * as supertest from 'supertest';

import * as app from '../../app';

describe('取引タスク実行', () => {
    it('メール送信', async () => {
        await supertest(app)
            .post('/webhook')
            .send({
                events: [
                    {
                        postback: {
                            data: 'action=pushNotification&transaction=59ba103414b1ad1be49faa1f'
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
            })
            .expect(HTTPStatus.OK)
            .then((response) => {
                assert.equal(response.text, 'ok');
            });
    });

    it('本予約', async () => {
        await supertest(app)
            .post('/webhook')
            .send({
                events: [
                    {
                        postback: {
                            data: 'action=settleSeatReservation&transaction=59ba103414b1ad1be49faa1f'
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
            })
            .expect(HTTPStatus.OK)
            .then((response) => {
                assert.equal(response.text, 'ok');
            });
    });

    it('所有権作成', async () => {
        await supertest(app)
            .post('/webhook')
            .send({
                events: [
                    {
                        postback: {
                            data: 'action=createOwnershipInfos&transaction=59ba103414b1ad1be49faa1f'
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
            })
            .expect(HTTPStatus.OK)
            .then((response) => {
                assert.equal(response.text, 'ok');
            });
    });
});
