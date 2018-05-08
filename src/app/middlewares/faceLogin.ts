/**
 * 顔ログインミドルウェア
 */

import * as kwskfs from '@motionpicture/kwskfs-domain';
import { NextFunction, Request, Response } from 'express';
import { OK } from 'http-status';
import * as querystring from 'querystring';
import * as request from 'request-promise-native';

import * as LINE from '../../line';
import User from '../user';

const FACE_MATCH_THRESHOLD_ENV = process.env.FACE_MATCH_THRESHOLD;
const FACE_MATCH_THRESHOLD = parseInt((FACE_MATCH_THRESHOLD_ENV !== undefined) ? FACE_MATCH_THRESHOLD_ENV : '70', 10);

// tslint:disable-next-line:max-func-body-length
export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        const event: LINE.IWebhookEvent | undefined = (req.body.events !== undefined) ? req.body.events[0] : undefined;
        if (event === undefined) {
            throw new Error('Invalid request.');
        }

        const userId = event.source.userId;
        req.user = new User({
            host: req.hostname,
            userId: userId,
            state: JSON.stringify(req.body)
        });

        // ログイン済であれば次へ
        const credentials = await req.user.getCredentials();
        if (credentials !== null) {
            next();

            return;
        }

        // face loginイベントであれば、メッセージを送信
        if (event.type === 'postback' && event.postback !== undefined) {
            const data = querystring.parse(event.postback.data);
            if (data.action === 'loginByFace') {
                // ログイン前のstateを保管
                await req.user.saveCallbackState(<string>data.state);
                await LINE.pushMessage(userId, '顔写真を送信してください。');
                res.status(OK).send('ok');

                return;
            }
        }

        // 画像が送信されてくれば、顔認証
        if (event.type === 'message' && event.message !== undefined) {
            if (event.message.type === 'image') {
                try {
                    const faces = await req.user.searchFaces();
                    if (faces.length === 0) {
                        // 顔登録済でなければメッセージ送信
                        await LINE.pushMessage(userId, '顔写真を少なくとも1枚登録してください。');
                    } else {
                        await LINE.pushMessage(userId, `画像を検証中...${event.message.id}`);
                        const content = await LINE.getContent(event.message.id);
                        const searchFacesByImageResponse = await req.user.verifyFace(new Buffer(content));
                        // const searchFacesByImageResponse = await searchFacesByImage(new Buffer(content));
                        if (!Array.isArray(searchFacesByImageResponse.FaceMatches)) {
                            await LINE.pushMessage(userId, '類似画像が見つかりませんでした。');
                        } else if (searchFacesByImageResponse.FaceMatches.length === 0) {
                            await LINE.pushMessage(userId, '類似画像が見つかりませんでした。');
                        } else {
                            const similarity = searchFacesByImageResponse.FaceMatches[0].Similarity;
                            if (similarity === undefined) {
                                await LINE.pushMessage(userId, '類似画像が見つかりませんでした。');
                            } else if (similarity < FACE_MATCH_THRESHOLD) {
                                await LINE.pushMessage(userId, `ログインできません。類似率は${searchFacesByImageResponse.FaceMatches[0].Similarity}%です。`);
                            } else {
                                await LINE.pushMessage(userId, `${searchFacesByImageResponse.FaceMatches[0].Similarity}%の確立で一致しました。`);

                                // 一致結果があれば、リフレッシュトークンでアクセストークンを手動更新して、ログイン
                                const refreshToken = await req.user.getRefreshToken();
                                if (refreshToken === null) {
                                    await LINE.pushMessage(userId, 'LINEと会員が結合されていません。一度、IDとパスワードでログインしてください。');
                                } else {
                                    req.user.authClient.setCredentials({
                                        refresh_token: refreshToken,
                                        token_type: 'Bearer'
                                    });
                                    await req.user.signInForcibly(<any>await req.user.authClient.refreshAccessToken());
                                    await LINE.pushMessage(userId, `Hello ${req.user.payload.username}.`);

                                    // ログイン前のイベントを強制的に再送信
                                    try {
                                        const callbackState = await req.user.findCallbackState();
                                        if (callbackState !== null) {
                                            await req.user.deleteCallbackState();
                                            await request.post(`https://${req.hostname}/webhook`, {
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                form: callbackState
                                            }).promise();
                                        }
                                    } catch (error) {
                                        await LINE.pushMessage(event.source.userId, error.message);
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    await LINE.pushMessage(userId, error.message);
                }

                res.status(OK).send('ok');

                return;
            }
        }

        next();
    } catch (error) {
        next(new kwskfs.factory.errors.Unauthorized(error.message));
    }
};
