# Understanding Incubation and Entrepreneurship — Quiz

A static practice quiz with all 120 NPTEL assignment questions (Weeks 1–12). It doesn't need a build step.

- `questions.js` holds the question bank (`w` = week, `o` = options, `a` = correct option indices).
- `app.js` holds the quiz logic: shuffling, practice and exam modes, results and review.
- `style.css` holds the styling, with light and dark themes.

## Deploy to Vercel

**Option A: dashboard.** Push this folder to a GitHub repo, then import it at vercel.com/new. Set the Framework Preset to **Other** and leave the build command empty.

**Option B: CLI.** Run this from inside this folder:

```bash
npx vercel --prod
```

## Run locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173.
