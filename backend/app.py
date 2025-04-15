from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
import os
from session import Session

app = Flask(__name__)
CORS(app)  # Enable CORS so Next.js frontend can talk to Flask

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sessions.db'
db = SQLAlchemy(app)

current_session = Session(-1)

class SessionModel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), default="Untitled")
    summary = db.Column(db.Text, default="")
    transcript = db.Column(db.Text, default="")
    messages = db.Column(db.JSON, default=list)

@app.route('/save_session', methods=['POST'])
def save_session():
    if current_session.id == -1:  # New session, add to the database
        new_session = SessionModel(
            name=current_session.name,
            summary=current_session.summary,
            transcript=current_session.transcript,
            messages=current_session.messages
        )
        db.session.add(new_session)
        db.session.commit()
        current_session.id = new_session.id  # Update current_session id
        return jsonify({
            'message': 'Session created',
            'session_id': new_session.id
        }), 201
    else:  # Existing session, update in the database
        existing_session = SessionModel.query.get(current_session.id)
        if not existing_session:
            return jsonify({'error': 'Session not found'}), 404

        existing_session.name = current_session.name
        existing_session.summary = current_session.summary
        existing_session.transcript = current_session.transcript
        existing_session.messages = current_session.messages
        db.session.commit()

        return jsonify({
            'message': 'Session updated',
            'session_id': existing_session.id
        }), 200

@app.route('/summarize', methods=['POST'])
def summarize():
    if 'transcript' not in request.files or 'recording' not in request.files:
        return jsonify({'error': 'Missing transcript or recording file'}), 400

    transcript_file = request.files['transcript']
    recording_file = request.files['recording']

    transcript_path = secure_filename(transcript_file.filename)
    recording_path = secure_filename(recording_file.filename)

    transcript_file.save(transcript_path)
    recording_file.save(recording_path)

    def generate():
        try:
            for chunk in current_session.summarize(transcript_path, recording_path):
                yield chunk
        finally:
            os.remove(transcript_path)
            os.remove(recording_path)

    return Response(stream_with_context(generate()), content_type='text/markdown')

@app.route('/chat', methods=['POST'])
def chat():
    prompt = request.json.get('message')
    if not prompt:
        return jsonify({'error': 'Missing prompt'}), 400
    
    def generate():
        try:
            for chunk in current_session.prompt_chat(prompt):
                yield chunk
        finally:
            pass

    return Response(stream_with_context(generate()), content_type='text/markdown')

@app.route('/load_session/<int:session_id>', methods=['GET'])
def load_session(session_id):
    record = SessionModel.query.get(session_id)
    if not record:
        return jsonify({'error': 'Session not found'}), 404
    global current_session
    current_session = Session(
        id=record.id,
        name=record.name,
        summary=record.summary,
        transcript=record.transcript,
        messages=record.messages,
    )
    return jsonify({
        'message': 'Session loaded',
        'session_id': session_id,
        'name': record.name,
        'summary': record.summary,
        'transcript': record.transcript,
        'messages': record.messages,
    })
    
@app.route('/get_sessions', methods=['GET'])
def get_sessions():
    sessions = SessionModel.query.all()
    session_list = []
    for session in sessions:
        session_list.append({'id': session.id, 'name': session.name})
    return jsonify(session_list)

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=8000)