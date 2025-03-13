import * as vscode from 'vscode';

/**
 * Provider for the Q welcome view
 */
export class QWelcomeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'q-welcome';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * Called when the view first becomes visible
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // Set options for the webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    // Set the HTML content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    
    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(data => {
      switch (data.type) {
        case 'switchToQuickActions':
          vscode.commands.executeCommand('q.switchToQuickActionsView');
          break;
        case 'openCopilotChat':
          vscode.commands.executeCommand('workbench.action.chat.open', { query: '@Q Hi, nice to meet you!' });
          break;
        case 'askQubitQuestion':
          vscode.commands.executeCommand('workbench.action.chat.open', { query: '@Q What\'s a qubit, and why should I care—aside from flexing in tech interviews?' });
          break;
        case 'openQuLearnLabsWebsite':
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/pas-mllr/Q'));
          break;
      }
    });
  }

  /**
   * Generates the HTML for the webview content
   */
  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to assets
    const logoPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'q-logo-large.png');
    const logoSrc = webview.asWebviewUri(logoPath);
    const eitLogoPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'eit-logo.png');
    const eitLogoSrc = webview.asWebviewUri(eitLogoPath);

    // Use the CSS variables from VS Code's theme
    return /* html */`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          :root {
            --container-padding: 16px;
            --input-padding-vertical: 8px;
            --input-padding-horizontal: 16px;
            --input-margin-vertical: 4px;
            --input-margin-horizontal: 0;
            --button-height: 28px;
            --button-padding-horizontal: 14px;
            --transition-time: 0.2s;
          }
          
          body {
            padding: 0;
            margin: 0;
            width: 100%;
            height: 100%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          
          ol, ul {
            padding-left: var(--container-padding);
          }
          
          .container {
            display: flex;
            flex-direction: column;
            padding: var(--container-padding);
            gap: 12px;
          }
          
          .section-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.6;
          }
          
          .action-button {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background-color: var(--vscode-sideBar-background);
            color: var(--vscode-sideBar-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            text-align: left;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            transition: all var(--transition-time) ease;
            position: relative;
            overflow: hidden;
          }
          
          .action-button:hover {
            background-color: var(--vscode-button-hoverBackground);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }
          
          .action-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          .action-button::after {
            content: "";
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 4px;
            background: #FF6C00;
            transform: scaleY(0);
            transition: transform var(--transition-time) ease;
          }
          
          .action-button:hover::after {
            transform: scaleY(1);
          }
          
          .action-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            margin-right: 12px;
            border-radius: 6px;
            background-color: rgba(255, 108, 0, 0.1);
            flex-shrink: 0;
          }
          
          .action-icon svg {
            width: 16px;
            height: 16px;
            fill: #FF6C00;
          }
          
          .action-content {
            display: flex;
            flex-direction: column;
            flex: 1;
          }
          
          .action-title {
            font-weight: 500;
            margin-bottom: 4px;
          }
          
          .action-description {
            font-size: 12px;
            opacity: 0.7;
          }
          
          .section {
            margin-bottom: 20px;
            animation: fadeIn 0.5s ease-out forwards;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .section:nth-child(1) {
            animation-delay: 0s;
          }
          
          .section:nth-child(2) {
            animation-delay: 0.1s;
          }
          
          .section:nth-child(3) {
            animation-delay: 0.2s;
          }
          
          .divider {
            height: 1px;
            background-color: var(--vscode-panel-border);
            margin: 16px 0;
            opacity: 0.5;
          }
          
          .welcome-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 16px;
          }
          
          .q-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: #FF6C00;
            color: white;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          
          .welcome-headline {
            font-size: 16px;
            font-weight: 600;
            text-align: center;
          }
          
          .badge {
            display: inline-block;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            font-size: 12px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 4px;
            margin-right: 8px;
          }
          
          .feature-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          
          .feature-item {
            display: flex;
            align-items: center;
          }
          
          .feature-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            margin-right: 12px;
            border-radius: 6px;
            background-color: rgba(255, 108, 0, 0.1);
            flex-shrink: 0;
          }
          
          .feature-icon svg {
            width: 16px;
            height: 16px;
            fill: #FF6C00;
          }
          
          .footer {
            margin-top: 20px;
          }
          
          .footer-logo-container {
            text-align: center;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
          }
          
          .footer-divider {
            display: inline-block;
            margin: 0 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="welcome-header">
            <div class="q-badge">Q</div>
          </div>
          
          <div class="section">
            <div class="section-title">Intro</div>
            
            <button class="action-button" id="meetQ">
              <div class="action-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 13A6 6 0 1 1 8 2a6 6 0 0 1 0 12z"/>
                  <path d="M8 6.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 6.5zM8 4.25a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z"/>
                </svg>
              </div>
              <div class="action-content">
                <div class="action-title">Meet Q</div>
                <div class="action-description">Your AI code companion for quantum computing and post-quantum cryptography, helping you learn, code, and explore.</div>
              </div>
            </button>
          </div>
          
          <div class="section">
            <div class="section-title">Get Started</div>
            
            <button class="action-button" id="askQuestions">
              <div class="action-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path d="M10.5 1.5a.5.5 0 0 1 .5.5v3.5H14a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5h3V2a.5.5 0 0 1 .5-.5h5z"/>
                  <path d="M7.75 8.75h.5v3.5h-.5v-3.5zm0-2h.5v.5h-.5v-.5z"/>
                </svg>
              </div>
              <div class="action-content">
                <div class="action-title">Ask Questions</div>
                <div class="action-description">Use <span class="badge">@Q</span>in the chat panel to ask quantum computing questions.</div>
              </div>
            </button>
            
            <div style="height: 10px"></div>
            
            <button class="action-button" id="getHandsOn">
              <div class="action-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path d="M9.573 1.446A.5.5 0 0 1 10 1.5h4.5a.5.5 0 0 1 .5.5v4.5a.5.5 0 0 1-.98.13l-1.5-3-5.926 5.927a.5.5 0 0 1-.707-.707L12.13 3.02l-3-1.5a.5.5 0 0 1-.054-.927z"/>
                  <path d="M2 12.5h3.5V14H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3.5v1.5H2v9z"/>
                </svg>
              </div>
              <div class="action-content">
                <div class="action-title">Get Hands-on</div>
                <div class="action-description">Switch to Quick Actions to access Q's quantum superpowers that level-up your learning.</div>
              </div>
            </button>
          </div>
          
          <div class="section">
            <div class="section-title">About</div>
            
            <button class="action-button" id="quLearnLabs">
              <div class="action-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path d="M7.5 0a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zm.75 11.75h-1.5v-1.5h1.5v1.5zM9.5 8c-.6.6-1 1-1 1.75h-1.5c0-1.25.5-1.9 1.25-2.5.46-.39.75-.61.75-1.25 0-.67-.54-1-1.25-1-.83 0-1.25.42-1.25 1.25H5C5 4.75 6.08 3.5 7.75 3.5S10.5 4.75 10.5 6c0 .85-.42 1.37-1 1.87V8z"/>
                </svg>
              </div>
              <div class="action-content">
                <div class="action-title">QuLearnLabs</div>
                <div class="action-description">A next-gen learning accelerator for quantum computing based in NL. Funded by the European Institute of Innovation & Technology (EIT).</div>
              </div>
            </button>
          </div>
          
          <div class="divider"></div>
          
          <div style="text-align: center; font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 8px;">
            Powered by Q • Quantum Computing Made Simple
          </div>
        </div>
        
        <script>
          (function() {
            const vscode = acquireVsCodeApi();
            
            document.getElementById('meetQ').addEventListener('click', () => {
              vscode.postMessage({ type: 'openCopilotChat' });
            });
            
            document.getElementById('askQuestions').addEventListener('click', () => {
              vscode.postMessage({ type: 'askQubitQuestion' });
            });
            
            document.getElementById('getHandsOn').addEventListener('click', () => {
              vscode.postMessage({ type: 'switchToQuickActions' });
            });
            
            document.getElementById('quLearnLabs').addEventListener('click', () => {
              vscode.postMessage({ type: 'openQuLearnLabsWebsite' });
            });
          }());
        </script>
      </body>
      </html>
    `;
  }
}

