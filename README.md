# Shift App

飲食店アルバイト向けシフト管理アプリ（PWA）

## 機能

- **役割**: 店長 / 従業員（承認制ワークフロー）
- **認証**: Googleログイン（招待制）
- **シフト管理**: 3ヶ月先まで編集・承認、30分単位
- **休憩・時給**: 休憩時間管理、時給計算（本人＋店長のみ閲覧）
- **シフト交代**: 当人同士＋店長承認の二段階フロー
- **PDF出力**: 月単位、A4横/縦、個人別/全員一覧
- **通知**: Web Push（PWA）、シフト前のアラーム時間も調整可
- **デザイン**: 12色 × 20柄のテーマカスタマイズ
- **対応**: スマホ・PC両対応

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| PWA | vite-plugin-pwa + Workbox |
| State/Data | TanStack Query |
| Backend | FastAPI + Python 3.12 |
| ORM | SQLAlchemy 2.0 + Alembic |
| Auth | Authlib (Google OAuth2) + JWT |
| Push | pywebpush (VAPID) |
| Scheduler | APScheduler |
| PDF | WeasyPrint (日本語フォント対応) |
| DB | SQLite (dev) / PostgreSQL (prod) |
| Hosting | Vercel (frontend) / Railway (backend + Postgres) |

## ディレクトリ

```
shift-app/
├── backend/         # FastAPI
│   └── app/
│       ├── api/        # ルーター
│       ├── core/       # 設定・DB・セキュリティ
│       ├── models/     # SQLAlchemy モデル
│       ├── schemas/    # Pydantic スキーマ
│       ├── services/   # ドメインロジック（PDF, 通知など）
│       └── migrations/ # Alembic
└── frontend/        # React + Vite
    └── src/
        ├── components/
        ├── pages/
        ├── hooks/
        ├── lib/
        └── types/
```

## セットアップ（開発）

### 前提
- Python 3.12+
- Node.js 20+
- Google Cloud Project（OAuth2クライアント）

### 1. 環境変数

`backend/.env` を作成（`.env.example` をコピー）:

```
DATABASE_URL=sqlite:///./shift.db
SECRET_KEY=<openssl rand -hex 32 で生成>
GOOGLE_CLIENT_ID=<Google Cloud Console から>
GOOGLE_CLIENT_SECRET=<同上>
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
VAPID_PRIVATE_KEY=<scripts/gen_vapid.py で生成>
VAPID_PUBLIC_KEY=<同上>
VAPID_CLAIM_EMAIL=mailto:you@example.com
INITIAL_MANAGER_EMAIL=<最初の店長になるGoogleアカウントのメール>
TZ=Asia/Tokyo
```

`frontend/.env` を作成:

```
VITE_API_URL=http://localhost:8000
VITE_VAPID_PUBLIC_KEY=<backend と同じ公開鍵>
```

### 2. Backend

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate   # Windows bash
pip install -r requirements.txt
python -m app.scripts.gen_vapid   # VAPID鍵を生成して .env に貼る
alembic upgrade head
uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開く。

### 4. 初回ログイン
- `INITIAL_MANAGER_EMAIL` に設定したアカウントで Google ログイン → 自動で「店長」ロールが付与されます。
- 他のスタッフは、店長が「メンバー管理」画面で招待メールアドレスを登録 → 当該メールでログインすると参加可能。

## デプロイ

### Vercel（フロント）
- `frontend/` をルートに指定
- 環境変数 `VITE_API_URL`, `VITE_VAPID_PUBLIC_KEY` を設定

### Railway（バック＋DB）
- `backend/` を Service として追加
- PostgreSQL アドオンを追加（`DATABASE_URL` は自動注入）
- 上記 `.env` の値を Railway の環境変数に登録（`DATABASE_URL` 以外）
- 起動コマンド: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## セキュリティ方針

- **JWT** を HTTPOnly + Secure + SameSite=Lax クッキーで配布
- **CORS** はフロントのオリジンのみ許可
- 全シフト系エンドポイントは認証必須＋テナント検証
- **招待制**で部外者の登録を防止
- PDFダウンロードURLは短期有効なシグネチャ付きURL
- HTTPS 強制、Content-Security-Policy 設定

## ライセンス

Private
