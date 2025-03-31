#!/usr/bin/env python3
"""
Qiskit Code Fixer
-----------------
A comprehensive tool for automatically fixing deprecated Qiskit patterns to make them compatible with Qiskit 1.x.

This tool can:
1. Fix imports (from qiskit_aer import Aer → from qiskit_aer import Aer)
2. Replace the deprecated execute() pattern with transpile() + run()
3. Run in various modes:
   - Fix specific files
   - Monitor files in a workspace
   - Monitor the clipboard
   - Interactive mode for direct input

Part of the Q extension by QuLearnLabs.
"""

import re
import os
import sys
import json
import time
import shutil
import argparse
import subprocess
import platform
from datetime import datetime

try:
    import pyperclip  # For clipboard monitoring
except ImportError:
    pyperclip = None
    print("Warning: pyperclip not installed. Clipboard features will not work.")
    print("To install: pip install pyperclip")

# File for storing history of fixed files
HISTORY_FILE = os.path.expanduser("~/.qiskit_fixer_history.json")

# Documentation for the tool
DOCUMENTATION = """
# Qiskit Code Fixer

Automatically fix deprecated Qiskit code patterns to make them compatible with Qiskit 1.x.

## Quick Start

1. Run the setup command: `python src/qiskit_tools.py --setup`
2. Run one of the VS Code tasks to fix your code

## What This Tool Does

This tool automatically fixes two main issues with Qiskit code:

1. **Aer Import Fix**: Updates `from qiskit_aer import Aer` to `from qiskit_aer import Aer`
2. **Execute Pattern Fix**: Replaces the deprecated `execute()` function with the modern `transpile()` + `run()` pattern

## Usage Options

### VS Code Tasks (Recommended)

After running the setup, you can use the VS Code tasks:

1. Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
2. Type "Tasks: Run Task"
3. Choose one of the following tasks:
   - **Start Qiskit Watcher**: Continuously monitor all Python files in the workspace
   - **Run Qiskit Watcher Once**: Scan all Python files once
   - **Run Qiskit Watcher Once (Force)**: Scan and fix all files, ignoring history
   - **Fix Current Qiskit File**: Fix only the currently active file
   - **Start Qiskit Clipboard Monitor**: Monitor clipboard for Qiskit code

### Command Line Usage

You can also use the tool directly from the command line:

#### Fix a specific file:
```bash
python src/qiskit_tools.py -f path/to/file.py
```

#### Monitor clipboard for Qiskit code:
```bash
python src/qiskit_tools.py --watch
```

#### Interactive mode (paste code and get fixed version):
```bash
python src/qiskit_tools.py
```

#### Watch all Python files in workspace:
```bash
python src/qiskit_tools.py --watcher
```

#### Run the watcher once:
```bash
python src/qiskit_tools.py --once
# Use --force to fix files even if they were fixed recently
python src/qiskit_tools.py --once --force
```

#### Run setup to install tasks:
```bash
python src/qiskit_tools.py --setup
```

## Requirements

- Python 3.6+
- Required packages (installed by setup):
  - qiskit>=1.0.0
  - qiskit-aer>=0.12.0
  - matplotlib>=3.7.0
  - pyperclip>=1.8.2 (for clipboard monitoring)
"""

#######################
# CODE FIXING FUNCTIONS
#######################

