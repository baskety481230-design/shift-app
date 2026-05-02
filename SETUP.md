# セットアップ手順（最初の起動まで）

## 0. Google OAuth クライアントの作成

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」→「OAuth同意画面」を構成（外部、テストユーザーに自分のメールを追加）
3. 「認証情報」→「OAuth 2.0 クライアントID」を作成
   - 種別: **ウェブアプリケーション**
   - 承認済みリダイレクトURI: `http://localhost:8000/api/auth/google/callback`（本番ではRailwayのURL）
4. 表示された Client ID / Client Secret を控える

## 1. Backend

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate    # Windows (bash)
# Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt

# .env を作成
cp .env.example .env
# SECRET_KEY を生成
python -c "import secrets; print(secrets.token_hex(32))"
# その値を .env の SECRET_KEY に設定

# VAPID鍵を生成（Web Push用）
python -m app.scripts.gen_vapid
# 出力された VAPID_PUBLIC_KEY と VAPID_PRIVATE_KEY を .env に貼る

# .env で他に設定するもの:
# - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# - INITIAL_MANAGER_EMAIL=自分のGmail（最初のログインで店長になる）

# DBマイグレーション
alembic upgrade head

# 起動
uvicorn app.main:app --reload
```

WeasyPrint で日本語PDFを出すには **Noto Sans CJK JP** が必要です。Windowsには標準で日本語フォントが入っているのでそのまま動きます。Linuxの場合は `apt-get install fonts-noto-cjk`（Dockerfileでは設定済み）。

## 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# .env を編集:
#   VITE_API_URL=http://localhost:8000
#   VITE_VAPID_PUBLIC_KEY=<backend と同じ公開鍵>

npm run dev
```

ブラウザで http://localhost:5173 を開く。

## 3. 初回ログイン

1. `http://localhost:5173/login` で「Googleでログイン」
2. `INITIAL_MANAGER_EMAIL` に設定したアカウントでサインインすると **店長** ロールが自動付与
3. 「メンバー」ページから他のスタッフを招待（メールアドレス登録 → 当該アドレスでGoogleログイン）

## 4. 動作確認

- カレンダーから日付をタップしてシフト追加
- 店長として承認
- 「通知」ページで `この端末で通知を有効化` → `テスト送信` でWeb Pushが届くか確認
- 「PDF（横）」ボタンで月次PDFが生成される

## 5. デプロイ

### Backend → Railway

```bash
# Railway CLI 経由か Web UI から
# 1. プロジェクトを作成し PostgreSQL アドオンを追加
# 2. backend ディレクトリを Service として接続（Dockerfile を自動検出）
# 3. 環境変数を Web UI から登録（DATABASE_URL は自動注入）
#    APP_ENV=production
#    SECRET_KEY=<新しい値>
#    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
#    GOOGLE_REDIRECT_URI=https://<railway-domain>/api/auth/google/callback
#    FRONTEND_URL=https://<vercel-domain>
#    VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CLAIM_EMAIL
#    INITIAL_MANAGER_EMAIL
#    COOKIE_SECURE=true
#    COOKIE_SAMESITE=none   # クロスドメイン認証のため
#    TZ=Asia/Tokyo
# 4. Google Cloud Console の認証情報で本番リダイレクトURIを追加
```

### Frontend → Vercel

```bash
# 1. Vercel に GitHub リポジトリを接続
# 2. Root Directory を frontend に設定
# 3. Environment Variables:
#    VITE_API_URL=https://<railway-domain>
#    VITE_VAPID_PUBLIC_KEY=<backendと同じ>
# 4. Deploy
```

### 注意点

- 本番では `COOKIE_SECURE=true`、`COOKIE_SAMESITE=none` にしてHTTPS必須にする（クロスドメイン用）
- もしフロントとバックを同じドメイン（サブドメイン）にできるなら `SAMESITE=lax` のままで安全度が上がる
- iOS Safari でWeb Pushを受けるには「ホーム画面に追加」してPWAとしてインストールする必要あり（iOS 16.4+）

## 6. PWA アイコン

`frontend/public/` に以下のPNGを配置してください（任意で先に用意したロゴ画像から）:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `icon-512-maskable.png` (512×512, セーフエリア込みのマスカブル)
- `apple-touch-icon.png` (180×180)

一旦無くてもアプリは動作しますが、ホーム追加時のアイコンがフォールバックになります。

## トラブルシューティング

| 症状 | 原因 / 対処 |
|------|-------------|
| ログイン後にCORSエラー | `FRONTEND_URL` がフロントのオリジンと一致しているか / Cookieはクロスドメインなら `SAMESITE=none, SECURE=true` 必須 |
| `not_invited` でリダイレクト | 招待が登録されていない or `INITIAL_MANAGER_EMAIL` 未設定 |
| PDFで日本語が豆腐 | サーバに `fonts-noto-cjk` がない（Dockerfileを使えば解決） |
| Web Push が届かない | `Notification.permission` が granted か、サブスクリプションが Subscribe テーブルに登録されているか確認 |
| iOS で通知が来ない | iOS 16.4+ かつ「ホーム画面に追加」した状態である必要がある |
