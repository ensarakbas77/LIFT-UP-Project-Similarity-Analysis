"""
Database Katmanı — PostgreSQL Bağlantı Yönetimi.

psycopg2 connection pool kullanarak verimli bağlantı yönetimi sağlar.
"""

import psycopg2
from psycopg2 import pool
from app.core.config import settings


class DatabaseSession:
    """PostgreSQL bağlantı havuzu (connection pool) yöneticisi."""

    _pool: pool.SimpleConnectionPool | None = None

    @classmethod
    def initialize(cls) -> None:
        """Bağlantı havuzunu başlatır. Startup sırasında çağrılır."""
        if cls._pool is None:
            cls._pool = pool.SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                dbname=settings.DB_NAME,
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                sslmode=settings.DB_SSLMODE,
            )
            print("PostgreSQL baglanti havuzu olusturuldu.")

    @classmethod
    def get_connection(cls):
        """Havuzdan bir bağlantı alır."""
        if cls._pool is None:
            raise RuntimeError(
                "Bağlantı havuzu başlatılmadı. Önce initialize() çağrılmalı."
            )
        return cls._pool.getconn()

    @classmethod
    def return_connection(cls, conn) -> None:
        """Kullanılan bağlantıyı havuza geri verir."""
        if cls._pool is not None:
            cls._pool.putconn(conn)

    @classmethod
    def close_all(cls) -> None:
        """Tüm bağlantıları kapatır. Shutdown sırasında çağrılır."""
        if cls._pool is not None:
            cls._pool.closeall()
            cls._pool = None
            print("PostgreSQL baglanti havuzu kapatildi.")
