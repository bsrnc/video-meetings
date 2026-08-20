---
name: issues
description: Создает github issues и milestones из файла плана. Использую, когда есть готовый план с фазами и нужно создать backlog на github.
---

# issues генератор

Прочитай план из файла: $ARGUMENTS 

Для каждой фазы создай milestone и issues в Github, используя gh CLI

## Порядок действий

1. Прочитай файл плана
2. Для каждой фазы создай milestone:
'gh api repos/{owner}/{repo}/milestones --field title="Фаза N: название"'
3. Для каждой задачи в фазе создай issue:
'gh issue create --title "..." --body "..." --label "..." --milestone "..."'

## Формат issue

**Title**: текст задачи из плана (без [])
**Body**: описание задачи