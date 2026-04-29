
# Git commit

- Stage **only** files in scope; no `git add .` unless every change belongs in one commit.
- One-line message: `<tag>: <summary>` — tags: `feat` `fix` `refactor` `docs` `test` `chore` `perf` `build` `ci` `style` `revert`.
- Small, frequent commits; split if a commit grows too large.
- Default branch `main` — before **push** or **new PR**: integrate latest `origin/main` (merge/rebase), resolve conflicts, test.
- Identity: 
  `git -c user.name="Khanovico" -c user.email="khanovicdev@gmail.com" commit --author="Khanovic <khanovicdev@gmail.com>" -m "<tag>: <summary>"`
