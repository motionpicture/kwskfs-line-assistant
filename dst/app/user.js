"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const kwskfsapi = require("@motionpicture/kwskfs-api-nodejs-client");
const AWS = require("aws-sdk");
const createDebug = require("debug");
const redis = require("ioredis");
const jwt = require("jsonwebtoken");
const debug = createDebug('kwskfs-line-assistant:user');
// 以下環境変数をセットすること
// AWS_ACCESS_KEY_ID
// AWS_SECRET_ACCESS_KEY
const rekognition = new AWS.Rekognition({
    apiVersion: '2016-06-27',
    region: 'us-west-2'
});
const redisClient = new redis({
    host: process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
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
class User {
    constructor(configurations) {
        this.host = configurations.host;
        this.userId = configurations.userId;
        this.state = configurations.state;
        this.rekognitionCollectionId = `kwskfs-line-assistant-${this.userId}`;
        this.authClient = new kwskfsapi.auth.OAuth2({
            domain: process.env.API_AUTHORIZE_SERVER_DOMAIN,
            clientId: process.env.API_CLIENT_ID,
            clientSecret: process.env.API_CLIENT_SECRET,
            redirectUri: `https://${configurations.host}/signIn`,
            logoutUri: `https://${configurations.host}/logout`
        });
    }
    generateAuthUrl() {
        return this.authClient.generateAuthUrl({
            scopes: [],
            state: this.state,
            codeVerifier: process.env.API_CODE_VERIFIER
        });
    }
    generateLogoutUrl() {
        return this.authClient.generateLogoutUrl();
    }
    getCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            return redisClient.get(`line-assistant.credentials.${this.userId}`)
                .then((value) => (value === null) ? null : JSON.parse(value));
        });
    }
    getRefreshToken() {
        return __awaiter(this, void 0, void 0, function* () {
            return redisClient.get(`line-assistant.refreshToken.${this.userId}`)
                .then((value) => (value === null) ? null : value);
        });
    }
    setCredentials(credentials) {
        const payload = jwt.decode(credentials.access_token);
        debug('payload:', payload);
        this.payload = payload;
        this.accessToken = credentials.access_token;
        this.authClient.setCredentials(credentials);
        return this;
    }
    signIn(code) {
        return __awaiter(this, void 0, void 0, function* () {
            // 認証情報を取得できればログイン成功
            const credentials = yield this.authClient.getToken(code, process.env.API_CODE_VERIFIER);
            debug('credentials published', credentials);
            if (credentials.access_token === undefined) {
                throw new Error('Access token is required for credentials.');
            }
            if (credentials.refresh_token === undefined) {
                throw new Error('Refresh token is required for credentials.');
            }
            // ログイン状態を保持
            const results = yield redisClient.multi()
                .set(`line-assistant.credentials.${this.userId}`, JSON.stringify(credentials))
                .expire(`line-assistant.credentials.${this.userId}`, EXPIRES_IN_SECONDS, debug)
                .exec();
            debug('results:', results);
            // rekognitionコレクション作成
            yield new Promise((resolve, reject) => {
                rekognition.createCollection({
                    CollectionId: this.rekognitionCollectionId
                }, (err, __) => __awaiter(this, void 0, void 0, function* () {
                    if (err instanceof Error) {
                        // すでに作成済であればok
                        if (err.code === 'ResourceAlreadyExistsException') {
                            resolve();
                        }
                        else {
                            reject(err);
                        }
                    }
                    else {
                        resolve();
                    }
                }));
            });
            // リフレッシュトークンを保管
            yield redisClient.multi()
                .set(`line-assistant.refreshToken.${this.userId}`, credentials.refresh_token)
                .expire(`line-assistant.refreshToken.${this.userId}`, REFRESH_TOKEN_EXPIRES_IN_SECONDS, debug)
                .exec();
            debug('refresh token saved.');
            this.setCredentials(Object.assign({}, credentials, { access_token: credentials.access_token }));
            return this;
        });
    }
    signInForcibly(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            // ログイン状態を保持
            const results = yield redisClient.multi()
                .set(`line-assistant.credentials.${this.userId}`, JSON.stringify(credentials))
                .expire(`line-assistant.credentials.${this.userId}`, EXPIRES_IN_SECONDS, debug)
                .exec();
            debug('results:', results);
            this.setCredentials(Object.assign({}, credentials, { access_token: credentials.access_token }));
            return this;
        });
    }
    logout() {
        return __awaiter(this, void 0, void 0, function* () {
            yield redisClient.del(`line-assistant.credentials.${this.userId}`);
        });
    }
    saveCallbackState(state) {
        return __awaiter(this, void 0, void 0, function* () {
            yield redisClient.multi()
                .set(`line-assistant.callbackState.${this.userId}`, state)
                .expire(`line-assistant.callbackState.${this.userId}`, EXPIRES_IN_SECONDS, debug)
                .exec();
        });
    }
    findCallbackState() {
        return __awaiter(this, void 0, void 0, function* () {
            return redisClient.get(`line-assistant.callbackState.${this.userId}`).then((value) => {
                return (value !== null) ? JSON.parse(value) : null;
            });
        });
    }
    deleteCallbackState() {
        return __awaiter(this, void 0, void 0, function* () {
            yield redisClient.del(`line-assistant.callbackState.${this.userId}`);
        });
    }
    saveMFAPass(pass, postEvent) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                // JWT作成
                const payload = { events: [postEvent] };
                jwt.sign(payload, SECRET, { expiresIn: POST_EVENT_TOKEN_EXPIRES_IN_SECONDS }, (jwtErr, token) => __awaiter(this, void 0, void 0, function* () {
                    if (jwtErr instanceof Error) {
                        reject(jwtErr);
                    }
                    else {
                        const key = `line-assistant.postEvent.${this.userId}.${pass}`;
                        const results = yield redisClient.multi()
                            .set(key, token)
                            .expire(key, POST_EVENT_TOKEN_EXPIRES_IN_SECONDS, debug)
                            .exec();
                        debug('results:', results);
                        resolve(pass);
                    }
                }));
            });
        });
    }
    verifyMFAPass(pass) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const key = `line-assistant.postEvent.${this.userId}.${pass}`;
                const token = yield redisClient.get(key);
                if (token === null) {
                    resolve(null);
                    return;
                }
                jwt.verify(token, SECRET, (jwtErr, decoded) => {
                    if (jwtErr instanceof Error) {
                        reject(jwtErr);
                    }
                    else {
                        resolve(decoded);
                    }
                });
            }));
        });
    }
    deleteMFAPass(pass) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = `line-assistant.postEvent.${this.userId}.${pass}`;
            yield redisClient.del(key);
        });
    }
    /**
     * 顔画像を検証する
     * @param source 顔画像buffer
     */
    verifyFace(source) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                rekognition.searchFacesByImage({
                    CollectionId: this.rekognitionCollectionId,
                    FaceMatchThreshold: 0,
                    // FaceMatchThreshold: FACE_MATCH_THRESHOLD,
                    MaxFaces: 5,
                    Image: {
                        Bytes: source
                    }
                }, (err, data) => {
                    if (err instanceof Error) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    }
    /**
     * 顔画像を登録する
     * @param source 顔画像buffer
     */
    indexFace(source) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, reject) => {
                rekognition.indexFaces({
                    CollectionId: this.rekognitionCollectionId,
                    Image: {
                        Bytes: source
                    },
                    DetectionAttributes: ['ALL']
                    // ExternalImageId: 'STRING_VALUE'
                }, (err, __) => {
                    if (err instanceof Error) {
                        reject(err);
                    }
                    else {
                        debug('face indexed.');
                        resolve();
                    }
                });
            });
        });
    }
    /**
     * 登録済顔画像を検索する
     */
    searchFaces() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                rekognition.listFaces({
                    CollectionId: this.rekognitionCollectionId
                }, (err, data) => {
                    if (err instanceof Error) {
                        // コレクション未作成であれば空配列を返す
                        if (err.code === 'ResourceNotFoundException') {
                            resolve([]);
                        }
                        else {
                            reject(err);
                        }
                    }
                    else {
                        const faces = (data.Faces !== undefined) ? data.Faces : [];
                        resolve(faces);
                    }
                });
            });
        });
    }
}
exports.default = User;
