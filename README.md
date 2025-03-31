<div 

  <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/"><img src="https://img.shields.io/badge/License-CC--BY--NC--ND%204.0-blue.svg?style=flat-square" alt="License: CC-BY-NC-ND 4.0"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=qulearnlabs.q"><img src="https://img.shields.io/badge/VS_Code-Marketplace-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white" alt="VS Code Marketplace"></a>
  <a href="https://github.com/pas-mllr/Q/releases"><img src="https://img.shields.io/badge/version-1.0.0-brightgreen?style=flat-square" alt="Version"></a>
  <a href="https://www.eitdigital.eu/our-initiatives/deep-tech-talent/"><img src="https://img.shields.io/badge/Supported_by-EIT_Deep_Tech_Talent-orange?style=flat-square" alt="EIT Deep Tech Talent"></a>
</div>


<div align="left">
  <p>The quantum-powered coding buddy you didn't know you needed. Built for QuLearnLabs' next-gen software engineering course.</p>
</div>

## What's Q? 🤔

**Q** is your VS Code quantum copilot, created by the cool folks at [QuLearnLabs](https://quLearnLabs.com) in the Netherlands. Think of it as that quantum physics friend who's always ready to explain the weird stuff in ways that actually make sense. 

It plugs into GitHub Copilot Chat to supercharge your quantum learning journey - offering explanations, code, and answers that don't require a PhD to understand. Whether you're building quantum circuits or wondering how post-quantum crypto works, Q's got your back.

### Why Q Should Be Your Quantum Buddy 💪

- **Learning on Steroids:** Built specifically for QuLearnLabs' curriculum, but useful for anyone diving into the quantum rabbit hole.

- **Double Threat Knowledge:** Tackles both quantum computing (the weird physics stuff) AND post-quantum cryptography (keeping your secrets safe when quantum computers try to break everything).

- **AI + Quantum = Magic:** Level up your skills for the future where AI and quantum computing collide. The tech world's power couple.

- **Euro-Powered Innovation:** Part of Europe's mission to not get left behind in the quantum race. Tech with a purpose!

### Q's Superpowers ✨

- **`/exercise`**  
   Level up your quantum skills with custom coding challenges.

     ```
     /exercise Create a circuit that puts 2 qubits into that spooky entangled state
     ```

- **`/snippet`**  
   Need quantum code? Say no more. Grab ready-to-run snippets for any quantum task.  

     ```
     /snippet Show me how to teleport a qubit using Qiskit - no physics degree required
     ```

- **`/explain`**  
   "Explain it like I'm 5" but for quantum physics. Complex concepts, simple language.  

     ```
     /explain What's this entanglement thing everyone's talking about? How do I code it?
     ```

- **Quantum Circuit Visualizer**  
   Select Qiskit code, right-click, and instantly view your quantum circuit diagram.
   
     ```python
     # Select this code, right-click, and choose "Visualize Quantum Circuit"
     from qiskit import QuantumCircuit
     qc = QuantumCircuit(2)
     qc.h(0)
     qc.cx(0, 1)
     qc.measure_all()
     ```

- **Quantum Code Completions**  
   Type less, quantum more. Smart suggestions that know their Hadamards from their CNOTs.
   
     ```python
     # Watch the quantum magic happen as you type
     from qiskit import Quantum  # Q knows what you need
     circuit.h(0)               # "Maybe add a Hadamard gate here?"
     ```

### Quantum Frameworks Q Speaks 🗣️

Q uses **Qiskit** (IBM's quantum framework) as the default for all code examples, unless you specifically request a different framework.

| Framework        | Made By    | Status            |
|------------------|----------- |-------------------|
| **Qiskit**       | IBM        | ✅ Available & default |
| **Cirq**         | Google     | ✅ Available, just ask |
| **PennyLane**    | Xanadu     | ✅ Available, just ask |
| **Q#**           | Microsoft  | 🔜 Learning It     |
| **Quil/PyQuil**  | Rigetti    | 🔜 Learning It     |
| **QuTiP**        | Open Source| 🔜 Learning It     |
| **Ocean**        | D-Wave     | 🔜 Learning It     |
| **Strawberry Fields** | Xanadu | 🔜 Learning It     |

### Technical Stack 🔧

- **Language**: TypeScript
- **Runtime**: Node.js
- **Extension Framework**: VS Code Extension API
- **AI Integration**: GitHub Copilot Chat API
- **Packaging**: VS Code Extension Bundler

### Directory Structure 📁

```
Q/
├── media/                 # Visual assets and logos
│   └── circuits/          # Generated quantum circuit images
├── src/                   # Core TypeScript source
│   ├── extension.ts       # Main entry point
│   ├── completions.ts     # Quantum code completion provider
│   ├── circuit-visualizer.ts # Quantum circuit visualization
│   ├── qiskit-fixer.ts    # Qiskit 1.x compatibility fixer (TypeScript)
│   ├── qiskit_tools.py    # Qiskit 1.x compatibility fixer (Python)
│   └── sidebar-provider.ts # Welcome and Quick Actions sidebar
├── LICENSE.md             # CC-BY-NC-ND 4.0 License
├── README.md              # Project documentation
├── package.json           # Dependencies and extension metadata
├── tsconfig.json          # TypeScript configuration
└── eslint.config.mjs      # Linting rules
```


## Get Q In Your VS Code 🚀

### The Easy Way (Recommended)
1. **Fire up VS Code**  
2. Hit the **Extensions** button in the sidebar  
3. Type **"Q Quantum"** in the search bar  
4. Smash that **Install** button

### The Hacker Way (For the Curious)
```bash
git clone https://github.com/pas-mllr/Q.git
cd Q
npm install
npm run vscode:prepublish
# A new VSIX file will be generated with version 1.0.0
code --install-extension releases/Q-by-QuLearnLabs-1.0.0.vsix
```

## How To Use Your New Quantum Friend 🤝

### Using the Q Sidebar Interface

1. **Access the Q Sidebar**  
   Click the Q icon in the VS Code Activity Bar to open the sidebar.

2. **Welcome View**  
   The Welcome View provides quick access to Q's features:
   - **Meet Q** - Opens the Copilot Chat with a friendly Q greeting
   - **Ask Questions** - Opens Chat with a pre-populated query about qubits
   - **Get Hands-on** - Switches to the Quick Actions view
   - **QuLearnLabs** - Opens the QuLearnLabs website

3. **Quick Actions View**  
   This view provides direct access to Q's quantum superpowers:
   - **Explain a Concept** - Opens Chat with a query comparing quantum and classical algorithms
   - **Insert Code Snippet** - Opens Chat requesting a beginner-friendly qubit creation snippet
   - **Visualize Quantum Circuit** - Activates the quantum circuit visualization tool
   - **Generate Coding Exercise** - Opens Chat with a query for a qubit superposition exercise

### Chatting with Q

1. **Summon Q in Chat**  
   Click the chat icon or hit `Ctrl+Shift+I` (Windows/Linux) or `⌘+Shift+I` (macOS).

2. **Wake Up Q**  
   Just type `@Q` followed by your burning quantum question.

3. **Unleash Q's Powers**  
   Try these magic commands:
   ```
   @Q /exercise Build me a quantum circuit that can teleport my cat
   @Q /snippet Show me how to make 3 qubits do the quantum tango
   @Q /explain What's Shor's algorithm and why should I care?
   ```
   Or just chat naturally:
   ```
   @Q Hey, what's the difference between superposition and entanglement? Are they like cousins?
   ```

4. **Visualize Quantum Circuits**  
   - Ensure you have the required Python packages installed: `pip install qiskit matplotlib pylatexenc` or `pip3 install qiskit matplotlib pylatexenc`
   - Write or paste Qiskit code in your editor
   - Select the code block
   - Right-click and choose "Visualize Quantum Circuit" (or press Ctrl+Alt+Q / Cmd+Alt+Q)
   - The circuit image will be saved to the `media/circuits` folder
   - A notification will appear with options to open the image or folder
   - If visualization fails, check the error message - it will provide specific instructions to resolve dependency issues

## Qiskit 1.x Compatibility 🔄

Q automatically fixes your code to work with Qiskit 1.x! Two major changes in Qiskit 1.x are handled for you:

```python
# OLD → NEW
from qiskit import Aer  →  from qiskit_aer import Aer
execute(circuit, backend)  →  backend.run(transpile(circuit, backend))
```

### Auto-Fixer: One-Click Solution

Right-click any Python file and select **"Fix Qiskit Code for 1.x Compatibility"** to instantly update your code.

### Setup & Options

**Setup:** Run once to install dependencies
```bash
python3 src/qiskit_tools.py --setup
```

**VS Code Tasks:** Access from Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) → "Tasks: Run Task"
- **Fix Current File** - Update open file only
- **Run Watcher Once** - Scan all files once
- **Start Watcher** - Continuously fix files as you edit 
- **Clipboard Monitor** - Fix code when copied

**Terminal Usage:**
```bash
python3 src/qiskit_tools.py -f file.py  # Fix specific file
python3 src/qiskit_tools.py --watch      # Monitor clipboard
python3 src/qiskit_tools.py --watcher    # Watch all files
```

The fixer safely handles Aer imports, execute() calls, and adds any missing imports - all automatically!

### The Fine Print

This project is licensed under the **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License**. Check the [LICENSE](LICENSE.md) file if you're into legal stuff.

## The People Behind Q

**Check Us Out**: [QuLearnLabs.com](https://www.qulearnlabs.com)  

- **Our Thing**: Getting the next generation of coders quantum-ready before everyone else.  

- **We're All About**: Quantum magic, crypto that quantum computers can't break, and making you a better coder.  


QuLearnLabs is helping Europe level up in the global tech game - especially in quantum computing and next-gen security. 

- **Flattening Learning Curves**: Making quantum concepts click without needing 10 years of physics.  

- **Quantum For Everyone**: Building tools that don't require a PhD to operate.  

- **Future-Proofing Careers**: Preparing Europe's tech talent for the quantum revolution before it hits.

- **Backed By**: The awesome [EIT Deep Tech Talent initiative](https://www.eitdigital.eu/our-initiatives/deep-tech-talent/).

##
 © 2025 QuLearnLabs Foundation • <a href="CHANGELOG.md">Version 1.0.0</a> • Made with ⚛️ + ❤️
</div>