from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
from summarizer.interview_summarizer import InterviewSummarizer, gpt4o_client, whisper_client

app = Flask(__name__)
CORS(app)  # Enable CORS so Next.js frontend can talk to Flask

summarizer = InterviewSummarizer(gpt4o_client, whisper_client)

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
            for chunk in summarizer.summarize(transcript_path, recording_path):
                yield chunk
        finally:
            os.remove(transcript_path)
            os.remove(recording_path)

    return Response(stream_with_context(generate()), content_type='text/plain')

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=8000)