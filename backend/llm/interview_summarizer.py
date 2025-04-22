import os
from dotenv import load_dotenv
from docx import Document
from pydub import AudioSegment
from pydub.utils import make_chunks
from .llm_clients import gpt4o_client, whisper_client
import PyPDF2

load_dotenv()

# ------------ INTERVIEW SUMMARIZER ------------ #


class InterviewSummarizer:
    @staticmethod
    def summarize(transcript_path: str, recording_path: str):
        # confirm file types
        assert transcript_path.lower().tendswith(
            ".docx"
        ), "Transcript file must be a .docx file."
        assert recording_path.lower().endswith(
            ".mp4"
        ), "Recording file must be a .mp4 file."

        # parse transcript and recording
        print("Parsing transcript...")
        transcript = InterviewSummarizer.parse_transcript(transcript_path)
        print("Transcribing recording...")
        recording_transcription = InterviewSummarizer.parse_recording(recording_path)

        # align transcripts
        print("Aligning transcripts...")
        aligned_transcript = InterviewSummarizer.align_transcripts(
            transcript, recording_transcription
        )

        # generate summary
        print("Generating summary...")
        for chunk in InterviewSummarizer.generate_summary(aligned_transcript):
            yield chunk

    @staticmethod
    def parse_transcript(docx_file: str) -> str:
        """Extract text from a DOCX transcript and return as a single string."""

        document = Document(docx_file)
        transcript = []

        for paragraph in document.paragraphs:
            text = paragraph.text.strip()
            if text:
                transcript.append(text)

        transcription = "\n".join(transcript)

        return transcription

    @staticmethod
    def parse_recording(recording_path: str) -> str:
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
                    response = whisper_client.audio.transcriptions.create(
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
                response = whisper_client.audio.transcriptions.create(
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

    @staticmethod
    def align_transcripts(vtt_transcript: str, whisper_transcript: str) -> str:
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
        response = gpt4o_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.choices[0].message.content

        return content

    @staticmethod
    def generate_summary(aligned_transcript: str, additional_context: str = ""):
        prompt = f"""
        You are an AI assistant helping to summarize interview transcripts for a civil rights investigation.

        Your task is to generate a comprehensive, detailed, and structured third-person narrative summary of the transcript below, following these guidelines:

        - The priority is to capture the most important information from the interview, but use the additional context to help with this.
        - It is important to note that you are not summarizing the additional context, only the transcript and how it relates to the additional context if needed.
        - The summary should begin with a **title** that includes the interviewee's name (e.g., "Interview with [Interviewee's Name]"). This should be in heading level 1 format.
        - Use a **standard format** for each summary, starting with the title, followed by a brief introductory sentence, and then the detailed narrative.
        - The narrative should be organized into **sections** that capture different themes or topics discussed during the interview.
        - Each section should be clearly labeled with a **heading** that summarizes the main topic of that section. This should be in heading level 2 format.
        - Separate sections with an extra newline for clarity, DO NOT ADD DIVIDERS.
        - The summary should capture **everything that transpired according to the interviewee**, providing a full account of their perspective and experiences.
        - Present only the **facts and details learned during the interview**, omitting any mention of the interviewee.
        - Do **not** include phrases like "the interviewee said," "reported," "affirmed," "described," or any variation of those. Simply state the facts as directly as possible.
        - Do **not** mention the investigator or interviewer.
        - There is no need to specify that the interviewee is the one saying the words; just present the information as detached events with no storyteller.
        - Avoid all first-person and third-person attribution. The summary must read as an objective report of discovered facts.
        - Avoid editorializing or drawing conclusions not supported directly by the transcript.
        - Include **timestamps** in brackets like [hh:mm:ss] to cite when important details were mentioned.
        - If using the additional context, make sure to cite the page number and filename of the context that is relevant to the transcript like [Page 1: Context from [filename].pdf].
        - Organize the summary into **short, informative paragraphs** or clear sections to improve readability.
        - Ensure the summary is comprehensive, leaving no significant detail or event unmentioned.
        - Only generate the summary; avoid any unnecessary leading or trailing sentences.

        Transcript:
        {aligned_transcript}
        
        Additional Context:
        {additional_context if additional_context != "" else "None provided."}
        """

        # Call the GPT-4 model to generate the summary in a streaming manner
        response = gpt4o_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": prompt}],
            stream=True,  # Enable streaming
        )

        for chunk in response:
            if not chunk or not hasattr(chunk, "choices") or len(chunk.choices) == 0:
                continue  # skip invalid or empty chunks

            delta = getattr(chunk.choices[0].delta, "content", "") or ""
            yield delta

    @staticmethod
    def generate_title(summary: str):
        prompt = f"""
        You are an AI assistant helping to summarize interview transcripts for a civil rights investigation.
        Your task is to generate a title detailing the name of the interviewee for the following summary:
        {summary}
        The title should be a string that is formatted with the [Docket Number]: ["Interviewee Name"] like the following example:
        "Z1982-098127: John Doe"
        If the docket number is not known, use the following format:
        "UNKNOWN: John Doe"
        If the name of the interviewee is not known, use the following format:
        "Z1982-098127: UNKNOWN"
        Do not include any other names mentioned apart from the interviewee's name. Do not include any quotation marks in the title.
        """

        # Call the GPT-4 model to generate the title
        response = gpt4o_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.choices[0].message.content

        return content

    @staticmethod
    def initial_greeting():
        prompt = f"""
        You are an AI assistant helping to summarize interview transcripts 
        and assist investigators in identifying key insights for a civil rights
        investigation. Your task is to generate a greeting message for the user.
        The message should be concise and welcoming, setting the tone for the conversation. 
        Try to limit the message to 1 sentence as it shouldn't be too much for the user to read.
        """

        # Call the GPT-4 model to generate the greeting
        response = gpt4o_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.choices[0].message.content

        return content

    @staticmethod
    def generate_revision(messages: list):

        # Call the GPT-4 model to generate the revised summary
        response = gpt4o_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            stream=True,  # Enable streaming
        )

        for chunk in response:
            if not chunk or not hasattr(chunk, "choices") or len(chunk.choices) == 0:
                continue  # skip invalid or empty chunks

            delta = getattr(chunk.choices[0].delta, "content", "") or ""
            yield delta

    @staticmethod
    def parse_additional_context(pdf_filepaths: list[str]) -> str:
        """
        Extract text from a list of PDF files and concatenate the content into a single string.
        
        Args:
            pdf_filepaths (list[str]): List of paths to PDF files
            
        Returns:
            str: Concatenated text content from all PDFs
        """
        all_content = []
        
        for filepath in pdf_filepaths:
            if not filepath.lower().endswith('.pdf'):
                print(f"Warning: {filepath} is not a PDF file. Skipping.")
                continue
                
            try:
                content = []
                with open(filepath, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    
                    # Add filename as a header for context
                    filename = os.path.basename(filepath)
                    content.append(f"Content from {filename}:")
                    
                    # Extract text from each page
                    for page_num in range(len(pdf_reader.pages)):
                        page = pdf_reader.pages[page_num]
                        text = page.extract_text()
                        if text:
                            content.append(f"[Page {page_num + 1}] {text}")
                
                all_content.append("\n".join(content))
                
            except Exception as e:
                print(f"Error processing {filepath}: {str(e)}")
                
        # Combine all content with clear separators
        combined_content = "\n\n" + "-" * 40 + "\n\n".join(all_content)
        
        return combined_content
