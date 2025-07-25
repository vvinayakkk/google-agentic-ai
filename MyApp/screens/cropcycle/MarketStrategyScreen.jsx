import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const MarketStrategyScreen = ({ route }) => {
  const { selectedCrop, landSize } = route?.params || {};
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>📈 Market Intelligence</Text>
        <Text style={styles.subheader}>Strategic roadmap for maximum profit</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Market Signal</Text>
          <Text style={styles.sectionText}>Demand for {selectedCrop || 'your crop'} is projected to rise 15% this season. Price trend: <Text style={{color:'#4CAF50',fontWeight:'bold'}}>↑</Text></Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Suggestions</Text>
          <Text style={styles.bullet}>• Set up price alerts for {selectedCrop || 'your crop'} in local and online markets.</Text>
          <Text style={styles.bullet}>• Join a Farmer Producer Organization (FPO) to increase bargaining power.</Text>
          <Text style={styles.bullet}>• Use e-NAM for transparent price discovery.</Text>
          <Text style={styles.bullet}>• Store 30-40% of produce for price appreciation (if storage available).</Text>
          <Text style={styles.bullet}>• Direct marketing to retailers/processors to eliminate middlemen.</Text>
          <Text style={styles.bullet}>• Value addition: Processing into flour/oil for 20-30% higher margins.</Text>
          <Text style={styles.bullet}>• Export opportunities: Research international demand and requirements.</Text>
          <Text style={styles.bullet}>• Contract farming: Lock-in prices before sowing.</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why this matters</Text>
          <Text style={styles.sectionText}>AI predicts a 15% price increase for well-timed, direct market sales. Marketing infrastructure development grants available.</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <Text style={styles.sectionText}>Ongoing throughout crop cycle</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  bullet: { fontSize: 15, color: '#ccc', marginLeft: 12, marginBottom: 2 },
});

export default MarketStrategyScreen; 