def fix_qiskit_code(code):
    """Fix Qiskit code to be compatible with Qiskit 1.x"""
    # Add installation comment if needed
    if 'qiskit' in code and 'pip install qiskit-aer' not in code:
        code = "# Make sure to install qiskit-aer first:\n# pip install qiskit-aer\n\n" + code
    
    # Fix imports - handle Aer, BasicAer, and execute imports
    
    # 1. Fix Aer imports - move from qiskit to qiskit_aer
    # This regex finds import statements that include Aer
    aer_import_pattern = re.compile(r'from\s+qiskit\s+import\s+([^;\n]*\bAer\b[^;\n]*)')
    
    def fix_aer_import(match):
        # Get the full import list
        imports = match.group(1)
        
        # Split by commas and clean each item
        import_items = [item.strip() for item in imports.split(',')]
        
        # Filter out 'Aer'
        other_imports = [item for item in import_items if item != 'Aer']
        
        # Create the new imports
        if other_imports:
            return f"from qiskit import {', '.join(other_imports)}\nfrom qiskit_aer import Aer"
        else:
            return "from qiskit_aer import Aer"
    
    # Replace the Aer imports
    code = aer_import_pattern.sub(fix_aer_import, code)
    
    # 2. Fix BasicAer imports - replace with BasicProvider
    basicaer_import_pattern = re.compile(r'from\s+qiskit\s+import\s+([^;\n]*\bBasicAer\b[^;\n]*)')
    
    def fix_basicaer_import(match):
        # Get the full import list
        imports = match.group(1)
        
        # Split by commas and clean each item
        import_items = [item.strip() for item in imports.split(',')]
        
        # Filter out 'BasicAer'
        other_imports = [item for item in import_items if item != 'BasicAer']
        
        # Create the new imports
        result = ""
        if other_imports:
            result = f"from qiskit import {', '.join(other_imports)}\n"
        
        # Add the new import for BasicProvider
        result += "from qiskit.providers.basic_provider import BasicProvider"
        
        return result
    
    # Replace the BasicAer imports
    code = basicaer_import_pattern.sub(fix_basicaer_import, code)
    
    # 3. Fix execute imports - remove execute and ensure transpile is included
    # This regex finds import statements that include execute
    execute_import_pattern = re.compile(r'from\s+qiskit\s+import\s+([^;\n]*\bexecute\b[^;\n]*)')
    
    def fix_execute_import(match):
        # Get the full import list
        imports = match.group(1)
        
        # Split by commas and clean each item
        import_items = [item.strip() for item in imports.split(',')]
        
        # Filter out 'execute' and check for 'transpile'
        other_imports = [item for item in import_items if item != 'execute']
        has_transpile = 'transpile' in other_imports
        
        # Add transpile if not already present
        if not has_transpile:
            other_imports.append('transpile')
        
        # Create the new import
        return f"from qiskit import {', '.join(other_imports)}"
    
    # Replace the execute imports
    code = execute_import_pattern.sub(fix_execute_import, code)
    
    # 4. Replace deprecated qasm_simulator with basic_simulator
    # Look for BasicAer.get_backend("qasm_simulator") pattern
    code = re.sub(
        r'BasicAer\.get_backend\([\'"]qasm_simulator[\'"]\)',
        'BasicProvider().get_backend("basic_simulator")',
        code
    )
    
    # Look for Aer.get_backend("qasm_simulator") pattern - need to be careful here as Aer still supports qasm_simulator
    # We'll only replace it if we also have BasicAer in the file, suggesting they're trying to use the basic simulator
    if 'BasicProvider' in code:
        code = re.sub(
            r'Aer\.get_backend\([\'"]qasm_simulator[\'"]\)',
            'BasicProvider().get_backend("basic_simulator")',
            code
        )
    
    # Find all execute() patterns and replace them
    # This is a comprehensive approach to handle different variable names and patterns
    execute_pattern = re.compile(
        r'([\w_]+)\s*=\s*execute\(\s*([\w_]+)\s*,\s*(?:Aer\.get_backend\(\s*[\'"]([\w_]+)[\'"]\s*\)|(\w+))\s*(?:,\s*shots\s*=\s*(\d+))?\s*\)',
        re.MULTILINE
    )
    
    # Check if we need to add transpile import
    if execute_pattern.search(code) and 'from qiskit import transpile' not in code and 'import qiskit.transpile' not in code:
        # Try to add to existing qiskit import
        import_added = False
        
        # First try to add to an existing "from qiskit import X" line
        if re.search(r'from\s+qiskit\s+import\s+', code):
            code = re.sub(
                r'from\s+qiskit\s+import\s+([^,\n]*(?:,\s*[^,\n]*)*)',
                lambda m: f'from qiskit import {m.group(1)}, transpile' if 'transpile' not in m.group(1) else m.group(0),
                code,
                count=1
            )
            import_added = True
        
        # If no qiskit import was modified, add a new import line
        if not import_added:
            # Find position after comments at the top
            import_pos = 0
            for match in re.finditer(r'^#.*?\n', code, re.MULTILINE):
                import_pos = match.end()
            
            # Add after imports if possible
            imports_end = import_pos
            for match in re.finditer(r'^(?:from|import).*?\n', code, re.MULTILINE):
                if match.start() >= import_pos:
                    imports_end = match.end()
            
            code = code[:imports_end] + 'from qiskit import transpile\n' + code[imports_end:]
    
    # Process all execute() matches
    matches = list(execute_pattern.finditer(code))
    for match in reversed(matches):  # Process in reverse to handle offsets correctly
        result_var = match.group(1)  # e.g., "result"
        circuit_var = match.group(2)  # e.g., "circuit"
        backend_name = match.group(3)  # e.g., "qasm_simulator" 
        backend_var = match.group(4)   # e.g., "simulator" (direct variable)
        shots = match.group(5)  # e.g., "1000"
        
        # Build the replacement code
        replacement = f"{circuit_var}_transpiled = transpile({circuit_var})\n"
        
        # Handle backend - either direct variable or get_backend call
        if backend_var:
            replacement += f"{result_var} = {backend_var}.run({circuit_var}_transpiled"
        else:
            replacement += f"simulator = Aer.get_backend('{backend_name}')\n"
            replacement += f"{result_var} = simulator.run({circuit_var}_transpiled"
        
        # Add shots if specified
        if shots:
            replacement += f", shots={shots}"
        replacement += ")"
        
        # Replace in the code
        start, end = match.span()
        code = code[:start] + replacement + code[end:]
    
    # Fix any duplicate imports that might have been added
    code = re.sub(r'from qiskit import ([^,\n]*,\s*)*transpile(,\s*[^,\n]*)*,\s*transpile(,\s*[^,\n]*)*', 
                 lambda m: m.group(0).replace(', transpile', '', 1), 
                 code)
    code = re.sub(r'(?:from qiskit import transpile\n)+', 'from qiskit import transpile\n', code)
    
    return code

