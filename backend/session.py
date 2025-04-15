from llm.interview_summarizer import InterviewSummarizer as IS
from llm.chat import Chat

class Session:
    
    def __init__(self, id, name="Untitled", summary="", transcript="", messages=[]):
        self.id = id
        self.name = name
        self.summary = summary
        self.transcript = transcript
        self.messages = messages
        
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
        for chunk in IS.generate_summary(aligned_transcript):
            # add summary to chat
            self.summary += chunk
            yield chunk
            
        self.messages.append({"role": "assistant", "content": f'Initial Summary: {self.summary}'})
        self.name = IS.generate_title(self.summary)
        
    def prompt_chat(self, prompt: str):
        # add user message to conversation
        self.messages.append({"role": "user", "content": prompt})
        # get response in a streaming manner
        response = ""
        for chunk in Chat.stream_response(self.messages):
            # add assistant message to conversation
            response += chunk
            yield chunk
        # add final response to conversation
        self.messages.append({"role": "user", "content": response})