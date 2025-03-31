import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as childProcess from 'child_process';

/**
 * Class that manages the quantum circuit visualization functionality
 */
export class QuantumCircuitVisualizer {
  private context: vscode.ExtensionContext;
  private tempDir: string;
  private latestImagePath: string | undefined;
  private latestCode: string | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    
    // Create a persistent temp directory in the extension's storage path
    // instead of the system temp directory to avoid permission issues
    this.tempDir = path.join(context.globalStoragePath, 'circuit-visualizer');
    
    console.log(`Initializing QuantumCircuitVisualizer`);
    console.log(`Extension path: ${context.extensionPath}`);
    console.log(`Storage path: ${context.globalStoragePath}`);
    console.log(`Temp directory: ${this.tempDir}`);
    
    // Ensure temp directory exists
    try {
      if (!fs.existsSync(this.tempDir)) {
        console.log(`Creating temp directory: ${this.tempDir}`);
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      
      // Test write access
      const testFilePath = path.join(this.tempDir, 'test-write.txt');
      fs.writeFileSync(testFilePath, 'Test write access');
      fs.unlinkSync(testFilePath);
      console.log(`Temp directory ${this.tempDir} is writable`);
    } catch (error) {
      console.error(`Error setting up temp directory: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fallback to a directory in the extension path
      this.tempDir = path.join(context.extensionPath, 'tmp');
      console.log(`Falling back to extension-relative temp directory: ${this.tempDir}`);
      
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    }
    
    // Verify Python and packages on startup
    this.verifyPythonEnvironment().then(result => {
      console.log(`Python environment verification: ${result}`);
      // Store the verification result for later reference
      this.pythonVerificationResult = result;
    }).catch(error => {
      console.warn(`Python environment verification failed: ${error}`);
      // Store the verification error for later reference
      this.pythonVerificationResult = `Error: ${error}`;
    });
  }
  
  private pythonVerificationResult: string | undefined;
  
  /**
   * Verify Python environment including required packages
   */
  private async verifyPythonEnvironment(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create a verification script in the temp directory
      const verifyScriptPath = path.join(this.tempDir, 'verify_python_env.py');
      const verifyScript = `
import sys
import platform

# Print basic environment info
print(f"Python version: {sys.version}")
print(f"Platform: {platform.platform()}")

# Check for required packages
required_packages = ['qiskit', 'matplotlib', 'pylatexenc']
missing_packages = []
installed_packages = []

for package in required_packages:
    try:
        module = __import__(package)
        version = getattr(module, '__version__', 'unknown version')
        installed_packages.append(f"{package} ({version})")
        print(f"✓ {package} {version} found")
    except ImportError:
        missing_packages.append(package)
        print(f"✗ {package} NOT FOUND")

# Print summary
if missing_packages:
    print(f"\\nMissing packages: {', '.join(missing_packages)}")
    print("\\nPlease install missing packages with:")
    print(f"pip install {' '.join(missing_packages)}")
    sys.exit(1)
else:
    print(f"\\nAll required packages installed: {', '.join(installed_packages)}")
    sys.exit(0)
`;

      try {
        fs.writeFileSync(verifyScriptPath, verifyScript);
        console.log(`Python verification script written to ${verifyScriptPath}`);
      } catch (writeError) {
        reject(`Could not write verification script: ${writeError}`);
        return;
      }
      
      // Get configured Python path from VS Code settings
      const pythonPath = vscode.workspace.getConfiguration('python').get<string>('defaultInterpreterPath') || 
                        vscode.workspace.getConfiguration('python').get<string>('pythonPath') || 
                        'python'; // Use system python as a fallback
      
      console.log(`Running Python environment verification with configured Python: ${pythonPath}`);
      const pythonProcess = childProcess.spawn(pythonPath, [verifyScriptPath]);
      
      let pythonOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        pythonOutput += dataStr;
        console.log(`Verification stdout (configured Python): ${dataStr}`);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        pythonOutput += dataStr;
        console.log(`Verification stderr (configured Python): ${dataStr}`);
      });
      
      pythonProcess.on('error', (err) => {
        console.log(`Configured Python verification error: ${err.message}, trying with python...`);
        // If configured Python fails, try with python
        runWithPython();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(`${pythonPath}: ${pythonOutput.trim()}`);
        } else {
          console.log(`Configured Python verification failed with code ${code}, trying with python...`);
          // If configured Python fails, try with python
          runWithPython();
        }
      });
      
      // Function to run with regular python command
      const runWithPython = () => {
        const pythonProcess = childProcess.spawn('python', [verifyScriptPath]);
        
        let pythonOutput = '';
        
        pythonProcess.stdout.on('data', (data) => {
          const dataStr = data.toString();
          pythonOutput += dataStr;
          console.log(`Verification stdout (python): ${dataStr}`);
        });
        
        pythonProcess.stderr.on('data', (data) => {
          const dataStr = data.toString();
          pythonOutput += dataStr;
          console.log(`Verification stderr (python): ${dataStr}`);
        });
        
        pythonProcess.on('error', (err) => {
          reject(`Both python3 and python verification failed: ${err.message}`);
        });
        
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve(`python: ${pythonOutput.trim()}`);
          } else {
            const errorMsg = pythonOutput || 'No output from verification script';
            reject(`Python environment verification failed: ${errorMsg}`);
          }
        });
      };
    });
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
    console.log('Starting circuit visualization process...');
    
    // Get the directory of the active file (if any) to maintain context
    let workingDirectory = undefined;
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;
      if (document.uri.scheme === 'file') {
        workingDirectory = path.dirname(document.uri.fsPath);
        console.log(`Using working directory from active file: ${workingDirectory}`);
      }
    }
    
    // Create media/circuits directory if it doesn't exist
    const circuitsDir = path.join(this.context.extensionPath, 'media', 'circuits');
    try {
      if (!fs.existsSync(circuitsDir)) {
        fs.mkdirSync(circuitsDir, { recursive: true });
        console.log(`Created circuits directory: ${circuitsDir}`);
      }
    } catch (error) {
      console.error(`Failed to create circuits directory: ${error}`);
      vscode.window.showErrorMessage(`Failed to create circuits directory: ${error}`);
      return;
    }
    
    // Directly generate image, passing the working directory
    this.directlyGenerateCircuitImage(code, circuitsDir, workingDirectory);
  }
  
  /**
   * Generate circuit image directly without any webview
   * @param code The quantum circuit code to visualize
   * @param outputDir The directory to save the output image
   * @param workingDirectory Optional working directory for the script to run in
   */
  private async directlyGenerateCircuitImage(code: string, outputDir: string, workingDirectory?: string) {
    // Show progress notification
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating quantum circuit image...',
        cancellable: false
      },
      async (progress) => {
        try {
          // Generate a timestamp for the filename
          const timestamp = new Date().getTime();
          const outputFileName = `circuit_${timestamp}.png`;
          const outputPath = path.join(outputDir, outputFileName);
          
          console.log(`Generating circuit image to: ${outputPath}`);
          progress.report({ message: 'Running Python script...' });
          
          // Get Python path from VS Code settings
          const pythonPath = vscode.workspace.getConfiguration('python').get<string>('defaultInterpreterPath') || 
                           vscode.workspace.getConfiguration('python').get<string>('pythonPath') || 
                           'python'; // Use system python
          
          console.log(`Using Python interpreter: ${pythonPath}`);
          
          // Create a simplified Python script that doesn't rely on temp files or working dir
          const pythonScript = `
import sys
import os
import traceback
import matplotlib
import matplotlib.pyplot as plt

try:
    # Import qiskit
    import qiskit
    from qiskit import QuantumCircuit
    
    # Dictionary to store user code namespace
    user_ns = {
        'qiskit': qiskit,
        'QuantumCircuit': QuantumCircuit,
        'matplotlib': matplotlib,
        'plt': plt,
        'os': os,
        'sys': sys
    }
    
    # Import Aer (with fallbacks for different qiskit versions)
    aer_imported = False
    
    # Option 1: Import from qiskit_aer (newest version)
    try:
        from qiskit_aer import Aer
        user_ns['Aer'] = Aer
        aer_imported = True
        print("Imported Aer from qiskit_aer")
    except ImportError:
        pass
        
    # Option 2: Import from qiskit.providers.aer (middle version)
    if not aer_imported:
        try:
            from qiskit.providers.aer import Aer
            user_ns['Aer'] = Aer
            aer_imported = True
            print("Imported Aer from qiskit.providers.aer")
        except ImportError:
            pass
    
    # Option 3: Import from qiskit (old version)
    if not aer_imported:
        try:
            from qiskit import Aer
            user_ns['Aer'] = Aer
            aer_imported = True
            print("Imported Aer from qiskit")
        except ImportError:
            print("WARNING: Could not import Aer from any location")
    
    # Import execute with fallbacks
    try:
        from qiskit import execute
        user_ns['execute'] = execute
        print("Imported execute from qiskit")
    except ImportError:
        try:
            from qiskit.execute_function import execute
            user_ns['execute'] = execute
            print("Imported execute from qiskit.execute_function")
        except ImportError:
            print("WARNING: Could not import execute function")
            
    # Fix outdated imports in user's code
    user_code = '''${code.replace(/'/g, "\\'")}'''
    
    # Check if we need to fix imports (only if Aer is actually imported from qiskit_aer)
    if aer_imported and user_ns['Aer'].__module__ == 'qiskit_aer':
        print("Checking and fixing Aer imports in user code...")
        
        # Pattern 1: Direct import - from qiskit import Aer
        if "from qiskit import Aer" in user_code:
            print("Replacing 'from qiskit import Aer' with 'from qiskit_aer import Aer'")
            user_code = user_code.replace("from qiskit import Aer", "from qiskit_aer import Aer")
        
        # Pattern 2: Aer imported with other modules - from qiskit import QuantumCircuit, Aer, execute
        import re
        multi_import_pattern = r'from\s+qiskit\s+import\s+(.*?,\s*)?Aer(,.*?)?'
        if re.search(multi_import_pattern, user_code):
            print("Fixing Aer in multi-import statement")
            # First add the qiskit_aer import at the top
            user_code = "from qiskit_aer import Aer\\n" + user_code
            
            # Then remove Aer from the qiskit import line
            def replace_multi_import(match):
                full_import = match.group(0)
                # Remove Aer from the import list
                if ", Aer," in full_import:
                    return full_import.replace(", Aer,", ",")
                elif "Aer," in full_import:  # Aer is first in list
                    return full_import.replace("Aer,", "")
                elif ", Aer" in full_import:  # Aer is last in list
                    return full_import.replace(", Aer", "")
                else:  # Aer is the only import
                    return "# " + full_import + " # Modified by circuit visualizer"
            
            user_code = re.sub(multi_import_pattern, replace_multi_import, user_code)
    
    print("Executing user code...")
    exec(user_code, user_ns)
    
    # Find a circuit in the namespace
    circuit = None
    circuit_name = None
    
    # First look for QuantumCircuit objects
    for name, obj in user_ns.items():
        if name.startswith('__'):
            continue
        if isinstance(obj, qiskit.QuantumCircuit):
            circuit = obj
            circuit_name = name
            print(f"Found circuit: {name}")
            break
    
    # If no direct circuit found, look for objects with circuit attribute
    if circuit is None:
        for name, obj in user_ns.items():
            if name.startswith('__'):
                continue
            try:
                if hasattr(obj, 'circuit') and isinstance(obj.circuit, qiskit.QuantumCircuit):
                    circuit = obj.circuit
                    circuit_name = f"{name}.circuit"
                    print(f"Found circuit in attribute: {circuit_name}")
                    break
            except Exception:
                pass
    
    # If circuit found, draw it and save to file
    if circuit:
        print(f"Drawing circuit: {circuit_name}")
        
        # Ensure the output directory exists
        os.makedirs(os.path.dirname("${outputPath.replace(/\\/g, '\\\\')}"), exist_ok=True)
        
        # Draw the circuit
        figure = circuit.draw(output='mpl')
        plt.savefig("${outputPath.replace(/\\/g, '\\\\')}")
        plt.close(figure)
        print(f"Circuit image saved to: ${outputPath}")
        sys.exit(0)
    else:
        error_msg = "No quantum circuit found in the provided code."
        print(error_msg)
        sys.exit(1)
except Exception as e:
    print(f"Error: {str(e)}")
    traceback.print_exc()
    sys.exit(1)
`;

          // Execute Python directly with code as argument
          // We'll use -c to execute code directly to avoid needing temp files
          const process = childProcess.spawn(pythonPath, ['-c', pythonScript]);
          
          let stdout = '';
          let stderr = '';
          
          process.stdout.on('data', (data: any) => {
            stdout += data.toString();
            console.log(`Python stdout: ${data.toString()}`);
          });
          
          process.stderr.on('data', (data: any) => {
            stderr += data.toString();
            console.log(`Python stderr: ${data.toString()}`);
          });
          
          // Wait for the process to complete
          await new Promise<void>((resolve, reject) => {
            process.on('close', (code: number) => {
              if (code === 0) {
                console.log('Python process executed successfully');
                resolve();
              } else {
                console.error(`Python process failed with code ${code}`);
                reject(new Error(`Python script failed with code ${code}: ${stderr}`));
              }
            });
            
            process.on('error', (err: Error) => {
              console.error(`Failed to run Python: ${err.message}`);
              reject(err);
            });
          });
          
          // Check if the output file was created
          if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            console.log(`Circuit image created: ${outputPath} (${stats.size} bytes)`);
            
            // Show success message with options
            vscode.window.showInformationMessage(
              `Circuit image saved to: ${outputPath}`,
              'Open Image',
              'Open Folder'
            ).then(selection => {
              if (selection === 'Open Image') {
                // Open the image with the default app
                const openCommand = require('os').platform() === 'win32' ? 'explorer' : 'open';
                childProcess.spawn(openCommand, [outputPath]);
              } else if (selection === 'Open Folder') {
                // Open the containing folder
                const openCommand = require('os').platform() === 'win32' ? 'explorer' : 'open';
                childProcess.spawn(openCommand, [outputDir]);
              }
            });
          } else {
            throw new Error(`Output file not created at ${outputPath}`);
          }
        } catch (error) {
          console.error(`Failed to generate circuit image: ${error}`);
          vscode.window.showErrorMessage(`Failed to generate circuit image: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    );
  }
  
  // Python environment details webview method removed
  
  // Old webview method removed

  /**
   * Generate the circuit visualization by running a Python script
   * @param code The quantum circuit code to visualize
   * @param customOutputPath Optional custom output path for the image
   * @param workingDirectory Optional working directory for the script to run in
   */
  private async generateCircuitVisualization(code: string, customOutputPath?: string, workingDirectory?: string): Promise<string | undefined> {
    console.log('Generating circuit visualization...');
    
    // Ensure temp directory exists and is writable
    try {
      if (!fs.existsSync(this.tempDir)) {
        console.log(`Creating temp directory: ${this.tempDir}`);
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      
      // Test write access
      const testFile = path.join(this.tempDir, 'test-write.txt');
      fs.writeFileSync(testFile, 'Test write access');
      fs.unlinkSync(testFile);
      console.log(`Temp directory ${this.tempDir} is writable`);
    } catch (dirError) {
      console.error(`Error with temp directory: ${dirError instanceof Error ? dirError.message : String(dirError)}`);
      // Try to use a different temp directory if the default one fails
      this.tempDir = path.join(os.tmpdir(), `q-circuit-viz-${Math.random().toString(36).substring(2, 10)}`);
      console.log(`Trying alternative temp directory: ${this.tempDir}`);
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // Create a Python script file
    const timestamp = new Date().getTime();
    const scriptPath = path.join(this.tempDir, `circuit_${timestamp}.py`);
    
    // Use the custom output path if provided, otherwise create one in the temp directory
    const outputPath = customOutputPath || path.join(this.tempDir, `circuit_${timestamp}.png`);
    
    // Ensure the output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      console.log(`Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`Script path: ${scriptPath}`);
    console.log(`Output path: ${outputPath}`);
    
    // Write the visualization script
    const visualizationScript = this.createVisualizationScript(code, outputPath, workingDirectory);
    try {
      fs.writeFileSync(scriptPath, visualizationScript);
      console.log('Visualization script written to file');
    } catch (writeError) {
      console.error(`Error writing script file: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
      throw new Error(`Could not write to temporary file: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
    }
    
    try {
      // Execute the Python script
      console.log('Executing Python script...');
      const output = await this.executePythonScript(scriptPath);
      console.log(`Python script execution output: ${output}`);
      
      // Check if the output file was created
      if (fs.existsSync(outputPath)) {
        console.log(`Circuit visualization generated at: ${outputPath}`);
        return outputPath;
      } else {
        console.error(`Output file not found at: ${outputPath}`);
        throw new Error('Failed to generate circuit visualization. Check that Python, Qiskit, and Matplotlib are installed correctly.');
      }
    } catch (error) {
      console.error(`Error during Python script execution: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to execute Python script. Check your Python installation and dependencies.');
      }
    } finally {
      // Clean up the script file but keep it around for debugging
      try {
        // Instead of deleting, rename with .bak extension for debugging
        const backupPath = `${scriptPath}.bak`;
        fs.renameSync(scriptPath, backupPath);
        console.log(`Script file backed up to ${backupPath} for debugging`);
      } catch (cleanupError) {
        console.warn(`Could not back up script file: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
      }
    }
  }

  /**
   * Create the Python script that will generate the circuit visualization
   * @param code The quantum circuit code to visualize
   * @param outputPath The path to save the output image
   * @param workingDirectory Optional working directory for the script to run in
   */
  private createVisualizationScript(code: string, outputPath: string, workingDirectory?: string): string {
    // Add working directory handling to script if provided
    let workingDirLines = '# No working directory provided';
    if (workingDirectory) {
      workingDirLines = `os.chdir("${workingDirectory.replace(/\\/g, '\\\\')}")`;
    }
    return `
import sys
import traceback
import os
import platform

# Set working directory if provided
${workingDirLines}

# Print environment info for debugging
print(f"Python version: {sys.version}")
print(f"Platform: {platform.platform()}")
print(f"Script directory: {os.path.dirname(os.path.abspath(__file__))}")
print(f"Current working directory: {os.getcwd()}")
print(f"Output path: ${outputPath.replace(/\\/g, '\\\\')}")
print(f"Output directory exists: {os.path.isdir(os.path.dirname('${outputPath.replace(/\\/g, '\\\\')}'))}")
print(f"Output directory is writable: {os.access(os.path.dirname('${outputPath.replace(/\\/g, '\\\\')}'), os.W_OK)}")

# Add current directory to Python path to allow relative imports
sys.path.insert(0, os.getcwd())

# First, check for required dependencies
dependencies_error = None

try:
    import matplotlib
    import matplotlib.pyplot as plt
    print(f"Matplotlib version: {matplotlib.__version__}")
except ImportError as e:
    dependencies_error = f"Missing Matplotlib dependency: {str(e)}\\n\\nPlease install with: pip install matplotlib"
    print(f"Matplotlib import error: {str(e)}")

try:
    # Try to import pylatexenc, a common dependency for Qiskit visualization
    import pylatexenc
    print(f"pylatexenc version: {pylatexenc.__version__}")
except ImportError as e:
    print(f"pylatexenc import warning (not critical): {str(e)}")
    print("Note: pylatexenc is optional but recommended for better circuit visualization")
    # Not setting dependencies_error since this is optional

if dependencies_error is None:
    try:
        import qiskit
        from qiskit import QuantumCircuit
        print(f"Qiskit version: {qiskit.__version__}")
    except ImportError as e:
        dependencies_error = f"Missing Qiskit dependency: {str(e)}\\n\\nPlease install with: pip install qiskit"
        print(f"Qiskit import error: {str(e)}")

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
        print(f"Generated error image for missing dependency: {dependencies_error}")
    except Exception as plt_error:
        # If matplotlib fails, just exit with error
        print(f"Failed to generate error image: {str(plt_error)}")
        print(dependencies_error)
    
    sys.exit(1)

# Capture all output and errors
import io
import contextlib
output_buffer = io.StringIO()

def save_error_image(error_message, output_path):
    """Generate an image with the error message"""
    print(f"Creating error image: {error_message}")
    try:
        plt.figure(figsize=(10, 6))
        plt.text(0.5, 0.5, f"Error visualizing circuit:\\n\\n{error_message}",
                horizontalalignment='center', verticalalignment='center',
                fontsize=12, color='red', wrap=True)
        plt.axis('off')
        plt.savefig(output_path)
        plt.close()
        print(f"Error image saved to {output_path}")
    except Exception as img_error:
        print(f"Failed to create error image: {str(img_error)}")

try:    
    # Execute the user code
    user_namespace = {}
    
    # Add common imports that might be needed
    try:
        print("Adding common imports to user namespace...")
        exec("from qiskit import QuantumCircuit", user_namespace)
        exec("from qiskit.visualization import plot_histogram", user_namespace)
        
        # In newer Qiskit versions, execute and Aer are in different modules
        try:
            exec("from qiskit import Aer", user_namespace)
            print("Imported Aer from qiskit package")
        except Exception as aer_error:
            print(f"Note: Could not import Aer from qiskit: {str(aer_error)}")
            try:
                exec("from qiskit_aer import Aer", user_namespace)
                print("Imported Aer from qiskit_aer package")
            except Exception as aer2_error:
                print(f"Note: Could not import Aer from qiskit_aer: {str(aer2_error)}")
        
        try:
            exec("from qiskit import execute", user_namespace)
            print("Imported execute from qiskit package")
        except Exception as exec_error:
            print(f"Note: Could not import execute from qiskit: {str(exec_error)}")
            try:
                exec("from qiskit.primitives import Sampler", user_namespace)
                print("Imported Sampler from qiskit.primitives")
            except Exception as sampler_error:
                print(f"Note: Could not import Sampler: {str(sampler_error)}")
    except Exception as import_error:
        error_msg = f"Error importing Qiskit modules: {str(import_error)}\\n\\n{traceback.format_exc()}"
        print(error_msg)
        save_error_image(error_msg, "${outputPath.replace(/\\/g, '\\\\')}")
        sys.exit(1)
    
    # Set working directory if provided
    ${workingDirLines}
    print(f"Current working directory: {os.getcwd()}")
    
    # Add current directory to Python path to allow relative imports
    sys.path.insert(0, os.getcwd())
    print(f"Python path: {sys.path}")
    
    # Execute the user code
    print("Executing user code...")
    try:
        # Copy built-in modules to user namespace
        user_namespace.update({
            'os': os,
            'sys': sys,
            'qiskit': qiskit,
            'QuantumCircuit': QuantumCircuit,
            'matplotlib': matplotlib,
            'plt': plt
        })
        
        # Ensure Aer is added to user namespace
        try:
            print("Adding Aer simulator to namespace before executing user code...")
            # Try all known Aer import paths and add to user_namespace
            try:
                from qiskit_aer import Aer
                user_namespace['Aer'] = Aer
                print("Added qiskit_aer.Aer to namespace")
            except ImportError:
                try:
                    from qiskit.providers.aer import Aer
                    user_namespace['Aer'] = Aer
                    print("Added qiskit.providers.aer.Aer to namespace")
                except ImportError:
                    try:
                        from qiskit import Aer
                        user_namespace['Aer'] = Aer
                        print("Added qiskit.Aer to namespace")
                    except ImportError:
                        print("WARNING: Could not import Aer from any known location")
                        print("If your code uses Aer, you may need to install qiskit-aer:")
                        print("pip install qiskit-aer")
            
            # Add execute to namespace
            try:
                from qiskit import execute
                user_namespace['execute'] = execute
                print("Added qiskit.execute to namespace")
            except ImportError:
                try:
                    from qiskit.execute_function import execute
                    user_namespace['execute'] = execute
                    print("Added qiskit.execute_function.execute to namespace")
                except ImportError:
                    print("WARNING: Could not import execute function")
        except Exception as pre_exec_error:
            print(f"Error setting up namespace: {pre_exec_error}")
            
        # Write code to a temporary file
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
            temp_file.write("""${code.replace(/"/g, '\\"')}""")
            temp_file_name = temp_file.name
        print(f"User code written to temporary file: {temp_file_name}")
        
        # Execute the code from the file
        with open(temp_file_name, 'r') as f:
            user_code = f.read()
        os.unlink(temp_file_name)  # Clean up the temp file
        with contextlib.redirect_stdout(output_buffer):
            with contextlib.redirect_stderr(output_buffer):
                exec(user_code, user_namespace)
        print("User code executed successfully")
    except Exception as code_error:
        error_msg = f"Error in your quantum circuit code:\\n{str(code_error)}\\n\\n{traceback.format_exc()}"
        print(error_msg)
        save_error_image(error_msg, "${outputPath.replace(/\\/g, '\\\\')}")
        sys.exit(1)
    
    # Output buffer content for debugging
    buffer_content = output_buffer.getvalue()
    if buffer_content:
        print(f"User code output:\\n{buffer_content}")
    
    # Try to find a quantum circuit object in the namespace
    print("Searching for quantum circuit objects...")
    circuit = None
    circuit_names = []
    
    # Debug - print all variables in namespace
    print("Variables in user namespace:")
    for var_name, var_value in user_namespace.items():
        if not var_name.startswith('__') and var_name not in ['contextlib', 'output_buffer']:
            print(f"  {var_name}: {type(var_value).__name__}")
    
    # First look for direct QuantumCircuit instances
    for var_name, var_value in user_namespace.items():
        try:
            if isinstance(var_value, qiskit.QuantumCircuit):
                circuit_names.append(var_name)
                if circuit is None:  # Keep the first one found
                    circuit = var_value
                    print(f"Found quantum circuit: {var_name}")
        except Exception as check_error:
            print(f"Error checking if {var_name} is a QuantumCircuit: {str(check_error)}")
    
    # If no direct circuit was found, check for result objects with circuits
    if circuit is None:
        print("No direct QuantumCircuit instances found, checking for objects with circuit attribute...")
        for var_name, var_value in user_namespace.items():
            try:
                if hasattr(var_value, 'circuit'):
                    circuit = var_value.circuit
                    circuit_names.append(f"{var_name}.circuit")
                    print(f"Found circuit attribute in: {var_name}")
                    break
            except Exception as attr_error:
                print(f"Error checking attributes of {var_name}: {str(attr_error)}")
    
    if circuit is None:
        # If still no circuit, provide a helpful error
        print("No quantum circuit found in the user namespace")
        user_vars = ', '.join([f"{name} ({type(value).__name__})" for name, value in user_namespace.items() 
                            if not name.startswith('__') and name != 'contextlib' and name != 'output_buffer'])
        error_msg = (f"No quantum circuit found in the provided code.\\n\\n"
                    f"Variables found: {user_vars}\\n\\n"
                    f"Make sure you create a QuantumCircuit object and store it in a variable.")
        print(error_msg)
        save_error_image(error_msg, "${outputPath.replace(/\\/g, '\\\\')}")
        sys.exit(1)
    else:
        # Draw the circuit and save to file
        print(f"Visualizing circuit: {', '.join(circuit_names)}")
        try:
            # Ensure the output directory exists
            output_dir = os.path.dirname("${outputPath.replace(/\\/g, '\\\\')}")
            if not os.path.exists(output_dir):
                print(f"Creating output directory: {output_dir}")
                os.makedirs(output_dir, exist_ok=True)
            
            figure = circuit.draw(output='mpl')
            print(f"Circuit diagram generated, saving to {outputPath}...")
            figure.savefig("${outputPath.replace(/\\/g, '\\\\')}")
            plt.close(figure)
            print(f"Successfully visualized circuit: {', '.join(circuit_names)}")
        except Exception as draw_error:
            error_msg = f"Error drawing the circuit:\\n{str(draw_error)}\\n\\n{traceback.format_exc()}"
            print(error_msg)
            save_error_image(error_msg, "${outputPath.replace(/\\/g, '\\\\')}")
            sys.exit(1)
        
except Exception as e:
    error_msg = f"Unexpected error in visualization script: {str(e)}\\n\\n{traceback.format_exc()}"
    print(error_msg)
    try:
        save_error_image(error_msg, "${outputPath.replace(/\\/g, '\\\\')}")
    except Exception as final_error:
        print(f"Failed to create error image in exception handler: {str(final_error)}")
    sys.exit(1)

print("Visualization script completed successfully")
    `;
  }

  /**
   * Execute a Python script and return the output
   */
  private async executePythonScript(scriptPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Show a status notification
      vscode.window.showInformationMessage('Executing Python script for circuit visualization...');
      
      // Log the script path to help with debugging
      console.log(`Executing Python script at: ${scriptPath}`);
      
      // Create a debug log file
      try {
        const debugLogPath = path.join(this.context.extensionPath, 'tmp-debug', 'debug-log.txt');
        const timestamp = new Date().toISOString();
        let debugLog = `\n--- DEBUG LOG ${timestamp} ---\n`;
        debugLog += `Script path: ${scriptPath}\n`;
        debugLog += `Extension path: ${this.context.extensionPath}\n`;
        debugLog += `Storage path: ${this.context.globalStoragePath}\n`;
        debugLog += `Temp dir: ${this.tempDir}\n`;
        
        // Append to debug log (create if doesn't exist)
        fs.appendFileSync(debugLogPath, debugLog);
        
        // Also log the script content
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        fs.appendFileSync(debugLogPath, `\nScript content:\n${scriptContent}\n`);
      } catch (logError) {
        console.error(`Could not write debug log: ${logError}`);
      }
      
      // First, try to check Python version directly to ensure Python is available
      this.checkPythonInstallation().then(pythonInfo => {
        console.log(`Python installation check: ${pythonInfo}`);
        vscode.window.showInformationMessage(`Found Python: ${pythonInfo}`);
      }).catch(err => {
        console.warn(`Python installation check failed: ${err}`);
        vscode.window.showWarningMessage('Could not detect Python installation. Trying anyway...');
      });
      
      // Read the script content and log it for debugging
      try {
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        console.log(`Script content (first 500 chars):\n${scriptContent.substring(0, 500)}...`);
      } catch (readErr) {
        console.error(`Could not read script file: ${readErr}`);
      }
      
      // Get configured Python path from VS Code settings
      const pythonPath = vscode.workspace.getConfiguration('python').get<string>('defaultInterpreterPath') || 
                        vscode.workspace.getConfiguration('python').get<string>('pythonPath') || 
                        'python'; // Use system python as a fallback
      
      console.log(`Using configured Python interpreter: ${pythonPath}`);
      const process = childProcess.spawn(pythonPath, [scriptPath]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        const dataStr = data.toString();
        stdout += dataStr;
        console.log(`Python stdout: ${dataStr}`);
      });
      
      process.stderr.on('data', (data) => {
        const dataStr = data.toString();
        stderr += dataStr;
        console.log(`Python stderr: ${dataStr}`);
      });
      
      // Handle possible error in spawning the process
      process.on('error', (err) => {
        console.error(`Failed to start Python process with ${pythonPath}: ${err.message}`);
        vscode.window.showErrorMessage(`Failed to start Python: ${err.message}`);
        
        // If configured Python fails, try with regular python command
        tryWithPython();
      });
      
      process.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        if (code === 0) {
          vscode.window.showInformationMessage('Circuit visualization generated successfully!');
          resolve(stdout);
        } else {
          console.log(`Python failed with code ${code}, stdout: ${stdout}, stderr: ${stderr}`);
          
          // Log the error to the debug file
          try {
            const debugLogPath = path.join(this.context.extensionPath, 'tmp-debug', 'debug-log.txt');
            const errorLog = `\nPython execution failed with code ${code}\nStdout: ${stdout}\nStderr: ${stderr}\n`;
            fs.appendFileSync(debugLogPath, errorLog);
          } catch (logError) {
            console.error(`Could not write error log: ${logError}`);
          }
          
          // Try with python command as fallback
          tryWithPython();
        }
      });
      
      // Function to try with "python" command
      const tryWithPython = () => {
        vscode.window.showInformationMessage('Trying with "python" command instead of "python3"...');
        console.log('Attempting to execute with python...');
        
        const pythonProcess = childProcess.spawn('python', [scriptPath]);
        
        let pythonStdout = '';
        let pythonStderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
          const dataStr = data.toString();
          pythonStdout += dataStr;
          console.log(`Python alt stdout: ${dataStr}`);
        });
        
        pythonProcess.stderr.on('data', (data) => {
          const dataStr = data.toString();
          pythonStderr += dataStr;
          console.log(`Python alt stderr: ${dataStr}`);
        });
        
        // Handle possible error in spawning the process
        pythonProcess.on('error', (err) => {
          console.error(`Failed to start python process: ${err.message}`);
          
          const errorMessage = `Python execution failed: Could not start Python. 
            Error: ${err.message}. 
            Make sure Python is installed and in your PATH.
            Required packages: qiskit, matplotlib, pylatexenc`;
          
          vscode.window.showErrorMessage(`Failed to start python: ${err.message}`);
          reject(new Error(errorMessage));
        });
        
        pythonProcess.on('close', (pythonCode) => {
          console.log(`Alternative Python process exited with code ${pythonCode}`);
          if (pythonCode === 0) {
            vscode.window.showInformationMessage('Circuit visualization generated successfully!');
            resolve(pythonStdout);
          } else {
            // If we have stderr from either attempt, include it in the error
            const errorDetails = pythonStderr || stderr || 'No error output available';
            
            // Create a detailed error message
            const errorMessage = `Python execution failed with exit code ${pythonCode}. 
              Error details: ${errorDetails}
              
              Please check that:
              1. Python is installed and in your PATH
              2. Required packages (qiskit, matplotlib, pylatexenc) are installed
              3. You have permission to execute Python scripts
              
              Try running these commands in your terminal:
              python --version
              python -c "import qiskit; import matplotlib; print('Packages found')"`;
            
            console.error(`Circuit visualization error: ${errorMessage}`);
            vscode.window.showErrorMessage(`Circuit visualization failed. Python script execution failed with error code ${pythonCode}.`);
            reject(new Error(errorMessage));
          }
        });
      };
    });
  }
  
  /**
   * Check if Python is installed and available
   */
  private async checkPythonInstallation(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Try to get Python version
      console.log('Checking Python installation...');
      
      // First try with python3
      const python3Process = childProcess.spawn('python3', ['--version']);
      
      let python3Output = '';
      
      python3Process.stdout.on('data', (data) => {
        python3Output += data.toString();
      });
      
      python3Process.stderr.on('data', (data) => {
        python3Output += data.toString();
      });
      
      python3Process.on('error', () => {
        // If python3 fails, try with python
        const pythonProcess = childProcess.spawn('python', ['--version']);
        
        let pythonOutput = '';
        
        pythonProcess.stdout.on('data', (data) => {
          pythonOutput += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          pythonOutput += data.toString();
        });
        
        pythonProcess.on('error', (err) => {
          reject(`Both python3 and python commands failed: ${err.message}`);
        });
        
        pythonProcess.on('close', (code) => {
          if (code === 0 && pythonOutput) {
            resolve(`python: ${pythonOutput.trim()}`);
          } else {
            reject('Python installation not found');
          }
        });
      });
      
      python3Process.on('close', (code) => {
        if (code === 0 && python3Output) {
          resolve(`python3: ${python3Output.trim()}`);
        } else {
          // Continue to try with regular python
          const pythonProcess = childProcess.spawn('python', ['--version']);
          
          let pythonOutput = '';
          
          pythonProcess.stdout.on('data', (data) => {
            pythonOutput += data.toString();
          });
          
          pythonProcess.stderr.on('data', (data) => {
            pythonOutput += data.toString();
          });
          
          pythonProcess.on('error', (err) => {
            reject(`Both python3 and python commands failed: ${err.message}`);
          });
          
          pythonProcess.on('close', (code) => {
            if (code === 0 && pythonOutput) {
              resolve(`python: ${pythonOutput.trim()}`);
            } else {
              reject('Python installation not found');
            }
          });
        }
      });
    });
  }

  /**
   * Generate circuit image and save it to the specified directory
   * @param code The quantum circuit code to visualize
   * @param outputDir The directory to save the output image
   * @param workingDirectory Optional working directory for the script to run in
   */
  private async generateCircuitImageOnly(code: string, outputDir: string, workingDirectory?: string) {
    // Show progress notification
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating quantum circuit image...',
        cancellable: false
      },
      async (progress) => {
        try {
          // Generate a timestamp for the filename
          const timestamp = new Date().getTime();
          const outputFileName = `circuit_${timestamp}.png`;
          const outputPath = path.join(outputDir, outputFileName);
          
          console.log(`Generating circuit image to: ${outputPath}`);
          progress.report({ message: 'Running Python script...' });
          
          // Generate the circuit visualization
          const imagePath = await this.generateCircuitVisualization(code, outputPath, workingDirectory);
          if (imagePath) {
            // Verify the image file exists and is accessible
            try {
              const stats = fs.statSync(imagePath);
              if (stats.isFile() && stats.size > 0) {
                console.log(`Image generated successfully: ${imagePath} (${stats.size} bytes)`);
                
                // Show success message with image path
                vscode.window.showInformationMessage(
                  `Circuit image saved to: ${imagePath}`,
                  'Open Image',
                  'Open Folder'
                ).then(selection => {
                  if (selection === 'Open Image') {
                    // Open the image file with the default app
                    vscode.env.openExternal(vscode.Uri.file(imagePath));
                  } else if (selection === 'Open Folder') {
                    // Open the containing folder
                    vscode.env.openExternal(vscode.Uri.file(outputDir));
                  }
                });
                
                // Store the path for later reference
                this.latestImagePath = imagePath;
              } else {
                throw new Error(`Generated image is invalid or empty (${stats.size} bytes)`);
              }
            } catch (error) {
              throw new Error(`Failed to access image file: ${error instanceof Error ? error.message : String(error)}`);
            }
          } else {
            throw new Error('No image path returned from visualization process');
          }
        } catch (error) {
          console.error(`Circuit visualization failed: ${error instanceof Error ? error.message : String(error)}`);
          vscode.window.showErrorMessage(`Failed to generate circuit image: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    );
  }

  // Webview-related methods removed
}