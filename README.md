# 🎬 ContentKaro - AI Content Creation Tool for Indian Creators

An AI-powered content creation platform designed specifically for Indian creators with support for Hindi, English, and Hinglish content.

## 🌟 Features

### MVP Features
- **Script Generator** - Generate scripts in Hindi/English/Hinglish
- **Auto-Captions** - Automatic subtitle generation using Whisper AI
- **Reel Templates** - 10 pre-built templates (Festival, Food, Fitness, Business themes)
- **Thumbnail Generator** - AI-powered thumbnail creation
- **Hook Suggestions** - Viral hook ideas for your content

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Script  │ │ Caption │ │ Template│ │Thumbnail│ │  Hook   │  │
│  │Generator│ │ Editor  │ │ Browser │ │ Creator │ │Suggester│  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
└───────┼──────────┼──────────┼──────────┼──────────┼──────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (FastAPI)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Authentication & Rate Limiting               │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ /script │ │/caption │ │/template│ │/thumbnail│ │ /hooks  │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
└───────┼──────────┼──────────┼──────────┼──────────┼──────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐   │
│  │ OpenAI    │ │ Whisper   │ │ FFmpeg    │ │ Image         │   │
│  │ GPT-4     │ │ API       │ │ Processor │ │ Generation    │   │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └───────┬───────┘   │
└────────┼─────────────┼─────────────┼───────────────┼───────────┘
         │             │             │               │
         ▼             ▼             ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  PostgreSQL   │  │  Redis Cache  │  │  AWS S3/Cloudinary│   │
│  │  (Metadata)   │  │  (Sessions)   │  │  (Media Storage)  │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
india-ai-tool/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # API routes
│   │   ├── core/              # Config, security, dependencies
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   └── utils/             # Helper functions
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Backend tests
│   └── requirements.txt
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API services
│   │   ├── store/             # State management
│   │   └── utils/             # Helper functions
│   └── package.json
├── docker/                     # Docker configurations
└── docs/                       # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- FFmpeg
- Redis

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Configure your environment variables
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env  # Configure your environment variables
npm run dev
```

### Docker Setup (Recommended)
```bash
# Copy environment file and configure
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## 📊 Database Schema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     users       │     │    projects     │     │    scripts      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │────<│ user_id (FK)    │────<│ user_id (FK)    │
│ email           │     │ name            │     │ project_id (FK) │
│ full_name       │     │ description     │     │ title           │
│ password_hash   │     │ category        │     │ content         │
│ subscription_tier│     │ status          │     │ language        │
│ preferred_lang  │     │ tags[]          │     │ script_type     │
│ created_at      │     │ created_at      │     │ category        │
└─────────────────┘     └─────────────────┘     │ tone            │
                                                │ word_count      │
┌─────────────────┐     ┌─────────────────┐     │ hooks[]         │
│    captions     │     │   thumbnails    │     │ hashtags[]      │
├─────────────────┤     ├─────────────────┤     │ is_favorite     │
│ id (PK)         │     │ id (PK)         │     │ created_at      │
│ user_id (FK)    │     │ user_id (FK)    │     └─────────────────┘
│ project_id (FK) │     │ project_id (FK) │
│ title           │     │ title           │     ┌─────────────────┐
│ source_file_url │     │ primary_text    │     │   templates     │
│ transcription   │     │ secondary_text  │     ├─────────────────┤
│ segments (JSON) │     │ style           │     │ id (PK)         │
│ detected_lang   │     │ output_url      │     │ name            │
│ status          │     │ output_variants │     │ name_hindi      │
│ created_at      │     │ status          │     │ category        │
└─────────────────┘     │ created_at      │     │ template_type   │
                        └─────────────────┘     │ aspect_ratio    │
                                                │ preview_url     │
                                                │ is_premium      │
                                                └─────────────────┘
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login and get tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user |

### Scripts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/scripts/generate` | Generate AI script |
| GET | `/api/v1/scripts` | List user's scripts |
| GET | `/api/v1/scripts/{id}` | Get script details |
| PATCH | `/api/v1/scripts/{id}` | Update script |
| POST | `/api/v1/scripts/{id}/regenerate` | Regenerate script |
| DELETE | `/api/v1/scripts/{id}` | Delete script |

