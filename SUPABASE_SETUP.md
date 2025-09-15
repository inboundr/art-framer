# Supabase Setup Guide for Art Framer

This guide will help you set up Supabase locally for development with Docker Compose, including authentication, database, and storage.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and npm
- Git

## Quick Start

### 1. Start Supabase Services

```bash
# Start all Supabase services
docker-compose up -d

# Check if services are running
docker-compose ps
```

### 2. Set Environment Variables

Copy the example environment file and update it:

```bash
cp env.example .env.local
```

The default values in `.env.local` are already configured for local development.

### 3. Install Dependencies

```bash
cd art-framer
npm install
```

### 4. Run Database Migrations

```bash
# The migrations will run automatically when Supabase starts
# You can also run them manually if needed
docker-compose exec supabase supabase db reset
```

### 5. Start the Development Server

```bash
npm run dev
```

## Services Overview

### Ports Used

- **Supabase API**: http://localhost:54321
- **Supabase Studio**: http://localhost:54323
- **PostgreSQL**: localhost:54322
- **Storage**: http://localhost:54325
- **Auth**: http://localhost:54327
- **Realtime**: http://localhost:54326
- **Edge Functions**: http://localhost:54328

### Database Schema

The application includes the following tables:

- **profiles**: User profiles extending Supabase auth
- **images**: Generated images with metadata
- **image_likes**: User likes on images
- **user_generations**: Generation history and settings

### Storage Buckets

- **images**: Public access to generated images
- **thumbnails**: Public access to image thumbnails
- **avatars**: User profile avatars

## Authentication Features

### User Registration

- Email/password signup
- Username and full name collection
- Email verification (configurable)
- Automatic profile creation

### User Login

- Email/password authentication
- Session management
- Automatic token refresh

### Profile Management

- Update user information
- Avatar uploads
- Credit system
- Premium status

## API Endpoints

### Public Endpoints

- `GET /api/images` - List public images
- `GET /api/images/[id]` - Get image details

### Protected Endpoints

- `POST /api/images` - Create new image generation
- `PUT /api/images/[id]` - Update image
- `DELETE /api/images/[id]` - Delete image
- `POST /api/images/[id]/like` - Like/unlike image

## Development Workflow

### 1. Database Changes

When you need to modify the database schema:

```bash
# Create a new migration
docker-compose exec supabase supabase migration new migration_name

# Apply migrations
docker-compose exec supabase supabase db reset

# Generate types (if using Supabase CLI)
supabase gen types typescript --local > src/lib/supabase/types.ts
```

### 2. Testing Authentication

```bash
# View auth logs
docker-compose logs supabase

# Check database
docker-compose exec postgres psql -U postgres -d postgres
```

### 3. Storage Testing

```bash
# Upload test files
curl -X POST http://localhost:54325/storage/v1/object/bucket/images \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -F "file=@test-image.jpg"
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**

   ```bash
   # Check what's using a port
   lsof -i :54321

   # Stop conflicting services
   sudo kill -9 PID
   ```

2. **Database Connection Issues**

   ```bash
   # Restart Supabase
   docker-compose restart supabase

   # Check logs
   docker-compose logs supabase
   ```

3. **Storage Issues**
   ```bash
   # Reset storage
   docker-compose exec supabase supabase storage reset
   ```

### Reset Everything

```bash
# Stop and remove all containers
docker-compose down -v

# Remove all volumes
docker volume prune

# Start fresh
docker-compose up -d
```

## Production Considerations

### Environment Variables

- Use strong, unique secrets
- Store secrets securely (not in Git)
- Use different keys for staging/production

### Security

- Enable email confirmation in production
- Set up proper CORS policies
- Use HTTPS in production
- Implement rate limiting

### Monitoring

- Set up logging and monitoring
- Monitor database performance
- Track storage usage
- Set up alerts for errors

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Policies](https://supabase.com/docs/guides/storage/policies)

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Check if all services are running
4. Consult Supabase documentation
5. Check GitHub issues for similar problems
