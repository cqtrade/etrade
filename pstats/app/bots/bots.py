from message import send_message
from envvars import evars
from foolsgold import b

def fgold():
    try:
        api_key = evars.envdict['foolsgold_key']
        api_secret = evars.envdict['foolsgold_secret']
        clogger = send_message.discord_flash
        symbols = (evars.envdict['foolsgold_symbols']
                   if evars.envdict['foolsgold_symbols']
                   else "BTCUSDT,SOLUSDT,SUIUSDT,ETHUSDT,LTUSDT")
        b.bootstrap(api_key, api_secret, clogger, symbols)
        print("fgold OK")
    except Exception as e:
        print(e)
        print(str(e))
        send_message.discord_flash(f"ERROR Foolsgold {str(e)}")