### Captions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/captions/generate` | Generate captions from URL |
| POST | `/api/v1/captions/upload` | Upload video for captions |
| GET | `/api/v1/captions` | List user's captions |
| GET | `/api/v1/captions/{id}` | Get caption details |
| PATCH | `/api/v1/captions/{id}` | Update caption segments |
| POST | `/api/v1/captions/{id}/export` | Export captions (SRT/VTT/ASS) |
| DELETE | `/api/v1/captions/{id}` | Delete caption |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/templates` | List all templates |
| GET | `/api/v1/templates/featured` | Get featured templates |
| GET | `/api/v1/templates/categories` | Get template categories |
| GET | `/api/v1/templates/{id}` | Get template details |
| POST | `/api/v1/templates/{id}/use` | Use a template |
| POST | `/api/v1/templates/render` | Render template video |
| GET | `/api/v1/templates/render/{id}/status` | Check render status |

### Thumbnails
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/thumbnails/generate` | Generate AI thumbnail |
| POST | `/api/v1/thumbnails/upload-face` | Upload face image |
| GET | `/api/v1/thumbnails` | List user's thumbnails |
| GET | `/api/v1/thumbnails/{id}` | Get thumbnail details |
| POST | `/api/v1/thumbnails/{id}/variant` | Create variant |
| POST | `/api/v1/thumbnails/{id}/download` | Download thumbnail |
| DELETE | `/api/v1/thumbnails/{id}` | Delete thumbnail |

### Hooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/hooks/generate` | Generate viral hooks |
| GET | `/api/v1/hooks/templates` | Get hook templates |
| GET | `/api/v1/hooks/trending` | Get trending hooks |
| GET | `/api/v1/hooks/categories` | Get hook categories |
| POST | `/api/v1/hooks/use/{id}` | Track hook usage |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects` | List user's projects |
| GET | `/api/v1/projects/{id}` | Get project details |
| GET | `/api/v1/projects/{id}/content` | Get all project content |
| PATCH | `/api/v1/projects/{id}` | Update project |
| DELETE | `/api/v1/projects/{id}` | Delete project |

## 🎨 Component Architecture

```
src/
├── components/
│   ├── layouts/
│   │   ├── MainLayout.tsx       # Dashboard layout with sidebar
│   │   └── AuthLayout.tsx       # Login/Register layout
│   ├── common/
│   │   ├── Button.tsx           # Primary, secondary, ghost buttons
│   │   ├── Input.tsx            # Form inputs with validation
│   │   ├── Select.tsx           # Dropdown selects
│   │   ├── Modal.tsx            # Reusable modal component
│   │   └── LoadingSpinner.tsx   # Loading states
│   ├── scripts/
│   │   ├── ScriptCard.tsx       # Script list item
│   │   └── ScriptEditor.tsx     # Edit script content
│   ├── captions/
│   │   ├── CaptionEditor.tsx    # Edit caption segments
│   │   ├── VideoPlayer.tsx      # Preview with captions
│   │   └── UploadZone.tsx       # Drag & drop upload
│   ├── templates/
│   │   ├── TemplateCard.tsx     # Template preview card
│   │   └── TemplateCustomizer.tsx # Customize template
│   └── thumbnails/
│       ├── ThumbnailPreview.tsx # Preview generated thumbnail
│       └── ThumbnailEditor.tsx  # Edit text/colors
├── pages/
│   ├── HomePage.tsx             # Landing page
│   ├── DashboardPage.tsx        # User dashboard
│   ├── ScriptsPage.tsx          # Scripts list
│   ├── scripts/
│   │   └── ScriptGeneratorPage.tsx # Generate new script
│   ├── CaptionsPage.tsx         # Captions list
│   ├── TemplatesPage.tsx        # Templates gallery
│   ├── ThumbnailsPage.tsx       # Thumbnails list
│   ├── HooksPage.tsx            # Hook generator
│   └── ProjectsPage.tsx         # Projects list
├── services/
│   └── api.ts                   # Axios API client
├── store/
│   └── authStore.ts             # Zustand auth store
└── hooks/
    ├── useAuth.ts               # Authentication hook
    └── useMediaQuery.ts         # Responsive design hook
```

## 🌐 Environment Variables

### Backend (.env)
```env
# Required
SECRET_KEY=your-super-secret-key
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/contentkaro
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-your-openai-key

# Storage (choose one)
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Or AWS S3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=contentkaro-uploads
AWS_REGION=ap-south-1
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=ContentKaro
```

## 🈴 Language Support

ContentKaro is built specifically for Indian creators with proper Unicode support:

- **Hindi (हिंदी)** - Pure Hindi scripts and captions
- **English** - Standard English content
- **Hinglish** - Mix of Hindi and English (most popular!)

### Unicode Handling
```python
# All text is normalized using NFC for consistent storage
import unicodedata
text = unicodedata.normalize("NFC", raw_text)
```

### Font Support
- **Noto Sans Devanagari** - Used for Hindi text rendering in thumbnails
- Properly configured in Tailwind CSS for web display

## 📜 License

MIT License - See LICENSE file for details

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📊 Database Schema

See [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) for complete schema.

## 🔌 API Documentation

See [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md) for complete API reference.

## 🌐 Language Support

- **Hindi (हिंदी)** - Full Unicode support
- **English** - Native support
- **Hinglish** - Mixed language detection and generation

## 📝 License

MIT License - see LICENSE file for details.
