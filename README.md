# UBA-LITE: Lightweight User Behavior Analytics for Insider Threat Detection

> A production-ready insider threat detection system using machine learning to identify anomalous user behavior patterns.

## Overview

**UBA-LITE** is a lightweight User Behavior Analytics (UBA) system designed to detect insider threats by analyzing user activity logs. The system uses Isolation Forest machine learning models to identify anomalies across 12 different threat categories, from large file transfers to database tampering.

### Key Features

- **Multi-Model Detection**: Analyze logs across 12 insider threat models simultaneously
- **User-Scoped Analytics**: Each analyst sees only their uploaded data for accountability
- **Auto-Training**: Models train automatically when no trained model exists
- **Real-Time Detection**: Upload logs and get instant anomaly detection results
- **Interactive Dashboard**: Modern React UI with charts, trends, and risk scoring
- **Session Management**: Track, investigate, and update detection session statuses
- **Authentication**: Secure login system with JWT tokens
- **Flexible Log Parsing**: Supports CSV, JSON, JSONL, TSV, LOG, and TXT formats

---

## Architecture

```
UBA-LITE/
├── backend/              # FastAPI backend
│   ├── api/             # API routes and authentication
│   ├── database/        # SQLAlchemy models and DB config
│   ├── ml/              # Machine learning models and training
│   ├── utils/           # File parsers and utilities
│   └── config.py        # Configuration settings
├── frontend/            # React frontend (Vision UI)
│   ├── src/
│   │   ├── layouts/     # Page components (Dashboard, Upload, Detect, etc.)
│   │   ├── services/    # API client
│   │   └── components/  # Reusable UI components
│   └── public/
├── data/                # Sample datasets for testing
├── uploads/             # Uploaded log files
├── reports/             # Generated detection reports
└── uba_lite.db          # SQLite database
```

### Tech Stack

**Backend:**
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- Scikit-learn (Isolation Forest ML models)
- Pandas/NumPy (Data processing)
- JWT Authentication
- SQLite/PostgreSQL

**Frontend:**
- React 17
- Material-UI (MUI)
- Vision UI Dashboard (theme)
- Axios (API client)
- ApexCharts (data visualization)

---

## Quick Start

### Prerequisites

- **Python 3.8+**
- **Node.js 14+** and npm
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/uba-lite.git
cd UBA-LITE
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend server
uvicorn backend.main:app --reload --port 8000
```

Backend will be available at: **http://localhost:8000**

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend will be available at: **http://localhost:3000**

### 4. Create Your First Account

1. Open **http://localhost:3000**
2. Click **"Sign Up"**
3. Create an account with username, email, and password
4. Login and start uploading logs!

---

## Supported Threat Models

| Model Name | Description | Required Columns |
|------------|-------------|------------------|
| `large_file_transfer` | Detects unusually large file transfers | `user_id`, `file_size`, `destination` |
| `file_access` | Unauthorized file access patterns | `user_id`, `file_path` |
| `database_access` | Suspicious database queries | `user_id`, `database_name` |
| `privileged_access` | Privilege escalation attempts | `user_id`, `access_level` |
| `legacy_system_access` | Access to deprecated systems | `user_id`, `system_name` |
| `department_access` | Cross-department access violations | `user_id`, `department_name` |
| `unauthorized_software` | Unapproved software installations | `user_id`, `software_name`, `device_id` |
| `hacking_tools` | Use of hacking/penetration tools | `user_id`, `tool_name`, `device_id` |
| `command_line_access` | Suspicious CLI commands | `user_id`, `command_used`, `device_id` |
| `mass_deletion` | Bulk file deletion events | `file_count`, `timestamp` |
| `security_log_modification` | Tampering with security logs | `timestamp` |
| `database_record_alteration` | Database record manipulation | `alteration_time` |

---

## Supported File Formats

### CSV (.csv)
```csv
user_id,file_size,destination,timestamp
user001,52428800,external_drive,2024-11-23T10:00:00
user002,104857600,cloud_storage,2024-11-23T10:15:00
```

### JSON (.json)
```json
[
  {"user_id": "user001", "file_size": 52428800, "destination": "external_drive", "timestamp": "2024-11-23T10:00:00"},
  {"user_id": "user002", "file_size": 104857600, "destination": "cloud_storage", "timestamp": "2024-11-23T10:15:00"}
]
```

### JSON Lines (.jsonl, .ndjson)
```
{"user_id": "user001", "file_size": 52428800, "destination": "external_drive"}
{"user_id": "user002", "file_size": 104857600, "destination": "cloud_storage"}
```

### Log Files (.log)
```
timestamp=2024-11-23T10:00:00 user_id=user001 file_size=52428800 destination=external_drive
timestamp=2024-11-23T10:15:00 user_id=user002 file_size=104857600 destination=cloud_storage
```

### TSV (.tsv)
Tab-separated values (like CSV but with tabs)

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user info |
| GET | `/api/auth/profile` | Get user profile details |

### File Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload_file` | Upload log file for analysis |
| GET | `/api/uploaded_files` | Get user's upload history |
| GET | `/api/log_types` | Get available threat models |
| GET | `/api/supported_formats` | Get supported file formats |

