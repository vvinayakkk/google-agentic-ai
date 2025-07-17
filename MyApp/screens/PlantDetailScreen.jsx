import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { plantData } from '../data/data';

const { width } = Dimensions.get('window');
const HEADER_IMAGE_HEIGHT = Dimensions.get('window').height * 0.4;

// --- Helper Components for the new UI sections ---

// pH Scale Visual Component (Updated with colors)
const PhScale = ({ ph }) => {
  const getPhSegmentStyle = (value) => {
    // Define colors for different pH values based on the screenshot
    let backgroundColor;
    if (value <= 2) backgroundColor = '#d9534f'; // Red
    else if (value <= 4) backgroundColor = '#f0ad4e'; // Orange
    else if (value <= 6) backgroundColor = '#ffd700'; // Yellow
    else if (value === 7) backgroundColor = '#5cb85c'; // Neutral Green
    else if (value <= 9) backgroundColor = '#5bc0de'; // Light Blue
    else if (value <= 11) backgroundColor = '#428bca'; // Blue
    else backgroundColor = '#9932CC'; // Purple

    // Text color needs to be readable on the background
    const color = (value >= 5 && value <= 6) ? '#333' : '#fff';

    return { backgroundColor, color };
  };

  return (
    <View style={styles.phContainer}>
      <View style={styles.phScale}>
        {ph.range.map((value) => {
          const { backgroundColor, color } = getPhSegmentStyle(value);
          // Highlight the ideal range with a border or different style
          const isIdeal = value >= ph.min && value <= ph.max;
          return (
            <View 
              key={value} 
              style={[
                styles.phSegment, 
                { backgroundColor },
                isIdeal && styles.phIdealSegment
              ]}
            >
              <Text style={[styles.phText, { color }]}>{value}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.phLabelContainer}>
        <Text style={styles.phLabel}>{ph.min.toFixed(1)} - {ph.max.toFixed(1)} pH</Text>
      </View>
    </View>
  );
};


// Temperature Slider Visual Component
const TemperatureSlider = ({ temp }) => {
    const totalRange = temp.range.max - temp.range.min;
    const idealWidth = ((temp.ideal.max - temp.ideal.min) / totalRange) * 100;
    const tolerableWidth = ((temp.tolerable.max - temp.tolerable.min) / totalRange) * 100;
    
    return (
        <View style={styles.tempContainer}>
            <View style={styles.tempBar}>
                <View style={[styles.tempSegment, { width: `${idealWidth}%`, backgroundColor: '#4CAF50' }]} />
                <View style={[styles.tempSegment, { width: `${tolerableWidth}%`, backgroundColor: '#2196F3' }]} />
                <View style={[styles.tempSegment, { flex: 1, backgroundColor: '#F44336' }]} />
            </View>
            <View style={styles.tempLabels}>
                <Text style={styles.tempLabelText}>{temp.range.min}°C</Text>
                <Text style={styles.tempLabelText}>{temp.ideal.max}°C</Text>
                <Text style={styles.tempLabelText}>{temp.tolerable.max}°C</Text>
                <Text style={styles.tempLabelText}>{temp.range.max}°C</Text>
            </View>
             <View style={styles.tempLegend}>
                <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#4CAF50'}]} /><Text style={styles.legendItemText}> Ideal</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#2196F3'}]} /><Text style={styles.legendItemText}> Tolerable</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#F44336'}]} /><Text style={styles.legendItemText}> Unsuitable</Text></View>
            </View>
        </View>
    );
};


export function PlantDetailScreen({ route, navigation }) {
  const { plantId } = route.params;
  const plant = plantData.find(p => p.id === plantId);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  if (!plant) {
    return (
      <SafeAreaView style={styles.container}><Text>Plant not found!</Text></SafeAreaView>
    );
  }

  const renderTag = (tag) => {
    const isDanger = tag.type === 'danger';
    return (
      <View key={tag.label} style={[styles.tag, isDanger && styles.tagDanger]}>
        <Text style={[styles.tagText, isDanger && styles.tagTextDanger]}>{tag.label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* --- FIXED Image Header with Back Button --- */}
      <ImageBackground source={{ uri: plant.image }} style={styles.headerImage}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </ImageBackground>

      {/* --- SCROLLABLE Main Content --- */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }} // Ensure space at the bottom
      >
        <View style={styles.contentContainer}>
          <Text style={styles.plantTitle}>{plant.name}</Text>
          <View style={styles.tagsContainer}>{plant.tags.map(renderTag)}</View>
          
          <View style={styles.infoSection}>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Botanical Name</Text><Text style={styles.infoValue}>{plant.botanicalName}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Scientific Name</Text><Text style={styles.infoValue}>{plant.scientificName}</Text></View>
            {plant.alsoKnownAs.length > 0 && <View style={styles.infoRow}><Text style={styles.infoLabel}>Also known as</Text><Text style={styles.infoValue}>{plant.alsoKnownAs.join(', ')}</Text></View>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conditions</Text>
            <View style={styles.conditionRow}>
                <View style={styles.conditionItem}><Ionicons name="sunny-outline" size={24} color="#FFC107" /><Text style={styles.conditionText}>Sunlight</Text><Text style={styles.conditionValue}>{plant.conditions.sunlight}</Text></View>
                <View style={styles.conditionItem}><Ionicons name="thermometer-outline" size={24} color="#4CAF50" /><Text style={styles.conditionText}>Hardiness</Text><Text style={styles.conditionValue}>{plant.conditions.hardness}</Text></View>
            </View>
            <View style={styles.soilSection}><Ionicons name="leaf-outline" size={24} color="#795548" /><View style={{marginLeft: 10}}><Text style={styles.conditionText}>Soil</Text><Text style={styles.conditionValue}>Type: {plant.conditions.soil.type}</Text><Text style={styles.conditionValue}>Drainage: {plant.conditions.soil.drainage}</Text></View></View>
            <PhScale ph={plant.conditions.soil.ph} />
            <Text style={[styles.conditionText, {marginTop: 20, marginBottom: 10}]}>Temperature needs</Text>
            <TemperatureSlider temp={plant.conditions.temperature} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <View style={styles.requirementsGrid}>
                <View style={styles.requirementItem}><Ionicons name="water-outline" size={24} color="#2196F3" /><Text>{plant.requirements.water}</Text></View>
                <View style={styles.requirementItem}><Ionicons name="analytics-outline" size={24} color="#9C27B0" /><Text>{plant.requirements.reporting}</Text></View>
                <View style={styles.requirementItem}><Ionicons name="nutrition-outline" size={24} color="#FF9800" /><Text>{plant.requirements.fertilizer}</Text></View>
                <View style={styles.requirementItem}><Ionicons name="cloud-outline" size={24} color="#00BCD4" /><Text>{plant.requirements.misting}</Text></View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pests & Diseases</Text>
            <View style={styles.pestsContainer}>
                <View style={styles.pestsColumn}><Text style={styles.pestsTitle}>Pests</Text>{plant.pestsAndDiseases.pests.map(pest => <Text key={pest} style={styles.pestItem}>- {pest}</Text>)}</View>
                <View style={styles.pestsColumn}><Text style={styles.pestsTitle}>Diseases</Text>{plant.pestsAndDiseases.diseases.map(disease => <Text key={disease} style={styles.pestItem}>- {disease}</Text>)}</View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Uses</Text>
            <View style={styles.usesContainer}><Ionicons name="bulb-outline" size={24} color="#4CAF50" /><View style={{marginLeft: 10, flex: 1}}><Text style={styles.usesTitle}>Symbolism</Text><Text style={styles.usesText}>{plant.uses.symbolism}</Text></View></View>
          </View>

          <View style={styles.healthSection}>
             <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}><Ionicons name="leaf-outline" size={20} color="#388E3C" /><Text style={styles.sectionTitle}>Plant Health</Text></View>
            <Text style={styles.healthStatus}>HORRAY! YOUR PLANT LOOKS {plant.health.status.toUpperCase()}!</Text>
            <Text style={styles.healthDiagnosis}>{plant.health.diagnosis}</Text>
            <TouchableOpacity style={styles.chatButton}><Text style={styles.chatButtonText}>Chat with AI</Text></TouchableOpacity>
          </View>

          <View style={styles.section}>
             <Text style={styles.sectionTitle}>Description</Text>
             <Text style={styles.descriptionText} numberOfLines={isDescriptionExpanded ? 0 : 3}>{plant.longDescription}</Text>
             <TouchableOpacity onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}><Text style={styles.readMore}>Read {isDescriptionExpanded ? 'less' : 'more'}</Text></TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scientific classification</Text>
            {Object.entries(plant.scientificClassification).map(([key, value]) => (<View key={key} style={styles.classificationRow}><Text style={styles.classificationKey}>{key}</Text><Text style={styles.classificationValue}>{value}</Text></View>))}
          </View>

           {plant.similarPlants.length > 0 && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Similar Plant of {plant.name}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>{plant.similarPlants.map(p => (<View key={p.id} style={styles.similarPlantCard}><Image source={{ uri: p.image }} style={styles.similarPlantImage}/><Text style={styles.similarPlantName}>{p.name}</Text></View>))}</ScrollView>
            </View>
           )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  headerImage: { width: '100%', height: HEADER_IMAGE_HEIGHT },
  backButton: { position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 20, zIndex: 10 },
  scrollContainer: { flex: 1 },
  contentContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, padding: 24 },
  plantTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  tag: { backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  tagText: { color: '#388E3C', fontWeight: '600', fontSize: 12 },
  tagDanger: { backgroundColor: '#FFCDD2' },
  tagTextDanger: { color: '#D32F2F' },
  infoSection: { marginBottom: 24 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  conditionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  conditionItem: { alignItems: 'center', backgroundColor: '#fafafa', padding: 16, borderRadius: 12, width: '45%' },
  conditionText: { color: '#666', marginTop: 4 },
  conditionValue: { color: '#333', fontWeight: 'bold' },
  soilSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', padding: 16, borderRadius: 12, marginBottom: 20 },
  phContainer: {},
  phScale: { flexDirection: 'row', height: 25, borderRadius: 12, overflow: 'hidden' },
  phSegment: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  phIdealSegment: { borderWidth: 2, borderColor: '#FFFFFF', elevation: 5 },
  phText: { fontWeight: 'bold', fontSize: 10 },
  phLabelContainer: { alignSelf: 'center', marginTop: 8, backgroundColor: '#388E3C', borderRadius: 15, paddingVertical: 4, paddingHorizontal: 12 },
  phLabel: { color: '#fff', fontWeight: 'bold' },
  tempContainer: {},
  tempBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#eee' },
  tempSegment: { height: '100%' },
  tempLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  tempLabelText: { fontSize: 12, color: '#666' },
  tempLegend: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendItemText: { fontSize: 12 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  requirementsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  requirementItem: { width: '48%', backgroundColor: '#fafafa', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10, gap: 8 },
  pestsContainer: { flexDirection: 'row', backgroundColor: '#fafafa', padding: 16, borderRadius: 12 },
  pestsColumn: { flex: 1 },
  pestsTitle: { fontWeight: 'bold', color: '#D32F2F', marginBottom: 8 },
  pestItem: { fontSize: 14, color: '#666', marginBottom: 4 },
  usesContainer: { flexDirection: 'row', backgroundColor: '#E8F5E9', padding: 16, borderRadius: 12 },
  usesTitle: { fontWeight: 'bold', color: '#388E3C', marginBottom: 4 },
  usesText: { fontSize: 14, color: '#555', lineHeight: 20 },
  healthSection: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 16, marginBottom: 24 },
  healthStatus: { fontWeight: 'bold', color: '#388E3C', marginBottom: 8 },
  healthDiagnosis: { fontSize: 14, color: '#555', marginBottom: 16 },
  chatButton: { backgroundColor: '#388E3C', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  chatButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  descriptionText: { fontSize: 15, lineHeight: 22, color: '#555' },
  readMore: { color: '#388E3C', fontWeight: 'bold', marginTop: 4 },
  classificationRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  classificationKey: { fontSize: 14, color: '#666' },
  classificationValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  similarPlantCard: { width: 120, marginRight: 16 },
  similarPlantImage: { width: 120, height: 120, borderRadius: 12, marginBottom: 8 },
  similarPlantName: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center' },
});
