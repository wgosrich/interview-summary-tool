from llm.interview_summarizer import InterviewSummarizer as IS
from llm.chat import Chat


class Session:

    def __init__(self, name="Untitled", summary="", transcript="", messages=None):
        self.name = name
        self.summary = summary
        self.transcript = transcript
        self.messages = list(messages) if messages else []

    def summarize(self, transcript: str, recording: str):
        assert transcript.lower().endswith(
            ".docx"
        ), "Transcript file must be a .docx file."
        assert recording.lower().endswith(".mp4"), "Recording file must be a .mp4 file."

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
        self.messages.append(
            {"role": "system", "content": f"Transcript: {aligned_transcript}"}
        )

        # generate summary
        print("Generating summary...")
        for chunk in IS.generate_summary(aligned_transcript):
            # add summary to chat
            self.summary += chunk
            yield chunk

        self.messages.append(
            {"role": "system", "content": f"Initial Summary: {self.summary}"}
        )
        self.name = IS.generate_title(self.summary)

        # initial message
        greeting = IS.initial_greeting()
        self.messages.append({"role": "assistant", "content": greeting})

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
        self.messages.append({"role": "assistant", "content": response})

    def revise(self, request: str):
        # initial system prompt, summary, and transcript
        system_messages = self.messages[:3]
        # most recent summary
        system_messages.append(
            {"role": "system", "content": f"Most Recent Summary: {self.summary}"}
        )
        # revision system prompt
        system_messages.append(
            {
                "role": "system",
                "content": """Your task is to revise an interview summary based on the user's request and the most recent summary. 

                                You have access to:
                                1. The original summary guidelines
                                2. The complete transcript of the interview
                                3. The original version of the summary
                                4. The most recent version of the summary
                                5. The user's specific revision request

                                Guidelines for revision:
                                - Always begin with the title "# Interview with [interviewee's name]" as heading level 1
                                - Use heading level 2 (##) for all section headers within the summary
                                - Format the entire summary using proper markdown syntax
                                - Maintain the professional tone and factual accuracy of the original
                                - Implement the user's requested changes while ensuring the summary remains coherent and comprehensive
                                - Focus on capturing the most important information from the interview
                                - Organize content logically with clear section breaks
                                - Make sure the summary remains an accurate reflection of the interview content

                                Do not include any leading text, explanatory notes, or metadata. Provide only the revised summary starting with the title.
                                """,
            }
        )

        # revision request
        system_messages.append(
            {
                "role": "user",
                "content": f"Can you make these revisions to the summary: {request}",
            }
        )
        self.summary = ""
        for chunk in IS.generate_revision(system_messages):
            # add revision to chat
            self.summary += chunk
            yield chunk
