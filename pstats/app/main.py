from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from pytz import utc
from message import send_message
from envvars import evars
from cc import cc

if not evars.envdict['stats_enabled']:
    print("Stats not enabled")
    exit()

send_message.discord("Starting stats bot ...")

scheduler = BlockingScheduler(timezone=utc)

def futures_premium():
    send_message.discord(cc.get_stats().to_markdown())

# def function_b():
#     print("Function B executed")


# scheduler.add_job(function_a, IntervalTrigger(minutes=35))

scheduler.add_job(futures_premium, IntervalTrigger(minutes=5))

# scheduler.add_job(futures_premium, CronTrigger(hour='6,18', minute=33, second=33, timezone=utc))



send_message.discord("Started stats bot!")

send_message.discord(cc.get_stats().to_markdown())

print("Starting scheduler")

scheduler.start()
