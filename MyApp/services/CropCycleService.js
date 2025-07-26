import { NetworkConfig } from '../utils/NetworkConfig';

const { API_BASE } = NetworkConfig;

class CropCycleService {
  
  // Analyze crop and get comprehensive recommendations
  static async analyzeCrop(cropData) {
    try {
      const response = await NetworkConfig.safeFetch('/crop-cycle/analyze-crop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crop: cropData.crop,
          land_size: parseFloat(cropData.landSize),
          irrigation_method: cropData.irrigation,
          available_tools: cropData.tools || [],
          location: cropData.location || 'India'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error analyzing crop:', error);
      throw error;
    }
  }

  // Get corporate buyers for a specific crop
  static async getCorporateBuyers(crop) {
    try {
      const response = await NetworkConfig.safeFetch(`/crop-cycle/corporate-buyers/${crop}`);
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching corporate buyers:', error);
      throw error;
    }
  }

  // Get loan schemes
  static async getLoanSchemes() {
    try {
      const response = await NetworkConfig.safeFetch('/crop-cycle/loan-schemes');
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching loan schemes:', error);
      throw error;
    }
  }

  // Get insurance plans
  static async getInsurancePlans() {
    try {
      const response = await NetworkConfig.safeFetch('/crop-cycle/insurance-plans');
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching insurance plans:', error);
      throw error;
    }
  }

  // Get certifications
  static async getCertifications() {
    try {
      const response = await NetworkConfig.safeFetch('/crop-cycle/certifications');
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching certifications:', error);
      throw error;
    }
  }

  // Get solar schemes
  static async getSolarSchemes() {
    try {
      const response = await NetworkConfig.safeFetch('/crop-cycle/solar-schemes');
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching solar schemes:', error);
      throw error;
    }
  }

  // Get soil testing labs
  static async getSoilTestingLabs() {
    try {
      const response = await NetworkConfig.safeFetch('/crop-cycle/soil-testing-labs');
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching soil testing labs:', error);
      throw error;
    }
  }

  // Get mandi information
  static async getMandiInfo() {
    try {
      const response = await NetworkConfig.safeFetch('/crop-cycle/mandi-info');
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching mandi info:', error);
      throw error;
    }
  }

  // Get government schemes
  static async getGovernmentSchemes() {
    try {
      const response = await NetworkConfig.safeFetch('/crop-cycle/government-schemes');
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching government schemes:', error);
      throw error;
    }
  }

  // Generate AI insights
  static async generateInsights(cropData) {
    try {
      const response = await NetworkConfig.safeFetch('/crop-cycle/generate-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crop: cropData.crop,
          land_size: parseFloat(cropData.landSize),
          irrigation_method: cropData.irrigation,
          available_tools: cropData.tools || [],
          location: cropData.location || 'India'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  // Search crop data
  static async searchCropData(query, docType = null, limit = 5) {
    try {
      const params = new URLSearchParams({
        query: query,
        limit: limit.toString()
      });
      
      if (docType) {
        params.append('doc_type', docType);
      }

      const response = await NetworkConfig.safeFetch(`/crop-cycle/search?${params}`);
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching crop data:', error);
      throw error;
    }
  }

  // Initiate phone call
  static async initiateCall(phoneNumber) {
    try {
      const response = await NetworkConfig.safeFetch('/crop-cycle/initiate-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  // Health check
  static async healthCheck() {
    try {
      const response = await NetworkConfig.safeFetch('/crop-cycle/health');
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking health:', error);
      throw error;
    }
  }
}

export default CropCycleService;
