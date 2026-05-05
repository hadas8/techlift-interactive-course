# Techlift Interactive Course

מבנה האתר:

```text
techlift-interactive-course/
├── index.html
└── exercises/
    └── mvp-v2/
        ├── index.html
        ├── editor.html
        ├── config.json
        └── assets/
            ├── styles.css
            ├── app.js
            └── editor.js
```

## קישורים אחרי פרסום ב־Netlify

- עמוד ראשי: `/`
- פעילות לתלמידים/מדריכים: `/exercises/mvp-v2/`
- עורך לצוות פדגוגי: `/exercises/mvp-v2/editor.html`

## תהליך עריכה מומלץ

1. פותחים את `editor.html`.
2. עורכים טקסטים / צבעים / שאלות / פידבקים / Google Form.
3. לוחצים על **הורדת config.json**.
4. נכנסים ל־GitHub ומחליפים את הקובץ:
   `exercises/mvp-v2/config.json`
5. עושים Commit.
6. Netlify יבצע deploy אוטומטי.
7. לאחר שה־deploy הסתיים, כל מי שייכנס לפעילות יראה את הגרסה המעודכנת.

## הערות חשובות

- `index.html` של הפעילות לא כולל כפתור עריכה.
- מדריכים וחניכים אמורים לקבל רק את קישור הפעילות.
- הצוות הפדגוגי בלבד אמור להשתמש ב־`editor.html`.
- העריכה בעורך לא נשמרת באתר עד שמורידים config.json ומחליפים אותו ב־GitHub.
