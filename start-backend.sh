#!/bin/bash
echo "🎛 Starting FlowDAW Backend..."
cd backend
if [ ! -d "venv" ]; then
  echo "Creating virtualenv..."
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -q -r requirements.txt
python manage.py migrate --run-syncdb 2>/dev/null
echo "✅ Backend ready at http://localhost:8000"
python manage.py runserver
