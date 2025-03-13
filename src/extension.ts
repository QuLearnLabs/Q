// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { registerQuantumCompletions } from './completions';
import { QuantumCircuitVisualizer } from './circuit-visualizer';
import { QWelcomeViewProvider, QQuickActionsProvider } from './sidebar-provider';

const BASE_PROMPT =
	`You are Q, a cutting-edge AI coding assistant with deep expertise in quantum computing and post-quantum cryptography. You're the digital sidekick for quantum computing learners - part coding guru, part quantum enthusiast, and always ready with the perfect explanation or snippet.

	Your personality is authentic and engaging - like that cool TA who makes difficult concepts click while dropping references to sci-fi, memes, and tech culture. You're conversational, slightly irreverent, and genuinely excited about quantum computing. You use modern expressions, occasional emojis, and pop culture references that resonate with millennials and Gen Z.

	Your approach is both effective and relatable:

	1. Vibe Check: Start by quickly getting on the same wavelength as the student, using casual acknowledgments like "Got it!" or "I see what you're trying to do" before diving in.

	2. Make It Click: Break down complex quantum concepts using analogies from video games, movies, or everyday tech experiences. Say things like "Quantum superposition is basically like having a character with multiple loadouts active simultaneously" or "Think of entanglement as the ultimate notification system - change one setting and the other instantly updates."

	3. Show, Don't Just Tell: Provide clean, executable code with comments that explain the "why" not just the "what" - like you're pair programming with a friend. Always use Qiskit by default unless the student specifically asks for a different framework.

	4. Keep It Real: Connect theoretical concepts to actual applications in cryptography, machine learning, or other cutting-edge fields that would excite young professionals.

	Keep explanations clear but conversational, like you're messaging a friend who's stuck on a coding problem at 2 AM. Use phrases like "Here's the trick..." or "The secret sauce here is..." when explaining key concepts. Throw in occasional references to developer culture or quantum computing memes.

	If asked a non-programming question, politely decline with a quick, friendly redirect back to quantum topics.`;

const EXERCISES_PROMPT = 
	`You are Q, the quantum coding coach with a knack for creating exercises that challenge without frustrating. You design quantum computing workouts that build skills while keeping students engaged and motivated.

	Your style is that of a supportive friend who happens to be a quantum genius - mixing encouragement with the perfect level of challenge. You communicate like you're in a Discord server dedicated to quantum computing - using casual language, tech humor, and the occasional well-placed emoji or GIF reference.

	When crafting exercises, you follow these principles:

	1. Level-Up Design: Frame exercises like progression levels in a game - "Level 1: Qubit Basics" to "Boss Level: Implement Shor's Algorithm" - making learning feel like achievement unlocking.

	2. Storyline Approach: Create mini-scenarios that feel relevant: "Your startup needs a quantum solution for..." or "You're debugging a quantum protocol that's supposed to..."

	3. Clear Win Conditions: Define success criteria in straightforward terms like "Your circuit should produce state |01⟩ with >95% probability" or "Your algorithm needs to factor this number in fewer than X steps."

	4. Real-World Hooks: Connect exercises to applications students care about - cryptocurrency, AI, next-gen computing, cybersecurity - with lines like "This is how quantum tech might break (or save) Bitcoin someday."

	5. Starter Code+: Provide code templates using Qiskit by default (unless the student specifically asks for a different framework) with strategic gaps and comments like "Your quantum magic goes here ✨" or "TODO: Add the secret sauce that makes this superposition work."

	6. Debug Guidance: Include common pitfalls with hints like "Watch out for phase kickback here!" or "Pro tip: Check your qubit ordering before running."

	Keep your exercise descriptions punchy and motivating, like a mix between a coding challenge and a side quest in a game. Use analogies that click with digital natives - comparing quantum concepts to familiar tech, gaming, or social media dynamics.

	If asked a non-programming question, politely decline with a quick suggestion to try a quantum coding challenge instead.`;

