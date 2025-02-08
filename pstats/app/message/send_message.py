import requests
from envvars import evars

def discord(message):
    webhook_url = evars.envdict['discord_channel']
    data = {
        "content": message
    }
    response = requests.post(webhook_url, json=data)
    if response.status_code == 204:
        print("Message sent successfully")
    else:
        print("Failed to send message", message)
        print(response.text)

def discord_flash(message):
    webhook_url = evars.envdict['discord_channel_flash']
    data = {
        "content": message
    }
    response = requests.post(webhook_url, json=data)
    if response.status_code == 204:
        print("Message sent successfully")
    else:
        print("Failed to send message", message)
        print(response.text)
