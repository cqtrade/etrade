import os

print(os.environ.get('P_STATS_ENABLED'))
# print(os.environ.get('P_DISCORD_STATS'))

envdict = {
    "stats_enabled": bool(os.environ.get('P_STATS_ENABLED')),
    "discord_channel": os.environ.get('P_DISCORD_STATS'),
    "foolsgold": bool(os.environ.get('FOOLSGOLD')),
    "foolsgold_key": os.environ.get('FOOLSGOLD_KEY'),
    "foolsgold_secret": os.environ.get('FOOLSGOLD_SECRET'),
    "foolsgold_symbols": os.environ.get('FOOLSGOLD_SYMBOLS'),
}
