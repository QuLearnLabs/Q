import * as vscode from 'vscode';

// List of quantum computing frameworks with their common imports and functions
const QUANTUM_FRAMEWORKS = {
  qiskit: {
    imports: [
      'from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister',
      'from qiskit_aer import Aer',
      'from qiskit import transpile, execute',
      'from qiskit.visualization import plot_histogram, plot_bloch_multivector',
      'from qiskit.quantum_info import Statevector',
      'from qiskit.primitives import Sampler'
    ],
    gates: [
      'circuit.h(${1:qubit})', 
      'circuit.x(${1:qubit})',
      'circuit.y(${1:qubit})',
      'circuit.z(${1:qubit})',
      'circuit.cx(${1:control_qubit}, ${2:target_qubit})',
      'circuit.ccx(${1:control1}, ${2:control2}, ${3:target})',
      'circuit.measure(${1:qubit_register}, ${2:classical_register})',
      'circuit.barrier()'
    ],
    snippets: [
      {
        label: 'qiskit-circuit-aer',
        detail: 'Create a Qiskit quantum circuit with Aer simulator (Qiskit 1.x)',
        insertText: new vscode.SnippetString(
          '# Imports\n' +
          'from qiskit import QuantumCircuit, transpile\n' +
          'from qiskit_aer import Aer\n\n' +
          'qc = QuantumCircuit(${1:num_qubits}, ${2:num_bits})\n' +
          '# Apply quantum gates\n' +
          'qc.h(${3:0})\n' +
          '# Measure quantum circuit\n' +
          'qc.measure(${4:[0]}, ${5:[0]})\n\n' +
          '# Execute the circuit with Aer\n' +
          'simulator = Aer.get_backend(\'${6:qasm_simulator}\')\n' +
          'compiled_circuit = transpile(qc, simulator)\n' +
          'job = simulator.run(compiled_circuit, shots=${7:1000})\n' +
          'result = job.result()\n' +
          'counts = result.get_counts()\n' +
          'print(counts)'
        )
      },
      {
        label: 'qiskit-circuit-sampler',
        detail: 'Create a Qiskit quantum circuit with Sampler primitive (Qiskit 1.x)',
        insertText: new vscode.SnippetString(
          '# Imports\n' +
          'from qiskit import QuantumCircuit\n' +
          'from qiskit.primitives import Sampler\n\n' +
          'qc = QuantumCircuit(${1:num_qubits}, ${2:num_bits})\n' +
          '# Apply quantum gates\n' +
          'qc.h(${3:0})\n' +
          '# Measure quantum circuit\n' +
          'qc.measure_all()\n\n' +
          '# Execute using Sampler primitive (modern approach)\n' +
          'sampler = Sampler()\n' +
          'job = sampler.run(qc, shots=${4:1000})\n' +
          'result = job.result()\n' +
          'print(result)'
        )
      },
      {
        label: 'qiskit-bell',
        detail: 'Create a Bell state with Qiskit (Qiskit 1.x)',
        insertText: new vscode.SnippetString(
          'from qiskit import QuantumCircuit, transpile\n' +
          'from qiskit_aer import Aer\n' +
          'from qiskit.visualization import plot_histogram\n\n' +
          'qc = QuantumCircuit(2, 2)\n' +
          '# Create Bell state (entanglement)\n' +
          'qc.h(0)\n' +
          'qc.cx(0, 1)\n' +
          '# Measure both qubits\n' +
          'qc.measure([0, 1], [0, 1])\n\n' +
          '# Run on simulator\n' +
          'simulator = Aer.get_backend(\'qasm_simulator\')\n' +
          'compiled_circuit = transpile(qc, simulator)\n' +
          'job = simulator.run(compiled_circuit, shots=${1:1000})\n' +
          'result = job.result()\n' +
          'counts = result.get_counts()\n' +
          'plot_histogram(counts)'
        )
      }
    ]
  },
  cirq: {
    imports: [
      'import cirq',
      'import numpy as np'
    ],
    gates: [
      'cirq.H(${1:qubit})',
      'cirq.X(${1:qubit})',
      'cirq.Y(${1:qubit})',
      'cirq.Z(${1:qubit})',
      'cirq.CNOT(${1:control_qubit}, ${2:target_qubit})',
      'cirq.measure(${1:qubit}, key=${2:\'result\'})'
    ],
    snippets: [
      {
        label: 'cirq-circuit',
        detail: 'Create a basic Cirq quantum circuit',
        insertText: new vscode.SnippetString(
          'qubits = [cirq.GridQubit(0, i) for i in range(${1:num_qubits})]\n' +
          'circuit = cirq.Circuit()\n\n' +
          '# Apply quantum gates\n' +
          'circuit.append(cirq.H(qubits[${2:0}]))\n\n' +
          '# Measure qubits\n' +
          'circuit.append(cirq.measure(*qubits, key=\'${3:result}\'))\n\n' +
          '# Simulate circuit\n' +
          'simulator = cirq.Simulator()\n' +
          'result = simulator.run(circuit, repetitions=${4:1000})\n' +
          'print(result)'
        )
      }
    ]
  },
  pennylane: {
    imports: [
      'import pennylane as qml',
      'import numpy as np'
    ],
    gates: [
      'qml.Hadamard(wires=${1:0})',
      'qml.PauliX(wires=${1:0})',
      'qml.PauliY(wires=${1:0})',
      'qml.PauliZ(wires=${1:0})',
      'qml.CNOT(wires=[${1:0}, ${2:1}])',
      'qml.Toffoli(wires=[${1:0}, ${2:1}, ${3:2}])'
    ],
    snippets: [
      {
        label: 'pennylane-device',
        detail: 'Create a PennyLane quantum device and circuit',
        insertText: new vscode.SnippetString(
          'dev = qml.device(\'${1:default.qubit}\', wires=${2:2})\n\n' +
          '@qml.qnode(dev)\n' +
          'def quantum_circuit(x):\n' +
          '    qml.RX(x[0], wires=0)\n' +
          '    qml.RY(x[1], wires=1)\n' +
          '    qml.CNOT(wires=[0, 1])\n' +
          '    return qml.expval(qml.PauliZ(wires=1))\n\n' +
          'params = np.array([0.54, 0.12], requires_grad=True)\n' +
          'result = quantum_circuit(params)\n' +
          'print(result)'
        )
      }
    ]
  }
};

