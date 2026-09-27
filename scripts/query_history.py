import sqlite3
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8')

src = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\History"
dst = r"C:\Users\shriyansh chandrakar\AppData\Local\Temp\History_copy.db"

shutil.copyfile(src, dst)
conn = sqlite3.connect(dst)
c = conn.cursor()

c.execute("SELECT url, title, visit_count FROM urls WHERE url LIKE '%analytics.google.com%' OR url LIKE '%console.cloud.google.com%' OR url LIKE '%jandarpan%' OR url LIKE '%durg%' OR url LIKE '%solar%' OR url LIKE '%stratxcel%' ORDER BY last_visit_time DESC LIMIT 100")
for row in c.fetchall():
    print(f"URL: {row[0]}")
    print(f"TITLE: {row[1]}")
    print(f"VISITS: {row[2]}")
    print("-" * 40)
