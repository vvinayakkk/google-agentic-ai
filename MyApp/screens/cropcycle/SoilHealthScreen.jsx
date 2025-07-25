import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const SoilHealthScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>🌿 Soil Optimization</Text>
        <Text style={styles.subheader}>Precision agriculture implementation</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scientific Soil Enhancement</Text>
          <Text style={styles.bullet}>• Conduct comprehensive soil testing every 2-3 years</Text>
          <Text style={styles.bullet}>• Apply lime to correct soil pH (optimal 6.0-7.5 for most crops)</Text>
          <Text style={styles.bullet}>• Organic matter: Add 2-3 tonnes/acre of well-decomposed FYM</Text>
          <Text style={styles.bullet}>• Micronutrient correction: Zinc, Boron, Iron as per soil test</Text>
          <Text style={styles.bullet}>• Bio-fertilizers: Rhizobium, Azotobacter, PSB application</Text>
          <Text style={styles.bullet}>• Cover crops: Legumes in off-season to fix nitrogen</Text>
          <Text style={styles.bullet}>• Minimal tillage: Preserve soil structure and microbial life</Text>
          <Text style={styles.bullet}>• Regular monitoring through soil health cards</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subsidy</Text>
          <Text style={styles.sectionText}>50% subsidy on organic inputs and bio-fertilizers</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <Text style={styles.sectionText}>Continuous process with seasonal applications</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#607D8B', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  bullet: { fontSize: 15, color: '#ccc', marginLeft: 12, marginBottom: 2 },
});

export default SoilHealthScreen; 