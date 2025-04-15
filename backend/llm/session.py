from .llm_clients import gpt4o_client, whisper_client
from .interview_summarizer import InterviewSummarizer as IS
from .chat import Chat

class Session:
    
    def __init__(self, id):
        self.id = id
        self.summary = ""
        self.transcript = ""
        self.messages = []
        
    def summarize(self, transcript: str, recording: str):
        assert transcript.lower().endswith(
            ".docx"
        ), "Transcript file must be a .docx file."
        assert recording.lower().endswith(
            ".mp4"
        ), "Recording file must be a .mp4 file."

        # parse transcript and recording
        print("Parsing transcript...")
        og_transcript = IS.parse_transcript(transcript)
        print("Transcribing recording...")
        whisper_transcript = IS.parse_recording(recording)

        # align transcripts
        print("Aligning transcripts...")
        aligned_transcript = IS.align_transcripts(og_transcript, whisper_transcript)
        self.transcript = aligned_transcript
        
        
        self.messages.append({"role": "system", "content": Chat.PROMPT})
        self.messages.append({"role": "user", "content": f"Transcript: {aligned_transcript}"})
        
        # generate summary
        print("Generating summary...")
        self.messages.append({"role": "assistant", "content": "Initial Summary:"})
        for chunk in IS.generate_summary(aligned_transcript):
            # add summary to chat
            self.messages[-1]["content"] += chunk
            self.summary += chunk
            yield chunk
        
    def prompt_chat(self, prompt: str):
        # add user message to conversation
        self.messages.append({"role": "user", "content": prompt})
        # get response in a streaming manner
        for chunk in Chat.stream_response(self.messages):
            # add assistant message to conversation
            if self.messages and self.messages[-1]["role"] == "assistant":
                self.messages[-1]["content"] += chunk
            else:
                self.messages.append({"role": "assistant", "content": chunk})
            yield chunk
    