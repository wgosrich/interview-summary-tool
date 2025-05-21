import os
from dotenv import load_dotenv
from docx import Document
from pydub import AudioSegment # incomptabile with azure web app
from pydub.utils import make_chunks # incomptabile with azure web app
from myflaskapp.llm.llm_clients import gpt4o_client
import PyPDF2
import re

load_dotenv()

# ------------ INTERVIEW SUMMARIZER FUNCTIONS ------------ #

def summarize(transcript_path: str, recording_path: str):
    # confirm file types
    assert transcript_path.lower().endswith(
        ".docx"
    ), "Transcript file must be a .docx file."
    assert recording_path.lower().endswith(
        ".mp4"
    ), "Recording file must be a .mp4 file."

    # parse transcript and recording
    print("Parsing transcript...")
    transcript = parse_transcript(transcript_path)
    print("Transcribing recording...")
    recording_transcription = parse_recording(recording_path)

    # align transcripts
    print("Aligning transcripts...")
    aligned_transcript = align_transcripts(
        transcript, recording_transcription
    )

    # generate summary
    print("Generating summary...")
    for chunk in generate_summary(aligned_transcript):
        yield chunk

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

def parse_recording(recording_path: str) -> str:
    """Transcribe the audio recording using gpt-4o-transcribe and return the transcription."""
    # Check file size and chunk if necessary
    file_size_mb = os.path.getsize(recording_path) / (1024 * 1024)
    max_size_mb = 25
    transcription = ""

    if file_size_mb > max_size_mb:
        print(
            f"File size is {file_size_mb:.2f} MB, exceeding {max_size_mb} MB. Chunking audio..."
        )

        audio = AudioSegment.from_file(recording_path)
        chunk_length_ms = 10 * 60 * 1000  # 10 minutes per chunk
        chunks = []
        for start in range(0, len(audio), chunk_length_ms):
            chunks.append(audio[start:start + chunk_length_ms])

        for i, chunk in enumerate(chunks):
            chunk_path = f"chunk_{i}.mp3"
            chunk.export(chunk_path, format="mp3")
            try:
                with open(chunk_path, "rb") as audio_file:
                    response = gpt4o_client.audio.transcriptions.create(
                        model="gpt-4o-transcribe",
                        file=audio_file,
                        response_format="text",
                    )
                os.remove(chunk_path)
                transcription += response
            except Exception as e:
                print(f"Error transcribing chunk {i}: {e}")
                continue
    else:
        with open(recording_path, "rb") as audio_file:
            response = gpt4o_client.audio.transcriptions.create(
                model="gpt-4o-transcribe",
                file=audio_file,
                response_format="text",
            )
        transcription = response

    return transcription


def align_transcripts(teams_transcript: str, llm_transcript: str) -> str:
    """Use GPT-4o to align and merge transcripts while keeping timestamps."""
    prompt = f"""
    You are a helpful assistant tasked with refining an interview transcript by using two versions of the same interview:

    1. The Teams Transcript, which contains accurate timestamps and should serve as the primary source for both structure and content.
    2. The LLM-generated Transcript, which has higher transcription quality, does not have timestamps.

    Your objective is to enhance the Teams transcript using the gpt-4o-transcribe transcript while following these strict rules:

    TIMESTAMPS
    - Preserve all timestamps from the Teams transcript. These are considered more reliable.
    - If the LLM-generated transcript contains dialogue not captured in the Teams version, integrate that content at the appropriate timestamp from the Teams transcript, estimating placement based on context—but never invent timestamps.

    CONTENT
    - All final transcript content must originate from and be traceable to the Teams transcript.
    - Use the LLM-generated transcript only to clarify or fill in gaps in the Teams version—such as correcting misheard phrases, completing truncated sentences, or adding missing words.
    - Never introduce content from the LLM-generated transcript that cannot be matched to something from the Teams transcript.
    - If any of the interviewee, interview date, or duration information is not found in either transcript, simply write "N/A" for that field. ONLY DO THIS IF THE INFORMATION IS NOT PRESENT IN EITHER TRANSCRIPT.

    FORMATTING
    - The output should exactly match this format:
      **Interviewee: [Interviewee's Name]**
      **Interview Date: [Interview Date]**
      **Duration: [Interview Duration]**

      **[Speaker Name] [hh:mm:ss]:**
      [Text spoken by that speaker]

    - Do not include any additional commentary, headings, or section breaks.
    - Do not include any extra asterisks or other formatting as this will be parsed as markdown and messes up the formatting.
    - Do not include any opening or closing remarks not found in the original content.
    - Do not add quotation marks around any lines.
    - All timestamps should be formatted as [hh:mm:ss] and placed next to speaker names, bolded.
    - Leave a blank line between each speaker's turn.

    Use the Teams transcript as the authoritative source and the LLM-generated transcript only to correct or complete it. Do not merge or paraphrase across both transcripts in a way that loses the structure of the Teams version.

    Return only the final formatted transcript, with no leading or trailing explanation.

    Teams Transcript:
    {teams_transcript}

    LLM-generated Transcript:
    {llm_transcript}
    """

    # Call the GPT-4 model to align and merge the transcripts
    response = gpt4o_client.chat.completions.create(
        model="gpt-4o",
        max_tokens=16384,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.choices[0].message.content

    return content


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