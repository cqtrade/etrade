import requests
import os


def discord(message):
    webhook_url = os.getenv('P_DISCORD_STATS')
    data = {
        "content": message
    }
    response = requests.post(webhook_url, json=data)
    if response.status_code == 204:
        print("Message sent successfully")
    else:
        print("Failed to send message", message)
        print(response.text)
