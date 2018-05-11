import * as kwskfsapi from '@motionpicture/kwskfs-api-nodejs-client';
import * as AWS from 'aws-sdk';
import * as createDebug from 'debug';
import * as redis from 'ioredis';
import * as jwt from 'jsonwebtoken';

const debug = createDebug('kwskfs-line-assistant:user');

import * as LINE from '../line';

// 以下環境変数をセットすること
// AWS_ACCESS_KEY_ID
// AWS_SECRET_ACCESS_KEY
const rekognition = new AWS.Rekognition({
    apiVersion: '2016-06-27',
    region: 'us-west-2'
});

const redisClient = new redis({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: <any>{ servername: <string>process.env.REDIS_HOST }
});

export interface ICredentials {
    /**
     * リフレッシュトークン
     */
    refresh_token?: string;
    /**
     * 期限UNIXタイムスタンプ
     */
    expiry_date?: number;
    /**
     * アクセストークン
     */
    access_token: string;
    /**
     * トークンタイプ
     */
    token_type?: string;
}

/**
 * トークンに含まれる情報インターフェース
 * @export
 */
export interface IPayload {
    sub: string;
    token_use: string;
    scope: string;
    iss: string;
    exp: number;
    iat: number;
    version: number;
    jti: string;
    client_id: string;
    username?: string;
}

/**
 * ユーザー設定インターフェース
 * @export
 */
export interface IConfigurations {
    host: string;
    userId: string;
    state: string;
}

const USER_EXPIRES_IN_SECONDS = process.env.USER_EXPIRES_IN_SECONDS;
if (USER_EXPIRES_IN_SECONDS === undefined) {
    throw new Error('Environment variable USER_EXPIRES_IN_SECONDS required.');
}
// tslint:disable-next-line:no-magic-numbers
const EXPIRES_IN_SECONDS = parseInt(USER_EXPIRES_IN_SECONDS, 10);
const POST_EVENT_TOKEN_EXPIRES_IN_SECONDS = 60;
const SECRET = 'secret';

const REFRESH_TOKEN_EXPIRES_IN_SECONDS_ENV = process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS;
if (REFRESH_TOKEN_EXPIRES_IN_SECONDS_ENV === undefined) {
    throw new Error('Environment variable REFRESH_TOKEN_EXPIRES_IN_SECONDS required.');
}
// tslint:disable-next-line:no-magic-numbers
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = parseInt(REFRESH_TOKEN_EXPIRES_IN_SECONDS_ENV, 10);

/**
 * LINEユーザー
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 */
export default class User {
    public host: string;
    public state: string;
    public userId: string;
    public payload: IPayload;
    public accessToken: string;
    public authClient: kwskfsapi.auth.OAuth2;
    public rekognitionCollectionId: string;

    constructor(configurations: IConfigurations) {
        this.host = configurations.host;
        this.userId = configurations.userId;
        this.state = configurations.state;
        this.rekognitionCollectionId = `kwskfs-line-assistant-${this.userId}`;

        this.authClient = new kwskfsapi.auth.OAuth2({
            domain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
            clientId: <string>process.env.API_CLIENT_ID,
            clientSecret: <string>process.env.API_CLIENT_SECRET,
            redirectUri: `https://${configurations.host}/signIn`,
            logoutUri: `https://${configurations.host}/logout`
        });
    }

    public generateAuthUrl() {
        return this.authClient.generateAuthUrl({
            scopes: [],
            state: this.state,
            codeVerifier: <string>process.env.API_CODE_VERIFIER
        });
    }

    public generateLogoutUrl() {
        return this.authClient.generateLogoutUrl();
    }

    public async getCredentials(): Promise<ICredentials | null> {
        return redisClient.get(`line-assistant.credentials.${this.userId}`)
            .then((value) => (value === null) ? null : JSON.parse(value));
    }

    public async getRefreshToken(): Promise<string | null> {
        return redisClient.get(`line-assistant.refreshToken.${this.userId}`)
            .then((value) => (value === null) ? null : value);
    }

    public setCredentials(credentials: ICredentials) {
        const payload = <any>jwt.decode(credentials.access_token);
        debug('payload:', payload);

        this.payload = payload;
        this.accessToken = credentials.access_token;
        this.authClient.setCredentials(credentials);

        return this;
    }

