import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const Card = ({ title, children, accent }) => (
  <View style={[styles.card, accent ? { borderLeftColor: accent } : {}]}>
    {title && <Text style={styles.cardTitle}>{title}</Text>}
    {children}
  </View>
);

const SoilHealthScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>🌿 Soil Optimization</Text>
        <Text style={styles.subheader}>Precision agriculture implementation</Text>
        <Card title="Scientific Soil Enhancement" accent="#607D8B">
          <View style={styles.suggestionList}>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Conduct comprehensive soil testing every 2-3 years</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Apply lime to correct soil pH (optimal 6.0-7.5 for most crops)</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Organic matter: Add 2-3 tonnes/acre of well-decomposed FYM</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Micronutrient correction: Zinc, Boron, Iron as per soil test</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Bio-fertilizers: Rhizobium, Azotobacter, PSB application</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Cover crops: Legumes in off-season to fix nitrogen</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Minimal tillage: Preserve soil structure and microbial life</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Regular monitoring through soil health cards</Text></View>
          </View>
        </Card>
        <Card title="Subsidy" accent="#43e97b">
          <Text style={styles.sectionText}>50% subsidy on organic inputs and bio-fertilizers</Text>
        </Card>
        <Card title="Timeline" accent="#FFC107">
          <Text style={styles.sectionText}>Continuous process with seasonal applications</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#607D8B', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  card: { backgroundColor: '#181818', borderRadius: 14, padding: 18, marginBottom: 18, borderLeftWidth: 5, borderLeftColor: '#333', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  suggestionList: { marginTop: 4 },
  suggestionCard: { backgroundColor: '#232323', borderRadius: 8, padding: 12, marginBottom: 8 },
  suggestionText: { color: '#B0CFFF', fontSize: 15 },
});

export default SoilHealthScreen; 