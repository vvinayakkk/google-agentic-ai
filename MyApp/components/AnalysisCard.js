import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import AnimatedCard from './AnimatedCard';

const AnalysisCard = ({ icon, title, value, details, color = '#58D68D', metrics = [] }) => (
  <AnimatedCard>
    <View style={styles.analysisCard}>
      <View style={styles.analysisCardHeader}>
        <Icon name={icon} style={{ fontSize: 24, color }} />
        <Text style={styles.analysisCardTitle}>{title}</Text>
      </View>
      <Text style={[styles.analysisCardValue, { color }]}>{value}</Text>
      {details && <Text style={styles.analysisCardDetails}>{details}</Text>}
      {metrics.length > 0 && (
        <View style={styles.metricsContainer}>
          {metrics.map((metric, index) => (
            <View key={index} style={styles.metricItem}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={[styles.metricText, { color: metric.color || '#58D68D' }]}>{metric.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  </AnimatedCard>
);

const styles = StyleSheet.create({
  analysisCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  analysisCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  analysisCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  analysisCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  analysisCardDetails: {
    fontSize: 14,
    color: '#A9A9A9',
    marginBottom: 10,
  },
  metricsContainer: {
    marginTop: 10,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  metricLabel: {
    fontSize: 14,
    color: '#A9A9A9',
  },
  metricText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AnalysisCard; 