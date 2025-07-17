import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function PlantAILandingScreen({ navigation }) {
  const goToChat = (question) => {
    navigation.navigate('PlantAssistant', { initialQuery: question });
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://i.imgur.com/25sL5i2.png' }}
        style={styles.plantImage}
      />
      <Text style={styles.mainTitle}>Plant AI Assistant</Text>
      <Text style={styles.subtitle}>Ask me anything about Mentha-Mint or any other plants!</Text>

      <TouchableOpacity style={styles.chatButton} onPress={() => goToChat()}>
        <Text style={styles.chatButtonText}>💬 Start chatting</Text>
      </TouchableOpacity>

      <View style={styles.popularSection}>
        <Text style={styles.popularTitle}>Popular Plant Questions</Text>
        <Text style={styles.popularSubtitle}>These represent common topics users ask about</Text>
        <View style={styles.cardsContainer}>
          <TouchableOpacity style={styles.card} onPress={() => goToChat('What is the care guide for Mint?')}>
            <Text style={styles.cardIcon}>🌿</Text>
            <Text style={styles.cardText}>Care Guide</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => goToChat('What are the light needs for Mint?')}>
            <Text style={styles.cardIcon}>☀️</Text>
            <Text style={styles.cardText}>Light Needs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => goToChat('Is Mint toxic to pets?')}>
             <Text style={styles.cardIcon}>🐾</Text>
            <Text style={styles.cardText}>Pet Toxicity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => goToChat('How often should I water Mint?')}>
             <Text style={styles.cardIcon}>💧</Text>
            <Text style={styles.cardText}>Watering</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FCFDFE',
    paddingTop: 80,
  },
  plantImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#14532D',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  chatButton: {
    backgroundColor: '#34D399',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatButtonText: {
    color: '#14532D',
    fontSize: 18,
    fontWeight: '600',
  },
  popularSection: {
    marginTop: 40,
    width: '100%',
    alignItems: 'center',
  },
  popularTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  popularSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '45%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardIcon: {
    fontSize: 40,
  },
  cardText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});
