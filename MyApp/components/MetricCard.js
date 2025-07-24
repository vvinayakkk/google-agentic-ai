import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';

const MetricCard = ({ icon, title, value, subtitle, trend, color = '#58D68D' }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <Icon name={icon} style={[styles.metricIcon, { color }]} />
      <View style={styles.metricContent}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
        {trend && <Text style={[styles.metricTrend, { color: trend.includes('+') ? '#58D68D' : '#E74C3C' }]}>{trend}</Text>}
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  metricCard: { 
    flex: 1, 
    backgroundColor: '#1A1A1A', 
    borderRadius: 10, 
    padding: 12 
  },
  metricHeader: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  metricIcon: { 
    fontSize: 20, 
    marginRight: 8 
  },
  metricContent: { 
    flex: 1 
  },
  metricTitle: { 
    fontSize: 12, 
    color: '#A9A9A9', 
    marginBottom: 2 
  },
  metricValue: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  metricSubtitle: { 
    fontSize: 10, 
    color: '#A9A9A9', 
    marginTop: 2 
  },
  metricTrend: { 
    fontSize: 12, 
    fontWeight: '600', 
    marginTop: 2 
  },
});

export default MetricCard; 