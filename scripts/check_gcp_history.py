import sqlite3
import shutil
import datetime

src = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\History"
dst = r"C:\Users\shriyansh chandrakar\AppData\Local\Temp\History_p1_today.db"
shutil.copyfile(src, dst)
conn = sqlite3.connect(dst)
c = conn.cursor()
c.execute("""
    SELECT url, title, last_visit_time 
    FROM urls 
    ORDER BY last_visit_time DESC LIMIT 100
""")
print("Recent visits in Profile 1:")
for r in c.fetchall():
    t = r[2]
    dt = datetime.datetime(1601, 1, 1) + datetime.timedelta(microseconds=t)
    if "2026-09-27" in str(dt):
        print(f"{dt} | {r[0]} | {r[1]}")
