from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from pytz import utc

scheduler = BlockingScheduler(timezone=utc)

def function_a():
    print("Function A executed")

def function_b():
    print("Function B executed")

# Schedule function_a to run every minute
scheduler.add_job(function_a, IntervalTrigger(minutes=1//60))

# Schedule function_b to run at 10:00 UTC and 22:00 UTC
scheduler.add_job(function_b, CronTrigger(hour='10,22', minute=0, second=0, timezone=utc))

scheduler.start()
