# ⚗️ Chem10 — Class 10 Chemistry MCQ Practice

A clean, fast MCQ practice website for Class 10 Chemistry (Punjab Board).  
96 verified questions across 13 chapters, with shuffled options, a countdown timer, and instant explanations.

---

## Features

- **13 chapters** (Ch 14–26), 96 verified MCQs
- **Shuffled options** on every attempt — students can't memorise positions
- **Countdown timer** (5 / 10 / 15 / 20 / 30 min or no limit)
- **Instant feedback** after each answer with explanation
- **Full review** at the end showing every question, your answer, the correct answer, and explanation
- **Guest mode** — works with no login
- **Sign in / Sign up** via Supabase (optional) — results saved to database
- Fully **mobile-responsive**

---

## Project structure

```
chem-quiz/
├── index.html          ← single page app
├── css/
│   └── style.css
├── js/
│   ├── config.js       ← put your Supabase credentials here
│   ├── auth.js         ← sign in / sign up / guest
│   ├── quiz.js         ← quiz engine (shuffle, timer, scoring)
│   └── app.js          ← UI / routing
├── data/
│   └── mcqs.json       ← 96 MCQs with options, answers, explanations
└── images/
    └── svg/            ← SVG diagrams for questions/options
```

---

## 1 — Deploy to GitHub Pages (free)

### Step 1: Create a GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Name it `chem10` (or anything you like)
3. Set it to **Public**
4. Click **Create repository**

### Step 2: Upload the files

Option A — drag and drop in the browser:
1. Open your new repo on GitHub
2. Click **Add file → Upload files**
3. Drag the entire `chem-quiz/` folder contents (all files and subfolders)
4. Click **Commit changes**

Option B — via Git (terminal):
```bash
cd chem-quiz
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chem10.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click **Save**
5. After ~1 minute your site is live at:  
   `https://YOUR_USERNAME.github.io/chem10/`

---

## 2 — Set up Supabase (optional — for login & progress tracking)

Without Supabase the site works perfectly in guest mode. Add Supabase when you want students to sign up and have their scores saved.

### Step 1: Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project**, fill in a name and password
3. Wait for it to provision (~1 min)

### Step 2: Create the results table

In your Supabase project, go to **SQL Editor** and run:

```sql
create table quiz_results (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  score       text,
  total       int,
  correct     int,
  wrong       int,
  time_taken  int,
  chapters    int[],
  created_at  timestamptz default now()
);

-- Allow logged-in users to insert and read their own results
alter table quiz_results enable row level security;

create policy "Users can insert own results"
  on quiz_results for insert
  with check (auth.uid() = user_id);

create policy "Users can read own results"
  on quiz_results for select
  using (auth.uid() = user_id);
```

### Step 3: Add your credentials to config.js

1. In Supabase go to **Settings → API**
2. Copy the **Project URL** and **anon public** key
3. Open `js/config.js` and replace the placeholder values:

```js
const SUPABASE_URL  = 'https://xyzxyz.supabase.co';    // ← your URL
const SUPABASE_ANON = 'eyJhbGc...';                    // ← your anon key
const SUPABASE_ENABLED = true;                          // ← set to true
```

4. Push the updated file to GitHub — the site will automatically use Supabase.

### Step 4 (optional): Allow email sign-ups

In Supabase → **Authentication → Providers → Email**, make sure it is enabled.  
To skip email confirmation during testing, go to **Authentication → Settings** and disable **Confirm email**.

---

## Adding more MCQs

Edit `data/mcqs.json`. Each entry follows this shape:

```json
{
  "no": 97,
  "id": "NEW_ID",
  "chapter": 14,
  "chapter_name": "States of Matter",
  "topic_heading": "14.1 Internal Energy",
  "source_type": "Exercise",
  "question_en": "Your question here?",
  "question_ur": "اردو سوال",
  "options": {
    "A": { "en": "Option A text", "ur": "آپشن الف", "image": null },
    "B": { "en": "Option B text", "ur": "آپشن ب",   "image": null },
    "C": { "en": "Option C text", "ur": "آپشن ج",   "image": null },
    "D": { "en": "Option D text", "ur": "آپشن د",   "image": null }
  },
  "verified_answer": "A",
  "verification_note": "Explanation of why A is correct.",
  "has_images": false,
  "question_images": [],
  "image_files": []
}
```

If the question has an SVG image, place the file in `images/svg/` and add its filename to `question_images`.

---

## License

For educational use.
