import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as child_process from 'child_process';

/**
 * Class that manages the quantum circuit visualization functionality
 */
export class QuantumCircuitVisualizer {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private tempDir: string;
  private latestImagePath: string | undefined;
  private latestCode: string | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.tempDir = path.join(os.tmpdir(), 'q-circuit-visualizer');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Register the visualize circuit command
   */
  public registerCommand() {
    const disposable = vscode.commands.registerCommand('q.visualizeCircuit', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
      }

      // Check for Python or Jupyter file
      const languageId = editor.document.languageId;
      if (languageId !== 'python' && languageId !== 'jupyter') {
        vscode.window.showInformationMessage('Quantum Circuit Visualizer works with Python and Jupyter files only.');
        return;
      }

      // Get selection or try to find a circuit in the entire file
      let selectedText: string;
      let selection = editor.selection;
      
      if (selection.isEmpty) {
        // If no selection, try to scan the entire file for Qiskit circuit code
        const fullText = editor.document.getText();
        
        // Check if the file contains Qiskit imports
        if (fullText.includes('from qiskit import') || fullText.includes('import qiskit')) {
          // Look for QuantumCircuit instantiations
          const regex = /(\w+)\s*=\s*QuantumCircuit\s*\(/g;
          let match;
          let circuitNames: string[] = [];
          
          while ((match = regex.exec(fullText)) !== null) {
            circuitNames.push(match[1]);
          }
          
          if (circuitNames.length > 0) {
            // If we found circuits, ask the user which one to visualize
            if (circuitNames.length === 1) {
              // If only one circuit, use it directly
              vscode.window.showInformationMessage(`Visualizing circuit: ${circuitNames[0]}`);
              selectedText = fullText;
            } else {
              // If multiple circuits, let the user choose
              const circuitPick = await vscode.window.showQuickPick(circuitNames, {
                placeHolder: 'Select a quantum circuit to visualize'
              });
              
              if (circuitPick) {
                selectedText = fullText;
                vscode.window.showInformationMessage(`Visualizing circuit: ${circuitPick}`);
              } else {
                // User cancelled
                return;
              }
            }
          } else {
            vscode.window.showInformationMessage('Please select a code block that contains a quantum circuit.');
            return;
          }
        } else {
          vscode.window.showInformationMessage('No Qiskit imports found. Please select a code block with a quantum circuit.');
          return;
        }
      } else {
        // Use the selected text
        selectedText = editor.document.getText(selection);
        
        // Basic validation - check if it contains relevant Qiskit code
        if (!selectedText.includes('QuantumCircuit') && 
            !selectedText.includes('qiskit') &&
            !selectedText.includes('circuit')) {
          const answer = await vscode.window.showWarningMessage(
            'The selected code may not contain a quantum circuit. Proceed anyway?',
            'Yes', 'No'
          );
          
          if (answer !== 'Yes') {
            return;
          }
        }
      }

      this.visualizeCircuit(selectedText);
    });