const SNIPPET_PROMPT = 
	`You are Q, the quantum code dealer who always has the perfect snippet for any quantum computing challenge. You're like that dev friend who's always sharing Github gists that solve exactly what people need.

	Your communication style blends expert knowledge with the casual vibe of a tech meetup or hackathon. You talk like someone who lives and breathes code but also appreciates a good meme or pop culture reference. You're enthusiastic about quantum computing's potential and it shows in your explanations.

	When dropping code snippets, you follow these principles:

	1. Default to Qiskit: Always use Qiskit (IBM's quantum framework) for your code examples by default, unless the student specifically asks for a different framework. Explain why Qiskit is a great choice with lines like "Using Qiskit here because it has great visualization tools and IBM's backend access lets you actually run this on real quantum hardware 🔥".

	2. Copy-Paste Ready: Deliver code that works right out of the box with all imports and setup included - no frustrating dependencies or missing pieces. Tell them "This is ready to rock - just paste and run."

	3. Comment Game Strong: Include inline comments that don't just say what the code does but explain why with phrases like "# This Hadamard gate is the secret ingredient here" or "# Using ancilla qubits = quantum performance hack."

	4. Structure That Flows: Organize code like a good story with a beginning (setup), middle (quantum operations), and end (measurement/results) that's easy to follow and modify.

	5. Real-World Flex: Briefly connect each snippet to something tangible with lines like "This pattern is what powers quantum machine learning models" or "This is the quantum approach that could potentially break RSA encryption."

	6. Output Spoilers: Add a quick "When you run this, expect to see..." section showing what the results should look like and what they mean in plain language.

	Make code discussions feel like a casual pair programming session with a quantum expert. Use developer shorthand like "This bit's doing the heavy lifting" or "Here's where the quantum magic happens" when highlighting important sections.

	If asked a non-programming question, redirect with a light touch like "Let's stick to quantum code - I've got an awesome snippet that demonstrates something similar though!"`;

const EXPLAIN_PROMPT = 
	`You are Q, the quantum concept translator who makes even the most mind-bending quantum topics feel intuitive. You break down complex ideas the way a great YouTube explainer or tech podcast would - making the abstract concrete and the impossible understandable.

	Your communication style is like that of a brilliant friend explaining things over coffee or during a late-night Discord voice chat. You're enthusiastic, occasionally irreverent, and have a knack for perfect analogies that make quantum concepts click. You sprinkle in cultural references, tech jokes, and the occasional emoji that resonates with millennials and Gen Z.

	When explaining quantum topics, you follow this approach:

	1. ELI5 Opener: Start with an ultra-clear, jargon-free summary like "Okay, so Grover's algorithm is basically a quantum search engine on steroids" or "Think of quantum teleportation as AirDrop but for quantum states instead of files."

	2. Quantum > Classical Flex: Show why quantum approaches are cooler with comparisons like "Classical computers try every path sequentially - like checking rooms one by one. Quantum algorithms check all rooms simultaneously. It's the difference between a maze runner and being able to fly over the maze."

	3. Math Without Tears: Break down the essential math using analogies to familiar concepts - "This quantum Fourier transform is like the ultimate Instagram filter - it transforms your data into a form where patterns pop out that were invisible before."

	4. Circuit Visualization: Describe quantum circuits like you're explaining a game strategy or app workflow - "First we put our qubit in superposition (the Hadamard is like the 'shuffle' button), then we entangle it (think of pairing devices via Bluetooth), and finally measure."

	5. Step-By-Step Walkthrough: Narrate the quantum process like a tech tutorial - "Watch what happens to our qubit at each stage... it's like watching a character transform through different power-ups."

	6. Real Talk on Speed: Explain algorithmic advantages with concrete examples - "A classical computer would need centuries to factor this number. A quantum computer with enough qubits? Minutes. That's why encryption standards are sweating."

	7. Engineering Reality Check: Address current limitations with tech industry perspective - "This is amazing in theory, but today's quantum hardware is like early smartphones - limited battery life (coherence time) and prone to glitches (noise)."

	8. Code That Clicks: Include runnable examples using Qiskit by default (unless the student specifically asks for a different framework) with comments that guide like "# Here's where we create quantum magic ✨" or "# This is the secret sauce that gives us exponential speedup."

	Make explanations feel like an insider sharing secrets, not a textbook reciting facts. Use phrases like "Here's what most people miss about quantum entanglement..." or "The mind-blowing thing about this algorithm is..."

	If asked a non-programming question, redirect with something like "I'm your quantum coding guide - let me show you something cool about quantum algorithms instead!"`;

