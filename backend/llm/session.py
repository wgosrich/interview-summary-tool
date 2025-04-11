from .llm_clients import gpt4o_client, whisper_client
from .interview_summarizer import InterviewSummarizer
from .chat import Chat

class Session:
    
    def __init__(self):
        self.gpt_client = gpt4o_client
        self.whisper_client = whisper_client
        self.chat = Chat(self.gpt_client)
        self.summarizer = InterviewSummarizer(self.gpt_client, self.whisper_client)
        
        self.summary = ""
        self.transcript = ""
        
    def summarize(self, transcript: str, recording: str):
        assert transcript.lower().endswith(
            ".docx"
        ), "Transcript file must be a .docx file."
        assert recording.lower().endswith(
            ".mp4"
        ), "Recording file must be a .mp4 file."

        # parse transcript and recording
        print("Parsing transcript...")
        og_transcript = self.summarizer.parse_transcript(transcript)
        print("Transcribing recording...")
        whisper_transcript = self.summarizer.parse_recording(recording)

        # align transcripts
        print("Aligning transcripts...")
        aligned_transcript = self.summarizer.align_transcripts(og_transcript, whisper_transcript)
        self.transcript = aligned_transcript
        self.chat.add_message("user", f"Transcript: {aligned_transcript}")
        
        # generate summary
        print("Generating summary...")
        self.chat.add_stream_message("assistant", "Initial summary: ")
        for chunk in self.summarizer.generate_summary(aligned_transcript):
            # add summary to chat
            self.chat.add_stream_message("assistant", chunk)
            self.summary += chunk
            yield chunk
        
    def prompt_chat(self, prompt: str):
        # add user message to conversation
        self.chat.add_message("user", prompt)
        # get response in a streaming manner
        for chunk in self.chat.stream_response():
            # add assistant message to conversation
            self.chat.add_stream_message("assistant", chunk)
            yield chunk
    