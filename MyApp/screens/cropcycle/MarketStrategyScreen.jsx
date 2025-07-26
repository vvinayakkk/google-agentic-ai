import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const Card = ({ title, children, accent }) => (
  <View style={[styles.card, accent ? { borderLeftColor: accent } : {}]}>
    {title && <Text style={styles.cardTitle}>{title}</Text>}
    {children}
  </View>
);

const MarketStrategyScreen = ({ route }) => {
  const { selectedCrop, landSize } = route?.params || {};
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>📈 Market Intelligence</Text>
        <Text style={styles.subheader}>Strategic roadmap for maximum profit</Text>
        <Card title="Key Market Signal" accent="#4CAF50">
          <Text style={styles.sectionText}>Demand for {selectedCrop || 'your crop'} is projected to rise 15% this season. Price trend: <Text style={{color:'#4CAF50',fontWeight:'bold'}}>↑</Text></Text>
        </Card>
        <Card title="AI Suggestions" accent="#43e97b">
          <View style={styles.suggestionList}>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Set up price alerts for {selectedCrop || 'your crop'} in local and online markets.</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Join a Farmer Producer Organization (FPO) to increase bargaining power.</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Use e-NAM for transparent price discovery.</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Store 30-40% of produce for price appreciation (if storage available).</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Direct marketing to retailers/processors to eliminate middlemen.</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Value addition: Processing into flour/oil for 20-30% higher margins.</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Export opportunities: Research international demand and requirements.</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Contract farming: Lock-in prices before sowing.</Text></View>
          </View>
        </Card>
        <Card title="Why this matters" accent="#FFC107">
          <Text style={styles.sectionText}>AI predicts a 15% price increase for well-timed, direct market sales. Marketing infrastructure development grants available.</Text>
        </Card>
        <Card title="Timeline" accent="#2196F3">
          <Text style={styles.sectionText}>Ongoing throughout crop cycle</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  card: { backgroundColor: '#181818', borderRadius: 14, padding: 18, marginBottom: 18, borderLeftWidth: 5, borderLeftColor: '#333', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  suggestionList: { marginTop: 4 },
  suggestionCard: { backgroundColor: '#232323', borderRadius: 8, padding: 12, marginBottom: 8 },
  suggestionText: { color: '#B0FFB0', fontSize: 15 },
});

export default MarketStrategyScreen; 