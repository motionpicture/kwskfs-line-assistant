// tslint:disable:no-implicit-dependencies

/**
 * webhookルーターテスト
 * @ignore
 */

import * as assert from 'assert';
import * as HTTPStatus from 'http-status';
import * as supertest from 'supertest';

import * as app from '../app';

describe('POST /webhook', () => {
    it('found', async () => {
        await supertest(app)
            .post('/webhook')
            .send({
                events: [
                    {
                        source: {
                            type: 'user',
                            userId: 'U28fba84b4008d60291fc861e2562b34f'
                        }
                    }
                ]
            })
            .expect(HTTPStatus.OK)
            .then((response) => {
                assert.equal(response.text, 'ok');
            });
    });

    it('使い方送信', async () => {
        await supertest(app)
            .post('/webhook')
            .send({
                events: [
                    {
                        message: {
                            id: '5647872913345',
                            text: '???',
                            type: 'text'
                        },
                        replyToken: '26d0dd0923a94583871ecd7e6efec8e2',
                        source: {
                            type: 'user',
                            userId: 'U28fba84b4008d60291fc861e2562b34f'
                        },
                        timestamp: 1487085535998,
                        type: 'message'
                    }
                ]
            })
            .expect(HTTPStatus.OK)
            .then((response) => {
                assert.equal(response.text, 'ok');
            });
    });

    it('予約番号メッセージ受信', async () => {
        await supertest(app)
            .post('/webhook')
            .send({
                events: [
                    {
                        message: {
                            id: '5647872913345',
                            text: '118-12386',
                            type: 'text'
                        },
                        replyToken: '26d0dd0923a94583871ecd7e6efec8e2',
                        source: {
                            type: 'user',
                            userId: 'U28fba84b4008d60291fc861e2562b34f'
                        },
                        timestamp: 1487085535998,
                        type: 'message'
                    }
                ]
            })
            .expect(HTTPStatus.OK)
            .then((response) => {
                assert.equal(response.text, 'ok');
            });
    });

    it('予約番号で検索(成立取引)', async () => {
        await supertest(app)
            .post('/webhook')
            .send({
                events: [
                    {
                        postback: {
                            data: 'action=searchTransactionByReserveNum&theater=118&reserveNum=33868'
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

    it('予約番号で検索', async () => {
        await supertest(app)
            .post('/webhook')
            .send({
                events: [
                    {
                        postback: {
                            data: 'action=searchTransactionByReserveNum&theater=118&reserveNum=2698'
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

    it('電話番号で検索', async () => {
        await supertest(app)
            .post('/webhook')
            .send({
                events: [
                    {
                        postback: {
                            data: 'action=searchTransactionByTel&theater=118&tel=09012345678'
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