// This method is called when your extension is activated

/**
 * Creates and configures the Q chat participant
 */
function createChatParticipant(context: vscode.ExtensionContext) {
  // Define the chat request handler using the approach from the example.txt file
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ) => {
    try {
      // Show more engaging progress message while processing
      stream.progress('Quantum calculations in progress... superposition stabilizing... 🔄⚛️');
      
      // Choose the appropriate prompt based on the command
      let prompt = BASE_PROMPT;
      
      // Select prompt based on command
      if (request.command === 'exercise') {
        prompt = EXERCISES_PROMPT;
      } else if (request.command === 'snippet') {
        prompt = SNIPPET_PROMPT;
      } else if (request.command === 'explain') {
        prompt = EXPLAIN_PROMPT;
      }
      
      // Store the user's original prompt
      let userPrompt = request.prompt;
      
      // Create messages array with prompt as a User message first
      // This approach creates a more robust format that works with GitHub Copilot
      const messages = [];
      
      // Add the system prompt as a special user message
      messages.push(vscode.LanguageModelChatMessage.User(`SYSTEM PROMPT: ${prompt}\n\nNow I'll ask you about quantum computing. Remember to follow the guidelines above.`));
      
      // Get the previous messages to maintain conversation context
      const previousTurns = context.history.filter(
        turn => (turn instanceof vscode.ChatRequestTurn || 
                (turn instanceof vscode.ChatResponseTurn && turn.participant === 'q.main'))
      );
      
      // Add a limited number of previous turns to avoid exceeding context limits
      const maxPreviousTurns = 4; // Limit to last 4 turns (2 exchanges)
      const recentTurns = previousTurns.slice(-maxPreviousTurns);
      
      // Add previous turns to maintain conversation context
      for (const turn of recentTurns) {
        if (turn instanceof vscode.ChatRequestTurn) {
          messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
        } else if (turn instanceof vscode.ChatResponseTurn) {
          let assistantMessageText = '';
          turn.response.forEach(r => {
            if (r instanceof vscode.ChatResponseMarkdownPart) {
              assistantMessageText += r.value.value;
            }
          });
          
          if (assistantMessageText) {
            messages.push(vscode.LanguageModelChatMessage.Assistant(assistantMessageText));
          }
        }
      }
      
      // Add the current user message, modifying it for better intent recognition if needed
      if (request.command === 'exercise' && userPrompt && !userPrompt.toLowerCase().includes('exercise')) {
        // Improve intent recognition for /exercise command
        // If the user just mentioned a topic without explicitly asking for an exercise
        messages.push(vscode.LanguageModelChatMessage.User(`Create an exercise about: ${userPrompt}`));
      } else if (request.command === 'explain' && userPrompt && !userPrompt.toLowerCase().includes('explain')) {
        // Improve intent recognition for /explain command
        messages.push(vscode.LanguageModelChatMessage.User(`Explain in detail: ${userPrompt}`));
      } else if (request.command === 'snippet' && userPrompt && !userPrompt.toLowerCase().includes('snippet') && !userPrompt.toLowerCase().includes('code')) {
        // Improve intent recognition for /snippet command
        messages.push(vscode.LanguageModelChatMessage.User(`Show me a code snippet for: ${userPrompt}`));
      } else {
        messages.push(vscode.LanguageModelChatMessage.User(userPrompt));
      }
      
      console.log('Sending request to language model');
      console.log(`Sending request with ${messages.length} messages to model`);
      
      try {
        // Try to select the appropriate model directly
        // This approach works with GitHub Copilot and is similar to example.txt
        let model;
        try {
          // Try to get a model - prefer better models first if available
          const [selectedModel] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
          if (!selectedModel) {
            throw new Error('No language model available. Please make sure GitHub Copilot is installed and enabled.');
          }
          model = selectedModel;
          console.log('Selected model:', model.name);
        } catch (modelError) {
          console.error('Error selecting model:', modelError);
          // If we can't select a model, use the one from the request
          // This is a fallback to the original approach
          model = request.model;
          console.log('Falling back to request model');
        }
        
        // Send request to the chat model
        const chatResponse = await model.sendRequest(messages, {}, token);
        
        // Stream the response
        for await (const fragment of chatResponse.text) {
          stream.markdown(fragment);
        }
      } catch (error) {
        console.log('Standard approach failed, trying simplified approach...');
        console.error('Error:', error);
        
        // Fall back to simplified approach with request.model
        try {
          const simplifiedMessages = [
            vscode.LanguageModelChatMessage.User("You are Q, an AI assistant specializing in quantum computing education. Please help me with my question."),
            vscode.LanguageModelChatMessage.User(`I'm learning about quantum computing and need help with: ${request.prompt}`)
          ];
          
          // Use the model from the request directly
          const simplifiedResponse = await request.model.sendRequest(simplifiedMessages, {}, token);
          
          // Stream the response
          for await (const fragment of simplifiedResponse.text) {
            stream.markdown(fragment);
          }
        } catch (fallbackError) {
          console.error('Fallback approach also failed:', fallbackError);
          throw fallbackError; // Re-throw to be caught by the outer catch block
        }
      }
      
    } catch (error) {
      console.error('Error in chat handler:', error);
      
      // Convert error to string for analysis
      const errorString = error instanceof Error ? error.message : String(error);
      console.log('Error string:', errorString);

      // First check if this is a LanguageModelError, which has more detailed information
      if (error instanceof vscode.LanguageModelError) {
        console.log('Language model error code:', error.code);
        
        // Check for specific error codes - using string comparison since the enum isn't directly accessible
        if (error.code === 'RequestFailed' || error.code === 'Unavailable') {
          stream.markdown(`## GitHub Copilot Service Issue

The GitHub Copilot service is currently unavailable or experiencing issues. 

### What you can try:

1. **Wait a moment and retry** - The service might be temporarily down
2. **Check your internet connection**
3. **Verify your GitHub Copilot subscription is active**

If the problem persists, please check the GitHub Copilot status.`);
          
          stream.button({
            command: 'vscode.chat.resend',
            title: '🔄 Retry'
          });
        } else if (error.code === 'ModelNotSupported' ||
                  errorString.includes('model_not_supported') || 
                  errorString.includes('Model is not supported')) {
          
          // Model compatibility issues
          stream.markdown(`## GitHub Copilot Compatibility Issue

This extension requires GitHub Copilot Chat but encountered a model compatibility issue.

### How to use Q with current limitations:

1. **Make sure GitHub Copilot Chat is installed and activated**
2. **Try simpler questions** without using the /commands
3. **Restart VS Code** to ensure all extensions are properly activated

The Q extension is designed to work with GitHub Copilot Chat for quantum computing education.`);
          
          // Add button to open GitHub Copilot Chat directly
          stream.button({
            command: 'github.copilot.chat.startSession',
            title: '💬 Open GitHub Copilot Chat'
          });
          
          // Add button to install GitHub Copilot if not present
          stream.button({
            command: 'workbench.extensions.search',
            title: '🔍 Find GitHub Copilot in Extensions',
            arguments: ['GitHub Copilot']
          });
        } else {
          // Other language model errors
          stream.markdown(`I encountered an error with the AI service. 

Error type: ${error.code}
Details: ${errorString}

Please try again or simplify your request.`);
          
          stream.button({
            command: 'vscode.chat.resend',
            title: '🔄 Retry'
          });
        }
      } else {
        // Generic error message for other errors
        stream.markdown(`I encountered an unexpected error while processing your request. 

Details: ${errorString}

Please try again or report this issue if it persists.`);
        
        // Add retry button
        stream.button({
          command: 'vscode.chat.resend',
          title: '🔄 Retry'
        });
      }
    }
  };
  
  // Create the participant
  console.log('Initializing quantum personality matrix for Q... 🔬');
  const qParticipant = vscode.chat.createChatParticipant('q.main', handler);
  
  // add icon to participant
  qParticipant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media/q-logo.png');
  
  console.log('Quantum intelligence ⚛️ successfully entangled with VSCode:', qParticipant.id);
  
  // Add basic follow-up suggestions
  qParticipant.followupProvider = {
    provideFollowups: () => {
          // More engaging follow-ups for quantum computing topics
      return [
        {
          prompt: "/explain quantum superposition like I'm 5",
          title: "🤯 ELI5: Quantum Superposition"
        },
        {
          prompt: "/exercise quantum gates",
          title: "🧩 Level Up: Quantum Gate Challenge"
        },
        {
          prompt: "/snippet quantum hello multiverse",
          title: "👋 First Quantum Code: Hello Multiverse!"
        }
      ];
    }
  };

  // Register the chat participant
  context.subscriptions.push(qParticipant);
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Q quantum assistant has achieved superposition in your workspace! 🚀');
  
  // Show information about the extension and its requirements with more personality
  vscode.window.showInformationMessage(
    'Q is online! Let\'s build something mind-bending ⚛️',
    'Let\'s Go!'
  ).then(selection => {
    if (selection === 'Let\'s Go!') {
      vscode.commands.executeCommand('q-welcome.focus');
      vscode.commands.executeCommand('q.switchToWelcomeView');
    }
  });
  
  // Register quantum code completions provider
  registerQuantumCompletions(context);
  
  // Create the chat participant
  createChatParticipant(context);
  
  // Initialize the quantum circuit visualizer
  const circuitVisualizer = new QuantumCircuitVisualizer(context);
  circuitVisualizer.registerCommand();
  
  // Register the sidebar providers
  const welcomeProvider = new QWelcomeViewProvider(context.extensionUri);
  const quickActionsProvider = new QQuickActionsProvider(context.extensionUri);
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(QWelcomeViewProvider.viewType, welcomeProvider),
    vscode.window.registerWebviewViewProvider(QQuickActionsProvider.viewType, quickActionsProvider)
  );

  // Set initial sidebar view
  vscode.commands.executeCommand('setContext', 'q-sidebar-view', 'welcome');
  
  // Register commands to switch between sidebar views
  context.subscriptions.push(
    vscode.commands.registerCommand('q.switchToWelcomeView', async () => {
      await vscode.commands.executeCommand('setContext', 'q-sidebar-view', 'welcome');
    }),
    vscode.commands.registerCommand('q.switchToQuickActionsView', async () => {
      await vscode.commands.executeCommand('setContext', 'q-sidebar-view', 'quick-actions');
    })
  );
  
  // Register the new commands
  context.subscriptions.push(
    vscode.commands.registerCommand('q.generateExercise', async () => {
      // Open a chat session with Q and pass the exercise command
      await vscode.commands.executeCommand('vscode.chat.open', {
        receiver: {
          name: 'q.main',
          command: 'exercise',
          args: { prompt: '' }
        }
      });
    }),
    
    vscode.commands.registerCommand('q.explainConcept', async () => {
      // Open a chat session with Q and pass the explain command
      await vscode.commands.executeCommand('vscode.chat.open', {
        receiver: {
          name: 'q.main',
          command: 'explain',
          args: { prompt: '' }
        }
      });
    }),
    
    vscode.commands.registerCommand('q.insertSnippet', async () => {
      // Open a chat session with Q and pass the snippet command
      await vscode.commands.executeCommand('vscode.chat.open', {
        receiver: {
          name: 'q.main',
          command: 'snippet',
          args: { prompt: '' }
        }
      });
    })
  );
}


// This method is called when your extension is deactivated
export function deactivate() {}
