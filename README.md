# Robotus AI Platform

A modern, all-in-one AI platform for image and video generation with a beautiful dark-themed chatbot interface.

## Features

- 🤖 **AI-Powered Orchestrator**: Smart request analysis using OpenAI
- 🖼️ **Text-to-Image**: Generate images using Wavespeed AI (Bytedance Seedream V4)
- 🎨 **Image-to-Image**: Edit and modify existing images
- 🎥 **Image-to-Video**: Create videos from uploaded images using Wavespeed AI
- 📱 **Video from Images**: Animate your images into videos
- 🌙 **Dark Theme**: Beautiful black background with pink/purple gradients
- 🔐 **Authentication**: Secure login/register system
- 📁 **File Upload**: Drag & drop image support
- 💬 **Chat Interface**: Real-time conversation with AI

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **Authentication**: NextAuth.js with credentials provider
- **Database**: PostgreSQL with Prisma ORM
- **AI Services**: 
  - OpenAI GPT-4 (orchestration)
  - Wavespeed AI (image generation/editing/video generation)

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- API keys for:
  - OpenAI
  - Wavespeed AI

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd your-project-directory
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Fill in your actual API keys and database credentials in `.env`:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `WAVESPEED_API_KEY`: Your Wavespeed AI API key  
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: A random secret for NextAuth.js

3. **Set up the database**:
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and navigate to `http://localhost:3000`

## Usage

### Getting Started

1. **Create an account** or sign in at `/auth/signup` or `/auth/signin`
2. **Start chatting** with the AI at `/chat`

### Example Prompts

**Image Generation**:
- "Create an image of a futuristic city at sunset"
- "Generate a cute cartoon cat wearing a space helmet"

**Image Editing** (upload images first):
- "Make this image more colorful and vibrant"
- "Change the background to a forest scene"

**Video Generation** (upload images first):
- "Make a video from this image with smooth transitions"
- "Animate this image into a video"

### File Upload

- **Drag & Drop**: Simply drag images into the chat area
- **Click to Upload**: Use the attach button to browse files
- **Supported Formats**: JPG, PNG, GIF, MP4 (for images)

## API Endpoints

- `POST /api/auth/[...nextauth]` - Authentication
- `POST /api/register` - User registration
- `POST /api/chat` - Main chat interaction
- `GET /api/generations?id={id}` - Check generation status
- `POST /api/generations` - Batch check pending generations

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── chat/              # Main chat interface
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   └── chat-interface.tsx # Main chat component
├── lib/                   # Utility libraries
│   ├── ai-orchestrator.ts # OpenAI request analysis
│   ├── ai-services.ts     # Wavespeed API clients
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Database client
│   └── utils.ts          # Helper functions
└── types/                 # TypeScript type definitions
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for request orchestration | Yes |
| `WAVESPEED_API_KEY` | Wavespeed AI API key for image generation | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js sessions | Yes |
| `NEXTAUTH_URL` | Base URL for NextAuth.js | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.