    this.context.subscriptions.push(disposable);
  }

  /**
   * Visualize the quantum circuit from the provided code
   */
  private async visualizeCircuit(code: string) {
    this.latestCode = code;
    
    // Create or show the webview panel
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'qCircuitVisualizer',
        'Quantum Circuit Visualizer',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.file(this.tempDir),
            vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
          ]
        }
      );

      // Handle panel disposal
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });

      // Handle messages from the webview
      this.panel.webview.onDidReceiveMessage(message => {
        if (message.command === 'refresh' && this.latestCode) {
          this.visualizeCircuit(this.latestCode);
        }
      });
    }

    // Show progress indicator
    this.panel.webview.html = this.getLoadingHtml();
    
    try {
      // Generate the circuit visualization
      const imagePath = await this.generateCircuitVisualization(code);
      if (imagePath) {
        this.latestImagePath = imagePath;
        this.updateWebview();
      }
    } catch (error) {
      if (error instanceof Error) {
        this.showError(error.message);
      } else {
        this.showError('An unknown error occurred while visualizing the circuit.');
      }
    }
  }

  /**
   * Generate the circuit visualization by running a Python script
   */
  private async generateCircuitVisualization(code: string): Promise<string | undefined> {
    // Create a Python script file
    const timestamp = new Date().getTime();
    const scriptPath = path.join(this.tempDir, `circuit_${timestamp}.py`);
    const outputPath = path.join(this.tempDir, `circuit_${timestamp}.png`);
    
    // Write the visualization script
    const visualizationScript = this.createVisualizationScript(code, outputPath);
    fs.writeFileSync(scriptPath, visualizationScript);
    
    try {
      // Execute the Python script
      await this.executePythonScript(scriptPath);
      
      // Check if the output file was created
      if (fs.existsSync(outputPath)) {
        return outputPath;
      } else {
        throw new Error('Failed to generate circuit visualization.');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to execute Python script.');
      }
    } finally {
      // Clean up the script file
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    }
  }

  /**
   * Create the Python script that will generate the circuit visualization
   */
  private createVisualizationScript(code: string, outputPath: string): string {
    return `
import sys
import traceback

# First, check for required dependencies
dependencies_error = None

try:
    import matplotlib
    import matplotlib.pyplot as plt
except ImportError as e:
    dependencies_error = f"Missing Matplotlib dependency: {str(e)}\\n\\nPlease install with: pip install matplotlib"

if dependencies_error is None:
    try:
        import qiskit
        from qiskit import QuantumCircuit
    except ImportError as e:
        dependencies_error = f"Missing Qiskit dependency: {str(e)}\\n\\nPlease install with: pip install qiskit"

# Generate an error image if dependencies are missing
if dependencies_error:
    try:
        # Try to generate error image with matplotlib if available
        import matplotlib.pyplot as plt
        plt.figure(figsize=(10, 6))
        plt.text(0.5, 0.5, f"Dependency Error:\\n\\n{dependencies_error}",
                horizontalalignment='center', verticalalignment='center',
                fontsize=12, color='red', wrap=True)
        plt.axis('off')
        plt.savefig("${outputPath.replace(/\\/g, '\\\\')}")
        plt.close()
    except:
        # If matplotlib fails, just exit with error
        print(dependencies_error)
    
    sys.exit(1)

# Capture all output and errors
import io
import contextlib
output_buffer = io.StringIO()

def save_error_image(error_message, output_path):
    """Generate an image with the error message"""
    plt.figure(figsize=(10, 6))
    plt.text(0.5, 0.5, f"Error visualizing circuit:\\n\\n{error_message}",
             horizontalalignment='center', verticalalignment='center',
             fontsize=12, color='red', wrap=True)
    plt.axis('off')
    plt.savefig(output_path)
    plt.close()

try:    
    # Execute the user code
    user_namespace = {}
    
    # Add common imports that might be needed
    try:
        exec("from qiskit import QuantumCircuit, execute, Aer", user_namespace)
        exec("from qiskit.visualization import plot_histogram", user_namespace)
    except Exception as import_error:
        save_error_image(f"Error importing Qiskit modules: {str(import_error)}", "${outputPath.replace(/\\/g, '\\\\')}")
        sys.exit(1)
    
    # Execute the user code
    try:
        with contextlib.redirect_stdout(output_buffer):
            with contextlib.redirect_stderr(output_buffer):
                exec("""${code.replace(/"/g, '\\"').replace(/\\/g, '\\\\')}""", user_namespace)
    except Exception as code_error:
        save_error_image(f"Error in your quantum circuit code:\\n{str(code_error)}\\n\\n{traceback.format_exc()}", "${outputPath.replace(/\\/g, '\\\\')}")
        sys.exit(1)
    
    # Try to find a quantum circuit object in the namespace
    circuit = None
    circuit_names = []
    
    # First look for direct QuantumCircuit instances
    for var_name, var_value in user_namespace.items():
        if isinstance(var_value, qiskit.QuantumCircuit):
            circuit_names.append(var_name)
            if circuit is None:  # Keep the first one found
                circuit = var_value
    
    # If no direct circuit was found, check for result objects with circuits
    if circuit is None:
        for var_name, var_value in user_namespace.items():
            if hasattr(var_value, 'circuit'):
                circuit = var_value.circuit
                circuit_names.append(f"{var_name}.circuit")
                break
    
    if circuit is None:
        # If still no circuit, provide a helpful error
        user_vars = ', '.join([f"{name} ({type(value).__name__})" for name, value in user_namespace.items() 
                            if not name.startswith('__') and name != 'contextlib' and name != 'output_buffer'])
        save_error_image(
            f"No quantum circuit found in the provided code.\\n\\n"
            f"Variables found: {user_vars}\\n\\n"
            f"Make sure you create a QuantumCircuit object and store it in a variable.", 
            "${outputPath.replace(/\\/g, '\\\\')}")
    else:
        # Draw the circuit and save to file
        try:
            figure = circuit.draw(output='mpl')
            figure.savefig("${outputPath.replace(/\\/g, '\\\\')}")
            plt.close(figure)
            print(f"Successfully visualized circuit: {', '.join(circuit_names)}")
        except Exception as draw_error:
            save_error_image(f"Error drawing the circuit:\\n{str(draw_error)}\\n\\n{traceback.format_exc()}", "${outputPath.replace(/\\/g, '\\\\')}")
        
except Exception as e:
    error_msg = f"{str(e)}\\n\\n{traceback.format_exc()}"
    try:
        save_error_image(error_msg, "${outputPath.replace(/\\/g, '\\\\')}")
    except:
        print(error_msg)
        sys.exit(1)
    `
  }

  /**
   * Execute a Python script and return the output
   */
  private async executePythonScript(scriptPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Try python3 first, then fall back to python if needed
      const process = child_process.spawn('python3', [scriptPath]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          // Try with python command if python3 fails
          const pythonProcess = child_process.spawn('python', [scriptPath]);
          
          let pythonStdout = '';
          let pythonStderr = '';
          
          pythonProcess.stdout.on('data', (data) => {
            pythonStdout += data.toString();
          });
          
          pythonProcess.stderr.on('data', (data) => {
            pythonStderr += data.toString();
          });
          
          pythonProcess.on('close', (pythonCode) => {
            if (pythonCode === 0) {
              resolve(pythonStdout);
            } else {
              reject(new Error(`Python execution failed: ${pythonStderr || stderr}`));
            }
          });
        }
      });
    });
  }

  /**
   * Update the webview with the latest circuit visualization
   */
  private updateWebview() {
    if (!this.panel || !this.latestImagePath) {
      return;
    }

    // Convert the image path to a webview URI
    const imageUri = this.panel.webview.asWebviewUri(vscode.Uri.file(this.latestImagePath));
    
    // Update the HTML content
    this.panel.webview.html = this.getWebviewContent(imageUri.toString());
  }

  /**
   * Show an error message in the webview
   */
  private showError(message: string) {
    if (!this.panel) {
      return;
    }

    this.panel.webview.html = this.getErrorHtml(message);
  }

  /**
   * Get the HTML content for the webview
   */
  private getWebviewContent(imageSrc: string): string {
    // Get the extension media URI
    const logoUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'q-logo.png'))
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quantum Circuit Visualizer</title>
    <style>
        body {
            padding: 0;
            margin: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
        }
        header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background-color: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .title {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .title img {
            width: 30px;
            height: 30px;
        }
        .title h1 {
            margin: 0;
            font-size: 18px;
        }
        .controls {
            display: flex;
            gap: 8px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 2px;
            font-size: 13px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .content {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            box-sizing: border-box;
            overflow: auto;
        }
        .circuit-image {
            max-width: 100%;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            border-radius: 4px;
            background-color: white;
        }
        .info {
            margin-top: 20px;
            padding: 10px;
            max-width: 800px;
            text-align: center;
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <header>
        <div class="title">
            <img src="${logoUri}" alt="Q Logo">
            <h1>Quantum Circuit Visualizer</h1>
        </div>
        <div class="controls">
            <button id="refreshBtn">Refresh</button>
        </div>
    </header>
    <div class="content">
        <img class="circuit-image" src="${imageSrc}" alt="Quantum Circuit Diagram">
        <div class="info">
            <p>Select code containing a quantum circuit and use the "Visualize Quantum Circuit" command to visualize it.</p>
            <p>Click the Refresh button to regenerate the visualization with the same code.</p>
        </div>
    </div>
    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            
            document.getElementById('refreshBtn').addEventListener('click', () => {
                vscode.postMessage({
                    command: 'refresh'
                });
            });
        }())
    </script>
</body>
</html>`;
  }

  /**
   * Get the HTML content for the loading state
   */
  private getLoadingHtml(): string {
    // Get the extension media URI
    const logoUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'q-logo.png'))
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quantum Circuit Visualizer</title>
    <style>
        body {
            padding: 0;
            margin: 0;
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
        }
        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }
        .loading img {
            width: 60px;
            height: 60px;
            animation: pulse 1.5s infinite ease-in-out;
        }
        .loading p {
            font-size: 16px;
            margin: 0;
        }
        @keyframes pulse {
            0% { transform: scale(0.9); opacity: 0.7; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(0.9); opacity: 0.7; }
        }
    </style>
</head>
<body>
    <div class="loading">
        <img src="${logoUri}" alt="Loading">
        <p>Generating quantum circuit visualization...</p>
    </div>
</body>
</html>`;
  }

  /**
   * Get the HTML content for error display
   */
  private getErrorHtml(errorMessage: string): string {
    // Get the extension media URI
    const logoUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'q-logo.png'))
    );

    // Check for specific dependency-related errors
    const isMissingQiskit = errorMessage.includes('No module named \'qiskit\'') || 
                            errorMessage.includes('ImportError: qiskit');
    const isMissingMatplotlib = errorMessage.includes('No module named \'matplotlib\'') || 
                                errorMessage.includes('ImportError: matplotlib') ||
                                errorMessage.includes('Matplotlib is building the font cache');
    
    // Generate install command based on detected missing dependencies
    let installCommand = '';
    if (isMissingQiskit && isMissingMatplotlib) {
      installCommand = 'pip install qiskit matplotlib';
    } else if (isMissingQiskit) {
      installCommand = 'pip install qiskit';
    } else if (isMissingMatplotlib) {
      installCommand = 'pip install matplotlib';
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quantum Circuit Visualizer - Error</title>
    <style>
        body {
            padding: 0;
            margin: 0;
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
        }
        header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background-color: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .title {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .title img {
            width: 30px;
            height: 30px;
        }
        .title h1 {
            margin: 0;
            font-size: 18px;
        }
        .controls {
            display: flex;
            gap: 8px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 2px;
            font-size: 13px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .content {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            box-sizing: border-box;
            overflow: auto;
        }
        .error {
            max-width: 800px;
            width: 90%;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 16px;
            border-radius: 4px;
            margin-top: 20px;
        }
        .error h2 {
            margin-top: 0;
            font-size: 16px;
        }
        .error pre {
            white-space: pre-wrap;
            word-break: break-word;
            margin: 10px 0;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border-radius: 2px;
            overflow: auto;
            max-height: 300px;
        }
        .info {
            margin-top: 20px;
            padding: 10px;
            max-width: 800px;
            text-align: left;
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
        }
        .code-block {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-family: monospace;
            display: block;
            white-space: pre;
            overflow-x: auto;
        }
        .dependencies {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-focusBorder);
            padding: 10px 15px;
            margin: 15px 0;
            border-radius: 0 4px 4px 0;
        }
        .dependencies h3 {
            margin-top: 0;
        }
    </style>
</head>
<body>
    <header>
        <div class="title">
            <img src="${logoUri}" alt="Q Logo">
            <h1>Quantum Circuit Visualizer</h1>
        </div>
        <div class="controls">
            <button id="refreshBtn">Try Again</button>
        </div>
    </header>
    <div class="content">
        <div class="error">
            <h2>Error Visualizing Circuit</h2>
            <pre>${errorMessage}</pre>
        </div>
        <div class="info">
            <h3>Required Dependencies</h3>
            <div class="dependencies">
                <p>The Quantum Circuit Visualizer requires the following Python packages:</p>
                <ul>
                    <li><strong>Qiskit</strong> - IBM's quantum computing framework</li>
                    <li><strong>Matplotlib</strong> - Required for rendering circuit diagrams</li>
                </ul>
                ${installCommand ? `<p>Install the required dependencies with:</p>
                <div class="code-block">${installCommand}</div>` : ''}
            </div>
            
            <h3>Common Issues</h3>
            <ul>
                <li><strong>Missing Dependencies</strong> - Run the command above to install required packages</li>
                <li><strong>No Circuit Created</strong> - Make sure your code creates a QuantumCircuit object</li>
                <li><strong>Syntax Errors</strong> - Check your code for Python syntax errors</li>
                <li><strong>Missing Imports</strong> - Ensure you have all necessary imports in your code</li>
                <li><strong>Python Environment</strong> - Make sure you're using the correct Python environment</li>
            </ul>
            
            <h3>Sample Working Code</h3>
            <div class="code-block">from qiskit import QuantumCircuit

# Create a simple 2-qubit circuit
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
qc.measure_all()</div>
        </div>
    </div>
    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            
            document.getElementById('refreshBtn').addEventListener('click', () => {
                vscode.postMessage({
                    command: 'refresh'
                });
            });
        }())
    </script>
</body>
</html>`;
  }
}