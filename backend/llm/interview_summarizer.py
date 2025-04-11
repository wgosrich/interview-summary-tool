import os
from openai import AzureOpenAI
from dotenv import load_dotenv
from docx import Document
from pydub import AudioSegment
from pydub.utils import make_chunks

load_dotenv()

# ------------ INTERVIEW SUMMARIZER ------------ #


class InterviewSummarizer:
    def __init__(self, gpt_client, whisper_client):
        self.gpt_client = gpt_client
        self.whisper_client = whisper_client

    def summarize(self, transcript_path: str, recording_path: str):
        # confirm file types
        assert transcript_path.lower().endswith(
            ".docx"
        ), "Transcript file must be a .docx file."
        assert recording_path.lower().endswith(
            ".mp4"
        ), "Recording file must be a .mp4 file."

        # parse transcript and recording
        print("Parsing transcript...")
        transcript = self.parse_transcript(transcript_path)
        print("Transcribing recording...")
        recording_transcription = self.parse_recording(recording_path)

        # align transcripts
        print("Aligning transcripts...")
        aligned_transcript = self.align_transcripts(transcript, recording_transcription)

        # generate summary
        print("Generating summary...")
        for chunk in self.generate_summary(aligned_transcript):
            yield chunk

    def parse_transcript(self, docx_file: str) -> str:
        """Extract text from a DOCX transcript and return as a single string."""

        document = Document(docx_file)
        transcript = []

        for paragraph in document.paragraphs:
            text = paragraph.text.strip()
            if text:
                transcript.append(text)

        transcription = "\n".join(transcript)

        return transcription

    def parse_recording(self, recording_path: str) -> str:
        """Transcribe the audio recording using Whisper and return the transcription."""
        # Check file size and chunk if necessary
        file_size_mb = os.path.getsize(recording_path) / (1024 * 1024)
        max_size_mb = 25

        if file_size_mb > max_size_mb:
            print(
                f"File size is {file_size_mb:.2f} MB, exceeding {max_size_mb} MB. Chunking audio..."
            )

            audio = AudioSegment.from_file(recording_path)
            chunk_length_ms = 5 * 60 * 1000  # 5 minutes per chunk
            chunks = make_chunks(audio, chunk_length_ms)

            formatted_transcription = []
            cumulative_offset = 0  # To track the overall timeline

            for i, chunk in enumerate(chunks):
                chunk_path = f"chunk_{i}.mp4"
                chunk.export(chunk_path, format="mp4")

                with open(chunk_path, "rb") as audio_file:
                    response = self.whisper_client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="verbose_json",
                        timestamp_granularities=["segment"],
                    )

                for segment in response.segments:
                    start_time = cumulative_offset + segment.start
                    end_time = cumulative_offset + segment.end
                    text = segment.text.strip()

                    # Format time as HH:MM:SS
                    start_time_formatted = f"{int(start_time // 3600):02}:{int((start_time % 3600) // 60):02}:{int(start_time % 60):02}"
                    end_time_formatted = f"{int(end_time // 3600):02}:{int((end_time % 3600) // 60):02}:{int(end_time % 60):02}"

                    formatted_transcription.append(
                        f"[{start_time_formatted} - {end_time_formatted}] {text}"
                    )

                cumulative_offset += chunk_length_ms / 1000  # Update offset in seconds
                os.remove(chunk_path)  # Clean up temporary chunk file
        else:
            with open(recording_path, "rb") as audio_file:
                response = self.whisper_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json",
                    timestamp_granularities=["segment"],
                )

            formatted_transcription = []
            for segment in response.segments:
                start_time = f"{segment.start:.2f}"
                end_time = f"{segment.end:.2f}"
                text = segment.text.strip()
                formatted_transcription.append(f"[{start_time} - {end_time}] {text}")

        transcription = "\n".join(formatted_transcription)

        return transcription

    def align_transcripts(self, vtt_transcript: str, whisper_transcript: str) -> str:
        """Use GPT-4 to align and merge transcripts while keeping timestamps."""
        prompt = (
            "You are a helpful assistant. Your task is to align and merge two transcripts "
            "from an interview. The first transcript is from a VTT file, and the second "
            "is from an audio recording. Please ensure that the timestamps are preserved. "
            "Here are the transcripts:\n\n"
            f"VTT Transcript:\n{vtt_transcript}\n\n"
            f"Whisper Transcript:\n{whisper_transcript}\n\n"
            "Please provide the aligned and merged transcript."
        )

        # Call the GPT-4 model to align and merge the transcripts
        response = self.gpt_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.choices[0].message.content

        return content

    def generate_summary(self, aligned_transcript: str):
        prompt = f"""
        You are an AI assistant helping to summarize interview transcripts for a civil rights investigation.

        Your task is to generate a comprehensive, detailed, and structured third-person narrative summary of the transcript below, following these guidelines:

        - The summary should begin with a **title** that includes the interviewee's name (e.g., "Summary of Interview with [Interviewee's Name]").
        - Use a **standard format** for each summary, starting with the title, followed by a brief introductory sentence, and then the detailed narrative.
        - The narrative should be organized into **sections** that capture different themes or topics discussed during the interview.
        - Each section should be clearly labeled with a **heading** that summarizes the main topic of that section.
        - The summary should capture **everything that transpired according to the interviewee**, providing a full account of their perspective and experiences.
        - Do **not** mention the investigator or interviewer.
        - Do **not** use first-person language.
        - The summary must be written entirely in **third person**, focusing solely on the interviewee's account.
        - There is no need to specify that the interviewee is the one saying the words; just present the information as a narrative.
        - Avoid editorializing or drawing conclusions not supported directly by the transcript.
        - Include **timestamps** in brackets like [hh:mm:ss] to cite when important details were mentioned.
        - Organize the summary into **short, informative paragraphs** or clear sections to improve readability.
        - Ensure the summary is comprehensive, leaving no significant detail or event unmentioned.
        - Only generate the summary; avoid any unnecessary leading or trailing sentences.

        Transcript:
        {aligned_transcript}
        """

        # Call the GPT-4 model to generate the summary in a streaming manner
        response = self.gpt_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            stream=True,  # Enable streaming
        )

        summary = ""
        for chunk in response:
            if not chunk or not hasattr(chunk, "choices") or len(chunk.choices) == 0:
                continue  # skip invalid or empty chunks

            delta = getattr(chunk.choices[0].delta, "content", "") or ""
            summary += delta
            yield delta


# --------------------- TESTING --------------------- #

# if __name__ == "__main__":
#     base_path = "test_set/files/"
#     num_examples = 6
#     summarizer = InterviewSummarizer(gpt4o_client, whisper_client)

#     summaries = []

#     for i in range(num_examples):
#         print(f"Processing interview {i}...")
#         transcript = os.path.join(base_path, f"transcript_{i}.docx")
#         recording = os.path.join(base_path, f"recording_{i}.mp4")

#         summary = summarizer.summarize(
#             transcript_path=transcript, recording_path=recording, debug=False
#         )
#         summaries.append(summary)

#     # Save summaries to files
#     for i, summary in enumerate(summaries):
#         with open(f"test_set/results/summary_{i}.txt", "w") as f:
#             f.write(summary)