def get_clipboard_content():
    """Get the current clipboard content"""
    if pyperclip:
        return pyperclip.paste()
    return ""

def set_clipboard_content(text):
    """Set the clipboard content"""
    if pyperclip:
        pyperclip.copy(text)
        return True
    return False

def process_file(file_path, dry_run=False, verbose=False):
    """Process a single file to fix Qiskit code
    
    Args:
        file_path: Path to the file to process
        dry_run: If True, don't actually make changes
        verbose: If True, print detailed information
        
    Returns:
        True if file was (or would be) fixed, False otherwise
    """
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check if the file contains Qiskit code
        if 'from qiskit import' in content or 'import qiskit' in content:
            fixed_content = fix_qiskit_code(content)
            
            if fixed_content != content:
                if not dry_run:
                    with open(file_path, 'w') as f:
                        f.write(fixed_content)
                    
                    # Only print if verbose
                    if verbose:
                        print(f"Fixed Qiskit code in {file_path}")
                    
                    # Record this fix in history (for logging purposes only)
                    update_history(file_path)
                else:
                    if verbose:
                        print(f"Would fix Qiskit code in {file_path} (dry run)")
                        
                return True
            else:
                if verbose:
                    print(f"No changes needed for {file_path}")
        else:
            if verbose:
                print(f"No Qiskit code found in {file_path}")
        
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def update_history(file_path):
    """Update the history of fixed files"""
    history = load_history()
    
    timestamp = datetime.now().isoformat()
    if file_path in history:
        history[file_path].append(timestamp)
    else:
        history[file_path] = [timestamp]
    
    save_history(history)

