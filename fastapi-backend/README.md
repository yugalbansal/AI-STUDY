# FastAPI Backend for JSONL Generation

## Setup Instructions

### 1. Install Dependencies

```bash
cd fastapi-backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (from Settings > API)
- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `STORAGE_BUCKET_DOCUMENTS` - Name of Supabase storage bucket for documents (default: "documents")
- `STORAGE_BUCKET_JSONL` - Name of Supabase storage bucket for JSONL files (default: "jsonl-datasets")

### 3. Create Supabase Storage Buckets

Go to Supabase Dashboard > Storage and create two buckets:

1. **documents** (private bucket)
   - Used for storing uploaded document files
   - Keep RLS policies to restrict access per user

2. **jsonl-datasets** (private bucket)
   - Used for storing generated JSONL files
   - Keep RLS policies to restrict access per user

### 4. Run Database Migration

Apply the migration to add JSONL tracking columns:

```bash
# From project root
cd supabase
supabase db push

# Or manually run the SQL file in Supabase SQL Editor:
# supabase/migrations/20260115_add_jsonl_tracking.sql
```

### 5. Run FastAPI Backend Locally

```bash
cd fastapi-backend
python main.py

# Or use uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### 6. Update Frontend Configuration

Add to your frontend `.env` file:

```bash
VITE_FASTAPI_URL=http://localhost:8000
```

For production, set this to your deployed backend URL.

---

## Deployment

### Option 1: Railway (Recommended - Easy)

1. Create account at [Railway.app](https://railway.app)
2. Click "New Project" > "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `fastapi-backend`
5. Add environment variables in Railway dashboard
6. Railway will auto-detect and deploy FastAPI

### Option 2: Render

1. Create account at [Render.com](https://render.com)
2. New > Web Service
3. Connect your GitHub repo
4. Set:
   - Root Directory: `fastapi-backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy

### Option 3: VPS (DigitalOcean, Linode, AWS EC2)

1. SSH into your server
2. Install Python 3.10+
3. Clone your repository
4. Install dependencies and run with systemd:

```bash
# Install
cd fastapi-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create systemd service
sudo nano /etc/systemd/system/jsonl-generator.service
```

Service file content:
```ini
[Unit]
Description=JSONL Generator FastAPI
After=network.target

[Service]
User=your-user
WorkingDirectory=/path/to/fastapi-backend
Environment="PATH=/path/to/fastapi-backend/venv/bin"
ExecStart=/path/to/fastapi-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable jsonl-generator
sudo systemctl start jsonl-generator
```

Use Nginx as reverse proxy.

---

## Testing

### Test Backend Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "service": "jsonl-generator"}
```

### Test JSONL Generation (Full Flow)

1. Upload a document through the frontend
2. Click the "Generate JSONL" button (database icon)
3. Watch status change: idle → generating → completed
4. Click download button to get JSONL file
5. Verify JSONL format:

```bash
# Each line should be valid JSON with messages array
cat downloaded.jsonl | jq .
```

---

## Troubleshooting

### Backend won't start

- Check Python version: `python --version` (need 3.10+)
- Check environment variables are set correctly
- Check Supabase credentials are valid

### File upload fails

- Verify storage buckets exist in Supabase
- Check RLS policies allow authenticated users to upload
- Check file size limits

### JSONL generation fails

- Check OpenRouter API key is valid
- Check document file exists in storage
- Check backend logs: `journalctl -u jsonl-generator -f` (if using systemd)
- Check job status via API: `curl http://localhost:8000/api/jsonl/status/{job_id}`

### Download URL doesn't work

- Verify JSONL file was uploaded to storage
- Check signed URL hasn't expired (1 hour)
- Verify user has permission to access the file

---

## Architecture

```
User uploads document
        ↓
Frontend uploads FILE to Supabase Storage bucket "documents"
        ↓
Frontend parses text client-side for embeddings (existing flow - unchanged)
        ↓
User clicks "Generate JSONL" button
        ↓
FastAPI backend:
   1. Downloads file from storage
   2. Extracts text server-side
   3. Chunks text (~800 chars)
   4. Calls OpenRouter LLM for each chunk
   5. Generates 3-5 JSONL lines per chunk
   6. Uploads JSONL to storage bucket "jsonl-datasets"
        ↓
Frontend polls status every 3 seconds
        ↓
When complete, user clicks download button
        ↓
Backend generates signed URL (expires 1 hour)
        ↓
User downloads JSONL file for LLM fine-tuning
```

---

## API Endpoints

### POST `/api/jsonl/generate`
Start JSONL generation for a document

Request:
```json
{
  "document_id": "uuid",
  "user_id": "uuid"
}
```

Response:
```json
{
  "job_id": "uuid",
  "status": "started",
  "message": "JSONL generation started"
}
```

### GET `/api/jsonl/status/{job_id}`
Check job status

Response:
```json
{
  "job_id": "uuid",
  "status": "generating|completed|failed",
  "jsonl_url": "path/to/file.jsonl",
  "error": "error message if failed"
}
```

### GET `/api/jsonl/download/{document_id}?user_id={user_id}`
Get signed download URL

Response:
```json
{
  "download_url": "https://...",
  "expires_in": 3600
}
```

### POST `/api/jsonl/retry/{document_id}?user_id={user_id}`
Retry failed generation

Response:
```json
{
  "job_id": "uuid",
  "status": "started",
  "message": "JSONL generation restarted"
}
```

---

## Security Notes

- Service role key is only used in backend (never exposed to frontend)
- All API calls verify document ownership before processing
- Signed URLs expire after 1 hour
- RLS policies enforce user-level access control
- Background jobs are isolated per document

---

## Monitoring

Check active jobs:
```sql
SELECT id, title, jsonl_status, jsonl_created_at 
FROM documents 
WHERE jsonl_status = 'generating';
```

Check failed jobs:
```sql
SELECT id, title, jsonl_error 
FROM documents 
WHERE jsonl_status = 'failed';
```

View recent completions:
```sql
SELECT id, title, jsonl_created_at 
FROM documents 
WHERE jsonl_status = 'completed' 
ORDER BY jsonl_created_at DESC 
LIMIT 10;
```
