from apscheduler.schedulers.blocking import BlockingScheduler
# from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from pytz import utc
from message import send_message
from envvars import evars
from cc import cc
from fr import fr
from foolsgold import b

if not evars.envdict['stats_enabled']:
    print("Stats not enabled")
    exit()

send_message.discord("Starting stats bot ...")

scheduler = BlockingScheduler(timezone=utc)


def futures_premium():
    send_message.discord(cc.get_stats().to_markdown())


def funding_rates():
    send_message.discord(fr.latest_funding_rate().to_markdown())


scheduler.add_job(futures_premium, CronTrigger(
    hour='6,18', minute=33, second=33, timezone=utc))

scheduler.add_job(funding_rates, CronTrigger(
    hour='6,18', minute=34, second=33, timezone=utc))


def fgold():
    try:
        b.bootstrap()
        send_message.discord("FG bootstrap OK")
    except Exception as e:
        send_message.discord("bootstrap Error", e)
        print(e)


if evars.envdict['foolsgold']:
    scheduler.add_job(fgold, CronTrigger(
        minute=0, second=6, timezone=utc))

futures_premium()
funding_rates()

print("Starting scheduler")

scheduler.start()