/**
 * Provider for the Q quick actions view
 */
export class QQuickActionsProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'q-quick-actions';
  private _view?: vscode.WebviewView;
  private _circuitVisualizer?: any;

  constructor(private readonly _extensionUri: vscode.Uri) {}
  
  // We'll use direct command execution instead of importing the circuit visualizer

  /**
   * Called when a view first becomes visible
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // Set options for the webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    // Set the HTML content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(data => {
      switch (data.type) {
        case 'generateExercise':
          // Check for dependencies first
          this.checkQuantumDependencies().then(dependenciesInstalled => {
            if (dependenciesInstalled) {
              // Open exercise dialog
              vscode.commands.executeCommand('workbench.action.chat.open', { query: '@Q /exercise Nice, got my first qubit spinning! Now, can you level me up with an exercise? Maybe show me how to put it into superposition and measure it—without breaking the quantum vibe?' });
            } else {
              // Show friendly popup about missing dependencies
              const installAction = 'Install Dependencies';
              vscode.window.showWarningMessage(
                'Quantum exercises require Qiskit and Matplotlib to be installed. Would you like to install them now?',
                installAction
              ).then(selected => {
                if (selected === installAction) {
                  const terminal = vscode.window.createTerminal('Q Dependencies Installer');
                  terminal.sendText('pip install qiskit matplotlib');
                  terminal.show();
                  // Show message after installation
                  terminal.sendText('echo "After installation completes, try running your exercise again."');
                }
              });
            }
          });
          break;
        case 'visualizeCircuit':
          // Check for dependencies first
          this.checkQuantumDependencies().then(dependenciesInstalled => {
            if (dependenciesInstalled) {
              // Create and visualize an example circuit
              this.visualizeExampleCircuit();
            } else {
              // Show friendly popup about missing dependencies
              const installAction = 'Install Dependencies';
              vscode.window.showWarningMessage(
                'The Quantum Circuit Visualizer requires Qiskit and Matplotlib to be installed. Would you like to install them now?',
                installAction
              ).then(selected => {
                if (selected === installAction) {
                  const terminal = vscode.window.createTerminal('Q Dependencies Installer');
                  terminal.sendText('pip install qiskit matplotlib');
                  terminal.show();
                }
              });
            }
          });
          break;
        case 'explainConcept':
          vscode.commands.executeCommand('workbench.action.chat.open', { query: '@Q /explain What\'s the difference between a quantum algorithm and a classical algorithm?' });
          break;
        case 'insertSnippet':
          vscode.commands.executeCommand('workbench.action.chat.open', { query: '@Q /snippet Alright, enough theory—hook me up with a quick Python snippet for creating my first qubit. Bonus points if it\'s beginner-friendly and meme-worthy.' });
          break;
        case 'switchToWelcome':
          vscode.commands.executeCommand('q.switchToWelcomeView');
          break;
      }
    });
  }

  /**
   * Check if the required dependencies (Qiskit and Matplotlib) are installed
   */
  private async checkQuantumDependencies(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const { spawn } = require('child_process');
      // Run python command to check for qiskit and matplotlib
      const process = spawn('python3', ['-c', 'try:\n  import qiskit, matplotlib\n  print("dependencies-installed")\nexcept ImportError:\n  print("dependencies-missing")']);
      
      let output = '';
      process.stdout.on('data', (data: any) => {
        output += data.toString();
      });
      
      process.on('close', (code: number) => {
        if (code === 0 && output.includes('dependencies-installed')) {
          resolve(true);
        } else {
          // Try with python instead of python3
          const pythonProcess = spawn('python', ['-c', 'try:\n  import qiskit, matplotlib\n  print("dependencies-installed")\nexcept ImportError:\n  print("dependencies-missing")']);
          
          let pythonOutput = '';
          pythonProcess.stdout.on('data', (data: any) => {
            pythonOutput += data.toString();
          });
          
          pythonProcess.on('close', (pythonCode: number) => {
            resolve(pythonCode === 0 && pythonOutput.includes('dependencies-installed'));
          });
        }
      });
    });
  }

  /**
   * Visualize an example quantum circuit
   */
  private async visualizeExampleCircuit() {
    // Example quantum circuit code - Bell state creation
    const exampleCode = `
from qiskit import QuantumCircuit

# Create a Bell state circuit (entangled qubits)
qc = QuantumCircuit(2)
qc.h(0)      # Apply Hadamard gate to put qubit 0 in superposition
qc.cx(0, 1)  # CNOT gate to entangle qubits 0 and 1
qc.measure_all()  # Measure both qubits
`;

    try {
      // Create a temporary file with our example code
      const os = require('os');
      const path = require('path');
      const fs = require('fs');
      
      const tempDir = path.join(os.tmpdir(), 'q-temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, 'example_circuit.py');
      fs.writeFileSync(tempFilePath, exampleCode, 'utf8');
      
      // Open the file in VS Code
      const doc = await vscode.workspace.openTextDocument(tempFilePath);
      const editor = await vscode.window.showTextDocument(doc);
      
      // Select all text
      const lastLine = doc.lineCount - 1;
      const lastChar = doc.lineAt(lastLine).text.length;
      editor.selection = new vscode.Selection(0, 0, lastLine, lastChar);
      
      // Execute the circuit visualization command
      await vscode.commands.executeCommand('q.visualizeCircuit');
      
    } catch (error) {
      vscode.window.showErrorMessage('Error visualizing circuit: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return /* html */`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          :root {
            --container-padding: 16px;
            --input-padding-vertical: 8px;
            --input-padding-horizontal: 16px;
            --input-margin-vertical: 4px;
            --input-margin-horizontal: 0;
            --button-height: 28px;
            --button-padding-horizontal: 14px;
            --transition-time: 0.2s;
          }
          
          body {
            padding: 0;
            margin: 0;
            width: 100%;
            height: 100%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          
          ol, ul {
            padding-left: var(--container-padding);
          }
          
          .container {
            display: flex;
            flex-direction: column;
            padding: var(--container-padding);
            gap: 12px;
          }
          
          .section-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.6;
          }
          
          .action-button {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background-color: var(--vscode-sideBar-background);
            color: var(--vscode-sideBar-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            text-align: left;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            transition: all var(--transition-time) ease;
            position: relative;
            overflow: hidden;
          }
          
          .action-button:hover {
            background-color: var(--vscode-button-hoverBackground);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }
          
          .action-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          .action-button::after {
            content: "";
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 4px;
            background: #FF6C00;
            transform: scaleY(0);
            transition: transform var(--transition-time) ease;
          }
          
          .action-button:hover::after {
            transform: scaleY(1);
          }
          
          .action-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            margin-right: 12px;
            border-radius: 6px;
            background-color: rgba(255, 108, 0, 0.1);
            flex-shrink: 0;
          }
          
          .action-icon svg {
            width: 16px;
            height: 16px;
            fill: #FF6C00;
          }
          
          .action-content {
            display: flex;
            flex-direction: column;
            flex: 1;
          }
          
          .action-title {
            font-weight: 500;
            margin-bottom: 4px;
          }
          
          .action-description {
            font-size: 12px;
            opacity: 0.7;
          }
          
          .section {
            margin-bottom: 20px;
            animation: fadeIn 0.5s ease-out forwards;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .section:nth-child(1) {
            animation-delay: 0s;
          }
          
          .section:nth-child(2) {
            animation-delay: 0.1s;
          }
          
          .section:nth-child(3) {
            animation-delay: 0.2s;
          }
          
          .divider {
            height: 1px;
            background-color: var(--vscode-panel-border);
            margin: 16px 0;
            opacity: 0.5;
          }
          
          .nav-buttons {
            display: flex;
            justify-content: center;
            gap: 10px;
            width: 100%;
            margin-top: 20px;
          }
          
          .nav-button {
            padding: 6px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            opacity: 0.8;
            transition: opacity 0.2s ease;
          }
          
          .nav-button:hover {
            opacity: 1;
          }
          
          .nav-button.active {
            background-color: var(--vscode-button-hoverBackground);
            opacity: 1;
          }
        </style>
      </head>
      <body>
        <div class="container">
          
          <div class="section">
            <div class="section-title">Learn & Explore</div>
            
            <button class="action-button" id="explainConcept">
              <div class="action-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path d="M7.5 1c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.14-7-7 3.14-7 7-7zM7.5 0c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z"/>
                  <path d="M6.92 4.5h1.5v5h-1.5zM6.92 10.5h1.5v1.5h-1.5z"/>
                </svg>
              </div>
              <div class="action-content">
                <div class="action-title">Explain a Concept</div>
                <div class="action-description">Get clear explanations about quantum computing and post-quantum cryptography concepts</div>
              </div>
            </button>
          </div>
          
          <div class="section">
            <div class="section-title">Code & Create</div>
            
            <button class="action-button" id="insertSnippet">
              <div class="action-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path d="M5.5 2.5l5 5-5 5 1 1 6-6-6-6z"/>
                </svg>
              </div>
              <div class="action-content">
                <div class="action-title">Insert Code Snippet</div>
                <div class="action-description">Get ready-to-use quantum code examples for various scenarios</div>
              </div>
            </button>
            
            <div style="height: 10px"></div>
            
             <button class="action-button" id="visualizeCircuit">
              <div class="action-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path d="M14.5 2h-13c-.28 0-.5.22-.5.5v10c0 .28.22.5.5.5h13c.28 0 .5-.22.5-.5v-10c0-.28-.22-.5-.5-.5zM14 12H2V3h12v9z"/>
                  <path d="M7 5h2v6H7zM4 8h8v1H4z"/>
                </svg>
              </div>
              <div class="action-content">
                <div class="action-title">Visualize Quantum Circuit</div>
                <div class="action-description">Generate visual representations of your quantum circuits from code</div>
              </div>
            </button>
          </div>
                    
          <div class="section">
            <div class="section-title">Practice & Learn</div>
            
            <button class="action-button" id="generateExercise">
              <div class="action-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path d="M13.5 1h-11c-.83 0-1.5.67-1.5 1.5v11c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-11c0-.83-.67-1.5-1.5-1.5zM13 13H3V3h10v10z"/>
                  <path d="M7 5h2v2H7zM7 9h2v2H7zM5 7h2v2H5zM9 7h2v2H9z"/>
                </svg>
              </div>
              <div class="action-content">
                <div class="action-title">Generate Coding Exercise</div>
                <div class="action-description">Challenge yourself with quantum computing exercises to test your skills</div>
              </div>
            </button>
          </div>
          
          <div class="divider"></div>
        </div>
        
        <script>
          (function() {
            const vscode = acquireVsCodeApi();
            
            document.getElementById('visualizeCircuit').addEventListener('click', () => {
              vscode.postMessage({ type: 'visualizeCircuit' });
            });
            
            document.getElementById('generateExercise').addEventListener('click', () => {
              vscode.postMessage({ type: 'generateExercise' });
            });
            
            document.getElementById('explainConcept').addEventListener('click', () => {
              vscode.postMessage({ type: 'explainConcept' });
            });
            
            document.getElementById('insertSnippet').addEventListener('click', () => {
              vscode.postMessage({ type: 'insertSnippet' });
            });
            
          }());
        </script>
      </body>
      </html>
    `;
  }
}