def load_history():
    """Load the history of fixed files"""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_history(history):
    """Save the history of fixed files"""
    try:
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"Error saving history: {e}")

def should_fix_file(file_path, history, force=False):
    """Determine if a file should be fixed
    
    Args:
        file_path: Path to the file to check
        history: History of fixed files (not used anymore)
        force: Parameter kept for backward compatibility
        
    Returns:
        Always returns True - we always want to fix files that need fixing
    """
    # Always fix files that need fixing, regardless of history
    return True

#######################
# CLIPBOARD MONITORING
#######################

def monitor_clipboard(interval=1.0):
    """Monitor clipboard for Qiskit code and fix it automatically"""
    if not pyperclip:
        print("Error: pyperclip is required for clipboard monitoring")
        print("Install it with: pip install pyperclip")
        return
    
    print("Monitoring clipboard for Qiskit code...")
    print("Press Ctrl+C to stop")
    
    last_content = get_clipboard_content()
    
    try:
        while True:
            time.sleep(interval)
            current_content = get_clipboard_content()
            
            if current_content != last_content:
                # Check if it contains Qiskit code
                if 'from qiskit import' in current_content or 'import qiskit' in current_content:
                    fixed_content = fix_qiskit_code(current_content)
                    
                    if fixed_content != current_content:
                        set_clipboard_content(fixed_content)
                        print("\nDetected and fixed Qiskit code in clipboard!")
                
                last_content = current_content
    except KeyboardInterrupt:
        print("\nStopped clipboard monitoring")

#######################
# FILE WATCHING
#######################

def find_workspace_root():
    """Find the VS Code workspace root directory"""
    # Try to get from environment variable
    workspace_root = os.environ.get('WORKSPACE_FOLDER')
    if workspace_root and os.path.isdir(workspace_root):
        return workspace_root
    
    # Try current directory
    current_dir = os.getcwd()
    # Look for .vscode directory or git repository
    if os.path.isdir(os.path.join(current_dir, '.vscode')) or os.path.isdir(os.path.join(current_dir, '.git')):
        return current_dir
    
    # If running as a task, use the current directory
    return current_dir

def find_python_files_in_workspace():
    """Find all Python files in the workspace"""
    workspace_root = find_workspace_root()
    python_files = []
    
    # Get this script's path to exclude it
    this_script_path = os.path.abspath(__file__)
    
    # Walk through the directory recursively
    for root, _, files in os.walk(workspace_root):
        # Skip hidden directories and virtual environments
        if any(part.startswith('.') for part in root.split(os.sep)) or \
           'venv' in root or 'node_modules' in root:
            continue
        
        # Add Python files (excluding this script)
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                # Skip this script itself
                if os.path.abspath(file_path) != this_script_path:
                    python_files.append(file_path)
    
    return python_files

def find_open_python_files():
    """Find currently open Python files in VS Code"""
    # This is a best-effort approach as there's no direct way
    # to get the list of open files in VS Code from an external script
    
    # Get this script's path to exclude it
    this_script_path = os.path.abspath(__file__)
    
    # In some cases, VS Code might write temporary files for open editors
    workspace_root = find_workspace_root()
    
    # Another approach is to check recently modified files
    recently_modified = []
    for root, _, files in os.walk(workspace_root):
        # Skip hidden directories and virtual environments
        if any(part.startswith('.') for part in root.split(os.sep)) or \
           'venv' in root or 'node_modules' in root:
            continue
        
        # Check Python files
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                # Skip this script itself
                if os.path.abspath(file_path) == this_script_path:
                    continue
                # Check if modified in the last 5 minutes
                if time.time() - os.path.getmtime(file_path) < 300:  # 5 minutes
                    recently_modified.append(file_path)
    
    return recently_modified

