import sqlite3
import shutil
import os

user_data = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data"
profiles = ["Default", "Profile 1", "Profile 2", "Profile 3"]

for prof in profiles:
    hist_file = os.path.join(user_data, prof, "History")
    if not os.path.exists(hist_file):
        continue
    temp_hist = os.path.join(r"C:\Users\shriyansh chandrakar\AppData\Local\Temp", f"Hist_{prof.replace(' ', '_')}.db")
    try:
        shutil.copyfile(hist_file, temp_hist)
        conn = sqlite3.connect(temp_hist)
        c = conn.cursor()
        for term in ["silverwest", "superbiz", "jan-daarpan", "502200355392", "branding"]:
            c.execute(
                "SELECT url, title, datetime(last_visit_time/1000000-11644473600, 'unixepoch') FROM urls WHERE url LIKE ? OR title LIKE ? ORDER BY last_visit_time DESC LIMIT 10",
                (f"%{term}%", f"%{term}%")
            )
            rows = c.fetchall()
            if rows:
                print(f"=== Profile: {prof} | Term: {term} ({len(rows)} matches) ===")
                for r in rows:
                    print("  URL:", r[0][:120])
                    print("  TITLE:", r[1])
                    print("  TIME:", r[2])
        conn.close()
    except Exception as e:
        print(f"Error on {prof}: {e}")
