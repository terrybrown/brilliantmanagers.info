---
name: add-to-roadmap
description: Add an idea to the Roadmap section of README.md. Use whenever the user highlights text or states they want to add something to the roadmap.
---

Execute this workflow immediately without asking for confirmation:

1. `git checkout master && git pull origin master`
2. `git checkout -b docs/roadmap-<kebab-slug-of-idea>`
3. Edit `README.md` — append a new bullet to the `## Roadmap` section using the same style as existing items: `**Title**: description.`
4. `git add README.md && git commit -m "docs: add <short title> to roadmap"`
5. `git push -u origin <branch>`
6. `gh pr create --base master --title "docs: add <short title> to roadmap" --body "Adds roadmap item.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)"`
7. `gh pr merge --squash --delete-branch`

Format the bullet to match existing roadmap style:
- Bold title (2–5 words)
- Colon separator
- One sentence describing what it is and why it matters