// Common quantum computing concepts
const QUANTUM_CONCEPTS = [
  { label: 'qubit', detail: 'Basic unit of quantum information' },
  { label: 'quantum gate', detail: 'Operations on qubits that manipulate quantum states' },
  { label: 'superposition', detail: 'Quantum state that is a combination of multiple states' },
  { label: 'entanglement', detail: 'Quantum correlation between particles' },
  { label: 'quantum circuit', detail: 'Sequence of quantum gates applied to qubits' },
  { label: 'measurement', detail: 'Process of observing a quantum state' },
  { label: 'eigenvalue', detail: 'Value associated with eigenvector in quantum mechanics' },
  { label: 'unitary', detail: 'Property of quantum operations preserving norms' },
  { label: 'Hamiltonian', detail: 'Operator representing energy of quantum system' },
  { label: 'quantum algorithm', detail: 'Algorithm designed for quantum computers' }
];

// Quantum algorithms commonly used in education
const QUANTUM_ALGORITHMS = [
  { label: 'Grover\'s algorithm', detail: 'Quantum search algorithm with quadratic speedup' },
  { label: 'Shor\'s algorithm', detail: 'Quantum algorithm for integer factorization' },
  { label: 'Quantum Fourier Transform', detail: 'Quantum version of the discrete Fourier transform' },
  { label: 'Deutsch-Jozsa algorithm', detail: 'Determines if a function is constant or balanced' },
  { label: 'Quantum Phase Estimation', detail: 'Estimates the phase of an eigenvalue of a unitary operator' },
  { label: 'Variational Quantum Eigensolver', detail: 'Hybrid quantum-classical algorithm for ground state energy' },
  { label: 'QAOA', detail: 'Quantum Approximate Optimization Algorithm' },
  { label: 'Quantum teleportation', detail: 'Protocol to transmit quantum states' }
];

