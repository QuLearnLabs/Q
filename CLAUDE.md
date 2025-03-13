# Quantum VS Code Extension Development Guide

## Build & Development Commands
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch and recompile on changes
- `npm run lint` - Run ESLint on source files
- `npm run test` - Run tests (add when implementing tests)

## Code Style Guidelines
- **TypeScript**: Use strict typing with interfaces/types for all parameters
- **Naming**: PascalCase for classes, camelCase for variables/methods
- **Imports**: Use named imports `import { Name } from './file'`
- **Comments**: JSDoc for public methods/classes
- **Error Handling**: Try-catch with specific VS Code error messaging
- **Formatting**: Required semicolons, curly braces, strict equality (`===`)
- **Architecture**: Single responsibility per file, clear UI/logic separation

## Project Structure
- `src/` - Source TypeScript files
- `media/` - Icons and visual assets
- `out/` - Compiled JavaScript (don't edit directly)

## Extension Features
- Quantum circuit visualization
- Code completions
- Interactive sidebar

When modifying code, follow existing patterns closely and maintain VS Code extension best practices.