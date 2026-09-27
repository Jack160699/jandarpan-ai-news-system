import sqlite3

conn = sqlite3.connect(r"C:\Users\shriyansh chandrakar\AppData\Local\Temp\History_copy.db")
c = conn.cursor()

c.execute("SELECT url, title, datetime(last_visit_time/1000000-11644473600, 'unixepoch') as visit_date FROM urls WHERE url LIKE '%554621476%' OR url LIKE '%538010450%' ORDER BY last_visit_time DESC")
for row in c.fetchall():
    print(f"DATE: {row[2]}")
    print(f"URL: {row[0]}")
    print(f"TITLE: {row[1]}")
    print("-" * 50)
