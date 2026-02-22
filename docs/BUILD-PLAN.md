# Dark Mode Toggle — Build Plan

## Step 1 — Define CSS variables for the light theme

Replace the hardcoded colors in `App.css` with `--var` names in a `:root` block.
No visual change yet — this is pure refactoring.

**Test:** site looks identical after the change.

---

## Step 2 — Add a dark theme palette

Add a `[data-theme="dark"] { ... }` block with dark equivalents for every variable.
No wiring yet.

**Test:** manually add `data-theme="dark"` to `<body>` in DevTools — site goes dark.

---

## Step 3 — Add theme state in App.jsx

Add a `useState('light')` hook and apply `data-theme` to the root `<div>` based on that state.
No button yet.

**Test:** change the initial value to `'dark'` to confirm dark mode renders correctly.

---

## Step 4 — Add a toggle button to the header

Render a simple button in the header that calls
`setTheme(t => t === 'light' ? 'dark' : 'light')`.

**Test:** click the button — theme switches back and forth.

---

## Step 5 — Persist preference to localStorage

On mount, read `localStorage.getItem('theme')` as the initial value.
On change, write back with `useEffect`.

**Test:** switch to dark, refresh the page — it stays dark.