def check_file_for_qiskit_patterns(file_path):
    """Check if a file contains deprecated Qiskit patterns"""
    # Skip this script itself
    if os.path.abspath(file_path) == os.path.abspath(__file__):
        return False, None
        
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            
        # Check if it contains Qiskit code
        if 'from qiskit import' in content or 'import qiskit' in content:
            # Check for deprecated patterns using more powerful regex
            
            # Check for 'from qiskit import' lines that contain 'Aer'
            if re.search(r'from\s+qiskit\s+import\b.*?\bAer\b', content):
                return True, content
                
            # Check for BasicAer in imports
            if re.search(r'from\s+qiskit\s+import\b.*?\bBasicAer\b', content):
                return True, content
                
            # Check for execute in imports
            if re.search(r'from\s+qiskit\s+import\b.*?\bexecute\b', content):
                return True, content
                
            # Check for execute() pattern in code
            if 'execute(' in content:
                return True, content
                
            # Check for deprecated simulator patterns
            if 'get_backend("qasm_simulator")' in content or "get_backend('qasm_simulator')" in content:
                return True, content
            
    except Exception as e:
        print(f"Error checking {file_path}: {e}")
    
    return False, None

def show_vscode_notification(message):
    """Show a notification in VS Code
    
    This function creates a notification file in the .vscode directory
    that can be picked up by the VS Code extension to show a notification.
    """
    # Create a temporary file for notification
    notifications_dir = os.path.join(find_workspace_root(), '.vscode')
    os.makedirs(notifications_dir, exist_ok=True)
    notification_file = os.path.join(notifications_dir, 'qiskit_notification.json')
    
    # Create a more detailed notification
    notification_data = {
        'message': message,
        'title': 'Qiskit 1.x Compatibility',
        'type': 'info',
        'timestamp': datetime.now().isoformat()
    }
    
    # Write the notification data to the file
    with open(notification_file, 'w') as f:
        json.dump(notification_data, f)
        
    # Also print to console (will be hidden most of the time)
    print(f"[Notification] {message}")

def create_example_file():
    """Create an example file with deprecated Qiskit code for testing"""
    example_content = """# Example Qiskit circuit with deprecated patterns
from qiskit import QuantumCircuit, Aer, execute
from qiskit.visualization import plot_histogram

# Create a Quantum Circuit with 2 qubits
circuit = QuantumCircuit(2, 2)

# Add gates
circuit.h(0)
circuit.cx(0, 1)
circuit.measure([0, 1], [0, 1])

# Simulate the circuit
simulator = Aer.get_backend('qasm_simulator')
circuit_transpiled = transpile(circuit)
result = simulator.run(circuit_transpiled, shots=1000)

# Get and print the results
counts = result.get_counts(circuit)
print(counts)
"""
    example_path = os.path.join(find_workspace_root(), 'example_circuit.py')
    with open(example_path, 'w') as f:
        f.write(example_content)
    print(f"Created example circuit at {example_path}")
    return example_path

def watch_files_once(force=False, verbose=True):
    """Run a single check of all Python files
    
    Args:
        force: Parameter kept for backward compatibility
        verbose: If True, print detailed information
    """
    if verbose:
        print("Running Qiskit Watcher (single run)...")
    
    # Create example file if it doesn't exist
    example_path = os.path.join(find_workspace_root(), 'example_circuit.py')
    if not os.path.exists(example_path):
        create_example_file()
    
    # Check all Python files in workspace
    fixed_files = 0
    all_files = find_python_files_in_workspace()
    
    if verbose:
        print(f"Found {len(all_files)} Python files to check")
    
    for file_path in all_files:
        if verbose:
            print(f"Checking {file_path}...")
        
        needs_fixing, content = check_file_for_qiskit_patterns(file_path)
        if needs_fixing:
            if verbose:
                print(f"  - File needs fixing: {file_path}")
            
            if verbose:
                print(f"  - Processing file...")
            
            if process_file(file_path, verbose=verbose):
                fixed_files += 1
                # Add notification if not in verbose mode (silent background mode)
                if not verbose:
                    show_vscode_notification(
                        f"Fixed deprecated Qiskit code in {os.path.basename(file_path)}\n" +
                        "Updated code to be compatible with Qiskit 1.x"
                    )
        elif verbose:
            print(f"  - No fixes needed for {file_path}")
    
    # Explicitly check the example file
    if os.path.exists(example_path) and example_path not in all_files:
        if verbose:
            print(f"Explicitly checking example file: {example_path}")
        
        needs_fixing, content = check_file_for_qiskit_patterns(example_path)
        if needs_fixing:
            if verbose:
                print(f"  - Example file needs fixing")
                print(f"  - Processing example file...")
            
            if process_file(example_path, verbose=verbose):
                fixed_files += 1
                # Add notification if not in verbose mode
                if not verbose:
                    show_vscode_notification(
                        f"Fixed deprecated Qiskit code in {os.path.basename(example_path)}\n" +
                        "Updated code to be compatible with Qiskit 1.x"
                    )
        elif verbose:
            print(f"  - No fixes needed for example file")
    
    if verbose:
        print(f"Qiskit Watcher completed. Fixed {fixed_files} files.")
    
    return fixed_files

