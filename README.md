# Amit Game Factory V5 — Diversity Lock 🎮

גרסה שמטרתה לפתור את הבעיה של משחקים שחוזרים על עצמם.

## מה חדש ב־V5

- יש 24 תבניות רעיון שונות, לא רק 3.
- בכל ריצה המערכת בודקת את המשחקים האחרונים ולא בוחרת Blueprint שחזר לאחרונה.
- גם אם Gemini לא עובד או נגמרה המכסה, עדיין נוצר משחק חדש מתוך מאגר רעיונות שלא חוזר מהר.
- GitHub Pages הוא הפרסום הראשי.
- Netlify נשאר רק גיבוי אם GitHub Pages נכשל בזמן שה־Action כבר רץ.
- אין dotenv ואין npm install.
- רץ פעמיים ביום: 06:17 ו־15:43 UTC, שזה בערך 09:17 ו־18:43 בישראל בזמן שעון קיץ.

## סודות שצריך להשאיר ב־GitHub

- GEMINI_API_KEY — לא חובה, אבל משפר שמות ורעיונות.
- GMAIL_USER
- GMAIL_APP_PASSWORD
- EMAIL_TO
- SITE_URL — כתובת GitHub Pages, לדוגמה:
  https://16464-4434.github.io/amit-daily-game-factory2
- NETLIFY_AUTH_TOKEN — רק לגיבוי.
- NETLIFY_SITE_ID — רק לגיבוי.

## איך להעלות

ב־GitHub:

1. Code → Add file → Upload files
2. לגרור את כל מה שבתוך UPLOAD_TO_GITHUB
3. Commit changes
4. Actions → Amit Game Factory V5 → Run workflow

לא לעשות Re-run לריצות ישנות.

## איך לעצור ריצה אוטומטית אבל להשאיר ידני

בקובץ `.github/workflows/daily-game.yml` למחוק רק את:

```yml
  schedule:
    - cron: "17 6 * * *"
    - cron: "43 15 * * *"
```

ולהשאיר:

```yml
on:
  workflow_dispatch: {}
```
