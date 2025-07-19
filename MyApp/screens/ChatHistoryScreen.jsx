import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DUMMY_HISTORY = [
  { id: '1', title: 'Weather forecast for this week', date: 'July 20, 2025' },
  { id: '2', 'title': 'Best fertilizer for wheat crops', date: 'July 19, 2025' },
  { id: '3', 'title': 'How to control pests organically', date: 'July 18, 2025' },
  { id: '4', 'title': 'Market price for tomatoes', date: 'July 17, 2025' },
];

const HistoryItem = ({ title, date, onPress }) => (
  <TouchableOpacity style={styles.historyItem} onPress={onPress}>
    <Text style={styles.historyTitle} numberOfLines={1}>{title}</Text>
    <Text style={styles.historyDate}>{date}</Text>
  </TouchableOpacity>
);

export default function ChatHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Chat History</Text>
        <View style={{ width: 28 }} />
      </View>
      <FlatList
        data={DUMMY_HISTORY}
        renderItem={({ item }) => (
          <HistoryItem 
            title={item.title} 
            date={item.date}
            onPress={() => navigation.navigate('VoiceChatInputScreen')} 
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  topBarTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 20,
  },
  historyItem: {
    backgroundColor: '#1e1e1e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  historyTitle: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  historyDate: {
    color: 'gray',
    fontSize: 12,
  },
});