def watch_files_continuously():
    """Run a continuous watcher for Python files
    
    This function runs in the background and automatically fixes deprecated Qiskit
    patterns in Python files as they are opened or modified. It shows a notification
    when a file is fixed, but otherwise runs silently.
    """
    # Run silently in the background, only printing minimal startup information
    print("Qiskit compatibility watcher running in the background")
    print("Watching for deprecated Qiskit code patterns...")
    print("(This window can be minimized)")
    
    try:
        check_interval = 0  # Counter for periodic checks
        
        while True:
            # Always check recently modified and open files
            open_files = find_open_python_files()
            
            # Auto-fix any open files with deprecated patterns
            for file_path in open_files:
                needs_fixing, content = check_file_for_qiskit_patterns(file_path)
                if needs_fixing:
                    if process_file(file_path, verbose=False):
                        # Show a notification when a file is fixed
                        show_vscode_notification(
                            f"Fixed deprecated Qiskit code in {os.path.basename(file_path)}\n" +
                            "Updated code to be compatible with Qiskit 1.x"
                        )
            
            # Check all files in the workspace regularly (every 30 seconds)
            # Decreased from 5 minutes to ensure more frequent checking
            if check_interval >= 30:  # Every 30 seconds
                check_interval = 0
                all_files = find_python_files_in_workspace()
                
                for file_path in all_files:
                    # Skip if already checked as an open file
                    if file_path in open_files:
                        continue
                    
                    # Always check files for deprecated patterns
                    needs_fixing, content = check_file_for_qiskit_patterns(file_path)
                    if needs_fixing:
                        if process_file(file_path, verbose=False):
                            # Show a notification when a file is fixed
                            show_vscode_notification(
                                f"Fixed deprecated Qiskit code in {os.path.basename(file_path)}\n" +
                                "Updated code to be compatible with Qiskit 1.x"
                            )
            
            # Sleep to avoid high CPU usage
            time.sleep(1)
            check_interval += 1
            
    except KeyboardInterrupt:
        print("Qiskit watcher stopped")

#######################
# SETUP FUNCTIONALITY
#######################

def check_python():
    """Check if Python is installed and accessible"""
    try:
        subprocess.run([sys.executable, "--version"], check=True, capture_output=True)
        return True
    except Exception:
        return False

def install_dependencies():
    """Install required dependencies"""
    print("Installing required Python packages...")
    
    try:
        requirements = [
            "qiskit>=1.0.0",
            "qiskit-aer>=0.12.0",
            "matplotlib>=3.7.0",
            "pyperclip>=1.8.2"
        ]
        
        with open("requirements.txt", "w") as f:
            f.write("\n".join(requirements))
        
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print("✅ Dependencies installed successfully")
        return True
    except Exception as e:
        print(f"❌ Error installing dependencies: {e}")
        return False

