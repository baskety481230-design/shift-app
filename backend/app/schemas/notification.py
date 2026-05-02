from pydantic import BaseModel, Field


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushKeys
    user_agent: str | None = None


class PushSubscriptionRead(BaseModel):
    id: int
    endpoint: str

    class Config:
        from_attributes = True


class NotificationPrefs(BaseModel):
    minutes_before: int = Field(ge=0, le=24 * 60)
    enabled: bool


class VapidPublicKey(BaseModel):
    public_key: str


class TestNotification(BaseModel):
    title: str = "テスト通知"
    body: str = "Web Push が届いたら成功です"
