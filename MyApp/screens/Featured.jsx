import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const featuredItems = [
  {
    id: '1',
    title: 'Write For Me ✨',
    description: 'Supercharged writing assistant',
    provider: 'By projecttoday',
    iconName: 'pencil-outline',
    iconBgColor: '#6a0dad', // Purple
  },
  {
    id: '2',
    title: 'Scholar GPT',
    description: 'Enhance research with 200M+ resources and built-in critical reading skills. Access Google...',
    provider: 'By awesomeretail',
    iconName: 'school-outline', // Or 'book-open-variant'
    iconBgColor: '#007bff', // Blue
  },
  {
    id: '3',
    title: 'Consensus',
    description: 'Ask the research, chat directly with the world\'s scientific literature. Search relevanc...',
    provider: 'By consensus.app',
    iconName: 'chart-bubble', // Or 'chart-bar'
    iconBgColor: '#28a745', // Green
  },
  {
    id: '4',
    title: 'AI PDF Drive: Chat, Create, Organize',
    description: 'Advanced AI agents for legal and professional work. Upload briefs, contracts...',
    provider: 'By mindwiser.com',
    iconName: 'file-pdf-box',
    iconBgColor: '#dc3545', // Red
  },
  // Add more items as needed based on the image or your requirements
];

export default function FeaturedScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Top Bar - Simplified for consistency, assuming similar to Screen 1 and 2 */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={{ flex: 1 }} /> {/* Spacer */}
        <TouchableOpacity>
          <Ionicons name="home-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Featured</Text>
        <Text style={styles.subtitle}>Curated top picks from this week</Text>
      </View>

      {/* Featured Items List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {featuredItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.itemCard}>
            <View style={[styles.itemIconContainer, { backgroundColor: item.iconBgColor }]}>
              <MaterialCommunityIcons name={item.iconName} size={28} color="white" />
            </View>
            <View style={styles.itemTextContent}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
              <Text style={styles.itemProvider}>{item.provider}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end', // Pushes icon to the right
    paddingHorizontal: 20,
    paddingBottom: 20, // Space below top bar
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    color: 'gray',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 30, // Space at the bottom of the scroll view
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c', // Lighter background for cards
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  itemIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemTextContent: {
    flex: 1,
  },
  itemTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemDescription: {
    color: 'lightgray',
    fontSize: 14,
    marginBottom: 5,
  },
  itemProvider: {
    color: 'gray',
    fontSize: 12,
  },
});