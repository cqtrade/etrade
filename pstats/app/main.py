from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from pytz import utc
from message import send_message
from envvars import evars
from cc import cc

scheduler = BlockingScheduler(timezone=utc)

def function_a():
    send_message.discord("Function A executed")
    print("Function A executed")

def function_b():
    print("Function B executed")

print("Scheduler starting")

# if os.getenv('STATS_ENABLED'):
#     # Schedule function_a to run every minute
#     scheduler.add_job(function_a, IntervalTrigger(minutes=1))

#     # Schedule function_b to run at 10:00 UTC and 22:00 UTC
#     scheduler.add_job(function_b, CronTrigger(hour='10,22', minute=0, second=0, timezone=utc))
#     scheduler.start()

# # Schedule function_a to run every minute
# scheduler.add_job(function_a, IntervalTrigger(minutes=1))
# # Schedule function_b to run at 10:00 UTC and 22:00 UTC
# scheduler.add_job(function_b, CronTrigger(hour='10,22', minute=0, second=0, timezone=utc))
# scheduler.start()

print(evars.envdict['stats_enabled'])
print(evars.envdict['discord_channel'])

print(cc.get_stats())
