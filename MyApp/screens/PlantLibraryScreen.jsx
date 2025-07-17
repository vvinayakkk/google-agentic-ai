import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { plantData } from '../data/data'; // Adjust path if your data.js is elsewhere

// Get screen width for responsive card sizing
const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 24px padding on each side, 24px in between

const categories = ['All', 'Fruit', 'Vegetable', 'Legumes', 'Herbs', 'Flowers'];

export function PlantLibraryScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchText, setSearchText] = useState('');

  // Filter plants based on active category and search text
  const filteredPlants = plantData.filter(plant => {
    const matchesCategory = activeCategory === 'All' || plant.category === activeCategory;
    const matchesSearch = plant.name.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plant Library</Text>
        <Text style={styles.headerSubtitle}>Discover and explore our collection</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search plants..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Categories Section */}
      <Text style={styles.categoriesTitle}>Categories</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollView}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              activeCategory === category && styles.activeCategoryButton,
            ]}
            onPress={() => setActiveCategory(category)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                activeCategory === category && styles.activeCategoryButtonText,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Plant Cards Grid */}
      <ScrollView contentContainerStyle={styles.plantsGrid}>
        {filteredPlants.map((plant) => (
          <TouchableOpacity
            key={plant.id}
            style={styles.plantCard}
            onPress={() => navigation.navigate('PlantDetail', { plantId: plant.id })}
          >
            <Image source={{ uri: plant.image }} style={styles.plantImage} />
            <View style={styles.plantInfo}>
              <Text style={styles.plantName}>{plant.name}</Text>
              <Text style={styles.plantDescription}>{plant.shortDescription}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Handle status bar for Android
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#388E3C', // Darker green for the title
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    marginHorizontal: 24,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 24,
    marginBottom: 15,
  },
  categoriesScrollView: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  categoryButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    height: 44, // Fixed height for all buttons
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeCategoryButton: {
    backgroundColor: '#388E3C', // Green background for active
    borderColor: '#388E3C',
  },
  categoryButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeCategoryButtonText: {
    color: '#fff', // White text for active
  },
  plantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12, // Half of 24px padding to make cards align
    paddingTop: 8,
    paddingBottom: 20,
  },
  plantCard: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    overflow: 'hidden',
  },
  plantImage: {
    width: '100%',
    height: cardWidth, // Make image square
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  plantInfo: {
    padding: 12,
  },
  plantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  plantDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});