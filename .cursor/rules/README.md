# SolSim Cursor Rules

This directory contains the comprehensive Cursor rules structure for the SolSim project.

## 📂 Structure

```
.cursor/rules/                    # Project-level rules (apply globally)
├── architecture.mdc              # Architectural standards & patterns
└── brand-style.mdc              # Visual identity & UI consistency

frontend/.cursor/rules/           # Frontend-specific rules
├── formatting.mdc               # Monetary & numeric formatting
├── ui-ux.mdc                    # UI/UX quality & accessibility
└── code-quality.mdc             # React hooks & component standards

backend/.cursor/rules/            # Backend-specific rules
└── services.mdc                 # Fastify + Prisma service patterns

.cursor/prompts/                  # Code review automation
└── code-review.mdc              # Automated rule violation detection
```

## 🎯 How It Works

- **Project rules** apply to all TypeScript/TSX files globally
- **Frontend rules** target specific frontend patterns and components
- **Backend rules** focus on service layer conventions
- **Code review** provides automated violation detection during development

## ✅ Features

- **Scoped Application**: Rules apply automatically based on file paths
- **Composable**: Each rule file is focused and maintainable
- **Actionable**: Clear examples and specific guidance
- **Version Controlled**: All rules are tracked in git