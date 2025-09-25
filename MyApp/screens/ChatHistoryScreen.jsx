import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { NetworkConfig } from '../utils/NetworkConfig';
import { useTheme } from '../context/ThemeContext';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';

const HistoryItem = ({ title, date, onPress }) => (
  <TouchableOpacity style={styles.historyItem} onPress={onPress}>
    <Text style={styles.historyTitle} numberOfLines={1}>{title}</Text>
    <Text style={styles.historyDate}>{date}</Text>
  </TouchableOpacity>
);

const API_BASE = NetworkConfig.API_BASE;
const FARMER_ID = 'f001';
const CHAT_CACHE_KEY = 'chat-history-cache';

export default function ChatHistoryScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [renamingChatId, setRenamingChatId] = React.useState(null);
  const [renamingText, setRenamingText] = React.useState('');

  // Load chat history from cache, then fetch from backend
  const fetchChatHistory = async () => {
    setLoading(true);
    setError(null);
    // Try to load from cache first
    try {
      const cached = await AsyncStorage.getItem(CHAT_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setHistory(parsed);
        setLoading(false); // Show cached data immediately
      }
    } catch (e) {}
    // Always fetch from backend in background
    fetch(`${API_BASE}/farmer/${FARMER_ID}/chat`)
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        AsyncStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(data));
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load chat history');
        setLoading(false);
      });
  };

  React.useEffect(() => {
    fetchChatHistory();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchChatHistory();
    }, [])
  );

  const groupByDate = (items) => {
    const groups = { 'Today': [], 'This Week': [], 'Older': [] };
    items.forEach(it => {
      // try to parse ISO or fallback
      const dateObj = it.date ? (typeof it.date === 'string' ? (isNaN(Date.parse(it.date)) ? new Date(it.date) : parseISO(it.date)) : new Date(it.date)) : new Date();
      if (isToday(dateObj)) groups['Today'].push(it);
      else if (isThisWeek(dateObj)) groups['This Week'].push(it);
      else groups['Older'].push(it);
    });
    return groups;
  };

  const openChat = async (chat) => {
    // Navigate and pass chat content so VoiceChatInputScreen can load instantly
    navigation.navigate('VoiceChatInputScreen', { chatId: chat.id, chatData: chat });
  };

  const renameChat = (chat) => {
    setRenamingChatId(chat.id);
    setRenamingText(chat.title || '');
    // show a prompt-style inline input (simple Alert fallback for older devices)
    Alert.prompt(
      'Rename Chat',
      'Enter a new name for this chat',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        { text: 'OK', onPress: async (text) => {
            if (!text || text.trim().length === 0) return;
            const newTitle = text.trim();
            try {
              // update locally
              const updated = history.map(h => h.id === chat.id ? { ...h, title: newTitle } : h);
              setHistory(updated);
              await AsyncStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(updated));
              // persist to backend
              fetch(`${API_BASE}/farmer/${FARMER_ID}/chat/${chat.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...chat, title: newTitle })
              }).then(() => {}).catch(() => {});
            } catch (e) {
              console.error('Rename failed', e);
            }
        } }
      ],
      'plain-text',
      chat.title || ''
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Background Gradients (theme aware) */}
      <LinearGradient
        colors={isDark ? ['rgba(16, 185, 129, 0.05)', 'transparent', 'rgba(59, 130, 246, 0.05)'] : ['rgba(0,0,0,0)', 'transparent', 'rgba(0,0,0,0)']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.container}>
        {/* Top Bar with Blur and Gradient */}
        <View style={{ paddingTop: insets.top }}>
          <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={[styles.headerBlur, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.topBarContent}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <LinearGradient
                  colors={isDark ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] : ['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.02)']}
                  style={styles.backButtonGradient}
                >
                  <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <View style={styles.headerTitleContainer}>
                  <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.info} />
                  <Text style={[styles.topBarTitle, { color: theme.colors.text }]}>Chat History</Text>
                </View>
                <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Your recent conversations</Text>
              </View>
              <View style={{ width: 28 }} />
            </View>
          </BlurView>
        </View>
        {/* Chat History List */}
        {/* New grouped layout */}
        {(() => {
          const groups = groupByDate(history || []);
          const keys = Object.keys(groups).filter(k => groups[k].length > 0);
          return (
            <FlatList
              data={keys}
              keyExtractor={k => k}
              renderItem={({ item: groupKey }) => (
                <View>
                  <Text style={[styles.groupHeader, { color: theme.colors.text }]}>{groupKey}</Text>
                  {groups[groupKey].map((chat) => (
                    <TouchableOpacity key={chat.id} style={[styles.historyRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]} onPress={() => openChat(chat)}>
                      <View style={styles.historyRowLeft}>
                        <View style={[styles.historyIconContainer, { backgroundColor: theme.colors.primary }]}>
                          <Ionicons name="chatbubble-outline" size={18} color={theme.colors.headerTitle} />
                        </View>
                        <View style={styles.historyItemContent}>
                          <Text style={[styles.historyTitle, { color: theme.colors.text }]} numberOfLines={1}>{chat.title}</Text>
                          <Text style={[styles.historyDate, { color: theme.colors.textSecondary }]}>{chat.date}</Text>
                        </View>
                      </View>
                      <View style={styles.rowActions}>
                        <TouchableOpacity onPress={() => openChat(chat)} style={styles.iconButton}>
                          <Ionicons name="open-outline" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => renameChat(chat)} style={styles.iconButton}>
                          <Ionicons name="pencil-outline" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              contentContainerStyle={styles.listContainer}
            />
          );
        })()}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerBlur: {
    borderRadius: 20,
    margin: 16,
    overflow: 'hidden',
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarTitle: {
    color: 'white',
    fontSize: 25,
    fontWeight: '700',
    marginLeft: 8,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    marginTop: 2,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  historyItemGradient: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  historyItemTouchable: {
    padding: 16,
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  historyItemContent: {
    flex: 1,
  },
  historyTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDate: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '500',
  },
});
