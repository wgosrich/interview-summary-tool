from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
import os
import json
from session import Session

app = Flask(__name__)
CORS(app)  # Enable CORS so Next.js frontend can talk to Flask

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///sessions.db"
db = SQLAlchemy(app)


class SessionModel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), default="Untitled")
    summary = db.Column(db.Text, default="")
    transcript = db.Column(db.Text, default="")
    messages = db.Column(db.JSON, default=list)


@app.route("/save_session", methods=["POST"])
def save_session():
    session_data = request.json
    session_id = session_data.get("session_id")
    existing_session = db.session.get(SessionModel, session_id)
    if not existing_session:
        return jsonify({"error": "Session not found"}), 404

    existing_session.name = session_data.get("name", existing_session.name)
    existing_session.summary = session_data.get("summary", existing_session.summary)
    existing_session.transcript = session_data.get(
        "transcript", existing_session.transcript
    )
    existing_session.messages = session_data.get("messages", existing_session.messages)
    db.session.commit()

    return (
        jsonify({"message": "Session updated", "session_id": existing_session.id}),
        200,
    )


@app.route("/summarize", methods=["POST"])
def summarize():
    if "transcript" not in request.files or "recording" not in request.files:
        return jsonify({"error": "Missing transcript or recording file"}), 400

    session = Session(-1)

    transcript_file = request.files["transcript"]
    recording_file = request.files["recording"]

    transcript_path = secure_filename(transcript_file.filename)
    recording_path = secure_filename(recording_file.filename)

    transcript_file.save(transcript_path)
    recording_file.save(recording_path)

    def generate():
        try:
            for chunk in session.summarize(transcript_path, recording_path):
                yield chunk
        finally:
            os.remove(transcript_path)
            os.remove(recording_path)
            new_session = SessionModel(
                name=session.name,
                summary=session.summary,
                transcript=session.transcript,
                messages=session.messages,
            )
            db.session.add(new_session)
            db.session.commit()
            yield "\n[SESSION_META::" + json.dumps(
                {"id": new_session.id, "messages": new_session.messages}
            ) + "]"

    return Response(stream_with_context(generate()), content_type="text/markdown")


@app.route("/chat", methods=["POST"])
def chat():
    prompt = request.json.get("message")
    if not prompt:
        return jsonify({"error": "Missing prompt"}), 400

    session_id = request.json.get("session_id")
    if session_id is None:
        return jsonify({"error": "Missing session_id"}), 400

    record = db.session.get(SessionModel, session_id)
    if not record:
        return jsonify({"error": "Session not found"}), 404

    session = Session(
        id=record.id,
        name=record.name,
        summary=record.summary,
        transcript=record.transcript,
        messages=list(record.messages),
    )

    def generate():
        try:
            for chunk in session.prompt_chat(prompt):
                yield chunk
        finally:
            record.messages = session.messages
            db.session.commit()

    return Response(stream_with_context(generate()), content_type="text/markdown")


@app.route("/load_session/<int:session_id>", methods=["GET"])
def load_session(session_id):
    record = db.session.get(SessionModel, session_id)
    if not record:
        return jsonify({"error": "Session not found"}), 404

    return jsonify(
        {
            "message": "Session loaded",
            "session_id": session_id,
            "name": record.name,
            "summary": record.summary,
            "transcript": record.transcript,
            "messages": record.messages,
        }
    )


@app.route("/get_sessions", methods=["GET"])
def get_sessions():
    sessions = SessionModel.query.all()
    session_list = []
    for session in sessions:
        session_list.append({"id": session.id, "name": session.name})
    return jsonify(session_list)


@app.route("/delete_session/<int:session_id>", methods=["DELETE"])
def delete_session(session_id):
    session = db.session.get(SessionModel, session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    db.session.delete(session)
    db.session.commit()
    return jsonify({"message": "Session deleted"}), 200


with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
