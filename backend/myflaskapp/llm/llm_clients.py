import os
from openai import AzureOpenAI
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ------------ API CLIENTS ------------ #
openai_gpt4o_api_key = os.getenv("OPENAI_GPT4O_API_KEY")
api_key = os.getenv("AZURE_OPENAI_API_KEY")
whisper_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT_WHISPER")

if not api_key or not openai_gpt4o_api_key or not whisper_endpoint:
    raise EnvironmentError(
        "Missing required environment variables: AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT_WHISPER, or OPENAI_GPT4O_API_KEY"
    )

gpt4o_client = OpenAI(
    api_key=openai_gpt4o_api_key
)

whisper_client = AzureOpenAI(
    api_key=api_key, api_version="2024-10-21", azure_endpoint=whisper_endpoint
)

__all__ = ["gpt4o_client", "whisper_client"]