
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessageData, AppData, ActionButtonProps, BotResponse } from './types';
import { AppPhase, INITIAL_APP_DATA, FIRESTORE_DEV_RULES_EXAMPLE, STORAGE_DEV_RULES_EXAMPLE, GENKIT_EXAMPLE_CODE } from './constants';
import ChatMessage from './components/ChatMessage';

const App: React.FC = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessageData[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [currentPhase, setCurrentPhase] = useState<AppPhase>(AppPhase.GREETING);
  const [appData, setAppData] = useState<AppData>(INITIAL_APP_DATA);
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addMessage = useCallback((sender: 'user' | 'bot', text: React.ReactNode, actions?: ActionButtonProps[], isLoading?: boolean) => {
    setChatHistory(prev => [...prev, { id: Date.now().toString(), sender, text, timestamp: new Date(), actions, isLoading }]);
  }, []);
  
  const processUserDecision = useCallback((decision: 'Yes' | 'No' | 'Unsure', serviceKey?: keyof AppData['services'] | keyof AppData['localSetup'], nextPhaseYes?: AppPhase, nextPhaseNo?: AppPhase, explanation?: string) => {
    addMessage('user', decision);
    
    let newAppData = { ...appData };
    let nextBotText: React.ReactNode = '';
    let nextBotActions: ActionButtonProps[] | undefined = undefined;
    let nextP = currentPhase;

    if (decision === 'Unsure' && explanation) {
      nextBotText = (
        <>
          <p>{explanation}</p>
          <p className="mt-2">So, based on that, will you need this feature? (Yes/No)</p>
        </>
      );
      nextBotActions = [
        { label: 'Yes', onClick: () => processUserDecision('Yes', serviceKey, nextPhaseYes, nextPhaseNo) },
        { label: 'No', onClick: () => processUserDecision('No', serviceKey, nextPhaseYes, nextPhaseNo) },
      ];
    } else {
      const needed = decision === 'Yes';
      if (serviceKey) {
        if ('services' in newAppData && serviceKey in newAppData.services) {
          newAppData.services[serviceKey as keyof AppData['services']].needed = needed;
        } else if ('localSetup' in newAppData && serviceKey in newAppData.localSetup) {
           newAppData.localSetup[serviceKey as keyof AppData['localSetup']] = needed;
        }
      }
      setAppData(newAppData);
      nextP = needed ? (nextPhaseYes || currentPhase) : (nextPhaseNo || currentPhase);
      // The actual text for 'Yes'/'No' will be handled by getBotResponse which triggers next
    }
    
    if (nextBotText) { // Only if 'Unsure' was processed with explanation
        addMessage('bot', nextBotText, nextBotActions);
    }
    // For Yes/No, the phase change will trigger the next bot response via useEffect
    setCurrentPhase(nextP);
  }, [appData, currentPhase, addMessage]);


  const getBotResponse = useCallback((): BotResponse => {
    const commonYesNoUnsure = (serviceKey: keyof AppData['services'] | keyof AppData['localSetup'], nextPhaseYes: AppPhase, nextPhaseNo: AppPhase, explanation: string): ActionButtonProps[] => [
      { label: 'Yes', onClick: () => processUserDecision('Yes', serviceKey, nextPhaseYes, nextPhaseNo) },
      { label: 'No', onClick: () => processUserDecision('No', serviceKey, nextPhaseYes, nextPhaseNo) },
      { label: 'Unsure', onClick: () => processUserDecision('Unsure', serviceKey, nextPhaseYes, nextPhaseNo, explanation) },
    ];
    
    const commonNextAction = (label: string = "Next", nextP: AppPhase): ActionButtonProps[] => [
        { label, onClick: () => { addMessage('user', label); setCurrentPhase(nextP); } }
    ];

    switch (currentPhase) {
      case AppPhase.GREETING:
        return {
          text: (
            <>
              <h1 className="text-2xl font-bold mb-2 text-sky-400">Hello! I'm your Firebase Setup & Prompt Assistant!</h1>
              <p>My goal is to help you prepare your Firebase and Google Cloud environment *before* you use Firebase Studio. This will help prevent common issues and get you to a production-ready app faster!</p>
              <p className="mt-2">Let's start with the big idea. What's the name or core concept of your app?</p>
            </>
          ),
          nextPhase: AppPhase.COLLECT_APP_IDEA,
        };
      case AppPhase.COLLECT_APP_IDEA:
        return { text: "What are 1-3 main things a user will DO in your app? (e.g., 'create posts', 'chat with friends', 'track expenses'). Please list them separated by commas." };
      case AppPhase.COLLECT_CORE_FEATURES:
        return { text: "Great! Now let's think about the services you'll need.", actions: commonNextAction("Let's Start Service Setup", AppPhase.ASK_AUTH) };
      
      // --- Service Mapping ---
      case AppPhase.ASK_AUTH:
        return { 
          text: "Will users need to create accounts or log in to your app? This is for **Firebase Authentication**.",
          actions: commonYesNoUnsure('auth', AppPhase.COLLECT_AUTH_PROVIDERS, AppPhase.ASK_FIRESTORE, "Firebase Authentication handles user sign-up, sign-in, password recovery, and supports various providers like Email/Password, Google, Facebook, etc. Most apps with user-specific data or features need this.")
        };
      case AppPhase.COLLECT_AUTH_PROVIDERS:
        return { text: "Okay, Authentication it is! Which sign-in methods do you envision? (e.g., 'Email/Password, Google, Anonymous'). Please list them separated by commas."};
      
      case AppPhase.ASK_FIRESTORE:
        return { 
            text: "Will your app need to store and retrieve structured data, like user profiles, posts, or product information? This is for **Firestore Database**.",
            actions: commonYesNoUnsure('firestore', AppPhase.COLLECT_FIRESTORE_COLLECTIONS, AppPhase.ASK_STORAGE, "Firestore is a NoSQL document database great for storing and syncing app data in real-time. It's flexible and scales well. Use it for things like user profiles, game states, chat messages, product catalogs, etc.")
        };
      case AppPhase.COLLECT_FIRESTORE_COLLECTIONS:
        return { text: "Excellent, Firestore will be useful. What are some potential main collections you'll need? (e.g., 'users, posts, products'). Comma-separated."};

      case AppPhase.ASK_STORAGE:
        return {
            text: "Will users need to upload files like images, videos, or documents? This is for **Firebase Storage**.",
            actions: commonYesNoUnsure('storage', AppPhase.COLLECT_STORAGE_PATHS, AppPhase.ASK_FUNCTIONS, "Firebase Storage is used for storing user-generated content like photos, videos, and other files. It's secure and integrates well with Firebase Authentication and Firestore.")
        };
      case AppPhase.COLLECT_STORAGE_PATHS:
        return { text: "Got it, Storage is in. What are some potential folder paths you might use? (e.g., 'user_avatars/, product_images/, shared_documents/'). Comma-separated."};
      
      case AppPhase.ASK_FUNCTIONS:
        return {
            text: "Will your app need custom backend logic that runs in response to events (like a new user signing up) or HTTP requests? This is for **Cloud Functions for Firebase**.",
            actions: commonYesNoUnsure('functions', AppPhase.COLLECT_FUNCTIONS_IDEAS, AppPhase.ASK_VERTEX_AI, "Cloud Functions let you run backend code without managing servers. They're great for tasks like sending notifications, processing data after an upload, performing database operations triggered by events, or creating custom API endpoints. Using Functions often requires upgrading to the Blaze (pay-as-you-go) plan.")
        };
      case AppPhase.COLLECT_FUNCTIONS_IDEAS:
        return { text: "Cloud Functions sound like a plan. What are some ideas for functions you might need? (e.g., 'process new user signup, send welcome email, generate daily report'). Comma-separated."};

      case AppPhase.ASK_VERTEX_AI:
        return {
            text: "Are you planning to incorporate Generative AI features like chatbots, content generation, or image analysis? This would involve **Vertex AI & Genkit**.",
            actions: commonYesNoUnsure('vertexAI', AppPhase.COLLECT_VERTEX_AI_DESCRIPTION, AppPhase.ASK_PLATFORM, "Vertex AI provides access to Google's powerful AI models (like Gemini), and Genkit is a framework that helps you build, deploy, and manage AI-powered features, often using Cloud Functions. This also typically requires the Blaze plan and enabling the Vertex AI API in your Google Cloud project.")
        };
      case AppPhase.COLLECT_VERTEX_AI_DESCRIPTION:
        return { text: "Exciting! Describe the main AI-powered feature you're envisioning (e.g., 'AI chatbot for customer support', 'generate creative story prompts based on user input')."};

      case AppPhase.ASK_PLATFORM:
         return { 
            text: "What platform(s) are you targeting for your app? (e.g., 'Web, iOS, Android'). This helps set up the Firebase project correctly.",
            actions: commonYesNoUnsure('platform', AppPhase.COLLECT_PLATFORM_TYPES, AppPhase.CONSOLE_ACTIONS_RECAP, "Firebase supports Web, iOS, Android, and even Unity, Flutter, and C++. Knowing your target helps in generating the right configuration snippets.")
        }; // Always needs platform, so no "No" path here that skips COLLET_PLATFORM_TYPES.
      case AppPhase.COLLECT_PLATFORM_TYPES:
        return { text: "Which platforms specifically? (e.g., 'Web', 'iOS, Android', 'Web, Android'). Comma-separated." };

      // --- Console Actions Recap ---
      case AppPhase.CONSOLE_ACTIONS_RECAP: {
        let actionsList: string[] = [];
        if (appData.services.auth.needed) actionsList.push(`Enable chosen sign-in providers (${appData.services.auth.config?.providers || 'as discussed'}) in Firebase Console > Authentication > Sign-in method.`);
        if (appData.services.firestore.needed) {
            actionsList.push(`In Firebase Console > Firestore Database: Create database, select a region, and set initial security rules. For development, you can use:\n\`\`\`\n${FIRESTORE_DEV_RULES_EXAMPLE}\n\`\`\`\n (Remember to refine for production!)`);
        }
        if (appData.services.storage.needed) {
            actionsList.push(`In Firebase Console > Storage: Get started, select a region, and set initial security rules. For development:\n\`\`\`\n${STORAGE_DEV_RULES_EXAMPLE}\n\`\`\`\n (Refine for production!)`);
        }
        if (appData.services.functions.needed) actionsList.push("Remember Cloud Functions usually require upgrading your Firebase project to the Blaze (pay-as-you-go) plan.");
        if (appData.services.vertexAI.needed) {
            actionsList.push("For Vertex AI & Genkit: Ensure Blaze plan is active. In Google Cloud Console, ENABLE the Vertex AI API. Check IAM permissions: your Cloud Functions service account (usually `PROJECT_ID@appspot.gserviceaccount.com`) needs the 'Vertex AI User' role (or more specific ones like 'Vertex AI Service Agent' if it's managing resources) to call Vertex AI models.");
        }
        if (appData.services.platform.needed && appData.services.platform.config?.types) {
             actionsList.push(`In Firebase Console > Project Overview: Add your app(s) for these platforms: ${appData.services.platform.config.types}. Get the necessary configuration snippets (e.g., \`firebaseConfig\` for Web).`);
        }
        
        if (actionsList.length === 0) {
            return { text: "Looks like you haven't selected any services requiring specific console actions yet. Let's move to local setup.", actions: commonNextAction("Local Setup", AppPhase.ASK_FIREBASE_TOOLS)};
        }

        return {
          text: (
            <>
              <h2 className="text-xl font-semibold mb-3 text-sky-400">Phase 1 Complete: Console Action Summary</h2>
              <p>Based on your choices, here are the key actions to perform in your Firebase/GCP console:</p>
              <ul className="list-disc list-inside space-y-2 my-3 bg-slate-800 p-4 rounded-md">
                {actionsList.map((action, i) => <li key={i} className="whitespace-pre-wrap">{action}</li>)}
              </ul>
              <p>Have you noted these or are you ready to perform them? It's important to do these before we generate the final prompt.</p>
            </>
          ),
          actions: [
            { label: "I've done them / I'm ready!", onClick: () => { addMessage('user', "I've done them / I'm ready!"); setAppData(d => ({...d, allConsoleActionsConfirmed: true})); setCurrentPhase(AppPhase.ASK_FIREBASE_TOOLS); } },
            { label: "I need more time", onClick: () => { addMessage('user', "I need more time"); addMessage('bot', "No problem! Take your time. Let me know when you're ready to continue with local setup."); setCurrentPhase(AppPhase.CONFIRM_CONSOLE_ACTIONS_DONE);}} // Stays in a waiting phase
          ]
        };
      }
      case AppPhase.CONFIRM_CONSOLE_ACTIONS_DONE: // Waiting phase
         return { text: "Okay, let me know when you've completed the console actions and are ready for local setup steps!", actions: [
            { label: "I'm ready for local setup now!", onClick: () => { addMessage('user', "I'm ready for local setup now!"); setAppData(d => ({...d, allConsoleActionsConfirmed: true})); setCurrentPhase(AppPhase.ASK_FIREBASE_TOOLS);}}
         ]};

      // --- Local Setup ---
      case AppPhase.ASK_FIREBASE_TOOLS:
        return { 
            text: "Let's move to your local development environment. Are the Firebase CLI tools (`firebase-tools`) installed and are you logged in (`firebase login`)?",
            actions: commonYesNoUnsure(
                'firebaseToolsInstalled', 
                AppPhase.ASK_FIREBASE_INIT, 
                AppPhase.ASK_FIREBASE_INIT, // Still go to next, but with a reminder
                "The Firebase CLI (`firebase-tools`) is essential for initializing your project locally, deploying, and managing emulators. You can install it with `npm install -g firebase-tools` and then log in using `firebase login`."
            )
        };
      case AppPhase.ASK_FIREBASE_INIT:
        let initReminder = "";
        if (appData.localSetup.firebaseToolsInstalled === false) {
            initReminder = "Remember to install `firebase-tools` and log in first! ";
        }
        return { 
            text: `${initReminder}Have you run \`firebase init\` in your project directory and selected the services you need (e.g., Firestore, Functions, Storage, Emulators)?`,
            actions: commonYesNoUnsure(
                'firebaseInitDone', 
                appData.services.platform.config?.types?.toLowerCase().includes('web') ? AppPhase.ASK_FIREBASE_SDK : (appData.services.vertexAI.needed ? AppPhase.ASK_GENKIT_INIT : AppPhase.ALL_SETUP_CONFIRMED_CHECK),
                appData.services.platform.config?.types?.toLowerCase().includes('web') ? AppPhase.ASK_FIREBASE_SDK : (appData.services.vertexAI.needed ? AppPhase.ASK_GENKIT_INIT : AppPhase.ALL_SETUP_CONFIRMED_CHECK),
                "Running `firebase init` in your project's root directory links your local project to your Firebase project. You'll be prompted to select which Firebase services you want to use (like Firestore, Functions, Storage) and set up configuration files. Using emulators (`firebase init emulators`) is highly recommended for local development."
            )
        };
      case AppPhase.ASK_FIREBASE_SDK:
        if (!appData.services.platform.config?.types?.toLowerCase().includes('web')) {
            setCurrentPhase(appData.services.vertexAI.needed ? AppPhase.ASK_GENKIT_INIT : AppPhase.ALL_SETUP_CONFIRMED_CHECK);
            return {text: ""}; // Will be immediately replaced
        }
        return { 
            text: "For your Web app, have you installed the Firebase SDK (e.g., `npm install firebase` or via CDN script) and initialized it in your frontend code with your Firebase project's configuration object?",
            actions: commonYesNoUnsure(
                'firebaseSDKInstalled', 
                appData.services.vertexAI.needed ? AppPhase.ASK_GENKIT_INIT : AppPhase.ALL_SETUP_CONFIRMED_CHECK,
                appData.services.vertexAI.needed ? AppPhase.ASK_GENKIT_INIT : AppPhase.ALL_SETUP_CONFIRMED_CHECK,
                "For web apps, you need to include the Firebase JavaScript SDK. You can install it via npm/yarn or include it via a script tag. Then, you initialize it using the `firebaseConfig` object from your Firebase project settings in the console."
            )
        };
      case AppPhase.ASK_GENKIT_INIT:
        if (!appData.services.vertexAI.needed) {
            setCurrentPhase(AppPhase.ALL_SETUP_CONFIRMED_CHECK);
            return {text: ""}; // Will be immediately replaced
        }
        return { 
            text: "For Genkit (if using Vertex AI), have you run `npx genkit init` inside your `functions` directory and configured your `genkit.conf.js` (or `.ts`) file, for example, with your chosen model and plugins?",
            actions: commonYesNoUnsure(
                'genkitInitDone', 
                AppPhase.ALL_SETUP_CONFIRMED_CHECK,
                AppPhase.ALL_SETUP_CONFIRMED_CHECK,
                "Genkit helps structure your AI flows. After `firebase init functions` (if not already done), navigate into the `functions` directory and run `npx genkit init`. Then, you'll need to configure `genkit.conf.js` (or `.ts`) to specify plugins (like `@genkit-ai/googleai` or `@genkit-ai/vertexai`) and potentially your default model."
            )
        };

      case AppPhase.ALL_SETUP_CONFIRMED_CHECK: {
        let localActionsList: string[] = [];
        if (appData.localSetup.firebaseToolsInstalled === false) localActionsList.push("Install Firebase CLI (`npm install -g firebase-tools`) and log in (`firebase login`).");
        if (appData.localSetup.firebaseInitDone === false) localActionsList.push("Run `firebase init` in your project root and select relevant services/emulators.");
        if (appData.services.platform.config?.types?.toLowerCase().includes('web') && appData.localSetup.firebaseSDKInstalled === false) localActionsList.push("Install and initialize Firebase SDK in your web frontend.");
        if (appData.services.vertexAI.needed && appData.localSetup.genkitInitDone === false) localActionsList.push("Run `npx genkit init` in `functions` dir and configure `genkit.conf.js`.");

        let allSet = appData.allConsoleActionsConfirmed && 
                     (appData.localSetup.firebaseToolsInstalled !== false) &&
                     (appData.localSetup.firebaseInitDone !== false) &&
                     (!appData.services.platform.config?.types?.toLowerCase().includes('web') || appData.localSetup.firebaseSDKInstalled !== false) &&
                     (!appData.services.vertexAI.needed || appData.localSetup.genkitInitDone !== false);
        
        if (allSet) {
           return {
             text: "Fantastic! It sounds like you've completed all the console and local setup actions. Are you ready for me to generate the Firebase Studio prompt for your app?",
             actions: [
               { label: "Yes, generate the prompt!", onClick: () => { addMessage('user', "Yes, generate the prompt!"); setCurrentPhase(AppPhase.GENERATE_PROMPT); } },
               { label: "Not quite, I need to fix something.", onClick: () => { addMessage('user', "Not quite, I need to fix something."); addMessage('bot', "Okay, take your time. Let me know when you're ready by clicking the button above again or typing 'ready for prompt'."); setCurrentPhase(AppPhase.AWAITING_USER_CONFIRMATION_BEFORE_PROMPT); }}
             ]
           };
        } else {
            return {
                text: (
                    <>
                        <h2 className="text-xl font-semibold mb-3 text-sky-400">Local Setup Action Summary</h2>
                        <p>It looks like there might be a few local setup steps remaining or some console actions not yet confirmed:</p>
                        <ul className="list-disc list-inside space-y-2 my-3 bg-slate-800 p-4 rounded-md">
                            {!appData.allConsoleActionsConfirmed && <li>Confirm completion of all Firebase/GCP console actions.</li>}
                            {localActionsList.map((action, i) => <li key={i}>{action}</li>)}
                        </ul>
                        <p>Please ensure these are done for the best experience with Firebase Studio. Once you're all set, let me know!</p>
                    </>
                ),
                actions: [
                    { label: "I'm all set now!", onClick: () => { addMessage('user', "I'm all set now!"); setAppData(d => ({...d, allConsoleActionsConfirmed: true, localSetup: { firebaseToolsInstalled: true, firebaseInitDone: true, firebaseSDKInstalled: true, genkitInitDone: true } })); setCurrentPhase(AppPhase.ALL_SETUP_CONFIRMED_CHECK); } }, // Re-check
                    { label: "Okay, I'll work on these.", onClick: () => { addMessage('user', "Okay, I'll work on these."); setCurrentPhase(AppPhase.AWAITING_USER_CONFIRMATION_BEFORE_PROMPT); }}
                ]
            };
        }
      }
      case AppPhase.AWAITING_USER_CONFIRMATION_BEFORE_PROMPT:
        return {
            text: "No problem. Take your time with the setup. Let me know when you're ready to generate the prompt!",
            actions: [
                { label: "I'm ready now, generate the prompt!", onClick: () => { addMessage('user', "I'm ready now, generate the prompt!"); setAppData(d => ({...d, allConsoleActionsConfirmed: true, localSetup: { firebaseToolsInstalled: true, firebaseInitDone: true, firebaseSDKInstalled: true, genkitInitDone: true } })); setCurrentPhase(AppPhase.ALL_SETUP_CONFIRMED_CHECK); } } // Re-check by going to ALL_SETUP_CONFIRMED_CHECK
            ]
        };


      case AppPhase.GENERATE_PROMPT:
        const prompt = generateFirebaseStudioPrompt(appData);
        return { 
            text: (
                <>
                    <h2 className="text-2xl font-bold mb-3 text-green-400">🎉 All Set! Here's your Firebase Studio Prompt:</h2>
                    <p>Copy and paste the entire block below into Firebase Studio. You can then iterate and refine with follow-up prompts.</p>
                    <pre className="bg-slate-800 p-4 my-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
                        <code>{prompt}</code>
                    </pre>
                </>
            ),
            nextPhase: AppPhase.POST_PROMPT_ADVICE 
        };
      
      case AppPhase.POST_PROMPT_ADVICE:
        return {
          text: (
            <>
              <h3 className="text-xl font-semibold mt-6 mb-2 text-sky-400">Tips for Iterating with Firebase Studio:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Be specific in follow-up prompts: "Add a field 'username' to the 'users' Firestore collection." or "Create a new page for user profiles."</li>
                <li>If something isn't quite right, describe what you see and what you expected: "The login button isn't working. When I click it, nothing happens. It should take me to the dashboard."</li>
                <li>You can ask it to refactor code, add comments, or explain parts of the generated app.</li>
                <li>Focus on one feature or change at a time for clearer results.</li>
              </ul>
              <p className="mt-4 font-semibold text-lg">Are you ready to begin vibe-coding? Good luck with your app, "{appData.appIdea || 'Your Awesome App'}"!</p>
              <p className="mt-2">If you want to start over with a new app idea, just refresh the page!</p>
            </>
          )
          // No next phase, conversation ends here.
        };

      default:
        return { text: "I'm a bit confused about where we are. Let's try to figure this out." };
    }
  }, [currentPhase, appData, addMessage, processUserDecision]);


  const generateFirebaseStudioPrompt = (data: AppData): string => {
    let prompt = `Create a ${data.services.platform.config?.types || "Web"} application called "${data.appIdea}".\n\n`;
    prompt += `The app's core features are:\n${data.coreFeatures.split(',').map(f => `- ${f.trim()}`).join('\n')}\n\n`;

    if (data.services.auth.needed && data.services.auth.config?.providers) {
      prompt += `**User Authentication:**\n`;
      prompt += `- Implement user authentication using the Firebase SDK.\n`;
      prompt += `- Support the following sign-in providers: ${data.services.auth.config.providers}.\n`;
      prompt += `- Provide screens for sign-up, sign-in, and password reset (if applicable for chosen providers).\n`;
      prompt += `- After login, users should be directed to a main dashboard or landing page.\n\n`;
    }

    if (data.services.firestore.needed && data.services.firestore.config?.collections) {
      prompt += `**Firestore Database:**\n`;
      prompt += `- Set up Firestore database.\n`;
      prompt += `- Create the following collections: ${data.services.firestore.config.collections.split(',').map(c => `\`${c.trim()}\``).join(', ')}.\n`;
      prompt += `- For each collection, define appropriate document structures. For example, for a \`${data.services.firestore.config.collections.split(',')[0].trim()}\` collection, include fields for [describe typical fields based on app idea, or let Firebase Studio infer].\n`;
      prompt += `- Implement basic CRUD (Create, Read, Update, Delete) operations for these collections as needed by the core features.\n`;
      prompt += `- Secure Firestore with initial development rules (allow read/write if authenticated), like so:\n\`\`\`\n${FIRESTORE_DEV_RULES_EXAMPLE}\n\`\`\`\n (Emphasize that these rules MUST be refined for production.)\n\n`;
    }
    
    if (data.services.storage.needed && data.services.storage.config?.paths) {
      prompt += `**Firebase Storage:**\n`;
      prompt += `- Configure Firebase Storage for file uploads.\n`;
      prompt += `- Users should be able to upload files to paths such as: ${data.services.storage.config.paths.split(',').map(p => `\`${p.trim()}\``).join(', ')}.\n`;
      prompt += `- Implement functionality for uploading and displaying/accessing files from these paths relevant to the app's features.\n`;
      prompt += `- Secure Storage with initial development rules (allow read/write if authenticated), like so:\n\`\`\`\n${STORAGE_DEV_RULES_EXAMPLE}\n\`\`\`\n (Emphasize that these rules MUST be refined for production.)\n\n`;
    }

    if (data.services.functions.needed && data.services.functions.config?.ideas) {
      prompt += `**Cloud Functions for Firebase:**\n`;
      prompt += `- Implement the following Cloud Functions based on these ideas:\n${data.services.functions.config.ideas.split(',').map(idea => `  - A function for: ${idea.trim()}`).join('\n')}\n`;
      prompt += `- Ensure these functions are deployed and callable from the frontend or triggered by relevant events (e.g., Firestore triggers, auth triggers).\n\n`;
    }
    
    if (data.services.vertexAI.needed && data.services.vertexAI.config?.featureDescription) {
      prompt += `**Generative AI with Vertex AI & Genkit:**\n`;
      prompt += `- Integrate Generative AI capabilities using Genkit and a suitable Vertex AI model (e.g., a Gemini model).\n`;
      prompt += `- The core AI feature is: "${data.services.vertexAI.config.featureDescription}".\n`;
      prompt += `- Set up a Genkit flow (e.g., in Cloud Functions) to handle requests for this feature. This flow should interact with the Vertex AI model.\n`;
      prompt += `- The frontend should be able to call this Genkit flow (e.g., via an HTTPS callable function).\n`;
      prompt += `- Here's a conceptual example of how Genkit might be initialized in \`functions/src/index.ts\` (or similar):\n\`\`\`typescript\n${GENKIT_EXAMPLE_CODE}\n\`\`\`\n (Firebase Studio should adapt this, ensuring API keys are handled via environment variables like \`process.env.GEMINI_API_KEY\` or appropriate GCP service account authentication for Vertex AI).\n\n`;
    }

    prompt += `**General Requirements:**\n`;
    prompt += `- Use the official Firebase SDKs for all Firebase interactions.\n`;
    prompt += `- Ensure a clean, user-friendly, and responsive UI. Use Tailwind CSS for styling.\n`;
    prompt += `- Prioritize clear navigation and intuitive user experience.\n`;
    prompt += `- Structure the React code with clear separation of concerns (components, services, etc.).\n`;
    prompt += `- Implement basic error handling for API calls and user inputs.\n`;

    return prompt;
  };


  useEffect(() => {
    // Auto-scroll to bottom
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    // Focus input
    if (inputRef.current && 
        ![AppPhase.GENERATE_PROMPT, AppPhase.POST_PROMPT_ADVICE].includes(currentPhase) &&
        !chatHistory.some(msg => msg.actions && msg.actions.length > 0 && msg.sender === 'bot' && msg.id === chatHistory[chatHistory.length -1]?.id) // Don't focus if bot just presented buttons
    ) {
      //inputRef.current.focus();
    }

  }, [chatHistory, currentPhase]);

  // Effect to handle bot responses based on phase changes
  useEffect(() => {
    const lastMessage = chatHistory[chatHistory.length - 1];
    // Bot responds if it's its turn (i.e., user just spoke or phase changed to a bot-speaking phase)
    // Or if it's the initial greeting.
    if (currentPhase === AppPhase.GREETING && chatHistory.length === 0) {
        setIsBotTyping(true);
        setTimeout(() => {
            const botResp = getBotResponse();
            addMessage('bot', botResp.text, botResp.actions);
            if (botResp.nextPhase) setCurrentPhase(botResp.nextPhase);
            setIsBotTyping(false);
        }, 500);
    } else if (lastMessage?.sender === 'user' || 
        (lastMessage?.sender === 'bot' && !lastMessage.actions && ![AppPhase.POST_PROMPT_ADVICE, AppPhase.AWAITING_USER_CONFIRMATION_BEFORE_PROMPT, AppPhase.CONFIRM_CONSOLE_ACTIONS_DONE].includes(currentPhase))
      ) {
       // This condition handles cases where a bot message naturally leads to another bot message without user input.
       // e.g. after collecting platform types, bot automatically moves to console recap
       const phaseRequiresImmediateBotFollowUp = [
         AppPhase.COLLECT_PLATFORM_TYPES, // after user inputs platform types, bot moves to recap
         AppPhase.GENERATE_PROMPT, // after generating prompt, bot gives advice
         // Add other phases here that trigger an automatic bot response after completion
       ].includes(currentPhase) && lastMessage?.sender === 'user'; // Ensure user just finished this step

       const phaseIsBotInitiatedWithoutActions = lastMessage?.sender === 'bot' && !lastMessage.actions && 
        (currentPhase === AppPhase.CONSOLE_ACTIONS_RECAP || currentPhase === AppPhase.ALL_SETUP_CONFIRMED_CHECK || currentPhase === AppPhase.POST_PROMPT_ADVICE);


       if (lastMessage?.sender === 'user' || phaseIsBotInitiatedWithoutActions) {
        setIsBotTyping(true);
        setTimeout(() => {
            const botResp = getBotResponse();
            if(botResp.text || botResp.actions){ // Only add message if there's content
                 addMessage('bot', botResp.text, botResp.actions);
            }
            if (botResp.nextPhase) setCurrentPhase(botResp.nextPhase);
            setIsBotTyping(false);
        }, 700);
       }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, chatHistory.length]); // Rely on chatHistory.length to detect new user messages


  const handleUserInput = () => {
    if (userInput.trim() === '') return;
    addMessage('user', userInput);
    const currentInput = userInput;
    setUserInput('');

    let newAppData = { ...appData };
    let nextP = currentPhase;

    switch (currentPhase) {
      case AppPhase.COLLECT_APP_IDEA:
        newAppData.appIdea = currentInput;
        nextP = AppPhase.COLLECT_CORE_FEATURES;
        break;
      case AppPhase.COLLECT_CORE_FEATURES:
        newAppData.coreFeatures = currentInput;
        nextP = AppPhase.COLLECT_CORE_FEATURES; // Bot will offer to move to next major phase via action button
        break;
      case AppPhase.COLLECT_AUTH_PROVIDERS:
        newAppData.services.auth.config = { providers: currentInput };
        nextP = AppPhase.ASK_FIRESTORE;
        break;
      case AppPhase.COLLECT_FIRESTORE_COLLECTIONS:
        newAppData.services.firestore.config = { collections: currentInput };
        nextP = AppPhase.ASK_STORAGE;
        break;
      case AppPhase.COLLECT_STORAGE_PATHS:
        newAppData.services.storage.config = { paths: currentInput };
        nextP = AppPhase.ASK_FUNCTIONS;
        break;
      case AppPhase.COLLECT_FUNCTIONS_IDEAS:
        newAppData.services.functions.config = { ideas: currentInput };
        nextP = AppPhase.ASK_VERTEX_AI;
        break;
      case AppPhase.COLLECT_VERTEX_AI_DESCRIPTION:
        newAppData.services.vertexAI.config = { featureDescription: currentInput };
        nextP = AppPhase.ASK_PLATFORM;
        break;
      case AppPhase.COLLECT_PLATFORM_TYPES:
        newAppData.services.platform.config = { types: currentInput };
        newAppData.services.platform.needed = true; // Implicitly needed if types are provided
        nextP = AppPhase.CONSOLE_ACTIONS_RECAP;
        break;
      case AppPhase.AWAITING_USER_CONFIRMATION_BEFORE_PROMPT:
        if (currentInput.toLowerCase().includes("ready") || currentInput.toLowerCase().includes("generate")) {
            setAppData(d => ({...d, allConsoleActionsConfirmed: true, localSetup: { firebaseToolsInstalled: true, firebaseInitDone: true, firebaseSDKInstalled: true, genkitInitDone: true } }));
            nextP = AppPhase.ALL_SETUP_CONFIRMED_CHECK;
        }
        break;
    }
    setAppData(newAppData);
    setCurrentPhase(nextP);
  };


  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUserInput();
    }
  };
  
  const isInputDisabled = (): boolean => {
    const lastMsg = chatHistory[chatHistory.length -1];
    return isBotTyping || 
           (lastMsg?.sender === 'bot' && !!lastMsg.actions && lastMsg.actions.length > 0) || // If bot presented buttons
           [AppPhase.GREETING, AppPhase.GENERATE_PROMPT, AppPhase.POST_PROMPT_ADVICE, AppPhase.CONSOLE_ACTIONS_RECAP, AppPhase.ALL_SETUP_CONFIRMED_CHECK, AppPhase.COLLECT_CORE_FEATURES].includes(currentPhase) || // Phases driven by buttons
           (currentPhase === AppPhase.ASK_AUTH && !appData.services.auth.needed === null) || // Waiting for Yes/No/Unsure for services
           (currentPhase === AppPhase.ASK_FIRESTORE && !appData.services.firestore.needed === null) ||
           (currentPhase === AppPhase.ASK_STORAGE && !appData.services.storage.needed === null) ||
           (currentPhase === AppPhase.ASK_FUNCTIONS && !appData.services.functions.needed === null) ||
           (currentPhase === AppPhase.ASK_VERTEX_AI && !appData.services.vertexAI.needed === null) ||
           (currentPhase === AppPhase.ASK_PLATFORM && !appData.services.platform.needed === null) ||
           (currentPhase === AppPhase.ASK_FIREBASE_TOOLS && !appData.localSetup.firebaseToolsInstalled === null) ||
           (currentPhase === AppPhase.ASK_FIREBASE_INIT && !appData.localSetup.firebaseInitDone === null) ||
           (currentPhase === AppPhase.ASK_FIREBASE_SDK && appData.services.platform.config?.types?.toLowerCase().includes('web') && !appData.localSetup.firebaseSDKInstalled === null) ||
           (currentPhase === AppPhase.ASK_GENKIT_INIT && appData.services.vertexAI.needed && !appData.localSetup.genkitInitDone === null);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-900">
      <header className="p-4 bg-slate-800 shadow-md text-center">
        <h1 className="text-xl md:text-2xl font-bold text-sky-400">Firebase Setup & Prompt Assistant</h1>
      </header>

      <main ref={chatContainerRef} className="flex-grow p-4 md:p-6 space-y-4 overflow-y-auto scroll-smooth">
        {chatHistory.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isBotTyping && chatHistory[chatHistory.length -1]?.sender !== 'bot' && <ChatMessage key="typing" message={{id: 'typing', sender: 'bot', text: '...', timestamp: new Date(), isLoading: true}} />}

      </main>

      <footer className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isInputDisabled() ? "Select an option above or wait..." : "Type your answer..."}
            className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isInputDisabled()}
          />
          <button
            onClick={handleUserInput}
            disabled={isInputDisabled() || userInput.trim() === ''}
            className="px-6 py-3 bg-sky-500 text-white font-semibold rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
    