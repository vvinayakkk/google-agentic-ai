import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const Card = ({ title, children, accent }) => (
  <View style={[styles.card, accent ? { borderLeftColor: accent } : {}]}>
    {title && <Text style={styles.cardTitle}>{title}</Text>}
    {children}
  </View>
);

const PowerSupplyScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>⚡ Energy Independence</Text>
        <Text style={styles.subheader}>Step-by-step subsidy acquisition guide</Text>
        <Card title="Solar Transition Plan" accent="#FF9800">
          <View style={styles.suggestionList}>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Calculate your power requirements: Irrigation pump (5-10 HP), lighting (2-3 kW), processing equipment</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Solar system sizing: For 10 HP pump + 3kW lighting = 15kW solar system needed</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Apply for PM-KUSUM Scheme: Up to 60% subsidy on solar pumps</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Contact empaneled vendors: Get quotes from government-approved suppliers</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Submit application with land documents and electricity bill</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Install system with certified technicians</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Connect net metering for excess power sale back to grid</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Expected payback period: 4-5 years with subsidies</Text></View>
          </View>
        </Card>
        <Card title="Subsidy" accent="#43e97b">
          <Text style={styles.sectionText}>Government provides 60% subsidy + 30% bank loan at 7% interest</Text>
        </Card>
        <Card title="Timeline" accent="#2196F3">
          <Text style={styles.sectionText}>3-4 months from application to installation</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#FF9800', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  card: { backgroundColor: '#181818', borderRadius: 14, padding: 18, marginBottom: 18, borderLeftWidth: 5, borderLeftColor: '#333', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  suggestionList: { marginTop: 4 },
  suggestionCard: { backgroundColor: '#232323', borderRadius: 8, padding: 12, marginBottom: 8 },
  suggestionText: { color: '#FFD580', fontSize: 15 },
});

export default PowerSupplyScreen; 