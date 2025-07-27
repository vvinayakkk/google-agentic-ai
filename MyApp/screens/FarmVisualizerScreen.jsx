import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const FarmVisualizerScreen = ({ navigation }) => {
  console.log('FarmVisualizerScreen loaded!'); // Debug log
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [farmData, setFarmData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCropModal, setShowCropModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Mock real-time farm data
  const mockFarmData = {
    farmerName: "Rajesh Kumar",
    farmSize: "5.2 acres",
    totalCrops: 8,
    lastUpdated: "2 minutes ago",
    weather: {
      temperature: "28°C",
      humidity: "65%",
      windSpeed: "12 km/h",
      condition: "Partly Cloudy"
    },
    crops: [
      {
        id: 1,
        name: "Wheat",
        variety: "HD-2967",
        area: "2.1 acres",
        status: "healthy", // healthy, moderate, critical
        healthScore: 92,
        growthStage: "Flowering",
        daysPlanted: 45,
        expectedHarvest: "15 days",
        soilMoisture: 78,
        temperature: 26,
        nutrients: {
          nitrogen: 85,
          phosphorus: 72,
          potassium: 88
        },
        position: { x: 0.2, y: 0.3 },
        color: "#4CAF50"
      },
      {
        id: 2,
        name: "Rice",
        variety: "Pusa Basmati",
        area: "1.8 acres",
        status: "moderate",
        healthScore: 67,
        growthStage: "Vegetative",
        daysPlanted: 32,
        expectedHarvest: "28 days",
        soilMoisture: 65,
        temperature: 29,
        nutrients: {
          nitrogen: 58,
          phosphorus: 45,
          potassium: 62
        },
        position: { x: 0.7, y: 0.4 },
        color: "#FF9800"
      },
      {
        id: 3,
        name: "Cotton",
        variety: "BT Cotton",
        area: "0.8 acres",
        status: "critical",
        healthScore: 34,
        growthStage: "Fruiting",
        daysPlanted: 78,
        expectedHarvest: "5 days",
        soilMoisture: 42,
        temperature: 31,
        nutrients: {
          nitrogen: 23,
          phosphorus: 18,
          potassium: 29
        },
        position: { x: 0.4, y: 0.7 },
        color: "#F44336"
      },
      {
        id: 4,
        name: "Sugarcane",
        variety: "Co-0238",
        area: "0.5 acres",
        status: "healthy",
        healthScore: 89,
        growthStage: "Maturity",
        daysPlanted: 120,
        expectedHarvest: "30 days",
        soilMoisture: 82,
        temperature: 27,
        nutrients: {
          nitrogen: 91,
          phosphorus: 85,
          potassium: 94
        },
        position: { x: 0.8, y: 0.8 },
        color: "#4CAF50"
      }
    ]
  };

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setFarmData(mockFarmData);
      setIsLoading(false);
      startAnimations();
    }, 2000);

    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Simulate real-time updates
    const updateInterval = setInterval(() => {
      updateFarmData();
    }, 30000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(updateInterval);
    };
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation for farm view
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  };

  const updateFarmData = () => {
    setFarmData(prevData => ({
      ...prevData,
      lastUpdated: "Just now",
      crops: prevData.crops.map(crop => ({
        ...crop,
        soilMoisture: Math.max(30, Math.min(95, crop.soilMoisture + (Math.random() - 0.5) * 10)),
        temperature: Math.max(20, Math.min(35, crop.temperature + (Math.random() - 0.5) * 2)),
        healthScore: Math.max(20, Math.min(95, crop.healthScore + (Math.random() - 0.5) * 5))
      }))
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#4CAF50';
      case 'moderate': return '#FF9800';
      case 'critical': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return 'check-circle';
      case 'moderate': return 'warning';
      case 'critical': return 'error';
      default: return 'help';
    }
  };

  const handleCropPress = (crop) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCrop(crop);
    setShowCropModal(true);
  };

  const renderFarmView = () => {
    if (!farmData) return null;

    return (
      <View style={styles.farmContainer}>
        <LinearGradient
          colors={['#87CEEB', '#98FB98', '#90EE90']}
          style={styles.farmBackground}
        >
          {/* Farm boundary with fence */}
          <View style={styles.farmBoundary}>
            <View style={styles.boundaryLine} />
            <View style={[styles.boundaryLine, styles.boundaryLineRight]} />
            <View style={[styles.boundaryLine, styles.boundaryLineBottom]} />
            <View style={[styles.boundaryLine, styles.boundaryLineLeft]} />
            
            {/* Fence posts */}
            <View style={[styles.fencePost, { left: 10, top: 10 }]} />
            <View style={[styles.fencePost, { right: 10, top: 10 }]} />
            <View style={[styles.fencePost, { right: 10, bottom: 10 }]} />
            <View style={[styles.fencePost, { left: 10, bottom: 10 }]} />
          </View>

          {/* Main irrigation channel */}
          <View style={styles.mainIrrigationChannel} />
          
          {/* Secondary water channels */}
          <View style={[styles.waterChannel, { top: '25%', left: '20%', width: '60%', height: 3 }]} />
          <View style={[styles.waterChannel, { top: '55%', left: '15%', width: '70%', height: 3 }]} />
          <View style={[styles.waterChannel, { top: '75%', left: '25%', width: '50%', height: 3 }]} />
          
          {/* Vertical water channels */}
          <View style={[styles.waterChannel, { top: '15%', left: '35%', width: 3, height: '70%' }]} />
          <View style={[styles.waterChannel, { top: '20%', left: '65%', width: 3, height: '60%' }]} />

          {/* Farm house */}
          <View style={styles.farmHouse}>
            <View style={styles.houseRoof} />
            <View style={styles.houseBody} />
            <View style={styles.houseDoor} />
            <View style={styles.houseWindow} />
          </View>

          {/* Water pump station */}
          <View style={styles.waterPump}>
            <View style={styles.pumpBody} />
            <View style={styles.pumpPipe} />
            <MaterialCommunityIcons name="water-pump" size={20} color="#2196F3" style={styles.pumpIcon} />
          </View>

          {/* Storage shed */}
          <View style={styles.storageShed}>
            <View style={styles.shedRoof} />
            <View style={styles.shedBody} />
            <View style={styles.shedDoor} />
          </View>

          {/* Farm path */}
          <View style={styles.farmPath} />
          
          {/* Trees around the farm */}
          <View style={[styles.tree, { top: '8%', left: '15%' }]}>
            <View style={styles.treeTrunk} />
            <View style={styles.treeLeaves} />
          </View>
          <View style={[styles.tree, { top: '12%', right: '20%' }]}>
            <View style={styles.treeTrunk} />
            <View style={styles.treeLeaves} />
          </View>
          <View style={[styles.tree, { bottom: '15%', left: '12%' }]}>
            <View style={styles.treeTrunk} />
            <View style={styles.treeLeaves} />
          </View>

          {/* Small pond */}
          <View style={styles.pond}>
            <View style={styles.pondWater} />
            <View style={styles.pondRipple} />
          </View>

          {/* Irrigation sprinklers */}
          <View style={[styles.sprinkler, { top: '30%', left: '25%' }]}>
            <View style={styles.sprinklerBase} />
            <View style={styles.sprinklerHead} />
          </View>
          <View style={[styles.sprinkler, { top: '60%', left: '45%' }]}>
            <View style={styles.sprinklerBase} />
            <View style={styles.sprinklerHead} />
          </View>
          <View style={[styles.sprinkler, { top: '70%', left: '75%' }]}>
            <View style={styles.sprinklerBase} />
            <View style={styles.sprinklerHead} />
          </View>

          {/* Crops with realistic field shapes */}
          {farmData.crops.map((crop, index) => (
            <TouchableOpacity
              key={crop.id}
              style={[
                styles.cropField,
                {
                  left: crop.position.x * width * 0.8,
                  top: crop.position.y * height * 0.4,
                  backgroundColor: crop.color + '40',
                  borderColor: crop.color,
                  // Different shapes for variety
                  borderRadius: index % 2 === 0 ? 40 : 20,
                  width: index % 3 === 0 ? 90 : 80,
                  height: index % 3 === 0 ? 90 : 80,
                }
              ]}
              onPress={() => handleCropPress(crop)}
              activeOpacity={0.8}
            >
              {/* Field texture */}
              <View style={styles.fieldTexture} />
              
              {/* Crop rows */}
              <View style={styles.cropRows}>
                {[...Array(3)].map((_, i) => (
                  <View key={i} style={[styles.cropRow, { top: i * 15 }]} />
                ))}
              </View>

              {/* Crop plants visualization */}
              <View style={styles.cropPlants}>
                {[...Array(6)].map((_, i) => (
                  <View key={i} style={[
                    styles.cropPlant,
                    {
                      left: (i % 3) * 20 + 10,
                      top: Math.floor(i / 3) * 20 + 10,
                      backgroundColor: crop.color,
                    }
                  ]} />
                ))}
              </View>

              <Animated.View
                style={[
                  styles.cropPulse,
                  {
                    backgroundColor: crop.color,
                    transform: [{
                      scale: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.1]
                      })
                    }]
                  }
                ]}
              />
              <Text style={styles.cropName}>{crop.name}</Text>
              <MaterialIcons
                name={getStatusIcon(crop.status)}
                size={20}
                color={getStatusColor(crop.status)}
                style={styles.statusIcon}
              />
            </TouchableOpacity>
          ))}

          {/* Weather indicator */}
          <View style={styles.weatherIndicator}>
            <MaterialCommunityIcons name="weather-partly-cloudy" size={24} color="#fff" />
            <Text style={styles.weatherText}>{farmData.weather.temperature}</Text>
          </View>

          {/* Soil moisture indicator */}
          <View style={styles.soilIndicator}>
            <MaterialCommunityIcons name="water" size={20} color="#2196F3" />
            <Text style={styles.soilText}>Soil: 78%</Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderCropModal = () => {
    if (!selectedCrop) return null;

    return (
      <Modal
        visible={showCropModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCropModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.modalHeader}
            >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCropModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedCrop.name}</Text>
              <Text style={styles.modalSubtitle}>{selectedCrop.variety}</Text>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              {/* Health Score */}
              <View style={styles.healthScoreContainer}>
                <Text style={styles.healthScoreTitle}>Health Score</Text>
                <View style={styles.healthScoreBar}>
                  <View
                    style={[
                      styles.healthScoreFill,
                      {
                        width: `${selectedCrop.healthScore}%`,
                        backgroundColor: getStatusColor(selectedCrop.status)
                      }
                    ]}
                  />
                </View>
                <Text style={styles.healthScoreText}>{selectedCrop.healthScore}%</Text>
              </View>

              {/* Real-time Data */}
              <View style={styles.dataGrid}>
                <View style={styles.dataItem}>
                  <MaterialCommunityIcons name="thermometer" size={24} color="#FF5722" />
                  <Text style={styles.dataLabel}>Temperature</Text>
                  <Text style={styles.dataValue}>{selectedCrop.temperature}°C</Text>
                </View>
                <View style={styles.dataItem}>
                  <MaterialCommunityIcons name="water" size={24} color="#2196F3" />
                  <Text style={styles.dataLabel}>Soil Moisture</Text>
                  <Text style={styles.dataValue}>{selectedCrop.soilMoisture}%</Text>
                </View>
                <View style={styles.dataItem}>
                  <MaterialCommunityIcons name="leaf" size={24} color="#4CAF50" />
                  <Text style={styles.dataLabel}>Growth Stage</Text>
                  <Text style={styles.dataValue}>{selectedCrop.growthStage}</Text>
                </View>
                <View style={styles.dataItem}>
                  <MaterialCommunityIcons name="calendar" size={24} color="#9C27B0" />
                  <Text style={styles.dataLabel}>Days Planted</Text>
                  <Text style={styles.dataValue}>{selectedCrop.daysPlanted}</Text>
                </View>
              </View>

              {/* Nutrients */}
              <View style={styles.nutrientsContainer}>
                <Text style={styles.sectionTitle}>Nutrient Levels</Text>
                <View style={styles.nutrientBars}>
                  <View style={styles.nutrientItem}>
                    <Text style={styles.nutrientLabel}>Nitrogen (N)</Text>
                    <View style={styles.nutrientBar}>
                      <View
                        style={[
                          styles.nutrientFill,
                          { width: `${selectedCrop.nutrients.nitrogen}%`, backgroundColor: '#4CAF50' }
                        ]}
                      />
                    </View>
                    <Text style={styles.nutrientValue}>{selectedCrop.nutrients.nitrogen}%</Text>
                  </View>
                  <View style={styles.nutrientItem}>
                    <Text style={styles.nutrientLabel}>Phosphorus (P)</Text>
                    <View style={styles.nutrientBar}>
                      <View
                        style={[
                          styles.nutrientFill,
                          { width: `${selectedCrop.nutrients.phosphorus}%`, backgroundColor: '#FF9800' }
                        ]}
                      />
                    </View>
                    <Text style={styles.nutrientValue}>{selectedCrop.nutrients.phosphorus}%</Text>
                  </View>
                  <View style={styles.nutrientItem}>
                    <Text style={styles.nutrientLabel}>Potassium (K)</Text>
                    <View style={styles.nutrientBar}>
                      <View
                        style={[
                          styles.nutrientFill,
                          { width: `${selectedCrop.nutrients.potassium}%`, backgroundColor: '#2196F3' }
                        ]}
                      />
                    </View>
                    <Text style={styles.nutrientValue}>{selectedCrop.nutrients.potassium}%</Text>
                  </View>
                </View>
              </View>

              {/* Recommendations */}
              <View style={styles.recommendationsContainer}>
                <Text style={styles.sectionTitle}>AI Recommendations</Text>
                {selectedCrop.status === 'critical' && (
                  <View style={styles.recommendationItem}>
                    <MaterialIcons name="warning" size={20} color="#F44336" />
                    <Text style={styles.recommendationText}>
                      Immediate irrigation required. Soil moisture is critically low.
                    </Text>
                  </View>
                )}
                {selectedCrop.status === 'moderate' && (
                  <View style={styles.recommendationItem}>
                    <MaterialIcons name="info" size={20} color="#FF9800" />
                    <Text style={styles.recommendationText}>
                      Consider applying fertilizer to improve nutrient levels.
                    </Text>
                  </View>
                )}
                {selectedCrop.status === 'healthy' && (
                  <View style={styles.recommendationItem}>
                    <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={styles.recommendationText}>
                      Crop is performing excellently. Continue current practices.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#4CAF50', '#45a049']}
          style={styles.loadingGradient}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <MaterialCommunityIcons name="sprout" size={80} color="#fff" />
            <Text style={styles.loadingText}>Initializing Farm Visualizer...</Text>
            <Text style={styles.loadingSubtext}>Connecting to IoT sensors</Text>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      
      {/* Debug Info */}
      <View style={{ position: 'absolute', top: 50, left: 10, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 5 }}>
        <Text style={{ color: 'white', fontSize: 12 }}>Debug: FarmVisualizerScreen Loaded</Text>
        <Text style={{ color: 'white', fontSize: 12 }}>Farm Data: {farmData ? 'Loaded' : 'Loading...'}</Text>
      </View>
      
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#45a049']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Farm Visualizer</Text>
          <Text style={styles.headerSubtitle}>Real-time Crop Monitoring</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Farm Info */}
      <View style={styles.farmInfo}>
        <View style={styles.farmerInfo}>
          <MaterialCommunityIcons name="account" size={24} color="#4CAF50" />
          <Text style={styles.farmerName}>{farmData?.farmerName}</Text>
        </View>
        <View style={styles.farmStats}>
          <Text style={styles.statText}>📊 {farmData?.totalCrops} Crops</Text>
          <Text style={styles.statText}>🌾 {farmData?.farmSize}</Text>
          <Text style={styles.statText}>🕒 {farmData?.lastUpdated}</Text>
        </View>
      </View>

      {/* Farm Visualization */}
      <Animated.View
        style={[
          styles.farmVisualizer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {renderFarmView()}
      </Animated.View>
      
      {/* Fallback if no farm data */}
      {!farmData && !isLoading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <MaterialCommunityIcons name="sprout" size={80} color="#4CAF50" />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 20, textAlign: 'center' }}>
            Farm Visualizer
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 10, textAlign: 'center' }}>
            Real-time crop monitoring and visualization
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, marginTop: 20 }}
            onPress={() => {
              setFarmData(mockFarmData);
              setIsLoading(false);
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Load Demo Data</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Crop Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Crop Status</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Healthy</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Moderate</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Critical</Text>
          </View>
        </View>
      </View>

      {/* Crop Modal */}
      {renderCropModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#fff',
    marginTop: 10,
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  refreshButton: {
    padding: 8,
  },
  farmInfo: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  farmerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  farmerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  farmStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  farmVisualizer: {
    flex: 1,
    margin: 15,
    borderRadius: 20,
    overflow: 'hidden',
  },
  farmContainer: {
    flex: 1,
    position: 'relative',
  },
  farmBackground: {
    flex: 1,
    position: 'relative',
  },
  farmBoundary: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderWidth: 3,
    borderColor: '#8B4513',
    borderStyle: 'dashed',
    borderRadius: 15,
  },
  boundaryLine: {
    position: 'absolute',
    backgroundColor: '#8B4513',
  },
  boundaryLineRight: {
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  boundaryLineBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  boundaryLineLeft: {
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  fencePost: {
    position: 'absolute',
    width: 8,
    height: 20,
    backgroundColor: '#654321',
    borderRadius: 4,
  },
  mainIrrigationChannel: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    height: 8,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  waterChannel: {
    position: 'absolute',
    backgroundColor: '#2196F3',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  farmHouse: {
    position: 'absolute',
    top: '5%',
    left: '5%',
    width: 60,
    height: 50,
  },
  houseRoof: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: '#8B4513',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  houseBody: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#DEB887',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  houseDoor: {
    position: 'absolute',
    bottom: 0,
    left: 15,
    width: 12,
    height: 20,
    backgroundColor: '#654321',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  houseWindow: {
    position: 'absolute',
    top: 25,
    right: 10,
    width: 15,
    height: 12,
    backgroundColor: '#87CEEB',
    borderRadius: 2,
  },
  waterPump: {
    position: 'absolute',
    top: '15%',
    right: '10%',
    width: 40,
    height: 30,
  },
  pumpBody: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 30,
    height: 20,
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
  pumpPipe: {
    position: 'absolute',
    bottom: 0,
    left: 15,
    width: 4,
    height: 15,
    backgroundColor: '#666',
  },
  pumpIcon: {
    position: 'absolute',
    top: 8,
    left: 10,
  },
  storageShed: {
    position: 'absolute',
    bottom: '10%',
    right: '5%',
    width: 50,
    height: 40,
  },
  shedRoof: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: '#8B4513',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  shedBody: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#A0522D',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  shedDoor: {
    position: 'absolute',
    bottom: 0,
    left: 15,
    width: 20,
    height: 20,
    backgroundColor: '#654321',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  fieldTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    opacity: 0.3,
  },
  cropRows: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cropRow: {
    position: 'absolute',
    left: 5,
    right: 5,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 1,
  },
  farmPath: {
    position: 'absolute',
    top: '45%',
    left: '5%',
    width: '90%',
    height: 4,
    backgroundColor: '#D2B48C',
    borderRadius: 2,
    opacity: 0.7,
  },
  tree: {
    position: 'absolute',
    width: 25,
    height: 35,
  },
  treeTrunk: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    width: 5,
    height: 15,
    backgroundColor: '#8B4513',
    borderRadius: 2,
  },
  treeLeaves: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 25,
    backgroundColor: '#228B22',
    borderRadius: 12,
  },
  pond: {
    position: 'absolute',
    bottom: '25%',
    left: '70%',
    width: 40,
    height: 30,
  },
  pondWater: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#4682B4',
    borderRadius: 20,
    opacity: 0.8,
  },
  pondRipple: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderWidth: 1,
    borderColor: '#87CEEB',
    borderRadius: 15,
    opacity: 0.6,
  },
  sprinkler: {
    position: 'absolute',
    width: 15,
    height: 20,
  },
  sprinklerBase: {
    position: 'absolute',
    bottom: 0,
    left: 5,
    width: 5,
    height: 12,
    backgroundColor: '#666',
    borderRadius: 2,
  },
  sprinklerHead: {
    position: 'absolute',
    top: 0,
    left: 2,
    width: 11,
    height: 8,
    backgroundColor: '#2196F3',
    borderRadius: 6,
  },
  cropPlants: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cropPlant: {
    position: 'absolute',
    width: 8,
    height: 12,
    borderRadius: 4,
    opacity: 0.8,
  },
  cropField: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cropPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.6,
  },
  cropName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    zIndex: 1,
  },
  statusIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  weatherIndicator: {
    position: 'absolute',
    top: 30,
    right: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 5,
  },
  soilIndicator: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  soilText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 5,
  },
  legend: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    height: height * 0.8,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  healthScoreContainer: {
    marginBottom: 20,
  },
  healthScoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  healthScoreBar: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  healthScoreFill: {
    height: '100%',
    borderRadius: 10,
  },
  healthScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dataItem: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  dataLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  dataValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  nutrientsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  nutrientBars: {
    gap: 15,
  },
  nutrientItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutrientLabel: {
    width: 100,
    fontSize: 14,
    color: '#333',
  },
  nutrientBar: {
    flex: 1,
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  nutrientFill: {
    height: '100%',
    borderRadius: 6,
  },
  nutrientValue: {
    width: 40,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  recommendationsContainer: {
    marginBottom: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    lineHeight: 20,
  },
});

export default FarmVisualizerScreen; 