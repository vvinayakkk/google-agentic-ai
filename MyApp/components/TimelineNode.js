import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import AnimatedCard from './AnimatedCard';

const TimelineNode = ({ isFirst, isLast, title, date, details, priority = 'normal', completed = false }) => (
  <AnimatedCard>
    <View style={styles.timelineNode}>
      <View style={styles.timelineIconContainer}>
        <View style={[styles.timelineLine, isFirst && {backgroundColor: 'transparent'}]} />
        <View style={[
          styles.timelineCircle,
          { backgroundColor: completed ? '#58D68D' : priority === 'high' ? '#E74C3C' : '#2C2C2C' }
        ]}>
          <Icon name={completed ? '✓' : priority === 'high' ? '!' : '🗓️'} style={{fontSize: 14, color: '#FFFFFF'}} />
        </View>
        <View style={[styles.timelineLine, isLast && {backgroundColor: 'transparent'}]} />
      </View>
      <View style={styles.timelineTextContainer}>
        <View style={styles.timelineHeader}>
          <Text style={[styles.timelineTitle, completed && { color: '#58D68D' }]}>{title}</Text>
          {priority === 'high' && (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>URGENT</Text>
            </View>
          )}
        </View>
        <Text style={styles.timelineDate}>{date}</Text>
        <Text style={styles.timelineDetails}>{details}</Text>
      </View>
    </View>
  </AnimatedCard>
);

const styles = StyleSheet.create({
  timelineNode: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 15,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 15,
    width: 30,
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: '#4A4A4A',
  },
  timelineCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  timelineTextContainer: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  priorityBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  timelineDate: {
    fontSize: 12,
    color: '#58D68D',
    marginBottom: 5,
  },
  timelineDetails: {
    fontSize: 14,
    color: '#A9A9A9',
    lineHeight: 20,
  },
});

export default TimelineNode; 