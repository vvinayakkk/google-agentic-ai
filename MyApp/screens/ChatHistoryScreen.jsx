import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const HistoryItem = ({ title, date, onPress }) => (
  <TouchableOpacity style={styles.historyItem} onPress={onPress}>
    <Text style={styles.historyTitle} numberOfLines={1}>{title}</Text>
    <Text style={styles.historyDate}>{date}</Text>
  </TouchableOpacity>
);

export default function ChatHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = React.useState([]);

  // Load chat history from AsyncStorage
  const loadHistory = async () => {
    try {
      let stored = await AsyncStorage.getItem('chatHistory');
      stored = stored ? JSON.parse(stored) : [];
      setHistory(stored);
    } catch (e) {
      setHistory([]);
    }
  };

  React.useEffect(() => {
    loadHistory();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      {/* Background Gradients */}
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.05)', 'transparent', 'rgba(59, 130, 246, 0.05)']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.container}>
        {/* Top Bar with Blur and Gradient */}
        <View style={{ paddingTop: insets.top }}>
          <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
            <View style={styles.topBarContent}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.backButtonGradient}
                >
                  <Ionicons name="chevron-back" size={24} color="#10b981" />
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <View style={styles.headerTitleContainer}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#3b82f6" />
                  <Text style={styles.topBarTitle}>Chat History</Text>
                </View>
                <Text style={styles.headerSubtitle}>Your recent conversations</Text>
              </View>
              <View style={{ width: 28 }} />
            </View>
          </BlurView>
        </View>
        {/* Chat History List */}
        <FlatList
          data={history}
          renderItem={({ item, index }) => (
            <LinearGradient
              colors={index % 2 === 0 ? ['rgba(24, 24, 27, 0.9)', 'rgba(39, 39, 42, 0.9)'] : ['rgba(39, 39, 42, 0.9)', 'rgba(24, 24, 27, 0.9)']}
              style={styles.historyItemGradient}
            >
              <TouchableOpacity
                style={styles.historyItemTouchable}
                onPress={() => navigation.navigate('VoiceChatInputScreen', { chatId: item.id })}
                activeOpacity={0.8}
              >
                <View style={styles.historyItemHeader}>
                  <LinearGradient
                    colors={['#3b82f6', '#10b981']}
                    style={styles.historyIconContainer}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="white" />
                  </LinearGradient>
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
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
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
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
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDate: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '500',
  },
});
