import sqlite3
import shutil
import os

src = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\History"
dst = r"C:\Users\shriyansh chandrakar\AppData\Local\Temp\History_silverwest.db"
shutil.copyfile(src, dst)
conn = sqlite3.connect(dst)
c = conn.cursor()
c.execute("SELECT url, title, last_visit_time FROM urls WHERE url LIKE '%silverwest%' OR title LIKE '%silverwest%' ORDER BY last_visit_time DESC")
rows = c.fetchall()
print("Matching silverwest in Chrome history:", len(rows))
for r in rows:
    print(r)
