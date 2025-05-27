import os
from openai import AzureOpenAI
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ------------ API CLIENTS ------------ #
openai_gpt4o_api_key = os.getenv("OPENAI_GPT4O_API_KEY")

if not openai_gpt4o_api_key:
    raise EnvironmentError(
        "Missing required environment variables: OPENAI_GPT4O_API_KEY"
    )

gpt4o_client = OpenAI(
    api_key=openai_gpt4o_api_key
)

__all__ = ["gpt4o_client"]