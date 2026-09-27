import sqlite3

conn = sqlite3.connect(r"C:\Users\shriyansh chandrakar\AppData\Local\Temp\History_copy.db")
c = conn.cursor()

c.execute("SELECT url, title FROM urls WHERE url LIKE '%G-0R73Y87TQD%' OR url LIKE '%G-7JG6LL07NE%' OR title LIKE '%G-%' OR url LIKE '%stream%'")
rows = c.fetchall()
print(f"Found {len(rows)} rows:")
for r in rows:
    print(r)
