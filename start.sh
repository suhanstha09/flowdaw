#!/bin/bash
# start.sh - Run both backend and frontend in one terminal

echo "🎛  Starting FlowDAW..."

# Start Django backend in background
echo "▶ Starting Django backend on :8000..."
cd backend
source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
python manage.py migrate --run-syncdb 2>/dev/null
python manage.py runserver 8000 &
DJANGO_PID=$!

# Start Next.js frontend
echo "▶ Starting Next.js frontend on :3000..."
cd ../frontend
npm run dev &
NEXT_PID=$!

echo ""
echo "✅ FlowDAW running!"
echo "   Frontend → http://localhost:3000"
echo "   Backend  → http://localhost:8000"
echo "   Admin    → http://localhost:8000/admin"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $DJANGO_PID $NEXT_PID; exit" INT
wait
