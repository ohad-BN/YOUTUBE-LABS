@echo off
echo =========================================
echo    Starting YouTube Labs Backend
echo =========================================

cd backend

:: Check if virtual environment exists, create if it doesn't
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
)

:: Activate the virtual environment
call .venv\Scripts\activate

:: Install required packages
echo Installing requirements...
call pip install -r requirements.txt

:: Start the FastAPI server with auto-reload
echo Starting FastAPI with Uvicorn...
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
