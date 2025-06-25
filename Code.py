import customtkinter as ctk
import tkinter as tk
import threading
import time
import datetime
import uuid
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import random
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

# ---------- CONFIG ----------
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("dark-blue")

GOOGLE_SHEET_NAME = "BKEY"
GOOGLE_SHEET_TAB = "sheet1"

MONTE_CARLO_ROUNDS = 1000000
CONFIDENCE_THRESHOLD = 0.75

# ----------------------------

def get_credentials_path():
    import sys, os
    if getattr(sys, 'frozen', False):
        return os.path.join(sys._MEIPASS, 'noar-sserver-e787e9e2f222.json')
    return 'noar-sserver-e787e9e2f222.json'

def get_hwid():
    return str(uuid.getnode())

def validate_key(sheet, key, hwid):
    data = sheet.get_all_records()
    for i, row in enumerate(data, start=2):
        sheet_key = str(row.get('key', '')).strip()
        sheet_hwid = str(row.get('hwid', '')).strip()
        expire = str(row.get('expire', '')).strip()
        if sheet_key == key:
            if sheet_hwid == "" or sheet_hwid == hwid:
                if sheet_hwid == "":
                    sheet.update_cell(i, 2, hwid)
                if expire.lower() == "lifetime":
                    return True, "Lifetime Key"
                elif expire:
                    try:
                        expire_date = datetime.datetime.strptime(expire, "%Y-%m-%d")
                        now = datetime.datetime.now()
                        if now > expire_date:
                            return False, "Key expired"
                        else:
                            remain = expire_date - now
                            return True, f"Trial Key - {remain.days} days left"
                    except:
                        return True, "Valid Key"
                else:
                    return True, "Valid Key"
            else:
                return False, "HWID mismatch"
    return False, "Invalid Key"

def monte_carlo_simulation(history, rounds=MONTE_CARLO_ROUNDS):
    freq = {'P': 0, 'B': 0, 'T': 0}
    for r in history:
        freq[r] += 1
    total = sum(freq.values())
    probs = {k: v / total for k, v in freq.items()}
    count = {'P':0, 'B':0, 'T':0}
    for _ in range(rounds):
        rand = random.random()
        if rand < probs['P']:
            count['P'] += 1
        elif rand < probs['P'] + probs['B']:
            count['B'] += 1
        else:
            count['T'] += 1
    total_sim = sum(count.values())
    mc_probs = {k: v/total_sim for k,v in count.items()}
    return mc_probs

def train_ai(history):
    if len(history) < 10:
        return None
    X = []
    y = []
    mapping = {'P':0, 'B':1, 'T':2}
    for i in range(len(history)-1):
        X.append(mapping[history[i]])
        y.append(mapping[history[i+1]])
    X = np.array(X).reshape(-1,1)
    y = np.array(y)
    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X, y)
    return clf

class BaccaratAI:
    def __init__(self):
        self.history = []
        self.model = None
        self.mc_probs = None
        self.suggest = "??"
        self.suggest_prob = 0.0
        self.safe_mode = True
        self.use_monte_carlo = True

    def update_history(self, result):
        if result in ['P', 'B', 'T']:
            self.history.append(result)
            if len(self.history) > 50:
                self.history.pop(0)

    def calculate(self):
        if len(self.history) < 5:
            self.suggest = "??"
            self.suggest_prob = 0.0
            return

        self.model = train_ai(self.history)

        if self.use_monte_carlo:
            self.mc_probs = monte_carlo_simulation(self.history[-10:])

        if self.model:
            last = self.history[-1]
            mapping = {'P': 0, 'B': 1, 'T': 2}
            inv_map = {v: k for k, v in mapping.items()}
            pred_num = self.model.predict(np.array([mapping[last]]).reshape(1, -1))[0]
            ai_pred = inv_map[pred_num]
            ai_prob = max(self.model.predict_proba(np.array([mapping[last]]).reshape(1, -1))[0])

            if self.use_monte_carlo and self.mc_probs:
                combined_probs = {}
                for k in ['P', 'B', 'T']:
                    ai_p = ai_prob if k == ai_pred else 1 - ai_prob
                    mc_p = self.mc_probs.get(k, 0)
                    combined_probs[k] = 0.6 * ai_p + 0.4 * mc_p
                suggest = max(combined_probs, key=combined_probs.get)
                suggest_prob = combined_probs[suggest]
            else:
                suggest = ai_pred
                suggest_prob = ai_prob

            if self.safe_mode and suggest_prob < CONFIDENCE_THRESHOLD:
                self.suggest = "??"
                self.suggest_prob = 0.0
            else:
                self.suggest = suggest
                self.suggest_prob = suggest_prob
        else:
            self.suggest = "??"
            self.suggest_prob = 0.0