    public async signIn(code: string) {
        // 認証情報を取得できればログイン成功
        const credentials = await this.authClient.getToken(code, <string>process.env.API_CODE_VERIFIER);
        debug('credentials published', credentials);

        if (credentials.access_token === undefined) {
            throw new Error('Access token is required for credentials.');
        }

        if (credentials.refresh_token === undefined) {
            throw new Error('Refresh token is required for credentials.');
        }

        // ログイン状態を保持
        const results = await redisClient.multi()
            .set(`line-assistant.credentials.${this.userId}`, JSON.stringify(credentials))
            .expire(`line-assistant.credentials.${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
        debug('results:', results);

        // rekognitionコレクション作成
        await new Promise((resolve, reject) => {
            rekognition.createCollection(
                {
                    CollectionId: this.rekognitionCollectionId
                },
                async (err, __) => {
                    if (err instanceof Error) {
                        // すでに作成済であればok
                        if (err.code === 'ResourceAlreadyExistsException') {
                            resolve();
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve();
                    }
                });
        });

        // リフレッシュトークンを保管
        await redisClient.multi()
            .set(`line-assistant.refreshToken.${this.userId}`, credentials.refresh_token)
            .expire(`line-assistant.refreshToken.${this.userId}`, REFRESH_TOKEN_EXPIRES_IN_SECONDS, debug)
            .exec();
        debug('refresh token saved.');

        this.setCredentials({ ...credentials, access_token: credentials.access_token });

        return this;
    }

    public async signInForcibly(credentials: ICredentials) {
        // ログイン状態を保持
        const results = await redisClient.multi()
            .set(`line-assistant.credentials.${this.userId}`, JSON.stringify(credentials))
            .expire(`line-assistant.credentials.${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
        debug('results:', results);

        this.setCredentials({ ...credentials, access_token: credentials.access_token });

        return this;
    }

    public async logout() {
        await redisClient.del(`line-assistant.credentials.${this.userId}`);
    }

    public async saveCallbackState(state: string) {
        await redisClient.multi()
            .set(`line-assistant.callbackState.${this.userId}`, state)
            .expire(`line-assistant.callbackState.${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
    }

    public async findCallbackState(): Promise<Object | null> {
        return redisClient.get(`line-assistant.callbackState.${this.userId}`).then((value) => {
            return (value !== null) ? JSON.parse(value) : null;
        });
    }

    public async deleteCallbackState() {
        await redisClient.del(`line-assistant.callbackState.${this.userId}`);
    }

    public async saveMFAPass(pass: string, postEvent: LINE.IWebhookEvent) {
        return new Promise<string>((resolve, reject) => {
            // JWT作成
            const payload = { events: [postEvent] };
            jwt.sign(payload, SECRET, { expiresIn: POST_EVENT_TOKEN_EXPIRES_IN_SECONDS }, async (jwtErr, token) => {
                if (jwtErr instanceof Error) {
                    reject(jwtErr);
                } else {
                    const key = `line-assistant.postEvent.${this.userId}.${pass}`;

                    const results = await redisClient.multi()
                        .set(key, token)
                        .expire(key, POST_EVENT_TOKEN_EXPIRES_IN_SECONDS, debug)
                        .exec();
                    debug('results:', results);

                    resolve(pass);
                }
            });
        });
    }

    public async verifyMFAPass(pass: string) {
        return new Promise<LINE.IWebhookEvent | null>(async (resolve, reject) => {
            const key = `line-assistant.postEvent.${this.userId}.${pass}`;

            const token = await redisClient.get(key);
            if (token === null) {
                resolve(null);

                return;
            }

            jwt.verify(token, SECRET, (jwtErr, decoded: LINE.IWebhookEvent) => {
                if (jwtErr instanceof Error) {
                    reject(jwtErr);
                } else {
                    resolve(decoded);
                }
            });
        });
    }

    public async deleteMFAPass(pass: string) {
        const key = `line-assistant.postEvent.${this.userId}.${pass}`;
        await redisClient.del(key);
    }

    /**
     * 顔画像を検証する
     * @param source 顔画像buffer
     */
    public async verifyFace(source: Buffer) {
        return new Promise<AWS.Rekognition.Types.SearchFacesByImageResponse>((resolve, reject) => {
            rekognition.searchFacesByImage(
                {
                    CollectionId: this.rekognitionCollectionId,
                    FaceMatchThreshold: 0,
                    // FaceMatchThreshold: FACE_MATCH_THRESHOLD,
                    MaxFaces: 5,
                    Image: {
                        Bytes: source
                    }
                },
                (err, data) => {
                    if (err instanceof Error) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
        });
    }

    /**
     * 顔画像を登録する
     * @param source 顔画像buffer
     */
    public async indexFace(source: Buffer) {
        await new Promise((resolve, reject) => {
            rekognition.indexFaces(
                {
                    CollectionId: this.rekognitionCollectionId,
                    Image: {
                        Bytes: source
                    },
                    DetectionAttributes: ['ALL']
                    // ExternalImageId: 'STRING_VALUE'
                },
                (err, __) => {
                    if (err instanceof Error) {
                        reject(err);
                    } else {
                        debug('face indexed.');
                        resolve();
                    }
                });
        });
    }

    /**
     * 登録済顔画像を検索する
     */
    public async searchFaces() {
        return new Promise<AWS.Rekognition.FaceList>((resolve, reject) => {
            rekognition.listFaces(
                {
                    CollectionId: this.rekognitionCollectionId
                },
                (err, data) => {
                    if (err instanceof Error) {
                        // コレクション未作成であれば空配列を返す
                        if (err.code === 'ResourceNotFoundException') {
                            resolve([]);
                        } else {
                            reject(err);
                        }
                    } else {
                        const faces = (data.Faces !== undefined) ? data.Faces : [];
                        resolve(faces);
                    }
                });
        });
    }
}
