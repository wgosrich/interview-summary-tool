import azure.functions as func
import sys
import os
# This assumes app.py is located in the 'backend' directory
# The current file is in 'backend/HttpTrigger', so we add the parent directory (backend)
# to the Python path to be able to import the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app  # importing from backend/app.py

def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return func.WsgiMiddleware(app.wsgi_app).handle(req, context)