class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Baccarat PRO AI Assistant")
        self.geometry("520x500")
        self.attributes("-alpha", 0.9)
        self.resizable(False, False)
        self.configure(fg_color="#1a0000")

        self.ai = BaccaratAI()
        self.key_valid = False
        self.key_info = ""
        self.hwid = get_hwid()

        self.create_login_ui()

    def clear_widgets(self):
        for widget in self.winfo_children():
            widget.destroy()

    def create_login_ui(self):
        self.clear_widgets()
        self.login_frame = ctk.CTkFrame(self, fg_color="#1a0000")
        self.login_frame.pack(expand=True, fill="both", padx=40, pady=60)

        label_title = ctk.CTkLabel(self.login_frame, text="Login to Baccarat PRO AI",
                                   font=("Arial", 22, "bold"), text_color="#ff6666")
        label_title.pack(pady=(0, 10))

        self.key_entry = ctk.CTkEntry(self.login_frame, placeholder_text="Enter your Key here", width=300)
        self.key_entry.pack(pady=10)

        self.status_label = ctk.CTkLabel(self.login_frame, text="", text_color="#ff4444")
        self.status_label.pack(pady=(10, 0))

        btn_login = ctk.CTkButton(self.login_frame, text="Login", command=self.handle_login,
                                  fg_color="#ff0000", hover_color="#cc0000")
        btn_login.pack(pady=20)

        self.scroll_text = tk.Label(self.login_frame,
                                    text="Welcome! Please enter your key to login.",
                                    fg="#ff5555", bg="#1a0000",
                                    font=("Arial", 10, "italic"))
        self.scroll_text.pack(side="bottom", pady=10)
        self.scroll_text.after(1000, self.scroll_message)

    def scroll_message(self):
        txt = self.scroll_text.cget("text")
        self.scroll_text.config(text=txt[1:] + txt[0])
        self.scroll_text.after(150, self.scroll_message)

    def handle_login(self):
        key = self.key_entry.get().strip()
        if not key:
            self.status_label.configure(text="Please enter a key.")
            return
        self.status_label.configure(text="Checking key...")
        threading.Thread(target=self.check_key_thread, args=(key,), daemon=True).start()

    def check_key_thread(self, key):
        try:
            scope = ["https://spreadsheets.google.com/feeds",
                     'https://www.googleapis.com/auth/spreadsheets',
                     "https://www.googleapis.com/auth/drive.file",
                     "https://www.googleapis.com/auth/drive"]
            creds = ServiceAccountCredentials.from_json_keyfile_name(get_credentials_path(), scope)
            client = gspread.authorize(creds)
            sheet = client.open(GOOGLE_SHEET_NAME).worksheet(GOOGLE_SHEET_TAB)

            valid, info = validate_key(sheet, key, self.hwid)
            if valid:
                self.key_valid = True
                self.key_info = info
                self.after(0, self.create_main_ui)
            else:
                self.after(0, lambda: self.status_label.configure(text=f"Login failed: {info}"))
        except Exception as e:
            self.after(0, lambda: self.status_label.configure(text=f"Error: {e}"))

    def create_main_ui(self):
        self.clear_widgets()
        self.geometry("700x560")
        self.title(f"Baccarat PRO AI Assistant - {self.key_info}")

        self.header_label = ctk.CTkLabel(self, text="Baccarat PRO AI Assistant",
                                         font=("Arial", 24, "bold"), text_color="#ff5555")
        self.header_label.pack(pady=(10, 5))

        self.datetime_label = ctk.CTkLabel(self, text="", font=("Arial", 12))
        self.datetime_label.pack()

        self.key_info_label = ctk.CTkLabel(self, text=f"Logged in with key: {self.key_info}",
                                           font=("Arial", 10), text_color="#ff9999")
        self.key_info_label.pack(pady=(5, 15))

        self.history_frame = ctk.CTkFrame(self, fg_color="#330000")
        self.history_frame.pack(pady=(0, 10), fill="x", padx=40)

        self.history_label = ctk.CTkLabel(self.history_frame, text="Last 10 results:",
                                          font=("Arial", 14))
        self.history_label.pack(anchor="w", pady=(5, 2))

        self.history_text = ctk.CTkLabel(self.history_frame, text="", font=("Arial", 18))
        self.history_text.pack(pady=5)

        self.buttons_frame = ctk.CTkFrame(self, fg_color="#330000")
        self.buttons_frame.pack(pady=10, padx=40, fill="x")

        self.btn_player = ctk.CTkButton(self.buttons_frame, text="Player", fg_color="#3399ff",
                                        hover_color="#267acc", command=lambda: self.place_bet('P'))
        self.btn_banker = ctk.CTkButton(self.buttons_frame, text="Banker", fg_color="#ff3333",
                                        hover_color="#cc2929", command=lambda: self.place_bet('B'))
        self.btn_tie = ctk.CTkButton(self.buttons_frame, text="Tie", fg_color="#33cc33",
                                     hover_color="#29a329", command=lambda: self.place_bet('T'))

        self.btn_player.pack(side="left", expand=True, fill="x", padx=5)
        self.btn_banker.pack(side="left", expand=True, fill="x", padx=5)
        self.btn_tie.pack(side="left", expand=True, fill="x", padx=5)

        self.suggest_label = ctk.CTkLabel(self, text="Suggested Bet: ??",
                                          font=("Arial", 20, "bold"), text_color="#ffaa00")
        self.suggest_label.pack(pady=(15, 5))

        self.prob_label = ctk.CTkLabel(self, text="Confidence: --", font=("Arial", 14))
        self.prob_label.pack()

        self.options_frame = ctk.CTkFrame(self, fg_color="#330000")
        self.options_frame.pack(pady=10, padx=40, fill="x")

        self.mc_var = tk.BooleanVar(value=True)
        self.safe_mode_var = tk.BooleanVar(value=True)

        self.mc_check = ctk.CTkCheckBox(self.options_frame, text="Enable Monte Carlo",
                                        variable=self.mc_var, command=self.options_changed)
        self.safe_check = ctk.CTkCheckBox(self.options_frame, text="Enable Safe Mode",
                                          variable=self.safe_mode_var, command=self.options_changed)

        self.mc_check.pack(side="left", padx=10)
        self.safe_check.pack(side="left", padx=10)

        self.status_label = ctk.CTkLabel(self, text="", font=("Arial", 12), text_color="#ff4444")
        self.status_label.pack(pady=5)

        self.update_time()
        self.update_ui()

    def update_time(self):
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.datetime_label.configure(text=now)
        self.after(1000, self.update_time)

    def options_changed(self):
        self.ai.use_monte_carlo = self.mc_var.get()
        self.ai.safe_mode = self.safe_mode_var.get()
        self.update_ui()

    def place_bet(self, bet):
        if hasattr(self, 'is_calculating') and self.is_calculating:
            self.status_label.configure(text="Calculating, please wait...")
            return
        self.status_label.configure(text="Calculating...")
        self.is_calculating = True
        self.disable_buttons()
        self.ai.update_history(bet)
        threading.Thread(target=self.calc_thread, daemon=True).start()

    def calc_thread(self):
        time.sleep(0.7)
        self.ai.calculate()
        self.is_calculating = False
        self.after(0, self.update_ui)
        self.after(0, self.enable_buttons)

    def update_ui(self):
        last_10 = self.ai.history[-10:]
        hist_str = ' '.join(last_10) if last_10 else "No data"
        self.history_text.configure(text=hist_str)
        self.suggest_label.configure(text=f"Suggested Bet: {self.ai.suggest}")
        self.prob_label.configure(
            text=f"Confidence: {self.ai.suggest_prob*100:.2f}%" if self.ai.suggest_prob > 0 else "Confidence: --")
        if hasattr(self, 'is_calculating') and self.is_calculating:
            self.status_label.configure(text="Calculating, please wait...")
        else:
            self.status_label.configure(text="")

    def disable_buttons(self):
        self.btn_player.configure(state="disabled")
        self.btn_banker.configure(state="disabled")
        self.btn_tie.configure(state="disabled")

    def enable_buttons(self):
        self.btn_player.configure(state="normal")
        self.btn_banker.configure(state="normal")
        self.btn_tie.configure(state="normal")

if __name__ == "__main__":
    app = App()
    app.mainloop()
