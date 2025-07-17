import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { Search } from 'lucide-react';

const PlantLibraryScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Fruit', 'Vegetable', 'Leafy'];

  const plants = [
    {
      id: 1,
      name: 'Mentha-Mint',
      description: 'Mint is an aromatic plant that is almost entirely perennial. They have wide...',
      image: 'https://images.unsplash.com/photo-1628556270303-137b8acfb7de?w=400&h=300&fit=crop',
      category: 'Leafy'
    },
    {
      id: 2,
      name: 'Tomato',
      description: 'The tomato is a red, juicy fruit commonly used as a vegetable in cooking. It gr...',
      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop',
      category: 'Fruit'
    },
    {
      id: 3,
      name: 'Cucumber',
      description: 'Cucumbers are long, green vegetables that belong to the gourd family. They are...',
      image: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400&h=300&fit=crop',
      category: 'Vegetable'
    },
    {
      id: 4,
      name: 'Carrot',
      description: 'Carrots are root vegetables that are typically orange in color. They are rich...',
      image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=300&fit=crop',
      category: 'Vegetable'
    },
    {
      id: 5,
      name: 'Spinach',
      description: 'Spinach is a leafy green flowering plant native to Persia. It is an annual...',
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop',
      category: 'Leafy'
    },
    {
      id: 6,
      name: 'Apple',
      description: 'Apples are sweet, edible fruits produced by apple trees. They are one of the...',
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop',
      category: 'Fruit'
    }
  ];

  const filteredPlants = plants.filter(plant => {
    const matchesCategory = selectedCategory === 'All' || plant.category === selectedCategory;
    const matchesSearch = plant.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Plant Library</Text>
        <Text style={styles.subtitle}>Discover and explore our collection</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#4A5568" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plants..."
            placeholderTextColor="#A0AEC0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <Text style={styles.categoriesTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category ? styles.categoryButtonActive : styles.categoryButtonInactive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category ? styles.categoryTextActive : styles.categoryTextInactive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Plants Grid */}
      <View style={styles.plantsGrid}>
        {filteredPlants.map((plant, index) => (
          <View key={plant.id} style={styles.plantCard}>
            <Image source={{ uri: plant.image }} style={styles.plantImage} />
            <View style={styles.plantInfo}>
              <Text style={styles.plantName}>{plant.name}</Text>
              <Text style={styles.plantDescription}>{plant.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#68D391',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
  },
  categoriesContainer: {
    marginBottom: 24,
    paddingLeft: 24,
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#68D391',
    marginBottom: 16,
  },
  categoriesScroll: {
    paddingRight: 24,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
  },
  categoryButtonActive: {
    backgroundColor: '#68D391',
    borderColor: '#68D391',
  },
  categoryButtonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categoryTextInactive: {
    color: '#4A5568',
  },
  plantsGrid: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 100,
  },
  plantCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  plantImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  plantInfo: {
    padding: 12,
    backgroundColor: '#C6F6D5',
    minHeight: 80,
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 6,
  },
  plantDescription: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 16,
  },
});

export default PlantLibraryScreen;