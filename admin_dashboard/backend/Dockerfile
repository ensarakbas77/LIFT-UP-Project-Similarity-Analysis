FROM python:3.11-slim

# main.py'daki yol hesabı: dirname(__file__)/../.. = /app
# Bu yüzden backend /app/backend, frontend /app/frontend konumunda olmalı.
# docker-compose'da build context: ./admin_dashboard olarak ayarlanır.

WORKDIR /app/backend

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY frontend/ /app/frontend

# PDF işleme geçici dosyaları için jobs dizini
RUN mkdir -p /app/backend/jobs

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
