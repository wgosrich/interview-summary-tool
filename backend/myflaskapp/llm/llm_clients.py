import os
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv()

# ------------ API CLIENTS ------------ #
api_key = os.getenv("AZURE_OPENAI_API_KEY")
gpt_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT_GPT4O")
whisper_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT_WHISPER")
if not api_key or not gpt_endpoint or not whisper_endpoint:
    raise EnvironmentError(
        "Missing required environment variables: AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT_GPT4O"
    )

gpt4o_client = AzureOpenAI(
    api_key=api_key, api_version="2024-10-21", azure_endpoint=gpt_endpoint
)

whisper_client = AzureOpenAI(
    api_key=api_key, api_version="2024-10-21", azure_endpoint=whisper_endpoint
)

__all__ = ["gpt4o_client", "whisper_client"]