#!/bin/bash

echo "🚀 Starting Art Framer Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start Supabase services
echo "📦 Starting Supabase services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Supabase services are running!"
    echo ""
    echo "🌐 Services available at:"
    echo "   - Supabase API: http://localhost:54321"
    echo "   - Supabase Studio: http://localhost:54323"
    echo "   - Database: localhost:54322"
    echo "   - Storage: http://localhost:54325"
    echo ""
    echo "📱 Starting Next.js development server..."
    echo ""
    
    # Start Next.js dev server
    cd art-framer
    npm run dev
else
    echo "❌ Failed to start Supabase services. Check logs with:"
    echo "   docker-compose logs"
    exit 1
fi
