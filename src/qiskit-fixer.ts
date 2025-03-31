import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';

/**
 * Main class for the Qiskit Fixer functionality
 */
export class QiskitFixer {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private toolsPath: string;
  private isClipboardWatcherRunning: boolean = false;
  private clipboardWatcherProcess: cp.ChildProcess | null = null;
  private notificationQueue: string[] = [];
  private isProcessingNotifications: boolean = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel('Qiskit Fixer');
    
    // Find the path to the consolidated Python script
    this.toolsPath = path.join(context.extensionPath, 'src', 'qiskit_tools.py');
    
    // Register notification watcher
    this.startNotificationWatcher();
  }

  /**
   * Register all the Qiskit Fixer related commands
   */
  public registerCommands() {
    // Register the command to fix the current file
    this.context.subscriptions.push(
      vscode.commands.registerCommand('q.fixQiskitCode', () => this.fixCurrentFile()),
      vscode.commands.registerCommand('q.fixQiskitClipboard', () => this.toggleClipboardMonitor()),
      vscode.commands.registerCommand('q.startQiskitWatcher', () => this.startBackgroundWatcher()),
      vscode.commands.registerCommand('q.runQiskitWatcherOnce', () => this.runWatcherOnce())
    );
  }

  /**
   * Check if required Python packages are installed
   */
  private async checkPythonDependencies(): Promise<boolean> {
    try {
      // Try to run a simple Python command to check if necessary packages are installed
      const result = await this.runPythonScript('import sys; print("Python OK"); sys.exit(0)');
      return result.includes('Python OK');
    } catch (error) {
      console.error('Error checking Python dependencies:', error);
      return false;
    }
  }

  /**
   * Run a Python script directly
   */
  private runPythonScript(script: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonProcess = cp.exec('python3 -c "' + script + '"', (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        if (stderr) {
          this.outputChannel.appendLine(`[Warning] ${stderr}`);
        }
        
        resolve(stdout);
      });
    });
  }

  /**
   * Fix the currently open file
   */
  public async fixCurrentFile() {
    // Get the active editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active file to fix');
      return;
    }

    // Check if it's a Python file
    if (editor.document.languageId !== 'python') {
      vscode.window.showErrorMessage('The active file is not a Python file');
      return;
    }

    // Save the file to ensure the qiskit_tools.py script works with the latest content
    await editor.document.save();

    // Run the qiskit_tools.py script on the current file
    try {
      // Show progress notification
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Fixing Qiskit code...',
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: 'Analyzing Qiskit code...' });
        
        // Get the file path
        const filePath = editor.document.uri.fsPath;
        
        // Run the qiskit_tools.py script with file argument
        const fixProcess = cp.spawn('python3', [this.toolsPath, '-f', filePath]);
        
        let output = '';
        let errorOutput = '';
        
        fixProcess.stdout.on('data', (data) => {
          output += data.toString();
          this.outputChannel.appendLine(data.toString());
        });
        
        fixProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
          this.outputChannel.appendLine(`[Error] ${data.toString()}`);
        });
        
        return new Promise<void>((resolve) => {
          fixProcess.on('close', (code) => {
            progress.report({ increment: 100, message: 'Done' });
            
            if (code === 0) {
              if (output.includes('Fixed Qiskit code')) {
                vscode.window.showInformationMessage('Qiskit code has been updated for 1.x compatibility!');
              } else if (output.includes('No changes needed')) {
                vscode.window.showInformationMessage('This file is already compatible with Qiskit 1.x');
              } else {
                vscode.window.showInformationMessage('No Qiskit code found in file');
              }
            } else {
              vscode.window.showErrorMessage(`Failed to fix Qiskit code: ${errorOutput}`);
            }
            
            resolve();
          });
        });
      });
    } catch (error) {
      console.error('Error fixing Qiskit code:', error);
      vscode.window.showErrorMessage(`Error fixing Qiskit code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Toggle the clipboard monitor on/off
   */
  public async toggleClipboardMonitor() {
    if (this.isClipboardWatcherRunning) {
      // Stop the clipboard watcher
      this.stopClipboardWatcher();
      vscode.window.showInformationMessage('Qiskit clipboard monitor stopped');
    } else {
      // Start the clipboard watcher
      await this.startClipboardWatcher();
    }
  }

  /**
   * Start the clipboard watcher
   */
  private async startClipboardWatcher() {
    try {
      // Check dependencies
      const hasPython = await this.checkPythonDependencies();
      if (!hasPython) {
        vscode.window.showErrorMessage('Python is required for Qiskit clipboard monitoring');
        return;
      }

      // Check if pyperclip is installed
      try {
        await this.runPythonScript('import pyperclip; print("pyperclip OK")');
      } catch (error) {
        const install = await vscode.window.showWarningMessage(
          'The pyperclip package is required for clipboard monitoring. Would you like to install it?',
          'Yes, install pyperclip',
          'No'
        );
        
        if (install === 'Yes, install pyperclip') {
          // Install pyperclip
          await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Installing pyperclip...',
            cancellable: false
          }, async () => {
            try {
              const installProcess = cp.spawn('pip3', ['install', 'pyperclip']);
              
              return new Promise<void>((resolve) => {
                installProcess.on('close', (code) => {
                  if (code === 0) {
                    vscode.window.showInformationMessage('pyperclip installed successfully');
                    resolve();
                  } else {
                    vscode.window.showErrorMessage('Failed to install pyperclip');
                    resolve();
                  }
                });
              });
            } catch (error) {
              vscode.window.showErrorMessage(`Error installing pyperclip: ${error instanceof Error ? error.message : String(error)}`);
            }
          });
        } else {
          vscode.window.showInformationMessage('Clipboard monitoring requires pyperclip. Installation cancelled.');
          return;
        }
      }

      // Start the clipboard watcher process using the consolidated script
      this.clipboardWatcherProcess = cp.spawn('python3', [this.toolsPath, '--watch']);
      this.isClipboardWatcherRunning = true;
      
      // Send output to the output channel
      if (this.clipboardWatcherProcess && this.clipboardWatcherProcess.stdout) {
        this.clipboardWatcherProcess.stdout.on('data', (data) => {
          const output = data.toString();
          this.outputChannel.appendLine(output);
          
          // Show notification when Qiskit code is fixed
          if (output.includes('Detected and fixed Qiskit code in clipboard')) {
            vscode.window.showInformationMessage('Qiskit code in clipboard has been fixed for 1.x compatibility!');
          }
        });
      }
      
      if (this.clipboardWatcherProcess && this.clipboardWatcherProcess.stderr) {
        this.clipboardWatcherProcess.stderr.on('data', (data) => {
          this.outputChannel.appendLine(`[Error] ${data.toString()}`);
        });
      }
      
      if (this.clipboardWatcherProcess) {
        this.clipboardWatcherProcess.on('close', (code) => {
          this.outputChannel.appendLine(`Clipboard watcher process exited with code ${code}`);
          this.isClipboardWatcherRunning = false;
        });
      }
      
      vscode.window.showInformationMessage('Qiskit clipboard monitor started. Code copied to clipboard will be automatically fixed.');
      this.outputChannel.show();
    } catch (error) {
      console.error('Error starting clipboard watcher:', error);
      vscode.window.showErrorMessage(`Error starting clipboard watcher: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop the clipboard watcher
   */
  private stopClipboardWatcher() {
    if (this.clipboardWatcherProcess) {
      // Kill the process
      this.clipboardWatcherProcess.kill();
      this.clipboardWatcherProcess = null;
      this.isClipboardWatcherRunning = false;
    }
  }

  /**
   * Start the background watcher that automatically fixes Qiskit code
   */
  public async startBackgroundWatcher() {
    try {
      // Check dependencies
      const hasPython = await this.checkPythonDependencies();
      if (!hasPython) {
        vscode.window.showErrorMessage('Python is required for Qiskit background watching');
        return;
      }

      // Start the watcher process with the --watcher flag and --quiet option
      const watcherProcess = cp.spawn('python3', [this.toolsPath, '--watcher', '--quiet']);
      
      // Send output to the output channel
      watcherProcess.stdout.on('data', (data) => {
        const output = data.toString();
        this.outputChannel.appendLine(output);
      });
      
      watcherProcess.stderr.on('data', (data) => {
        this.outputChannel.appendLine(`[Error] ${data.toString()}`);
      });
      
      watcherProcess.on('close', (code) => {
        this.outputChannel.appendLine(`Watcher process exited with code ${code}`);
        vscode.window.showInformationMessage('Qiskit watcher stopped. Files will no longer be automatically fixed.');
      });
      
      vscode.window.showInformationMessage('Qiskit watcher started. Files with deprecated patterns will be automatically fixed.');
    } catch (error) {
      console.error('Error starting background watcher:', error);
      vscode.window.showErrorMessage(`Error starting background watcher: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run the watcher once to check all files in the workspace
   */
  public async runWatcherOnce() {
    try {
      // Check dependencies
      const hasPython = await this.checkPythonDependencies();
      if (!hasPython) {
        vscode.window.showErrorMessage('Python is required for Qiskit code fixing');
        return;
      }

      // Show progress notification
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Fixing Qiskit code in workspace...',
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: 'Scanning files...' });
        
        // Run the consolidated script with the --once flag
        const watcherProcess = cp.spawn('python3', [this.toolsPath, '--once']);
        
        let output = '';
        let errorOutput = '';
        
        watcherProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          output += chunk;
          this.outputChannel.appendLine(chunk);
        });
        
        watcherProcess.stderr.on('data', (data) => {
          const chunk = data.toString();
          errorOutput += chunk;
          this.outputChannel.appendLine(`[Error] ${chunk}`);
        });
        
        return new Promise<void>((resolve) => {
          watcherProcess.on('close', (code) => {
            progress.report({ increment: 100, message: 'Done' });
            
            if (code === 0) {
              if (output.includes('Fixed') && output.includes('files')) {
                const match = output.match(/Fixed (\d+) files/);
                const count = match ? match[1] : 'several';
                vscode.window.showInformationMessage(`Fixed Qiskit code in ${count} files for 1.x compatibility`);
              } else {
                vscode.window.showInformationMessage('No Qiskit code found that needed fixing');
              }
            } else {
              vscode.window.showErrorMessage(`Failed to fix Qiskit code: ${errorOutput}`);
            }
            
            resolve();
          });
        });
      });
    } catch (error) {
      console.error('Error running watcher once:', error);
      vscode.window.showErrorMessage(`Error running watcher: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Start a watcher for notification files
   */
  private startNotificationWatcher() {
    // Watch for notifications from the Python scripts
    const notificationsDir = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.vscode');
    const notificationFile = path.join(notificationsDir, 'qiskit_notification.json');
    
    // Check for notifications periodically
    const checkInterval = setInterval(() => {
      try {
        if (fs.existsSync(notificationFile)) {
          const stats = fs.statSync(notificationFile);
          const fileTime = stats.mtime.getTime();
          const now = Date.now();
          
          // Only process notifications that are recent (last 5 seconds)
          if (now - fileTime < 5000) {
            fs.readFile(notificationFile, 'utf8', (err, data) => {
              if (err) {
                console.error('Error reading notification file:', err);
                return;
              }
              
              try {
                const notification = JSON.parse(data);
                if (notification.message) {
                  this.notificationQueue.push(notification.message);
                  this.processNotificationQueue();
                }
              } catch (parseError) {
                console.error('Error parsing notification JSON:', parseError);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error checking for notifications:', error);
      }
    }, 1000);
    
    // Clean up on deactivation
    this.context.subscriptions.push({ dispose: () => clearInterval(checkInterval) });
  }

  /**
   * Process the notification queue
   */
  private processNotificationQueue() {
    if (this.isProcessingNotifications || this.notificationQueue.length === 0) {
      return;
    }
    
    this.isProcessingNotifications = true;
    const message = this.notificationQueue.shift();
    
    vscode.window.showInformationMessage(message || 'Qiskit fixer notification').then(() => {
      this.isProcessingNotifications = false;
      this.processNotificationQueue();
    });
  }

  /**
   * Dispose of resources
   */
  public dispose() {
    this.stopClipboardWatcher();
    this.outputChannel.dispose();
  }
}

/**
 * Register the Qiskit Fixer with the extension
 */
export function registerQiskitFixer(context: vscode.ExtensionContext) {
  const qiskitFixer = new QiskitFixer(context);
  qiskitFixer.registerCommands();
  
  // Register for disposal
  context.subscriptions.push({
    dispose: () => {
      qiskitFixer.dispose();
    }
  });
}