
export enum AppPhase {
  GREETING,
  COLLECT_APP_IDEA,
  COLLECT_CORE_FEATURES,

  // Service Mapping
  ASK_AUTH,
  COLLECT_AUTH_PROVIDERS,
  ASK_FIRESTORE,
  COLLECT_FIRESTORE_COLLECTIONS,
  ASK_STORAGE,
  COLLECT_STORAGE_PATHS,
  ASK_FUNCTIONS,
  COLLECT_FUNCTIONS_IDEAS,
  ASK_VERTEX_AI,
  COLLECT_VERTEX_AI_DESCRIPTION,
  ASK_PLATFORM,
  COLLECT_PLATFORM_TYPES,

  CONSOLE_ACTIONS_RECAP,
  CONFIRM_CONSOLE_ACTIONS_DONE,

  // Local Setup
  ASK_FIREBASE_TOOLS,
  ASK_FIREBASE_INIT,
  ASK_FIREBASE_SDK,
  ASK_GENKIT_INIT,

  ALL_SETUP_CONFIRMED_CHECK, // Final check if all actions are marked complete by user
  GENERATE_PROMPT,
  POST_PROMPT_ADVICE,
  AWAITING_USER_CONFIRMATION_BEFORE_PROMPT, // Intermediate step
}

export const FIRESTORE_DEV_RULES_EXAMPLE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // For development, allow authenticated users to read/write anything.
    // WARNING: THIS IS NOT SECURE FOR PRODUCTION.
    // You MUST refine these rules before launching.
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

export const STORAGE_DEV_RULES_EXAMPLE = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // For development, allow authenticated users to read/write any files.
    // WARNING: THIS IS NOT SECURE FOR PRODUCTION.
    // You MUST refine these rules before launching.
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

export const INITIAL_APP_DATA = {
  appIdea: '',
  coreFeatures: '',
  services: {
    auth: { needed: null, config: { providers: '' }, actionItems: [] },
    firestore: { needed: null, config: { collections: '' }, actionItems: [] },
    storage: { needed: null, config: { paths: '' }, actionItems: [] },
    functions: { needed: null, config: { ideas: '' }, actionItems: [] },
    vertexAI: { needed: null, config: { featureDescription: '' }, actionItems: [] },
    platform: { needed: null, config: { types: '' }, actionItems: [] },
  },
  localSetup: {
    firebaseToolsInstalled: null,
    firebaseInitDone: null,
    firebaseSDKInstalled: null,
    genkitInitDone: null,
  },
  localSetupActionItems: [],
  allConsoleActionsConfirmed: false,
  allLocalSetupActionsConfirmed: false,
};

export const GENKIT_EXAMPLE_CODE = `
// functions/src/index.ts (or your Genkit flow file)
import { initializeGenkit } from '@genkit-ai/core';
import { firebase } from '@genkit-ai/firebase';
// Make sure to install the correct Google AI plugin, e.g., @genkit-ai/googleai or @genkit-ai/vertexai
import { googleAI } from '@genkit-ai/googleai'; 

initializeGenkit({
  plugins: [
    firebase(), // For Firebase integration (e.g., Cloud Functions triggers)
    googleAI({ apiKey: process.env.GEMINI_API_KEY }), // Ensure API key is set as env var for Gemini models
    // Or for Vertex AI:
    // import { vertexAI } from '@genkit-ai/vertexai';
    // vertexAI(), // Ensure your GCP project is configured
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// Define your flow here based on your AI feature description
// For example:
// import { defineFlow, streamFlow } from '@genkit-ai/flow';
// import { geminiPro } from '@genkit-ai/googleai/gemini'; // or other models
// import * as z from 'zod';

// export const myAIChatFlow = defineFlow(
//   {
//     name: 'myAIChatFlow',
//     inputSchema: z.string(),
//     outputSchema: z.string(),
//   },
//   async (prompt) => {
//     const llmResponse = await geminiPro.generate({ prompt });
//     return llmResponse.text();
//   }
// );
`;
    