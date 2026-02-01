---
description: Review a feature plan for completeness.
---

Carefully review the $1 feature ($1-plan.md, $1-context.md, and $1-tasks.md).  Think hard about opportunities for improvement in the plan.

## General Review Questions

- Are there any gaps or missing details in the plan?
- Are there any open questions or ambiguous requirements that require investigation or clarification?
- Is there a thorough test plan to validate the functionality, including edge cases?
- Is all required work outlined in the task list and broken down into phases that can be implemented and tested incrementally?

## Compiler-Specific Review Questions

- Does the plan align with the language specification (`docs/spec/`)?
- Is it consistent with the compiler architecture (`docs/compiler-architecture/`)?
- What compiler phases are affected (lexer, parser, desugarer, type checker, optimizer, codegen)?
- Are there any breaking changes or backward compatibility implications?
- Are prerequisite changes or dependencies on other features identified?
- Will the changes require updates to the standard library (`@vibefun/std`)?

Ask clarifying questions and perform any research necessary to improve the feature, then update $1-plan.md, $1-context.md, and $1-tasks.md. Ensure those files have updated "Last Updated" timestamps and mark completed tasks immediately upon finishing.
