import os

print(os.environ.get('P_STATS_ENABLED'))
print(os.environ.get('P_DISCORD_STATS'))

envdict = {
  "stats_enabled": bool(os.environ.get('P_STATS_ENABLED')),
  "discord_channel": os.environ.get('P_DISCORD_STATS'),
}

