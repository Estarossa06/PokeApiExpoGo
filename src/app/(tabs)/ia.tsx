import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Gemini, Groq, OpenAI } from '@lobehub/icons-rn';
import Ionicons from '@expo/vector-icons/Ionicons';
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useRef, useState } from 'react';
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
import type { ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  sendChatMessage,
  type ChatDomain,
  type AiProvider,
  type AiTimeout,
  type ChatTurn,
} from '../../services/ai';

// La pantalla conserva un identificador local y marca los mensajes de error
// para poder mostrarlos, pero no los vuelve a enviar como parte del historial.
interface Message extends ChatTurn {
  id: string;
  failed?: boolean;
}

// El límite del campo coincide con el máximo que acepta el backend por mensaje.
const MAX_MESSAGE_LENGTH = 4000;
const TIMEOUT_STORAGE_KEY = 'ia.timeout.seconds';
// Relaciona cada valor enviado al backend con el icono que se muestra en pantalla.
const PROVIDER_ICONS = {
  gemini: Gemini,
  openai: OpenAI,
  groq: Groq,
} satisfies Record<AiProvider, React.ComponentType<{ size?: number; color?: string }>>;

/**
 * Pantalla del chat: mantiene las preferencias y la conversación, presenta los
 * controles y delega las solicitudes HTTP en `sendChatMessage`.
 */
export default function IaScreen() {
  // Cada estado controla una parte del formulario o del historial visible.
  const [domain, setDomain] = useState<ChatDomain>('pokemon');
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [timeout, setTimeoutValue] = useState<AiTimeout>(40);
  const [timeoutLoaded, setTimeoutLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const timeoutPersistenceQueue = useRef(Promise.resolve());

  // Recupera el tiempo elegido anteriormente desde el almacén local de SQLite.
  // Si no existe o no pertenece a las opciones válidas, se conserva el valor inicial (40).
  useEffect(() => {
    let active = true;

    Storage.getItem(TIMEOUT_STORAGE_KEY)
      .then((savedTimeout) => {
        if (!active) return;
        const value = Number(savedTimeout);
        if (value === 20 || value === 40 || value === 80 || value === 160) {
          setTimeoutValue(value);
        }
      })
      .catch((error) => {
        console.warn('No se pudo cargar el tiempo de espera guardado:', error);
      })
      .finally(() => {
        if (active) setTimeoutLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  /** Actualiza el tiempo de inmediato y guarda la preferencia para la próxima apertura. */
  const selectTimeout = (value: AiTimeout) => {
    setTimeoutValue(value);
    // La cola evita que escrituras rápidas terminen guardadas en un orden distinto al de selección.
    timeoutPersistenceQueue.current = timeoutPersistenceQueue.current
      .then(() => Storage.setItem(TIMEOUT_STORAGE_KEY, String(value)))
      .catch((error) => {
        console.warn('No se pudo guardar el tiempo de espera:', error);
      });
  };

  /** Valida el borrador, lo añade al chat y coordina una solicitud al servicio de IA. */
  const send = async () => {
    const question = draft.trim();
    if (!question || loading) return;

    // Primero se refleja la pregunta en la interfaz y se bloquean nuevos envíos mientras responde.
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
      // El backend acepta hasta 20 turnos/mensajes: se omiten errores locales y se conserva lo más reciente.
      const conversation = nextMessages
        .filter((message) => !message.failed)
        .slice(-20)
        .map(({ role, content }) => ({ role, content }));
      // El dominio, proveedor y tiempo seleccionados viajan junto con el historial.
      const reply = await sendChatMessage(conversation, domain, provider, timeout);
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant`, role: 'assistant', content: reply },
      ]);
    } catch (error) {
      // Los errores del servicio se agregan como mensajes visibles y se excluyen del próximo historial.
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

  /** Cambiar de base de datos inicia una conversación limpia para ese dominio. */
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
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="robot-outline" size={25} color="#FFFFFF" />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Asistente IA</Text>
          <Text style={styles.subtitle}>
            {domain === 'pokemon' ? 'Pokémon · PostgreSQL' : 'Dragon Ball · MongoDB'}
          </Text>
        </View>
      </SafeAreaView>

      <View style={styles.chatColumn}>
        {/* El dominio determina qué conjunto de registros consultará el backend. */}
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

        {/* `provider` usa los mismos valores permitidos por el backend: gemini, openai o groq. */}
        <View style={styles.providerSettingsRow}>
          <Text style={[styles.settingLabel, styles.providerSettingLabel]}>Proveedor</Text>
          <View style={styles.providerOptions}>
            {(['gemini', 'openai', 'groq'] as const).map((value) => {
              const ProviderIcon = PROVIDER_ICONS[value];
              const label = value === 'openai'
                ? 'OpenAI'
                : value.charAt(0).toUpperCase() + value.slice(1);

              return (
                <Pressable
                  key={value}
                  disabled={loading}
                  onPress={() => setProvider(value)}
                  accessibilityLabel={label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: provider === value }}
                  style={[
                    styles.providerOption,
                    provider === value && styles.providerOptionActive,
                  ]}
                >
                  <ProviderIcon size={18} color="#111111" />
                  <Text style={styles.providerLabel}>{label}</Text>
                  {provider === value && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={13}
                      color="#7D1D2A"
                      style={styles.providerSelectedMark}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
        {/* Opciones en segundos (20, 40, 80 o 160); se deshabilitan hasta recuperar la preferencia guardada. */}
        <View style={styles.settingsRow}>
          <Text style={styles.settingLabel}>Tiempo</Text>
          {([20, 40, 80, 160] as const).map((value) => (
            <Pressable key={value} disabled={loading || !timeoutLoaded} onPress={() => selectTimeout(value)}
              accessibilityRole="button" accessibilityState={{ selected: timeout === value }}
              style={[styles.settingOption, timeout === value && styles.settingOptionActive]}>
              <Text style={[styles.settingText, timeout === value && styles.settingTextActive]}>{value}s</Text>
            </Pressable>
          ))}
        </View>

        {/* El historial incluye las preguntas, respuestas y errores mostrados en el chat. */}
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

        {/* `draft` se actualiza al escribir; tanto Enter como el botón llaman a `send`. */}
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
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  settingLabel: { width: 74, flexShrink: 0, color: '#75686B', fontSize: 12, fontWeight: '600' },
  settingOption: { flex: 1, minHeight: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#EFE3E5' },
  settingOptionActive: { backgroundColor: '#7D1D2A' },
  providerSettingsRow: { marginBottom: 6 },
  providerSettingLabel: { width: 'auto', marginBottom: 5 },
  providerOptions: { flexDirection: 'row', gap: 6 },
  providerOption: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', gap: 4, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#D6C9CC', backgroundColor: '#EFE3E5' },
  providerOptionActive: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#7D1D2A' },
  providerLabel: { color: '#111111', fontSize: 12, fontWeight: '600', flexShrink: 1 },
  providerSelectedMark: { marginLeft: 'auto' },
  settingText: { color: '#75686B', fontSize: 12, fontWeight: '600' },
  settingTextActive: { color: '#FFFFFF' },
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
