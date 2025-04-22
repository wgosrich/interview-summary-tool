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


class UserModel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    sessions = db.relationship(
        "SessionModel", secondary="user_sessions", backref="users"
    )


class SessionModel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey("user_model.id"), nullable=False)
    name = db.Column(db.String(100), default="Untitled")
    summary = db.Column(db.Text, default="")
    transcript = db.Column(db.Text, default="")
    messages = db.Column(db.JSON, default=list)


user_sessions = db.Table(
    "user_sessions",
    db.Column("user_id", db.Integer, db.ForeignKey("user_model.id"), primary_key=True),
    db.Column(
        "session_id", db.Integer, db.ForeignKey("session_model.id"), primary_key=True
    ),
)


# requires username, returns user_id
@app.route("/login", methods=["POST"])
def login():
    user_data = request.json
    username = user_data.get("username")
    if not username:
        return jsonify({"error": "Missing username"}), 400

    existing_user = UserModel.query.filter_by(username=username).first()
    if existing_user:
        return (
            jsonify({"message": "User already exists", "user_id": existing_user.id}),
            200,
        )

    new_user = UserModel(username=username)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User created", "user_id": new_user.id}), 201


# requires user_id
@app.route("/delete_user/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    user = db.session.get(UserModel, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "User deleted"}), 200


# requires user_id and session_id
@app.route("/unsubscribe/<int:user_id>/<int:session_id>", methods=["DELETE"])
def unsubscribe(user_id, session_id):
    user = db.session.get(UserModel, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    session = db.session.get(SessionModel, session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    user.sessions.remove(session)
    db.session.commit()

    return jsonify({"message": "Unsubscribed from session"}), 200


# requires user_id and session_id
@app.route("/subscribe/<int:user_id>/<int:session_id>", methods=["POST"])
def subscribe(user_id, session_id):
    user = db.session.get(UserModel, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    session = db.session.get(SessionModel, session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    user.sessions.append(session)
    db.session.commit()

    return jsonify({"message": "Subscribed to session"}), 200


# requires user_id, creates session_id, returns summary and metadata
@app.route("/summarize/<int:user_id>", methods=["POST"])
def summarize(user_id):
    if "transcript" not in request.files or "recording" not in request.files:
        return jsonify({"error": "Missing transcript or recording file"}), 400

    session = Session()

    transcript_file = request.files["transcript"]
    recording_file = request.files["recording"]

    transcript_path = secure_filename(transcript_file.filename)
    recording_path = secure_filename(recording_file.filename)

    transcript_file.save(transcript_path)
    recording_file.save(recording_path)
    
    # Handle additional context files
    additional_context_paths = []
    if 'additional_context' in request.files:
        additional_context_files = request.files.getlist('additional_context')
        for context_file in additional_context_files:
            context_path = secure_filename(context_file.filename)
            context_file.save(context_path)
            additional_context_paths.append(context_path)

    def generate():
        try:
            for chunk in session.summarize(transcript_path, recording_path, additional_context_paths):
                yield chunk
        finally:
            os.remove(transcript_path)
            os.remove(recording_path)
            # Clean up additional context files
            for context_path in additional_context_paths:
                if os.path.exists(context_path):
                    os.remove(context_path)
            new_session = SessionModel(
                creator_id=user_id,
                name=session.name,
                summary=session.summary,
                transcript=session.transcript,
                messages=session.messages,
            )
            db.session.add(new_session)

            # Associate the session with the user who created it
            user = db.session.get(UserModel, user_id)
            if user:
                user.sessions.append(new_session)

            db.session.commit()
            yield "\n[SESSION_META::" + json.dumps(
                {"id": new_session.id, "messages": new_session.messages}
            ) + "]"

    return Response(stream_with_context(generate()), content_type="text/markdown")

@app.route("/revise/<int:session_id>", methods=["POST"])
def revise(session_id):
    data = request.json
    revision = data.get("revision")
    if not revision:
        return jsonify({"error": "Missing revision request"}), 400
    
    record = db.session.get(SessionModel, session_id)
    if not record:
        return jsonify({"error": "Session not found"}), 404
    
    session = Session(
        name=record.name,
        summary=record.summary,
        transcript=record.transcript,
        messages=list(record.messages),
    )
    
    def generate():
        try:
            yield " "
            for chunk in session.revise(revision):
                yield chunk
        finally:
            record.summary = session.summary
            db.session.commit()
            
    return Response(stream_with_context(generate()), content_type="text/markdown")


# requires session_id, does not require user_id, returns chat response
@app.route("/chat/<int:session_id>", methods=["POST"])
def chat(session_id):
    prompt = request.json.get("message")
    if not prompt:
        return jsonify({"error": "Missing prompt"}), 400

    record = db.session.get(SessionModel, session_id)
    if not record:
        return jsonify({"error": "Session not found"}), 404

    session = Session(
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


# requires session_id, does not require user_id, returns session metadata
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


# requires user_id, does not require session_id, returns session names and ids for user
@app.route("/get_sessions/<int:user_id>", methods=["GET"])
def get_sessions(user_id):
    user = db.session.get(UserModel, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    session_list = [
        {"id": session.id, "name": session.name, "creator_id": session.creator_id} for session in user.sessions
    ]
    return jsonify(session_list)


@app.route("/get_all_sessions", methods=["GET"])
def get_all_sessions():
    sessions = SessionModel.query.all()
    session_list = [{"id": session.id, "name": session.name} for session in sessions]
    return jsonify(session_list)


# requires session_id, does not require user_id
@app.route("/delete_session/<int:session_id>", methods=["DELETE"])
def delete_session(session_id):
    session = db.session.get(SessionModel, session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    db.session.delete(session)
    db.session.commit()
    return jsonify({"message": "Session deleted"}), 200


@app.route("/rename_session/<int:session_id>", methods=["PUT"])
def rename_session(session_id):
    data = request.json
    new_name = data.get("name")
    if not new_name:
        return jsonify({"error": "Missing new name"}), 400
    
    session = db.session.get(SessionModel, session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    session.name = new_name
    db.session.commit()
    return jsonify({"message": "Session renamed"}), 200


with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