/**
 * Creates a completion provider for Python files with quantum computing-specific completions
 */
export class QuantumCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const completionItems: vscode.CompletionItem[] = [];
    const linePrefix = document.lineAt(position).text.substring(0, position.character);
    
    // Get document content to detect which framework is being used
    const docText = document.getText();
    
    // Determine which framework the user is likely using based on imports
    const frameworkInUse = this.detectFramework(docText);
    
    // Add framework-specific completions if a framework is detected
    if (frameworkInUse && frameworkInUse in QUANTUM_FRAMEWORKS) {
      const framework = QUANTUM_FRAMEWORKS[frameworkInUse as keyof typeof QUANTUM_FRAMEWORKS];
      
      // Add import suggestions if user is typing at the top level
      if (position.line < 10 && (linePrefix.trim().startsWith('import') || linePrefix.trim().startsWith('from'))) {
        framework.imports.forEach(importStatement => {
          const item = new vscode.CompletionItem(importStatement, vscode.CompletionItemKind.Module);
          item.detail = `Import for ${frameworkInUse}`;
          completionItems.push(item);
        });
      }
      
      // Add gate suggestions
      framework.gates.forEach(gate => {
        const item = new vscode.CompletionItem(gate.split('(')[0], vscode.CompletionItemKind.Method);
        item.insertText = new vscode.SnippetString(gate);
        item.detail = `Quantum gate (${frameworkInUse})`;
        item.documentation = `A quantum gate operation from ${frameworkInUse}`;
        completionItems.push(item);
      });
      
      // Add code snippets
      framework.snippets.forEach(snippet => {
        const item = new vscode.CompletionItem(snippet.label, vscode.CompletionItemKind.Snippet);
        item.insertText = snippet.insertText;
        item.detail = snippet.detail;
        completionItems.push(item);
      });
    }
    
    // Add general quantum computing concepts
    QUANTUM_CONCEPTS.forEach(concept => {
      const item = new vscode.CompletionItem(concept.label, vscode.CompletionItemKind.Value);
      item.detail = concept.detail;
      completionItems.push(item);
    });
    
    // Add quantum algorithms
    QUANTUM_ALGORITHMS.forEach(algorithm => {
      const item = new vscode.CompletionItem(algorithm.label, vscode.CompletionItemKind.Class);
      item.detail = algorithm.detail;
      completionItems.push(item);
    });
    
    return completionItems;
  }
  
  /**
   * Detects which quantum framework is being used in the document
   */
  private detectFramework(docText: string): keyof typeof QUANTUM_FRAMEWORKS | null {
    // Simple detection based on imports
    if (docText.includes('import qiskit') || docText.includes('from qiskit')) {
      return 'qiskit';
    } else if (docText.includes('import cirq')) {
      return 'cirq';
    } else if (docText.includes('import pennylane') || docText.includes('import qml')) {
      return 'pennylane';
    }
    return null; // No recognized framework
  }
}

/**
 * Registers the quantum completions provider
 */
export function registerQuantumCompletions(context: vscode.ExtensionContext): void {
  // Register for Python files (most quantum frameworks use Python)
  const pythonProvider = vscode.languages.registerCompletionItemProvider(
    { language: 'python', scheme: 'file' },
    new QuantumCompletionProvider()
  );
  
  // Also register for Jupyter notebook cells
  const jupyterProvider = vscode.languages.registerCompletionItemProvider(
    { language: 'jupyter', scheme: 'file' },
    new QuantumCompletionProvider()
  );
  
  // Add to subscriptions for proper disposal
  context.subscriptions.push(pythonProvider, jupyterProvider);
}