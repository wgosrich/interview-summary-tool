import os
from openai import AzureOpenAI
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ------------ API CLIENTS ------------ #
# openai_direct=False
# if openai_direct:
#     openai_gpt4o_api_key = os.getenv("OPENAI_GPT4O_API_KEY")

#     if not openai_gpt4o_api_key:
#         raise EnvironmentError(
#             "Missing required environment variables: OPENAI_GPT4O_API_KEY"
#         )

#     gpt4o_client = OpenAI(
#         api_key=openai_gpt4o_api_key
#     )

#     __all__ = ["gpt4o_client"]

azure = True
if azure:
    azure_api_key = os.getenv("AZURE_OPENAI_API_KEY")
    azure_api_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")

    if not azure_api_key or not azure_api_endpoint:
        raise EnvironmentError(
            "Missing required environment variables: AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT"
        )
    
    az_client = AzureOpenAI(
        api_key=azure_api_key,
        api_version="2024-02-01",
        azure_endpoint=azure_api_endpoint
    )

    __all__ = ["az_client"]
