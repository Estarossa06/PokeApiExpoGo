import { MaterialCommunityIcons } from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  sendChatMessage,
  type ChatDomain,
  type ChatTurn,
} from '../../services/ai';

interface Message extends ChatTurn {
  id: string;
  failed?: boolean;
}

const MAX_MESSAGE_LENGTH = 4000;

export default function IaScreen() {
  const [domain, setDomain] = useState<ChatDomain>('pokemon');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async () => {
    const question = draft.trim();
    if (!question || loading) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: question,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft('');
    setLoading(true);

    try {
      const conversation = nextMessages
        .filter((message) => !message.failed)
        .slice(-20)
        .map(({ role, content }) => ({ role, content }));
      const reply = await sendChatMessage(conversation, domain);
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant`, role: 'assistant', content: reply },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado. Inténtalo nuevamente.';
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          content: message,
          failed: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const selectDomain = (nextDomain: ChatDomain) => {
    if (loading || nextDomain === domain) return;
    setDomain(nextDomain);
    setMessages([]);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="robot-outline" size={25} color="#FFFFFF" />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Asistente IA</Text>
          <Text style={styles.subtitle}>
            {domain === 'pokemon' ? 'Pokémon · PostgreSQL' : 'Dragon Ball · MongoDB'}
          </Text>
        </View>
      </View>

      <View style={styles.chatColumn}>
        <View style={styles.domainSwitch} accessibilityRole="tablist">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: domain === 'pokemon' }}
            disabled={loading}
            onPress={() => selectDomain('pokemon')}
            style={[
              styles.domainOption,
              domain === 'pokemon' && styles.domainOptionActive,
            ]}
          >
            <Text
              style={[
                styles.domainOptionText,
                domain === 'pokemon' && styles.domainOptionTextActive,
              ]}
            >
              Pokémon
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: domain === 'dragonball' }}
            disabled={loading}
            onPress={() => selectDomain('dragonball')}
            style={[
              styles.domainOption,
              domain === 'dragonball' && styles.domainOptionActive,
            ]}
          >
            <Text
              style={[
                styles.domainOptionText,
                domain === 'dragonball' && styles.domainOptionTextActive,
              ]}
            >
              Dragon Ball
            </Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name="message-text-outline"
                  size={28}
                  color="#8A2432"
                />
              </View>
              <Text style={styles.emptyTitle}>¿Qué te gustaría saber?</Text>
              <Text style={styles.emptyCopy}>
                Pregunta sobre un {domain === 'pokemon' ? 'Pokémon' : 'personaje'} registrado.
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  message.role === 'user' ? styles.userRow : styles.assistantRow,
                ]}
              >
                {message.role === 'assistant' && (
                  <View style={styles.messageAvatar}>
                    <MaterialCommunityIcons
                      name="robot-outline"
                      size={16}
                      color="#7D1D2A"
                    />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    message.role === 'user' ? styles.userBubble : styles.aiBubble,
                    message.failed && styles.errorBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.role === 'user' && styles.userMessageText,
                      message.failed && styles.errorMessageText,
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
              </View>
            ))
          )}

          {loading && (
            <View style={[styles.messageRow, styles.assistantRow]}>
              <View style={styles.messageAvatar}>
                <MaterialCommunityIcons
                  name="robot-outline"
                  size={16}
                  color="#7D1D2A"
                />
              </View>
              <View style={[styles.bubble, styles.aiBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#8A2432" />
                <Text style={styles.loadingText}>Pensando...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Pregunta para el asistente"
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor="#8A7A7D"
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            editable={!loading}
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={() => void send()}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar pregunta"
            disabled={!draft.trim() || loading}
            onPress={() => void send()}
            style={({ pressed }) => [
              styles.sendButton,
              (!draft.trim() || loading) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={23} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
        <Text style={styles.privacyNote}>Las respuestas pueden contener errores.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F4F5',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDE0',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7D1D2A',
  },
  headerCopy: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#222222',
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: '#75686B',
    fontSize: 12,
    marginTop: 2,
  },
  chatColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 860,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  domainSwitch: {
    width: '100%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: '#EFE3E5',
  },
  domainOption: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 11,
  },
  domainOptionActive: {
    backgroundColor: '#FFFFFF',
  },
  domainOptionText: {
    color: '#75686B',
    fontSize: 13,
    fontWeight: '600',
  },
  domainOptionTextActive: {
    color: '#7D1D2A',
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 18,
  },
  emptyState: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFE3E5',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#33272A',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyCopy: {
    maxWidth: 280,
    marginTop: 7,
    color: '#75686B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 6,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFE3E5',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#7D1D2A',
    borderBottomRightRadius: 5,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DDE0',
    borderBottomLeftRadius: 5,
  },
  errorBubble: {
    backgroundColor: '#FFF0EC',
    borderColor: '#E8B9AD',
  },
  messageText: {
    color: '#30282A',
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  errorMessageText: {
    color: '#8E3329',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  loadingText: {
    color: '#75686B',
    fontSize: 14,
  },
  composer: {
    width: '100%',
    minHeight: 58,
    maxHeight: 148,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 7,
    borderWidth: 1,
    borderColor: '#D6C9CC',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 132,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#222222',
    fontSize: 15,
    lineHeight: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7D1D2A',
  },
  sendButtonDisabled: {
    backgroundColor: '#BFAEB1',
  },
  sendButtonPressed: {
    opacity: 0.82,
  },
  privacyNote: {
    paddingTop: 7,
    paddingBottom: 2,
    color: '#8A7A7D',
    fontSize: 11,
    textAlign: 'center',
  },
});