# Kyoso Cloud Agent

<!-- Language Selection -->
[日本語](#japanese) | [English](#english)

---

<a id="japanese"></a>
## Japanese

### はじめに

Kyoso Cloud Agentは、2つの主要機能を提供するサービスです：

1. **Identus Cloud Agentプロキシ**: クライアントアプリケーションがIdentus Cloud Agentの機能を簡単に利用できるよう、複雑なコネクション管理やユーザ操作を抽象化し、単一のリクエストで必要な機能を提供

2. **オフチェーンポイント監査システム**: 一定期間ごとにオフチェーンポイント取引をマークルツリーでスナップショット化し、Cardanoブロックチェーンに記録。第三者機関として、ポイント運用企業がDBの改ざんや消去を行っていないかを保証

### アーキテクチャ

#### 1. Identus Cloud Agentプロキシ

```mermaid
graph LR
    A[クライアントアプリ] -->|Firebase JWT + APIキー + リクエスト| B[Kyoso Cloud Agent]
    B -->|JWT検証| C[Firebase]
    B -->|変換されたリクエスト| D[Identus Cloud Agent]
```

#### 2. オフチェーンポイント監査システム

```mermaid
graph LR
    A[クライアントアプリ] --> B[クライアントDB]
    B -->|週次データ取得| C[Kyoso Cloud Agent]
    C -->|マークルツリー作成| C
    C -->|ルートハッシュをメタデータにコミット| D[Cardanoブロックチェーン]
```

### 基本的な動作

#### 1. Identus Cloud Agentプロキシ

1. **認証**: クライアントアプリからFirebase JWTを受信
2. **JWT検証**: Firebaseでトークンの有効性を確認
3. **API変換**: クライアントリクエストをIdentus Cloud Agent APIに変換
4. **プロキシ処理**: Identus Cloud Agentにリクエストを転送
5. **レスポンス**: 結果をクライアントに返却

#### 2. オフチェーンポイント監査システム

**コミット処理（週次自動実行）:**
1. **データ収集**: 未コミットのポイントトランザクションを取得
2. **マークルツリー構築**: トランザクションをSHA256でハッシュ化してマークルツリーを作成
3. **ブロックチェーンコミット**: ルートハッシュをメタデータとしてCardano Preprodネットワークに送信
4. **プルーフ生成**: 各トランザクション用のマークルプルーフを生成・保存

**検証処理（API経由）:**
1. **プルーフ取得**: 指定トランザクションのマークルプルーフを取得
2. **ルートハッシュ再計算**: プルーフを使用してルートハッシュを再計算
3. **オンチェーン照合**: Cardanoブロックチェーンのメタデータと照合
4. **検証結果**: データ整合性の検証結果を返却

### ユーザAPI鍵生成ロジック

Firebase JWTの認証情報から、Identus Cloud Agent用のユーザ固有API鍵を動的に生成します：

```
userApiKey = HMAC-SHA256(salt, "iss|aud|sub|phone_number")
```

- **入力データ**: JWT claims（発行者、対象者、ユーザID、電話番号）
- **ハッシュ**: 設定されたsaltを使用してHMAC-SHA256で暗号化
- **用途**: 各リクエストでIdentus Cloud Agentに送信するx-user-api-keyヘッダー値として使用

## 開発環境セットアップ

### 前提条件

- Node.js (v18以上)
- npm (v9以上)
- Docker および Docker Compose
- PostgreSQL クライアント（オプション）

### 環境変数設定

`.env.sample`をコピーして`.env`ファイルを作成し、必要な環境変数を設定してください：

```bash
cp .env.sample .env
```

#### 環境変数一覧

##### Kyoso Cloud Agent設定

| 環境変数名 | 説明 |
|----------|------|
| `API_KEY` | Kyoso Cloud AgentのREST API認証に使用するAPIキー |
| `HTTP_TIMEOUT` | HTTPリクエストのタイムアウト時間（ミリ秒） |
| `IDENTUS_CLOUD_AGENT_URL` | Identus Cloud AgentのベースURL |
| `KYOSO_ISSUER_API_KEY` | Identus Cloud AgentのIssuer用APIキー |
| `IDENTUS_API_SALT` | ユーザーAPIキー生成に使用するソルト値 |
| `REDIS_HOST` | Redisサーバーのホスト名 |
| `REDIS_PORT` | Redisサーバーのポート番号 |
| `AUTH_MODE` | 認証モード（`TEST`または`FIREBASE`） |

##### Firebase設定

| 環境変数名 | 説明 |
|----------|------|
| `FIREBASE_ISSUER` | Firebase JWTの発行者 |
| `FIREBASE_AUDIENCE` | Firebase JWTの対象者 |
| `FIREBASE_PROJECT_ID` | FirebaseプロジェクトID |
| `FIREBASE_CLIENT_EMAIL` | Firebaseサービスアカウントのメールアドレス |
| `FIREBASE_PRIVATE_KEY` | Firebaseサービスアカウントの秘密鍵 |
| `FIREBASE_AUTH_DOMAIN` | Firebase認証ドメイン |
| `FIREBASE_API_KEY` | Firebase APIキー |

##### Agent設定

| 環境変数名 | 説明 |
|----------|------|
| `AGENT_API_KEY_SALT` | Agent APIキー生成用のソルト |
| `AGENT_ADMIN_TOKEN` | Agent管理者トークン |
| `POSTGRES_PASSWORD` | PostgreSQLのrootパスワード |
| `AGENT_DB_APP_PASSWORD` | Agentデータベースアプリケーション用パスワード |
| `VAULT_DEV_ROOT_TOKEN_ID` | Vault開発用ルートトークンID |
| `NODE_PSQL_PASSWORD` | PRISMノード用PostgreSQLパスワード |

##### ポイント管理設定

| 環境変数名 | 説明 |
|----------|------|
| `BLOCKFROST_PROJECT_ID` | BlockfrostのプロジェクトID（Cardanoブロックチェーンアクセス用） |
| `WALLET_MNEMONIC` | Cardanoウォレットのニーモニックフレーズ |
| `CARDANO_NETWORK_ID` | Cardanoネットワーク識別子（0=preprod/testnet, 1=mainnet） |
| `POINT_DATABASE_URL` | ポイント管理用データベースのURL |

### インストール手順

#### 1. 依存関係のインストール

```bash
npm install
```

#### 2. Prismaスキーマの生成

データベーススキーマを生成します：

```bash
npx prisma generate
```

#### 3. インフラストラクチャの起動

Docker Composeを使用して必要なサービス（PostgreSQL、Redis、Identus Cloud Agent等）を起動します：

```bash
make up
```

このコマンドにより以下のサービスが起動されます：
- PostgreSQLデータベース
- Redis キャッシュサーバー
- Identus Cloud Agent
- Vault（シークレット管理）
- PRISM Node

#### 4. データベースマイグレーション

初回セットアップ時、またはスキーマ変更後に実行：

```bash
npm run migrate
```

#### 5. アプリケーションの起動

新しいターミナルタブまたはウィンドウを開き、開発モードでアプリケーションを起動します：

```bash
npm run start:dev
```

アプリケーションは`http://localhost:3000`で起動します。

### 開発用コマンド

| コマンド | 説明 |
|---------|------|
| `npm run start:dev` | 開発モード（ホットリロード有効）でアプリケーションを起動 |
| `npm run build` | プロダクション用にアプリケーションをビルド |
| `npm run start:prod` | プロダクションモードでアプリケーションを起動 |
| `npm run test` | ユニットテストを実行 |
| `npm run test:e2e` | E2Eテストを実行 |
| `npm run lint` | ESLintでコードをチェック |
| `npm run format` | Prettierでコードフォーマット |
| `npm run seed` | データベースに初期データを投入 |
| `make down` | Dockerコンテナを停止・削除 |
| `make logs` | Dockerコンテナのログを表示 |

## APIリファレンス


### DID関連

- [DID作成・発行ジョブ](#did作成発行ジョブ)
- [DIDジョブステータス取得](#didジョブステータス取得)
- [ユーザーDID取得](#ユーザーdid取得)
- [Issuer DID取得](#issuer-did取得)

### VC関連

- [VCコネクションレス発行ジョブ](#vcコネクションレス発行ジョブ)
- [VCジョブステータス取得](#vcジョブステータス取得)
- [VCレコード一覧取得](#vcレコード一覧取得)
- [VCレコード詳細取得](#vcレコード詳細取得)

### ポイント関連
- [ポイントトランザクションのオンチェーンコミット](#ポイント・コミット)
- [ポイントトランザクションの検証](#トランザクション検証)


#### DID作成・発行ジョブ

##### 概要
Decentralized Identifier (DID)を作成し、Cardanoブロックチェーンに発行する非同期ジョブを開始します。
ホルダーとして、自身のアイデンティティを証明するための分散型識別子を作成します。イッシュアーとして、後に検証可能な資格情報を発行するためのDIDを生成します。このプロセスは非同期で実行され、DIDの作成からブロックチェーンでの確定まで段階的に進行します。

##### エンドポイント
```
POST /did/job/create-and-publish
```

##### 認証
- **必須ヘッダー**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### 処理フロー
```mermaid
sequenceDiagram
    participant C as クライアント
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant I as Identus Cloud Agent
    participant B as Cardano Blockchain

    C->>K: POST /did/job/create-and-publish
    K->>F: JWT検証
    F-->>K: 検証成功
    K->>K: ユーザAPI鍵生成
    K->>I: DID作成リクエスト
    I->>I: DID生成・署名
    I->>B: DIDをブロックチェーンに発行
    B-->>I: トランザクション確認
    I-->>K: DID作成完了
    K-->>C: ジョブID返却
```

##### リクエスト

**Content-Type**: `application/json`

**ボディパラメータ**: なし

**リクエスト例**:
```json
{}
```

##### レスポンス

**成功時 (200 OK)**:
```json
{
  "jobId": "create-and-publish-12345"
}
```

**エラーレスポンス**:

| ステータスコード | エラーコード | 説明 |
|--------------|------------|------|
| `400` | `INVALID_REQUEST` | リクエストパラメータが不正 |
| `401` | `UNAUTHORIZED` | 認証エラー |
| `403` | `FORBIDDEN` | APIキーが無効 |
| `404` | `NOT_FOUND` | リソースが見つからない |
| `422` | `UNPROCESSABLE_ENTITY` | リクエスト処理不可 |
| `500` | `INTERNAL_ERROR` | サーバー内部エラー |



#### DIDジョブステータス取得

##### 概要
指定されたジョブIDのDID作成・発行ジョブのステータスを取得します。
ジョブの進捗状況、処理結果、エラー情報を確認できます。

##### エンドポイント
```
GET /did/job/{jobId}
```

##### 認証
- **必須ヘッダー**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### 処理フロー
```mermaid
sequenceDiagram
    participant C as クライアント
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant Q as BullMQ Queue
    participant I as Identus Cloud Agent

    C->>K: GET /did/job/{jobId}
    K->>F: JWT検証
    F-->>K: 検証成功
    K->>Q: ジョブ情報取得
    Q-->>K: ジョブステータス
    alt ジョブが完了または進行中（75%以上）
        K->>I: DIDステータス確認
        I-->>K: DIDステータス
    end
    K-->>C: ジョブステータス返却
```

##### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|---------|-----|------|------|
| jobId | string | ✓ | 取得するジョブの識別子 |

**リクエスト例**:
```bash
curl -X GET "https://api.example.com/did/job/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-api-key: your-api-key"
```

##### レスポンス

**成功時 (200 OK)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "progress": 100,
  "result": {
    "did": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f",
    "status": "PUBLISHED",
    "longFormDid": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f:Cr8BCrQBCpEBCiQKIQKBjxhldqgH1LED6fL63bAopBe2_ObE4_4MLNxRTAUJGgpMEj8KCwjADBIEcm9vdBABEjBDb21tZXJjaWFsIEluc3VyZXIgRElEIGZvciBsaWNlbnNlIGNyZWRlbnRpYWwgaXNzdWluZxpAVGhpcyBpcyBjb21tZXJjaWFsIGluc3VyZXIgZGlkIGZvciBpc3N1aW5nIGxpY2Vuc2UgY3JlZGVudGlhbHMgdG8gaG9sZGVycw",
    "keyId": "key-1",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:32:15Z"
  }
}
```

**ジョブが進行中の場合**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "in_progress",
  "progress": 75,
  "result": {
    "did": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f",
    "status": "CREATED",
    "longFormDid": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f:Cr8BCrQBCpEBCiQKIQKBjxhldqgH1LED6fL63bAopBe2_ObE4_4MLNxRTAUJGgpMEj8KCwjADBIEcm9vdBABEjBDb21tZXJjaWFsIEluc3VyZXIgRElEIGZvciBsaWNlbnNlIGNyZWRlbnRpYWwgaXNzdWluZxpAVGhpcyBpcyBjb21tZXJjaWFsIGluc3VyZXIgZGlkIGZvciBpc3N1aW5nIGxpY2Vuc2UgY3JlZGVudGlhbHMgdG8gaG9sZGVycw",
    "keyId": "key-1",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:31:30Z"
  }
}
```

**エラーレスポンス**:

| ステータスコード | エラーコード | 説明 |
|--------------|------------|------|
| `401` | `UNAUTHORIZED` | 認証エラー（無効なFirebase JWT） |
| `403` | `FORBIDDEN` | APIキーが無効またはアクセス権限なし |
| `404` | `NOT_FOUND` | 指定されたジョブIDが存在しない |
| `422` | `UNPROCESSABLE_ENTITY` | リクエストパラメータが処理できない |
| `500` | `INTERNAL_ERROR` | サーバー内部エラー |

**エラーレスポンス例**:
```json
{
  "status": 404,
  "type": "/errors/job-not-found",
  "title": "Job Not Found",
  "detail": "Job 123e4567-e89b-12d3-a456-426614174000 not found"
}
```



#### ユーザーDID取得

##### 概要
ユーザーの管理対象DIDを取得します。1ユーザー1DIDの前提で、ユーザーに関連付けられた先頭のDIDを返します。該当DIDが存在しない場合はnullを返却します。またPUBLICATION_PENDINGステータスの場合はキャッシュを避けるため個別クエリで再確認を行います。

##### エンドポイント
```
GET /did
```

##### 認証
- **必須ヘッダー**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### 処理フロー
```mermaid
sequenceDiagram
    participant C as クライアント
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant I as Identus Cloud Agent

    C->>K: GET /did
    K->>F: JWT検証
    F-->>K: 検証成功
    K->>I: GET /did-registrar/dids (limit=1)
    I-->>K: DIDリスト返却
    alt DIDが存在する場合
        alt ステータスがPUBLICATION_PENDINGの場合
            K->>I: GET /did-registrar/dids/{longFormDid}
            I-->>K: 最新DID状態返却
        end
        K-->>C: DID情報返却
    else DIDが存在しない場合
        K-->>C: null返却
    end
```

##### リクエスト

**Content-Type**: `application/json`

**ボディパラメータ**: なし

**リクエスト例**:
```bash
curl -X GET "https://api.example.com/did" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5..." \
  -H "x-api-key: your_api_key"
```

##### レスポンス

**成功時 (200 OK)**:
```json
{
  "did": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f",
  "longFormDid": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f:Cr4BCrsBEjsKC3Nlcp...",
  "status": "PUBLISHED",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

**DIDが存在しない場合 (200 OK)**:
```json
null
```

**エラーレスポンス**:

| ステータスコード | エラーコード | 説明 |
|--------------|------------|------|
| `400` | `INVALID_REQUEST` | リクエストパラメータが不正 |
| `401` | `UNAUTHORIZED` | 認証エラー |
| `403` | `FORBIDDEN` | APIキーが無効 |
| `500` | `INTERNAL_ERROR` | サーバー内部エラー |



#### Issuer DID取得

##### 概要
システム全体で使用されるIssuer DIDを取得します。
Issuer DIDが存在しない場合は、DIDを自動的に作成・発行して返します。
ホルダーとしてはCredentialを受け取る際にこのIssuer DIDを信頼できる発行者として参照し、イッシュアーとしてはこのDIDでCredentialに署名を行います。

##### エンドポイント
```
GET /did/issuer
```

##### 認証
- **必須ヘッダー**:
  - `x-api-key: {api_key}`

##### 処理フロー
```mermaid
sequenceDiagram
    participant C as クライアント
    participant K as Kyoso Cloud Agent
    participant I as Identus Cloud Agent
    participant B as Cardano Blockchain

    C->>K: GET /did/issuer
    alt Issuer DIDが存在し、PUBLISHED状態
        K-->>C: 既存のDIDを返却
    else Issuer DIDが存在せず
        K->>I: DID作成リクエスト
        I->>I: DID生成・署名
        I-->>K: DID作成完了
        K->>I: DID発行リクエスト
        I->>B: DIDをブロックチェーンに発行
        B-->>I: トランザクション確認
        I-->>K: DID発行完了
        K-->>C: 新規作成・発行したDIDを返却
    else Issuer DIDが存在し、CREATED状態
        K->>I: DID発行リクエスト
        I->>B: DIDをブロックチェーンに発行
        B-->>I: トランザクション確認
        I-->>K: DID発行完了
        K-->>C: 発行済みDIDを返却
    end
```

##### レスポンス

**成功時 (200 OK)**:
```json
{
  "did": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f",
  "longFormDid": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f:CsQBCsEBElwKEgoPBBI...",
  "status": "PUBLISHED",
  "keyPairs": [
    {
      "keyId": "key-1",
      "curve": "Ed25519"
    },
    {
      "keyId": "key-2",
      "curve": "Ed25519"
    }
  ]
}
```

**エラーレスポンス**:

| ステータスコード | エラーコード | 説明 |
|--------------|------------|------|
| `400` | `INVALID_REQUEST` | リクエストパラメータが不正 |
| `401` | `UNAUTHORIZED` | 認証エラー |
| `403` | `FORBIDDEN` | APIキーが無効 |
| `404` | `RESOURCE_NOT_FOUND` | リソースが見つからない |
| `422` | `UNPROCESSABLE_ENTITY` | リクエストを処理できない |
| `500` | `INTERNAL_ERROR` | サーバー内部エラー |



#### VCコネクションレス発行ジョブ

##### 概要
Verifiable Credential (VC)をコネクションを確立せずに発行する非同期ジョブを開始します。
ホルダー（証明書受領者）として認証されたユーザーが、イッシュアー（発行者）から証明書を受け取るプロセスを自動化します。内部的にはOut-of-Band (OOB) メッセージとDIDCommプロトコルを使用して、イッシュアーからホルダーへのVC発行フローを実行します。

##### エンドポイント
```
POST /vc/connectionless/job/issue-to-holder
```

##### 認証
- **必須ヘッダー**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### 処理フロー
```mermaid
sequenceDiagram
    participant C as クライアント
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant I as Identus Cloud Agent (Issuer)
    participant H as Identus Cloud Agent (Holder)

    C->>K: POST /vc/connectionless/job/issue-to-holder
    K->>F: JWT検証
    F-->>K: 検証成功

    Note over K: 1. Issuer/Holder DID確認
    K->>I: DID検索・確認
    K->>H: DID検索・確認

    Note over K: 2. VC Offer作成 (Issuer)
    K->>I: createCredentialOfferInvitation
    I-->>K: VC Offer + OOB Invitation

    Note over K: 3. Invitation受諾 (Holder)
    K->>H: acceptCredentialOfferInvitation
    H-->>K: RecordId返却

    Note over K: 4. Offer受諾 (Holder)
    K->>H: acceptOffer (subjectId=holderDID)
    H-->>K: 更新されたRecord

    Note over K: 5. Credential発行 (Issuer)
    K->>I: issueCredential
    I-->>K: 発行完了

    Note over K: 6. Credential受信確認
    K->>H: getRecord (CREDENTIAL_RECEIVED待機)
    H-->>K: 最終Record

    K-->>C: ジョブID返却
```

##### リクエスト

**Content-Type**: `application/json`

**ボディパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|---------|-----|------|------|
| `claims` | `object` | ✓ | VC内に含める証明内容（クレーム） |

**リクエスト例**:
```json
{
  "claims": {
    "name": "山田 太郎",
    "email": "taro@example.com",
    "memberId": "MEMBER-123456",
    "membershipLevel": "ゴールド",
    "joinDate": "2023-05-15",
    "expiryDate": "2024-05-14",
    "organizationName": "株式会社KYOSO"
  }
}
```

##### レスポンス

**成功時 (200 OK)**:
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**エラーレスポンス**:

| ステータスコード | エラーコード | 説明 |
|--------------|------------|------|
| `400` | `INVALID_REQUEST` | リクエストパラメータが不正 |
| `401` | `UNAUTHORIZED` | 認証エラー |
| `403` | `FORBIDDEN` | APIキーが無効 |
| `404` | `RESOURCE_NOT_FOUND` | Issuer DIDまたはHolder DIDが見つからない |
| `422` | `UNPROCESSABLE_ENTITY` | DIDが未公開状態 |
| `500` | `INTERNAL_ERROR` | サーバー内部エラー |

#### VCジョブステータス取得

##### 概要
Verifiable Credential (VC) 発行ジョブのステータスと進捗状況を取得します。
ホルダーとしてVC発行の進捗を追跡し、発行完了後にはVCデータの受け取りが可能になります。
イッシュアーとして発行したVCの状況を監視し、エラー発生時にはその詳細な情報を把握できます。

##### エンドポイント
```
GET /vc/connectionless/job/{jobId}
```

##### 認証
- **必須ヘッダー**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### 処理フロー
```mermaid
sequenceDiagram
    participant C as クライアント
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant Q as BullMQキュー
    participant I as Identus Cloud Agent

    C->>K: GET /vc/connectionless/job/{jobId}
    K->>F: JWT検証
    F-->>K: 検証成功
    K->>Q: ジョブステータス取得
    Q-->>K: BullMQステータス返却
    Note over K: ステータス変換処理
    Note over K: - completed: COMPLETED
    Note over K: - failed: FAILED
    Note over K: - active: IN_PROGRESS
    Note over K: - waiting/delayed: PENDING
    K-->>C: ジョブステータス返却
```

##### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|---------|-----|------|------|
| `jobId` | string | ✓ | VC発行ジョブのID |

##### レスポンス

**成功時 (200 OK)**:
```json
{
  "id": "job-12345",
  "status": "completed",
  "progress": 100,
  "result": {
    "recordId": "vc-record-uuid",
    "subjectId": "did:prism:holder-did",
    "issuer": "did:prism:issuer-did",
    "validityPeriod": {
      "start": "2024-01-15T10:30:00Z",
      "end": "2024-12-31T23:59:59Z"
    },
    "claims": {
      "name": "田中太郎",
      "age": 30
    },
    "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

**エラーレスポンス**:

| ステータスコード | エラーコード | 説明 |
|--------------|------------|------|
| `400` | `INVALID_REQUEST` | リクエストパラメータが不正 |
| `401` | `UNAUTHORIZED` | 認証エラー |
| `403` | `FORBIDDEN` | APIキーが無効 |
| `404` | `NOT_FOUND` | 指定されたジョブが存在しない |
| `422` | `UNPROCESSABLE_ENTITY` | 処理できないリクエスト |
| `500` | `INTERNAL_ERROR` | サーバー内部エラー |





#### VCレコード一覧取得

##### 概要
Verifiable Credential (VC)のレコード一覧を取得します。このエンドポイントは、HolderとIssuer間で行われたVCの履歴と現在のステータスを一覧で表示するために使用されます。レコードには、発行処理の進行状況、状態、関連するDID情報など、VCフロー全体を管理するための重要な情報が含まれています。

##### エンドポイント
```
GET /vc
```

##### 認証
- **必須ヘッダー**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### 処理フロー
```mermaid
sequenceDiagram
    participant C as クライアント
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant I as Identus Cloud Agent

    C->>K: GET /vc
    K->>F: JWT検証
    F-->>K: 検証成功
    K->>K: ユーザAPI鍵生成
    K->>I: GET /issue-credentials/records
    I-->>K: VCレコード一覧
    K-->>C: VCレコード一覧返却
```

##### リクエスト

**Content-Type**: `application/json`

**ボディパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|---------|-----|------|------|
| なし | | | |

**リクエスト例**:
```json
```

##### レスポンス

**成功時 (200 OK)**:
```json
{
  "contents": [
    {
      "recordId": "issue-credential-record-123",
      "thid": "thread-id-456",
      "schemaId": "schema:credentials:1.0",
      "credentialDefinitionId": "cred-def-789",
      "credentialDefinitionGuid": "guid-abc-123",
      "credentialFormat": "JWT",
      "role": "Issuer",
      "subjectId": "did:prism:subject123",
      "validityPeriod": "2024-12-31T23:59:59Z",
      "automaticIssuance": true,
      "protocolState": "OfferSent",
      "issuingDID": "did:prism:issuer123",
      "metaRetries": 0,
      "updatedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "kind": "Collection",
  "self": "/cloud-agent/issue-credentials/records",
  "pageOf": "/cloud-agent/issue-credentials/records"
}
```

**エラーレスポンス**:

| ステータスコード | エラーコード | 説明 |
|--------------|------------|------|
| `401` | `UNAUTHORIZED` | 認証エラー |
| `403` | `FORBIDDEN` | APIキーが無効 |
| `500` | `INTERNAL_ERROR` | サーバー内部エラー |

#### VCレコード詳細取得

##### 概要
指定されたレコードIDに基づいて、特定のVerifiable Credential (VC)レコードの詳細情報を取得します。このエンドポイントは、個別のVCフローの詳細な状態確認、トラブルシューティング、進行状況の監視に使用されます。レスポンスには、現在のプロトコル状態、関連するDID、発行された証明書の情報などが含まれます。

##### エンドポイント
```
GET /vc/{recordId}
```

##### 認証
- **必須ヘッダー**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### 処理フロー
```mermaid
sequenceDiagram
    participant C as クライアント
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant I as Identus Cloud Agent

    C->>K: GET /vc/{recordId}
    K->>F: JWT検証
    F-->>K: 検証成功
    K->>K: ユーザAPI鍵生成
    K->>I: GET /issue-credentials/records/{recordId}
    I-->>K: VCレコード詳細
    K-->>C: VCレコード詳細返却
```

##### リクエスト

**Content-Type**: `application/json`

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|---------|-----|------|------|
| recordId | string | ○ | VCレコードID |

**リクエスト例**:
```json
```

##### レスポンス

**成功時 (200 OK)**:
```json
{
  "recordId": "issue-credential-record-123",
  "thid": "thread-id-456",
  "schemaId": "schema:credentials:1.0",
  "credentialDefinitionId": "cred-def-789",
  "credentialDefinitionGuid": "guid-abc-123",
  "credentialFormat": "JWT",
  "role": "Issuer",
  "subjectId": "did:prism:subject123",
  "validityPeriod": "2024-12-31T23:59:59Z",
  "automaticIssuance": true,
  "protocolState": "CredentialSent",
  "issuingDID": "did:prism:issuer123",
  "issuedCredentialRaw": "eyJhbGciOiJIUzI1NiIs...",
  "metaRetries": 0,
  "updatedAt": "2024-01-15T10:35:00Z",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**エラーレスポンス**:

| ステータスコード | エラーコード | 説明 |
|--------------|------------|------|
| `401` | `UNAUTHORIZED` | 認証エラー |
| `403` | `FORBIDDEN` | APIキーが無効 |
| `404` | `RESOURCE_NOT_FOUND` | 指定されたレコードが見つからない |
| `500` | `INTERNAL_ERROR` | サーバー内部エラー |


### ポイント管理

#### ポイント・コミット

##### 概要
未コミットのポイントトランザクションをメルクルツリー化し、ルートハッシュをCardanoブロックチェーンにコミットします。
このエンドポイントは定期的（週次）に実行され、ポイントシステムの整合性と透明性を保証するために、全ての未処理トランザクションをブロックチェーン上に永続的に記録します。メルクルツリーを使用することで、個々のトランザクションの存在証明と検証が可能になります。

##### エンドポイント
```
POST /point/commit
```

##### 認証
- **必須ヘッダー**: なし（内部システムによる定期実行）

##### 処理フロー
```mermaid
sequenceDiagram
    participant S as システム（cron）
    participant C as CommitService
    participant T as TransactionService
    participant M as MerkleService
    participant W as WalletService
    participant B as Cardanoブロックチェーン
    participant D as データベース

    S->>C: POST /point/commit
    C->>T: 最古の未コミットトランザクション取得
    T-->>C: 未コミットトランザクション一覧
    C->>M: メルクルツリー構築
    M-->>C: メルクルツリー + ルートハッシュ
    C->>T: 次のコミットラベル取得
    T-->>C: コミットラベル
    C->>W: メタデータをブロックチェーンにコミット
    W->>B: トランザクション送信
    B-->>W: トランザクションハッシュ
    W-->>C: txHash
    C->>D: コミット情報保存
    C->>M: 全メルクルプルーフ生成
    M-->>C: メルクルプルーフ配列
    C->>D: メルクルプルーフ保存
    C-->>S: コミット結果返却
```

##### リクエスト

**Content-Type**: `application/json`

**ボディパラメータ**: なし

**リクエスト例**:
```json
// リクエストボディなし
```

##### レスポンス

**成功時 (200 OK)**:
```json
{
  "txHash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "label": 42,
  "rootHash": "789abc123def456789012345678901234567890abcdef123456789012345678",
  "periodStart": "2024-01-15T10:30:00Z",
  "periodEnd": "2024-01-22T09:45:30Z",
  "walletAddress": "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp"
}
```

**未コミットトランザクションがない場合 (200 OK)**:
```json
{
  "txHash": null,
  "label": null,
  "rootHash": null,
  "periodStart": null,
  "periodEnd": null,
  "walletAddress": null
}
```

**レスポンスフィールド**:
| フィールド | 型 | 説明 |
|---------|-----|------|
| `txHash` | `string` | ブロックチェーンに記録されたコミットトランザクションのハッシュ |
| `label` | `number` | コミットの連番ラベル |
| `rootHash` | `string` | メルクルツリーのルートハッシュ |
| `periodStart` | `string` | コミット対象期間の開始日時（ISO 8601形式） |
| `periodEnd` | `string` | コミット対象期間の終了日時（ISO 8601形式） |
| `walletAddress` | `string` | コミットを実行したウォレットのアドレス |

**エラーレスポンス**:

| ステータスコード | エラーコード | 説明 |
|--------------|------------|------|
| `500` | `INTERNAL_ERROR` | サーバー内部エラー（DB接続エラー、ブロックチェーン接続エラー等） |

#### トランザクション検証

##### 概要
指定されたトランザクションIDのリストを受け取り、それぞれのトランザクションがCardanoブロックチェーンにコミットされたMerkle Tree内で有効であるかを検証します。トランザクションデータ、Merkleプルーフ、オンチェーンのルートハッシュを比較し、データの整合性を確認します。

##### エンドポイント
```
POST /point/verify
```

##### 認証
- **必須ヘッダー**: なし（現在の実装では認証は不要）

##### 処理フロー
```mermaid
sequenceDiagram
    participant C as クライアント
    participant PC as Point Controller
    participant VS as Verify Service
    participant TS as Transaction Service
    participant WS as Wallet Service
    participant MS as Merkle Service
    participant DB as Database
    participant B as Cardano Blockchain

    C->>PC: POST /point/verify
    PC->>VS: verifyTxIds(txIds)

    loop 各トランザクションID
        VS->>TS: findTransactionById(txId)
        TS->>DB: トランザクション取得
        DB-->>TS: トランザクション情報
        TS-->>VS: TransactionDto

        VS->>TS: getProofsForTransaction(txId)
        TS->>DB: Merkleプルーフ取得
        DB-->>TS: プルーフ配列
        TS-->>VS: Merkleプルーフ

        VS->>TS: getRootHashForTransaction(txId)
        TS->>DB: ルートハッシュ情報取得
        DB-->>TS: コミットID・ルートハッシュ
        TS-->>VS: ルートハッシュデータ

        VS->>WS: getMetadata(commitId)
        WS->>B: BlockfrostAPIでメタデータ取得
        B-->>WS: オンチェーンメタデータ
        WS-->>VS: メタデータレスポンス

        VS->>MS: verifyProof(tx, proofs, onchainRoot)
        MS->>MS: Merkleプルーフ検証
        MS-->>VS: 検証結果
    end

    VS-->>PC: 検証結果配列
    PC-->>C: VerifyResponseDto[]
```

##### リクエスト

**Content-Type**: `application/json`

**ボディパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|---------|-----|------|------|
| txIds | string[] | ✓ | 検証対象のトランザクションIDの配列 |

**リクエスト例**:
```json
{
  "txIds": ["tx_001", "tx_002", "tx_003"]
}
```

##### レスポンス

**成功時 (200 OK)**:
```json
[
  {
    "status": "verified",
    "txId": "tx_001",
    "transactionHash": "commit_hash_abc123",
    "rootHash": "merkle_root_def456",
    "label": 1
  },
  {
    "status": "not_verified",
    "txId": "tx_002",
    "transactionHash": "",
    "rootHash": "",
    "label": 0
  }
]
```

**レスポンスフィールド**:
| フィールド | 型 | 説明 |
|---------|-----|------|
| status | string | 検証結果（"verified" または "not_verified"） |
| txId | string | 検証対象のトランザクションID |
| transactionHash | string | Cardanoブロックチェーンのコミットハッシュ |
| rootHash | string | オンチェーンのMerkleルートハッシュ |
| label | number | メタデータラベル番号 |

**エラーレスポンス**:

```
| ステータスコード | エラーコード | 説明 |
|--------------|------------|------|
| `400` | `INVALID_REQUEST` | リクエストパラメータが不正 |
| `500` | `INTERNAL_ERROR` | サーバー内部エラー |
```

---
<a id="english"></a>
## English

### Introduction

Kyoso Cloud Agent provides two primary capabilities:

1. **Identus Cloud Agent Proxy**: Abstracts complex connection management and user interactions so that client applications can access Identus Cloud Agent features through a single request.
2. **Off-chain Point Audit System**: Periodically snapshots off-chain point transactions into a Merkle tree and records the root on the Cardano blockchain, acting as an independent third party to ensure that point operators do not tamper with or delete database records.

### Architecture

#### 1. Identus Cloud Agent Proxy

```mermaid
graph LR
    A[Client App] -->|Firebase JWT + API Key + Request| B[Kyoso Cloud Agent]
    B -->|JWT Verification| C[Firebase]
    B -->|Transformed Request| D[Identus Cloud Agent]
```

#### 2. Off-chain Point Audit System

```mermaid
graph LR
    A[Client App] --> B[Client DB]
    B -->|Weekly Data Fetch| C[Kyoso Cloud Agent]
    C -->|Build Merkle Tree| C
    C -->|Commit Root Hash to Metadata| D[Cardano Blockchain]
```

### Basic Behavior

#### 1. Identus Cloud Agent Proxy

1. **Authentication**: Receive a Firebase JWT from the client application.
2. **JWT Validation**: Validate the token with Firebase.
3. **API Transformation**: Convert the client request into the Identus Cloud Agent API format.
4. **Proxy Handling**: Forward the request to the Identus Cloud Agent.
5. **Response**: Return the result to the client.

#### 2. Off-chain Point Audit System

**Commit Process (runs weekly automatically):**

1. **Data Collection**: Retrieve uncommitted point transactions.
2. **Build Merkle Tree**: Hash each transaction with SHA-256 and construct the Merkle tree.
3. **Blockchain Commit**: Send the root hash as metadata to the Cardano Preprod network.
4. **Proof Generation**: Generate and store a Merkle proof for each transaction.

**Verification Process (via API):**

1. **Fetch Proof**: Retrieve the Merkle proof for the specified transaction.
2. **Recalculate Root Hash**: Recalculate the root hash using the proof.
3. **On-chain Comparison**: Compare it with the metadata stored on the Cardano blockchain.
4. **Verification Result**: Return the validation result.

### User API Key Generation Logic

Generate user-specific API keys for the Identus Cloud Agent dynamically from Firebase JWT claims:

```
userApiKey = HMAC-SHA256(salt, "iss|aud|sub|phone_number")
```

- **Input Data**: JWT claims (issuer, audience, user ID, phone number)
- **Hash**: Apply HMAC-SHA256 with the configured salt
- **Usage**: Send the value in the `x-user-api-key` header for each request to the Identus Cloud Agent

## Development Environment Setup

### Prerequisites

- Node.js (v18+)
- npm (v9+)
- Docker and Docker Compose
- PostgreSQL client (optional)

### Environment Variables

Copy `.env.sample` to create your `.env` file:

```bash
cp .env.sample .env
```

#### Environment Variables List

##### Kyoso Cloud Agent Configuration

| Variable | Description |
|----------|-------------|
| `API_KEY` | API key for Kyoso Cloud Agent REST API authentication |
| `HTTP_TIMEOUT` | HTTP request timeout in milliseconds |
| `IDENTUS_CLOUD_AGENT_URL` | Base URL for Identus Cloud Agent |
| `KYOSO_ISSUER_API_KEY` | Issuer API key for Identus Cloud Agent |
| `IDENTUS_API_SALT` | Salt value for user API key generation |
| `REDIS_HOST` | Redis server hostname |
| `REDIS_PORT` | Redis server port number |
| `AUTH_MODE` | Authentication mode (`TEST` or `FIREBASE`) |

##### Firebase Configuration

| Variable | Description |
|----------|-------------|
| `FIREBASE_ISSUER` | Firebase JWT issuer |
| `FIREBASE_AUDIENCE` | Firebase JWT audience |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key |
| `FIREBASE_AUTH_DOMAIN` | Firebase authentication domain |
| `FIREBASE_API_KEY` | Firebase API key |

##### Agent Configuration

| Variable | Description |
|----------|-------------|
| `AGENT_API_KEY_SALT` | Salt for Agent API key generation |
| `AGENT_ADMIN_TOKEN` | Agent administrator token |
| `POSTGRES_PASSWORD` | PostgreSQL root password |
| `AGENT_DB_APP_PASSWORD` | Agent database application password |
| `VAULT_DEV_ROOT_TOKEN_ID` | Vault development root token ID |
| `NODE_PSQL_PASSWORD` | PRISM node PostgreSQL password |

##### Point Management Configuration

| Variable | Description |
|----------|-------------|
| `BLOCKFROST_PROJECT_ID` | Blockfrost project ID for Cardano blockchain access |
| `WALLET_MNEMONIC` | Cardano wallet mnemonic phrase |
| `CARDANO_NETWORK_ID` | Cardano network identifier (0=preprod/testnet, 1=mainnet) |
| `POINT_DATABASE_URL` | Point management database URL |

### Installation Steps

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Generate Prisma Schema

Generate the database schema:

```bash
npx prisma generate
```

#### 3. Start Infrastructure

Start required services (PostgreSQL, Redis, Identus Cloud Agent, etc.) using Docker Compose:

```bash
make up
```

This command starts the following services:
- PostgreSQL database
- Redis cache server
- Identus Cloud Agent
- Vault (secret management)
- PRISM Node

#### 4. Database Migration

Run on initial setup or after schema changes:

```bash
npm run migrate
```

#### 5. Start Application

Open a new terminal tab/window and start the application in development mode:

```bash
npm run start:dev
```

The application will be available at `http://localhost:3000`.

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start application in development mode (hot reload enabled) |
| `npm run build` | Build application for production |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Check code with ESLint |
| `npm run format` | Format code with Prettier |
| `make down` | Stop and remove Docker containers |

## API Reference

### DID

- [DID Creation and Publication Job](#did-creation-and-publication-job)
- [Retrieve DID Job Status](#retrieve-did-job-status)
- [Retrieve User DID](#retrieve-user-did)
- [Retrieve Issuer DID](#retrieve-issuer-did)

### VC
- [Connectionless VC Issuance Job](#connectionless-vc-issuance-job)
- [Retrieve VC Job Status](#retrieve-vc-job-status)
- [List VC Records](#list-vc-records)
- [Retrieve VC Record Detail](#retrieve-vc-record-detail)

### POINT
- [Commit point transactions](#commit-point-transactions)
- [Verify point transaction](#verify-transactions)

#### DID Creation and Publication Job

##### Overview

Start an asynchronous job that creates a Decentralized Identifier (DID) and publishes it to the Cardano blockchain. As a holder, you generate a decentralized identifier to prove your identity. As an issuer, you create a DID that will later be used to issue verifiable credentials. The job runs asynchronously and advances through each stage from DID creation to blockchain finalization.

##### Endpoint

```
POST /did/job/create-and-publish
```

##### Authentication

- **Required Headers**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### Process Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant I as Identus Cloud Agent
    participant B as Cardano Blockchain

    C->>K: POST /did/job/create-and-publish
    K->>F: JWT verification
    F-->>K: Verification successful
    K->>K: Generate user API key
    K->>I: DID creation request
    I->>I: Create and sign DID
    I->>B: Publish DID to blockchain
    B-->>I: Transaction confirmation
    I-->>K: DID creation complete
    K-->>C: Return job ID
```

##### Request

**Content-Type**: `application/json`

**Body Parameters**: None

**Request Example**:
```json
{}
```

##### Response

**Success (200 OK):**
```json
{
  "jobId": "create-and-publish-12345"
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| `400` | `INVALID_REQUEST` | Invalid request parameters |
| `401` | `UNAUTHORIZED` | Authentication error |
| `403` | `FORBIDDEN` | API key is invalid |
| `404` | `NOT_FOUND` | Resource not found |
| `422` | `UNPROCESSABLE_ENTITY` | Request cannot be processed |
| `500` | `INTERNAL_ERROR` | Internal server error |

#### Retrieve DID Job Status

##### Overview

Retrieve the status of a DID creation and publication job by job ID. Use this endpoint to check progress, results, and error details.

##### Endpoint

```
GET /did/job/{jobId}
```

##### Authentication

- **Required Headers**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### Process Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant Q as BullMQ Queue
    participant I as Identus Cloud Agent

    C->>K: GET /did/job/{jobId}
    K->>F: JWT verification
    F-->>K: Verification successful
    K->>Q: Fetch job information
    Q-->>K: Job status
    alt Job completed or in progress (>= 75%)
        K->>I: Check DID status
        I-->>K: DID status
    end
    K-->>C: Return job status
```

##### Request

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | `string` | Yes | Identifier of the job to retrieve |

**Request Example**:
```bash
curl -X GET "https://api.example.com/did/job/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-api-key: your-api-key"
```

##### Response

**Success (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "progress": 100,
  "result": {
    "did": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f",
    "status": "PUBLISHED",
    "longFormDid": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f:Cr8BCrQBCpEBCiQKIQKBjxhldqgH1LED6fL63bAopBe2_ObE4_4MLNxRTAUJGgpMEj8KCwjADBIEcm9vdBABEjBDb21tZXJjaWFsIEluc3VyZXIgRElEIGZvciBsaWNlbnNlIGNyZWRlbnRpYWwgaXNzdWluZxpAVGhpcyBpcyBjb21tZXJjaWFsIGluc3VyZXIgZGlkIGZvciBpc3N1aW5nIGxpY2Vuc2UgY3JlZGVudGlhbHMgdG8gaG9sZGVycw",
    "keyId": "key-1",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:32:15Z"
  }
}
```

**When the job is still running:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "in_progress",
  "progress": 75,
  "result": {
    "did": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f",
    "status": "CREATED",
    "longFormDid": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f:Cr8BCrQBCpEBCiQKIQKBjxhldqgH1LED6fL63bAopBe2_ObE4_4MLNxRTAUJGgpMEj8KCwjADBIEcm9vdBABEjBDb21tZXJjaWFsIEluc3VyZXIgRElEIGZvciBsaWNlbnNlIGNyZWRlbnRpYWwgaXNzdWluZxpAVGhpcyBpcyBjb21tZXJjaWFsIGluc3VyZXIgZGlkIGZvciBpc3N1aW5nIGxpY2Vuc2UgY3JlZGVudGlhbHMgdG8gaG9sZGVycw",
    "keyId": "key-1",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:31:30Z"
  }
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| `401` | `UNAUTHORIZED` | Authentication error (invalid Firebase JWT) |
| `403` | `FORBIDDEN` | API key is invalid or lacks access rights |
| `404` | `NOT_FOUND` | The specified job ID does not exist |
| `422` | `UNPROCESSABLE_ENTITY` | Request cannot be processed |
| `500` | `INTERNAL_ERROR` | Internal server error |

**Error Response Example:**
```json
{
  "status": 404,
  "type": "/errors/job-not-found",
  "title": "Job Not Found",
  "detail": "Job 123e4567-e89b-12d3-a456-426614174000 not found"
}
```

#### Retrieve User DID

##### Overview

Fetch the managed DID for the user. Assuming one DID per user, the endpoint returns the first DID associated with the user. If no DID exists, it returns null. When the DID status is `PUBLICATION_PENDING`, the service issues a direct query to avoid cached data.

##### Endpoint

```
GET /did
```

##### Authentication

- **Required Headers**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### Process Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant I as Identus Cloud Agent

    C->>K: GET /did
    K->>F: JWT verification
    F-->>K: Verification successful
    K->>I: GET /did-registrar/dids (limit=1)
    I-->>K: Return DID list
    alt DID exists
        alt Status is PUBLICATION_PENDING
            K->>I: GET /did-registrar/dids/{longFormDid}
            I-->>K: Return latest DID state
        end
        K-->>C: Return DID information
    else DID does not exist
        K-->>C: Return null
    end
```

##### Request

**Content-Type**: `application/json`

**Body Parameters**: None

**Request Example**:
```bash
curl -X GET "https://api.example.com/did" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5..." \
  -H "x-api-key: your_api_key"
```

##### Response

**Success (200 OK):**
```json
{
  "did": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f",
  "longFormDid": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f:Cr4BCrsBEjsKC3Nlcp...",
  "status": "PUBLISHED",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

**When no DID exists (200 OK):**
```json
null
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| `400` | `INVALID_REQUEST` | Invalid request parameters |
| `401` | `UNAUTHORIZED` | Authentication error |
| `403` | `FORBIDDEN` | API key is invalid |
| `500` | `INTERNAL_ERROR` | Internal server error |

#### Retrieve Issuer DID

##### Overview

Fetch the issuer DID used throughout the system. If the issuer DID does not exist, it is automatically created and published. Holders reference this DID as a trusted issuer when receiving credentials, and issuers use it to sign credentials.

##### Endpoint

```
GET /did/issuer
```

##### Authentication

- **Required Headers**:
  - `x-api-key: {api_key}`

##### Process Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant K as Kyoso Cloud Agent
    participant I as Identus Cloud Agent
    participant B as Cardano Blockchain

    C->>K: GET /did/issuer
    alt Issuer DID exists and is PUBLISHED
        K-->>C: Return existing DID
    else Issuer DID does not exist
        K->>I: DID creation request
        I->>I: Create and sign DID
        I-->>K: DID creation complete
        K->>I: DID publication request
        I->>B: Publish DID to blockchain
        B-->>I: Transaction confirmation
        I-->>K: DID publication complete
        K-->>C: Return newly created and published DID
    else Issuer DID exists and is in CREATED state
        K->>I: DID publication request
        I->>B: Publish DID to blockchain
        B-->>I: Transaction confirmation
        I-->>K: DID publication complete
        K-->>C: Return published DID
    end
```

##### Response

**Success (200 OK):**
```json
{
  "did": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f",
  "longFormDid": "did:prism:3bb0505d13fcb04d28a48234edb27b0d4e6d7e18a81e2c1abab58f3bbc21ce6f:CsQBCsEBElwKEgoPBBI...",
  "status": "PUBLISHED",
  "keyPairs": [
    {
      "keyId": "key-1",
      "curve": "Ed25519"
    },
    {
      "keyId": "key-2",
      "curve": "Ed25519"
    }
  ]
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| `400` | `INVALID_REQUEST` | Invalid request parameters |
| `401` | `UNAUTHORIZED` | Authentication error |
| `403` | `FORBIDDEN` | API key is invalid |
| `404` | `RESOURCE_NOT_FOUND` | Resource not found |
| `422` | `UNPROCESSABLE_ENTITY` | Request cannot be processed |
| `500` | `INTERNAL_ERROR` | Internal server error |

### VC

#### Connectionless VC Issuance Job

##### Overview
Start an asynchronous job that issues a Verifiable Credential (VC) without establishing a connection. The holder authenticated by the client receives the credential from the issuer. Internally, the flow uses Out-of-Band (OOB) messages and the DIDComm protocol to automate VC issuance from issuer to holder.

##### Endpoint

```
POST /vc/connectionless/job/issue-to-holder
```

##### Authentication
- **Required Headers**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### Process Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant I as Identus Cloud Agent (Issuer)
    participant H as Identus Cloud Agent (Holder)

    C->>K: POST /vc/connectionless/job/issue-to-holder
    K->>F: JWT verification
    F-->>K: Verification successful

    Note over K: 1. Verify Issuer/Holder DID
    K->>I: Search and confirm DID
    K->>H: Search and confirm DID

    Note over K: 2. Create VC offer (Issuer)
    K->>I: createCredentialOfferInvitation
    I-->>K: VC offer + OOB invitation

    Note over K: 3. Accept invitation (Holder)
    K->>H: acceptCredentialOfferInvitation
    H-->>K: Return record ID

    Note over K: 4. Accept offer (Holder)
    K->>H: acceptOffer (subjectId=holderDID)
    H-->>K: Updated record

    Note over K: 5. Issue credential (Issuer)
    K->>I: issueCredential
    I-->>K: Issuance complete

    Note over K: 6. Confirm credential reception
    K->>H: getRecord (wait for CREDENTIAL_RECEIVED)
    H-->>K: Final record

    K-->>C: Return job ID
```

##### Request

**Content-Type**: `application/json`

**Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `claims` | `object` | Yes | Claims to include in the VC |

**Request Example**:
```json
{
  "claims": {
    "name": "Taro Yamada",
    "email": "taro@example.com",
    "memberId": "MEMBER-123456",
    "membershipLevel": "Gold",
    "joinDate": "2023-05-15",
    "expiryDate": "2024-05-14",
    "organizationName": "Kyoso Inc."
  }
}
```

##### Response

**Success (200 OK):**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| `400` | `INVALID_REQUEST` | Invalid request parameters |
| `401` | `UNAUTHORIZED` | Authentication error |
| `403` | `FORBIDDEN` | API key is invalid |
| `404` | `RESOURCE_NOT_FOUND` | Issuer DID or holder DID not found |
| `422` | `UNPROCESSABLE_ENTITY` | DID is not yet published |
| `500` | `INTERNAL_ERROR` | Internal server error |

#### Retrieve VC Job Status

##### Overview
Retrieve the status and progress of a Verifiable Credential issuance job. Holders can track issuance progress, and issuers can monitor job state and inspect error details.

##### Endpoint

```
GET /vc/connectionless/job/{jobId}
```

##### Authentication
- **Required Headers**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### Process Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant Q as BullMQ Queue
    participant I as Identus Cloud Agent

    C->>K: GET /vc/connectionless/job/{jobId}
    K->>F: JWT verification
    F-->>K: Verification successful
    K->>Q: Retrieve job status
    Q-->>K: Return BullMQ status
    Note over K: Normalize status values
    Note over K: - completed -> COMPLETED
    Note over K: - failed -> FAILED
    Note over K: - active -> IN_PROGRESS
    Note over K: - waiting/delayed -> PENDING
    K-->>C: Return job status
```

##### Request

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | `string` | Yes | ID of the VC issuance job |

##### Response

**Success (200 OK):**
```json
{
  "id": "job-12345",
  "status": "completed",
  "progress": 100,
  "result": {
    "recordId": "vc-record-uuid",
    "subjectId": "did:prism:holder-did",
    "issuer": "did:prism:issuer-did",
    "validityPeriod": {
      "start": "2024-01-15T10:30:00Z",
      "end": "2024-12-31T23:59:59Z"
    },
    "claims": {
      "name": "Taro Tanaka",
      "age": 30
    },
    "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| `400` | `INVALID_REQUEST` | Invalid request parameters |
| `401` | `UNAUTHORIZED` | Authentication error |
| `403` | `FORBIDDEN` | API key is invalid |
| `404` | `NOT_FOUND` | The specified job does not exist |
| `422` | `UNPROCESSABLE_ENTITY` | Request cannot be processed |
| `500` | `INTERNAL_ERROR` | Internal server error |

#### List VC Records

##### Overview
Retrieve a list of Verifiable Credential (VC) records. Use this endpoint to review the history and current status of VC interactions between holders and issuers. Each record includes the issuance workflow status, related DIDs, and other metadata necessary for managing the VC flow.

##### Endpoint

```
GET /vc
```

##### Authentication
- **Required Headers**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### Process Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant I as Identus Cloud Agent

    C->>K: GET /vc
    K->>F: JWT verification
    F-->>K: Verification successful
    K->>K: Generate user API key
    K->>I: GET /issue-credentials/records
    I-->>K: Return VC record list
    K-->>C: Return VC record list
```

##### Request

**Content-Type**: `application/json`

**Body Parameters**: None

##### Response

**Success (200 OK):**
```json
{
  "contents": [
    {
      "recordId": "issue-credential-record-123",
      "thid": "thread-id-456",
      "schemaId": "schema:credentials:1.0",
      "credentialDefinitionId": "cred-def-789",
      "credentialDefinitionGuid": "guid-abc-123",
      "credentialFormat": "JWT",
      "role": "Issuer",
      "subjectId": "did:prism:subject123",
      "validityPeriod": "2024-12-31T23:59:59Z",
      "automaticIssuance": true,
      "protocolState": "OfferSent",
      "issuingDID": "did:prism:issuer123",
      "metaRetries": 0,
      "updatedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "kind": "Collection",
  "self": "/cloud-agent/issue-credentials/records",
  "pageOf": "/cloud-agent/issue-credentials/records"
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| `401` | `UNAUTHORIZED` | Authentication error |
| `403` | `FORBIDDEN` | API key is invalid |
| `500` | `INTERNAL_ERROR` | Internal server error |

#### Retrieve VC Record Detail

##### Overview
Retrieve the detailed information of a specific Verifiable Credential (VC) record by record ID. Use this endpoint to troubleshoot individual VC flows, monitor progress, and inspect issued credential data.

##### Endpoint

```
GET /vc/{recordId}
```

##### Authentication
- **Required Headers**:
  - `Authorization: Bearer {firebase_jwt_token}`
  - `x-api-key: {api_key}`

##### Process Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant K as Kyoso Cloud Agent
    participant F as Firebase
    participant I as Identus Cloud Agent

    C->>K: GET /vc/{recordId}
    K->>F: JWT verification
    F-->>K: Verification successful
    K->>K: Generate user API key
    K->>I: GET /issue-credentials/records/{recordId}
    I-->>K: VC record detail
    K-->>C: Return VC record detail
```

##### Request

**Content-Type**: `application/json`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recordId` | `string` | Yes | VC record ID |

##### Response

**Success (200 OK):**
```json
{
  "recordId": "issue-credential-record-123",
  "thid": "thread-id-456",
  "schemaId": "schema:credentials:1.0",
  "credentialDefinitionId": "cred-def-789",
  "credentialDefinitionGuid": "guid-abc-123",
  "credentialFormat": "JWT",
  "role": "Issuer",
  "subjectId": "did:prism:subject123",
  "validityPeriod": "2024-12-31T23:59:59Z",
  "automaticIssuance": true,
  "protocolState": "CredentialSent",
  "issuingDID": "did:prism:issuer123",
  "issuedCredentialRaw": "eyJhbGciOiJIUzI1NiIs...",
  "metaRetries": 0,
  "updatedAt": "2024-01-15T10:35:00Z",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| `401` | `UNAUTHORIZED` | Authentication error |
| `403` | `FORBIDDEN` | API key is invalid |
| `404` | `RESOURCE_NOT_FOUND` | Specified record not found |
| `500` | `INTERNAL_ERROR` | Internal server error |

### Point Management

#### Commit Point Transactions

##### Overview
Commit unprocessed point transactions by aggregating them into a Merkle tree and recording the root hash on the Cardano blockchain. This endpoint runs periodically (weekly) to guarantee the integrity and transparency of the point system by permanently storing every pending transaction on-chain. Using a Merkle tree enables proof of inclusion and verification for individual transactions.

##### Endpoint

```
POST /point/commit
```

##### Authentication
- **Required Headers**: None (triggered by an internal scheduler)

##### Process Flow

```mermaid
sequenceDiagram
    participant S as System (cron)
    participant C as CommitService
    participant T as TransactionService
    participant M as MerkleService
    participant W as WalletService
    participant B as Cardano Blockchain
    participant D as Database

    S->>C: POST /point/commit
    C->>T: Fetch oldest uncommitted transactions
    T-->>C: Return uncommitted transactions
    C->>M: Build Merkle tree
    M-->>C: Merkle tree + root hash
    C->>T: Get next commit label
    T-->>C: Commit label
    C->>W: Commit metadata to blockchain
    W->>B: Submit transaction
    B-->>W: Transaction hash
    W-->>C: txHash
    C->>D: Store commit information
    C->>M: Generate all Merkle proofs
    M-->>C: Merkle proof array
    C->>D: Store Merkle proofs
    C-->>S: Return commit result
```

##### Request

**Content-Type**: `application/json`

**Body Parameters**: None

**Request Example**:
```json
// no request body
```

##### Response

**Success (200 OK):**
```json
{
  "txHash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "label": 42,
  "rootHash": "789abc123def456789012345678901234567890abcdef123456789012345678",
  "periodStart": "2024-01-15T10:30:00Z",
  "periodEnd": "2024-01-22T09:45:30Z",
  "walletAddress": "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp"
}
```

**When no uncommitted transactions exist (200 OK):**
```json
{
  "txHash": null,
  "label": null,
  "rootHash": null,
  "periodStart": null,
  "periodEnd": null,
  "walletAddress": null
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `txHash` | `string` | Transaction hash recorded on the blockchain |
| `label` | `number` | Sequential commit label |
| `rootHash` | `string` | Merkle tree root hash |
| `periodStart` | `string` | Start timestamp (ISO 8601) of the committed period |
| `periodEnd` | `string` | End timestamp (ISO 8601) of the committed period |
| `walletAddress` | `string` | Wallet address used to perform the commit |

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| `500` | `INTERNAL_ERROR` | Internal server error (e.g., DB or blockchain connectivity failure) |

#### Verify Transactions

##### Overview
Accept a list of transaction IDs and verify each one against the Merkle tree committed to the Cardano blockchain. The service compares transaction data, Merkle proofs, and the on-chain root hash to confirm data integrity.

##### Endpoint

```
POST /point/verify
```

##### Authentication
- **Required Headers**: None (authentication is not required in the current implementation)

##### Process Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant PC as Point Controller
    participant VS as Verify Service
    participant TS as Transaction Service
    participant WS as Wallet Service
    participant MS as Merkle Service
    participant DB as Database
    participant B as Cardano Blockchain

    C->>PC: POST /point/verify
    PC->>VS: verifyTxIds(txIds)

    loop For each transaction ID
        VS->>TS: findTransactionById(txId)
        TS->>DB: Retrieve transaction
        DB-->>TS: Transaction data
        TS-->>VS: TransactionDto

        VS->>TS: getProofsForTransaction(txId)
        TS->>DB: Fetch Merkle proofs
        DB-->>TS: Proof array
        TS-->>VS: Merkle proofs

        VS->>TS: getRootHashForTransaction(txId)
        TS->>DB: Retrieve root hash info
        DB-->>TS: Commit ID and root hash
        TS-->>VS: Root hash data

        VS->>WS: getMetadata(commitId)
        WS->>B: Retrieve metadata via Blockfrost API
        B-->>WS: On-chain metadata
        WS-->>VS: Metadata response

        VS->>MS: verifyProof(tx, proofs, onchainRoot)
        MS->>MS: Verify Merkle proof
        MS-->>VS: Verification result
    end

    VS-->>PC: Verification result array
    PC-->>C: VerifyResponseDto[]
```

##### Request

**Content-Type**: `application/json`

**Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `txIds` | `string[]` | Yes | Array of transaction IDs to verify |

**Request Example**:
```json
{
  "txIds": ["tx_001", "tx_002", "tx_003"]
}
```

##### Response

**Success (200 OK):**
```json
[
  {
    "status": "verified",
    "txId": "tx_001",
    "transactionHash": "commit_hash_abc123",
    "rootHash": "merkle_root_def456",
    "label": 1
  },
  {
    "status": "not_verified",
    "txId": "tx_002",
    "transactionHash": "",
    "rootHash": "",
    "label": 0
  }
]
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Verification result (`verified` or `not_verified`) |
| `txId` | `string` | Transaction ID that was validated |
| `transactionHash` | `string` | Commit hash on the Cardano blockchain |
| `rootHash` | `string` | On-chain Merkle root hash |
| `label` | `number` | Metadata label number |

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| `400` | `INVALID_REQUEST` | Invalid request parameters |
| `500` | `INTERNAL_ERROR` | Internal server error |
```