def setup_vscode_tasks():
    """Set up VS Code tasks"""
    # Find the .vscode directory
    workspace_root = find_workspace_root()
    vscode_dir = os.path.join(workspace_root, ".vscode")
    
    # Create the directory if it doesn't exist
    if not os.path.exists(vscode_dir):
        os.makedirs(vscode_dir)
        print(f"Created directory: {vscode_dir}")
    
    # Check if tasks.json exists
    tasks_file = os.path.join(vscode_dir, "tasks.json")
    
    # Get the actual path to this script, relative to workspace folder
    script_path = os.path.relpath(__file__, find_workspace_root())
    script_path = "${workspaceFolder}/" + script_path.replace("\\", "/")  # Ensure forward slashes
    
    tasks_config = {
        "version": "2.0.0",
        "tasks": [
            {
                "label": "Start Qiskit Compatibility Watcher",
                "type": "shell",
                "command": "python3",
                "args": [script_path, "--watcher"],
                "isBackground": True,
                "presentation": {
                    "reveal": "never",
                    "panel": "dedicated",
                    "showReuseMessage": False,
                    "close": True
                },
                "problemMatcher": [],
                "runOptions": {
                    "runOn": "folderOpen"
                },
                "group": {
                    "kind": "build",
                    "isDefault": True
                }
            },
            {
                "label": "Run Qiskit Watcher Once",
                "type": "shell",
                "command": "python3",
                "args": [script_path, "--once"],
                "presentation": {
                    "reveal": "always",
                    "panel": "shared",
                    "showReuseMessage": False
                },
                "problemMatcher": [],
                "group": {
                    "kind": "build",
                    "isDefault": False
                }
            },
            {
                "label": "Run Qiskit Watcher Once (Force)",
                "type": "shell",
                "command": "python3",
                "args": [script_path, "--once", "--force"],
                "presentation": {
                    "reveal": "always",
                    "panel": "shared",
                    "showReuseMessage": False
                },
                "problemMatcher": [],
                "group": {
                    "kind": "build",
                    "isDefault": False
                }
            },
            {
                "label": "Fix Current Qiskit File",
                "type": "shell",
                "command": "python3",
                "args": [script_path, "-f", "${file}"],
                "presentation": {
                    "reveal": "always",
                    "panel": "shared",
                    "showReuseMessage": False
                },
                "problemMatcher": [],
                "group": {
                    "kind": "build",
                    "isDefault": False
                }
            },
            {
                "label": "Start Qiskit Clipboard Monitor",
                "type": "shell",
                "command": "python3",
                "args": [script_path, "--watch"],
                "isBackground": True,
                "presentation": {
                    "reveal": "always",
                    "panel": "dedicated",
                    "showReuseMessage": False
                },
                "problemMatcher": [],
                "group": {
                    "kind": "build",
                    "isDefault": False
                }
            },
            {
                "label": "Setup Qiskit Tools",
                "type": "shell",
                "command": "python3",
                "args": [script_path, "--setup"],
                "presentation": {
                    "reveal": "always",
                    "panel": "shared",
                    "showReuseMessage": False
                },
                "problemMatcher": [],
                "group": {
                    "kind": "build",
                    "isDefault": False
                }
            }
        ]
    }
    
    # Try to merge with existing tasks.json if it exists
    if os.path.exists(tasks_file):
        try:
            with open(tasks_file, 'r') as f:
                existing_tasks = json.load(f)
            
            # Check if any of our tasks already exist
            qiskit_labels = [task["label"] for task in tasks_config["tasks"]]
            existing_tasks["tasks"] = [task for task in existing_tasks.get("tasks", []) 
                                      if task.get("label") not in qiskit_labels]
            
            # Add our tasks
            existing_tasks["tasks"].extend(tasks_config["tasks"])
            tasks_config = existing_tasks
        except Exception as e:
            print(f"Warning: Could not merge with existing tasks.json: {e}")
    
    try:
        with open(tasks_file, 'w') as f:
            json.dump(tasks_config, f, indent=4)
        print(f"✅ Created VS Code tasks file: {tasks_file}")
        return True
    except Exception as e:
        print(f"❌ Error creating tasks file: {e}")
        return False

