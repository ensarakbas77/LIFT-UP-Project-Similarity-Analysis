FROM python:3.11-slim

WORKDIR /app

# CPU-only torch — CUDA sürümünden (~2GB) kaçınmak için önce ayrıca kurulur.
# Bu satır olmazsa pip, requirements.txt'teki torch'u CUDA ile kurar.
RUN pip install --no-cache-dir torch==2.10.0 \
    --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
