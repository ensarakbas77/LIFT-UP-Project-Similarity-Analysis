"""
Admin Backend — Kimlik Doğrulama (Auth) Router.

Endpoint'ler:
  POST /auth/login   — kullanıcı adı + şifre → JWT token
  POST /auth/logout  — (client-side; token blacklist opsiyonel)
  GET  /auth/me      — token ile oturum bilgisi
"""

import os
import time

import bcrypt as _bcrypt          
import psycopg2
from psycopg2.extras import RealDictCursor

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

import jwt                         

from app.core.config import admin_settings


# ─── Güvenlik Araçları ────────────────────────────────────────────────────────

bearer_scheme = HTTPBearer(auto_error=False)


def _get_validated_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if secret is None:
        raise RuntimeError("JWT_SECRET environment variable must be set before starting the service.")
    secret = secret.strip()
    if not secret:
        raise RuntimeError("JWT_SECRET must not be empty or whitespace.")
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET must be at least 32 characters long.")
    return secret


# JWT ayarları (.env'den okunur; eksik/geçersizse uygulama startup'ında fail edilir)
JWT_SECRET: str = _get_validated_jwt_secret()
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # 8 saat


# ─── Pydantic Şemalar ──────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int            # saniye cinsinden
    user: dict


class MeResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str | None
    is_active: bool


class UpdateProfileRequest(BaseModel):
    username: str | None = None
    email: str | None = None
    new_password: str | None = None


# ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(
        dbname=admin_settings.DB_NAME,
        user=admin_settings.DB_USER,
        password=admin_settings.DB_PASSWORD,
        host=admin_settings.DB_HOST,
        port=admin_settings.DB_PORT,
        sslmode=admin_settings.DB_SSLMODE,
    )


def verify_password(plain: str, hashed: str) -> bool:
    """Direkt bcrypt doğrulaması"""
    try:
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def hash_password(plain: str) -> str:
    """Şifreyi bcrypt ile hashler ve string döner."""
    return _bcrypt.hashpw(plain.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict) -> tuple[str, int]:
    """JWT token üretir; (token, expire_seconds) döner."""
    expire_seconds = JWT_EXPIRE_MINUTES * 60
    payload = data.copy()
    payload["exp"] = time.time() + expire_seconds
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expire_seconds


def decode_token(token: str) -> dict:
    """Token'ı çözer; geçersizse HTTPException fırlatır."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş. Lütfen tekrar giriş yapın.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token.")


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """Bearer token'dan oturum verisini döner (bağımlılık enjeksiyonu)."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Kimlik doğrulama gerekli.")
    return decode_token(credentials.credentials)


# ─── Router ───────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/auth", tags=["Kimlik Doğrulama"])


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    """
    Admin kullanıcı girişi.

    - Kullanıcı adını veritabanında arar.
    - bcrypt ile şifreyi doğrular.
    - Başarılı girişte JWT token döner ve last_login günceller.
    """
    try:
        conn = get_db()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı bağlantı hatası: {e}")

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT id, username, email, full_name, password_hash, is_active "
            "FROM admin_users WHERE username = %s",
            (req.username,),
        )
        user = cur.fetchone()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı sorgu hatası: {e}")
    finally:
        cur.close()
        conn.close()

    # Kullanıcı yoksa veya şifre yanlışsa aynı hata mesajı
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı.",
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu hesap devre dışı bırakılmış. Lütfen sistem yöneticisiyle iletişime geçin.",
        )

    # last_login güncelle
    try:
        conn2 = get_db()
        cur2 = conn2.cursor()
        cur2.execute(
            "UPDATE admin_users SET last_login = NOW() WHERE id = %s",
            (user["id"],),
        )
        conn2.commit()
    except Exception:
        pass  # Kritik değil — login yine de başarılı sayılır
    finally:
        try:
            cur2.close()
            conn2.close()
        except Exception:
            pass

    token_payload = {
        "sub": str(user["id"]),
        "username": user["username"],
        "email": user["email"],
    }
    token, expire_seconds = create_access_token(token_payload)

    return LoginResponse(
        access_token=token,
        expires_in=expire_seconds,
        user={
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
        },
    )


@router.post("/logout")
def logout():
    """
    Oturumu kapat.

    JWT stateless olduğundan token sunucu tarafında geçersiz kılınmaz;
    client token'ı siler. Blacklist istenirse Redis entegrasyonu eklenebilir.
    """
    return {"success": True, "message": "Oturum kapatıldı."}


@router.get("/me", response_model=MeResponse)
def me(payload: dict = Depends(get_current_admin)):
    """Geçerli token'dan admin kullanıcı bilgilerini döner."""
    user_id = int(payload.get("sub", 0))

    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT id, username, email, full_name, is_active FROM admin_users WHERE id = %s",
            (user_id,),
        )
        user = cur.fetchone()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı hatası: {e}")
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    return MeResponse(**user)


@router.patch("/update-profile", tags=["Kimlik Doğrulama"])
def update_profile(
    req: UpdateProfileRequest,
    payload: dict = Depends(get_current_admin),
):
    """
    Admin kullanıcı profilini günceller.

    - Kullanıcı adı, e-posta ve/veya şifre güncellenebilir.
    - Yalnızca gönderilen alanlar güncellenir.
    - Şifre bcrypt ile hashlenerek saklanır.
    """
    user_id = int(payload.get("sub", 0))

    # Güncelleme alanlarını dinamik olarak oluştur
    sets: list[str] = []
    values: list = []

    if req.username is not None:
        if not req.username.strip():
            raise HTTPException(status_code=422, detail="Kullanıcı adı boş olamaz.")
        sets.append("username = %s")
        values.append(req.username.strip())

    if req.email is not None:
        if not req.email.strip():
            raise HTTPException(status_code=422, detail="E-posta boş olamaz.")
        sets.append("email = %s")
        values.append(req.email.strip())

    if req.new_password is not None:
        if len(req.new_password) < 6:
            raise HTTPException(status_code=422, detail="Şifre en az 6 karakter olmalıdır.")
        sets.append("password_hash = %s")
        values.append(hash_password(req.new_password))

    if not sets:
        raise HTTPException(status_code=422, detail="Güncellenecek en az bir alan belirtilmelidir.")

    values.append(user_id)
    sql = f"UPDATE admin_users SET {', '.join(sets)} WHERE id = %s"

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(sql, values)
        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı güncelleme hatası: {e}")
    finally:
        try:
            cur.close()
            conn.close()
        except Exception:
            pass

    return {"success": True, "message": "Profil başarıyla güncellendi."}