### Model Training

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/train_model` | Manually train a model |
| GET | `/api/models` | List all trained models |
| GET | `/api/models/{name}` | Get specific model info |

### Anomaly Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/detect/logs` | Run detection on uploaded logs |
| GET | `/api/detections/sessions` | Get detection sessions |
| PATCH | `/api/detections/sessions/{id}/status` | Update session status |
| POST | `/api/detections/sessions/{id}/report` | Generate PDF report |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/stats` | Dashboard KPIs |
| GET | `/api/analytics/trends` | Time-series anomaly trends |
| GET | `/api/analytics/user-risks` | Per-user risk scores |

---

## Usage Guide

### 1. Upload Logs

1. Navigate to **Upload Logs** page
2. Select **Log Type** (e.g., "Large File Transfer Detection")
3. Drag & drop or browse for your log file
4. Toggle **"Auto-detect anomalies after upload"** (recommended)
5. Toggle **"Check across all models"** to run detection on all 12 models
6. Click **Upload**

### 2. View Detection Results

1. Navigate to **Detect Anomalies** page
2. Browse detection sessions in the table
3. Click **"View Details"** to see:
   - Total events analyzed
   - Anomaly count
   - Risk distribution (High/Medium/Low)
   - Individual anomalous events
4. Update session status: **Investigating** → **Resolved** / **Escalated**
5. Generate PDF report for documentation

### 3. Analyze Trends

1. Navigate to **Dashboard** for high-level KPIs
2. Navigate to **Analytics** for:
   - Time-series anomaly trends
   - Per-user risk scores
   - Detailed threat breakdowns

### 4. Multi-Model Detection

When you enable **"Check across all models"**:
- System runs your uploaded logs through **all 12 threat models**
- Results show which models flagged anomalies
- Example output: `database_access (3/200 anomalies); privileged_access (1/200 anomalies)`

---

## Security Features

- **JWT Authentication**: Secure token-based auth with expiration
- **Password Hashing**: bcrypt with 12 rounds
- **User Isolation**: Each user only sees their own uploaded data
- **CORS Protection**: Configured for production deployment
- **SQL Injection Prevention**: SQLAlchemy ORM with parameterized queries

---

## Testing

### Sample Datasets

Sample datasets are provided in the `data/` directory:

- `large_file_transfer_sample.csv` - File transfer logs
- `database_access_sample.json` - Database query logs
- `privileged_access_sample.jsonl` - Privilege escalation logs

### Running Tests

```bash
# Backend API tests
python test_api.py
python test_auth.py

# Test with sample data
python test_simple_auth.py
```

---

## Deployment

### Backend (Production)

```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn backend.main:app --workers 4 --bind 0.0.0.0:8000
```

### Frontend (Production)

```bash
cd frontend
npm run build

# Serve with nginx or any static file server
```

### Environment Variables

Create `.env` file in project root:

```env
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=sqlite:///./uba_lite.db
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Acknowledgments

- **CERT Insider Threat Dataset** - Benchmark dataset for testing
- **Scikit-learn** - Machine learning library
- **FastAPI** - Modern Python web framework
- **Vision UI** - React dashboard template
- **Material-UI** - React component library

---

## Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Email: support@uba-lite.com

---

**Built with ❤️ for security analysts and SOC teams**