
import { ReactNode } from 'react';
import { AppPhase } from './constants';

export interface ChatMessageData {
  id: string;
  sender: 'user' | 'bot';
  text: ReactNode;
  timestamp: Date;
  actions?: ActionButtonProps[];
  isLoading?: boolean;
}

export interface ActionButtonProps {
  label: string;
  onClick: () => void;
  value?: string; // Optional value to associate with the button click
  className?: string;
}

export interface ServiceDetail<TConfig = Record<string, any>> {
  needed: boolean | null; // null: not asked, true: needed, false: not needed
  config?: TConfig;
  actionItems: string[];
}

export interface FirebaseAuthConfig {
  providers: string; // Comma-separated string
}

export interface FirestoreConfig {
  collections: string; // Comma-separated string
}

export interface StorageConfig {
  paths: string; // Comma-separated string
}

export interface FunctionsConfig {
  ideas: string; // Comma-separated string
}

export interface VertexAIConfig {
  featureDescription: string;
}

export interface PlatformConfig {
  types: string; // Comma-separated string: Web, iOS, Android
}

export interface AppData {
  appIdea: string;
  coreFeatures: string; // Comma-separated string
  services: {
    auth: ServiceDetail<FirebaseAuthConfig>;
    firestore: ServiceDetail<FirestoreConfig>;
    storage: ServiceDetail<StorageConfig>;
    functions: ServiceDetail<FunctionsConfig>;
    vertexAI: ServiceDetail<VertexAIConfig>;
    platform: ServiceDetail<PlatformConfig>;
  };
  localSetup: {
    firebaseToolsInstalled: boolean | null;
    firebaseInitDone: boolean | null;
    firebaseSDKInstalled: boolean | null;
    genkitInitDone: boolean | null;
  };
  localSetupActionItems: string[];
  allConsoleActionsConfirmed: boolean;
  allLocalSetupActionsConfirmed: boolean;
}

export interface BotResponse {
  text: ReactNode;
  actions?: ActionButtonProps[];
  nextPhase?: AppPhase;
  updateAppData?: (currentData: AppData, userInput?: string) => AppData;
}
    