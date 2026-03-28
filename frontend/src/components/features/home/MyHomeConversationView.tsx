import AssistantConversationStage from '../assistant/AssistantConversationStage';
import { CONVERSATION_UI } from '../../../constants/conversationUi';

interface MyHomeConversationViewProps {
  currentMode: string;
  isLockMode: boolean;
  isMicOn: boolean;
  faceType: number;
  mouthOpenRadius: number;
  isCharacterSpeaking: boolean;
  assistantDisplayName: string;
  userDisplayName: string;
  profileImage: string;
  aiCaptionText: string;
  aiDoneLength: number;
  aiActiveLength: number;
  userCaptionText: string;
  userDoneLength: number;
  userActiveLength: number;
  activeSpeaker: 'ai' | 'user' | null;
  statusText: string;
  statusSubtext?: string;
  connectionNotice?: string;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onMicToggle: () => void;
  onSendText: () => void;
  onCancel: () => void;
  onToggleLock: () => void;
}

export default function MyHomeConversationView(props: MyHomeConversationViewProps) {
  return <AssistantConversationStage title={CONVERSATION_UI.titles.home} {...props} />;
}