def setup():
    """Run the setup process"""
    print("=" * 60)
    print("Qiskit Code Fixer Setup")
    print("=" * 60)
    print("This script will set up the Qiskit Code Fixer to run automatically in VS Code.")
    print()
    
    # Check if Python is installed
    if not check_python():
        print("❌ Python is not installed or not accessible in PATH")
        sys.exit(1)
    
    # Install dependencies
    install_dependencies()
    
    # Set up VS Code tasks
    setup_vscode_tasks()
    
    print("\n" + "=" * 60)
    print("Setup complete! You can now use the Qiskit Code Fixer.")
    print("=" * 60)
    print("\nTo use the Qiskit Code Fixer:")
    print("1. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P)")
    print("2. Type 'Tasks: Run Task'")
    print("3. Select one of the Qiskit fixer tasks:")
    print("   - Start Qiskit Watcher (runs in background)")
    print("   - Run Qiskit Watcher Once (scans all files once)")
    print("   - Fix Current Qiskit File (fixes only the current file)")
    print("   - Start Qiskit Clipboard Monitor (watches clipboard)")

def interactive_mode():
    """Run in interactive mode"""
    print("Qiskit Code Fixer - Interactive Mode")
    print("Paste your Qiskit code below and press Ctrl+D (Unix) or Ctrl+Z (Windows) to process")
    
    try:
        content = sys.stdin.read()
        fixed_content = fix_qiskit_code(content)
        
        if fixed_content != content:
            print("\nFixed Qiskit code:")
            print("=" * 40)
            print(fixed_content)
            print("=" * 40)
            
            if pyperclip:
                set_clipboard_content(fixed_content)
                print("Fixed code has been copied to clipboard!")
        else:
            print("\nNo changes needed.")
    except KeyboardInterrupt:
        print("\nOperation cancelled")

def show_documentation():
    """Display the documentation"""
    print(DOCUMENTATION)

#######################
# MAIN FUNCTION
#######################

def main():
    parser = argparse.ArgumentParser(description="Qiskit Code Fixer - Fix deprecated Qiskit patterns")
    
    group = parser.add_mutually_exclusive_group()
    group.add_argument('-f', '--file', help='Path to Python file to fix')
    group.add_argument('-d', '--directory', help='Directory containing Python files to fix')
    group.add_argument('-i', '--interactive', action='store_true', help='Interactive mode (paste code from stdin)')
    group.add_argument('-w', '--watch', action='store_true', help='Monitor clipboard for Qiskit code')
    group.add_argument('--watcher', action='store_true', help='Monitor Python files in workspace')
    group.add_argument('--once', action='store_true', help='Run the watcher once on all files')
    group.add_argument('--setup', action='store_true', help='Set up the Qiskit fixer and install dependencies')
    group.add_argument('--help-detailed', action='store_true', help='Show detailed help and documentation')
    
    parser.add_argument('--dry-run', action='store_true', help='Show what would be changed without making changes')
    parser.add_argument('--force', action='store_true', help='Fix files even if they were fixed recently')
    parser.add_argument('--quiet', action='store_true', help='Run quietly with minimal output')
    
    args = parser.parse_args()
    
    # Use verbose mode based on quiet flag
    verbose = not args.quiet
    
    if args.file:
        process_file(args.file, args.dry_run, verbose=verbose)
    elif args.directory:
        processed = 0
        for root, _, files in os.walk(args.directory):
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    if process_file(file_path, args.dry_run, verbose=verbose):
                        processed += 1
        if verbose:
            print(f"Processed {processed} files")
    elif args.watch:
        monitor_clipboard()
    elif args.watcher:
        watch_files_continuously()
    elif args.once:
        watch_files_once(args.force, verbose=verbose)
    elif args.setup:
        setup()
    elif args.help_detailed:
        show_documentation()
    elif args.interactive:
        interactive_mode()
    else:
        interactive_mode()

if __name__ == "__main__":
    main()