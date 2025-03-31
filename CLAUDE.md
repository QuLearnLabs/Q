# Q Development Guide

## Build & Development Commands
- `npm run compile` - Compile TypeScript files
- `npm run watch` - Watch for changes and recompile
- `npm run lint` - Run ESLint on src directory
- `npm run vscode:prepublish` - Prepare for packaging (runs before publish)

## Code Style Guidelines
- **TypeScript**: Target ES2022 with strict type checking
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/interfaces
- **Imports**: camelCase or PascalCase for imports
- **Error Handling**: Use try/catch blocks with specific error types
- **Formatting**: Use semicolons, curly braces for all blocks
- **Types**: Enable strict mode, define return types for functions
- **Comments**: Use descriptive comments for complex logic

## Project Structure
- `/src` - TypeScript source files
- `/media` - Images and visual assets
- `/out` - Compiled JavaScript output
- `/releases` - VSIX extension packages

## Important Notes
- This is a VS Code extension for quantum computing education
- Uses GitHub Copilot Chat integration for AI assistance
- The extension primarily targets quantum computing education
- Default code examples use Qiskit framework

## Environment Requirements
- Python and the following Python packages are required for the circuit visualizer:
  - qiskit
  - matplotlib

To install the required Python dependencies, run:
```
pip install qiskit matplotlib
```
or
```
pip3 install qiskit matplotlib
```

## Qiskit 1.x Compatibility Watcher
The extension includes an automatic compatibility watcher for Qiskit code to make it compatible with Qiskit 1.x. The watcher automatically fixes:
1. Importing Aer from `qiskit_aer` instead of `qiskit`
2. Converting deprecated `execute()` to the transpile+run pattern

### Usage
The watcher can run in several modes:
- Background watcher (automatic fixing)
- One-time scan
- Clipboard monitoring
- Manual file fixing

VS Code tasks are available from the Command Palette to run the watcher in different modes.

### Tech Stack
- The watcher is implemented in Python and TypeScript
- The core logic is in the `src/qiskit_tools.py` file
- TypeScript integration is in `src/qiskit-fixer.ts`

### Automatic Watcher
The watcher automatically starts when the workspace opens (via VS Code tasks) and:
1. Monitors files for deprecated Qiskit patterns
2. Silently fixes deprecated code in the background
3. Shows notifications only when files are fixed