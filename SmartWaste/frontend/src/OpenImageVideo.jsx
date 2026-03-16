import { useState, useEffect } from "react";
import { Groq } from "groq-sdk";

const OpenImageAnalysis = () => {
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY; // Get Groq API key from .env
  
  // Initialize Groq client
  const groq = new Groq({
    apiKey: GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [wasteAnalysis, setWasteAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Change the handleFileChange function to use 'camera-placeholder' and 'camera-status' IDs
const handleFileChange = async (event) => {
  setError(null);
  setWasteAnalysis(null);
  
  const selectedFile = event.target.files[0];
  if (!selectedFile) return;
  
  // Validate that it's an image file
  if (!selectedFile.type.startsWith('image/')) {
    setError("Please select an image file only");
    return;
  }
  
  setFile(selectedFile);
  setLoading(true);
  
  // Create preview for the file
  const previewUrl = URL.createObjectURL(selectedFile);
  setPreview(previewUrl);
  
  // Update status message
  const statusElement = document.getElementById('camera-status');
  if (statusElement) {
    statusElement.textContent = 'Image selected. Analyzing...';
    statusElement.className = 'mt-4 w-full text-center text-sm text-gray-600 dark:text-gray-300';
  }
  
  // Display the image in the placeholder
  const placeholderElement = document.getElementById('camera-placeholder');
  
  if (placeholderElement) {
    placeholderElement.innerHTML = `<img src="${previewUrl}" alt="Selected" class="h-full w-full object-contain rounded-lg" />`;
  }
  
  // Process the uploaded image
  try {
    await analyzeWasteInImage(selectedFile);
  } catch (err) {
    console.error("Error processing image:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// Helper function to resize image and convert to base64
const resizeAndConvertToBase64 = (file, maxDimension) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDimension) {
          height = height * (maxDimension / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = width * (maxDimension / height);
          height = maxDimension;
        }
        
        // Create canvas and resize image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get base64 representation (without the prefix)
        const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        resolve(base64);
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Update analyzeWasteInImage to use 'camera-status' ID instead of 'analysis-status'
const analyzeWasteInImage = async (imageFile) => {
  setAnalyzing(true);
  
  // Clear previous results
  const resultsContainer = document.getElementById('analysis-results');
  if (resultsContainer) {
    resultsContainer.innerHTML = '';
    resultsContainer.className = 'hidden';
  }
  
  // Update status message
  const statusElement = document.getElementById('camera-status');
  if (statusElement) {
    statusElement.textContent = 'Analyzing image for waste using AI...';
    statusElement.className = 'mt-4 w-full text-center text-sm text-gray-600 dark:text-gray-300';
  }
  
  try {
    // Resize image before converting to base64
    const resizedImageBase64 = await resizeAndConvertToBase64(imageFile, 500); 
    
    // Try with vision-specific model first
    try {
      // Using Groq SDK for vision model request
      const visionResponse = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct", // Use vision model
        messages: [
          { 
            role: "system", 
            content: `You are a waste detection and classification AI assistant. Analyze images to identify waste and provide structured JSON responses. 
            Be very detailed in your analysis, including specific materials, environmental impact, and comprehensive disposal recommendations.` 
          },
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: `Analyze this image and determine if it contains garbage/waste.
                If waste is detected, provide a comprehensive analysis with these details:
                
                1. Identify the main type of waste (plastic, paper, organic, metal, electronic, hazardous, mixed, etc.)
                2. Provide a confidence score (0-100%)
                3. List all visible materials and their specific subtypes (e.g., PET plastic, cardboard, food waste)
                4. Give a detailed description of what you see in the image
                5. Environmental impact assessment of this type of waste
                6. Detailed disposal methods with step-by-step instructions for proper handling
                7. Recycling potential and any preparation needed before recycling
                8. Alternative uses or upcycling opportunities if applicable
                
                Return your analysis as JSON with the following structure:
                {
                  "isWaste": boolean,
                  "wasteType": string or null,
                  "confidence": number between 0-100 or null,
                  "materials": [
                    {
                      "name": string,
                      "subtype": string,
                      "description": string
                    }
                  ],
                  "description": string,
                  "environmentalImpact": string,
                  "disposalMethods": {
                    "general": string,
                    "steps": [string],
                    "specialInstructions": string
                  },
                  "recyclingInfo": {
                    "recyclable": boolean,
                    "preparation": string,
                    "facilities": string
                  },
                  "alternativeUses": [string] or null
                }
                
                If no waste is detected, set isWaste to false and provide a description of what you see.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${resizedImageBase64}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse and store the waste analysis results
      const result = JSON.parse(visionResponse.choices[0].message.content);
      setWasteAnalysis(result);
      
      // Display detailed results
      displayDetailedResults(result, resultsContainer);
      
      // Update status
      if (statusElement) {
        statusElement.textContent = result.isWaste ? 
          'Analysis complete: Waste detected' : 
          'Analysis complete: No waste detected';
      }

    } catch (visionError) {
      console.warn("Vision model API failed, falling back to text-only approach:", visionError);
      
      // Fallback to text-only approach with compressed image data
      const textPrompt = `
        Analyze this image and determine if it contains garbage/waste.
        If waste is detected, provide a comprehensive analysis with these details:
        
        1. Identify the main type of waste (plastic, paper, organic, metal, electronic, hazardous, mixed, etc.)
        2. Provide a confidence score (0-100%)
        3. List all visible materials and their specific subtypes (e.g., PET plastic, cardboard, food waste)
        4. Give a detailed description of what you see in the image
        5. Environmental impact assessment of this type of waste
        6. Detailed disposal methods with step-by-step instructions for proper handling
        7. Recycling potential and any preparation needed before recycling
        8. Alternative uses or upcycling opportunities if applicable
        
        Return your analysis as JSON with the following structure:
        {
          "isWaste": boolean,
          "wasteType": string or null,
          "confidence": number between 0-100 or null,
          "materials": [
            {
              "name": string,
              "subtype": string,
              "description": string
            }
          ],
          "description": string,
          "environmentalImpact": string,
          "disposalMethods": {
            "general": string,
            "steps": [string],
            "specialInstructions": string
          },
          "recyclingInfo": {
            "recyclable": boolean,
            "preparation": string,
            "facilities": string
          },
          "alternativeUses": [string] or null
        }
        
        If no waste is detected, set isWaste to false and provide a description of what you see.
        
        Image (base64): ${resizedImageBase64.substring(0, 100)}...
      `;
      
      // Using Groq SDK for text-based model request
      const textResponse = await groq.chat.completions.create({
        model: "llama3-70b-8192", // Or another appropriate Groq model
        messages: [
          { 
            role: "system", 
            content: `You are a waste detection and classification AI assistant. Analyze images to identify waste and provide structured JSON responses. 
            Be very detailed in your analysis, including specific materials, environmental impact, and comprehensive disposal recommendations.` 
          },
          { 
            role: "user", 
            content: textPrompt 
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse and store the waste analysis results
      const result = JSON.parse(textResponse.choices[0].message.content);
      setWasteAnalysis(result);
      
      // Display detailed results
      updateUIWithResults(result, resultsContainer);
      
      // Update status
      if (statusElement) {
        statusElement.textContent = result.isWaste ? 
          'Analysis complete: Waste detected' : 
          'Analysis complete: No waste detected';
      }
    }      
           
  } catch (error) {
    console.error("Error analyzing waste in image:", error);
    setError(error.message);
    
    // Update status message
    if (statusElement) {
      statusElement.textContent = `Error analyzing image: ${error.message}`;
      statusElement.className = 'mt-4 w-full text-center text-sm text-red-500';
    }
  } finally {
    setAnalyzing(false);
  }
};



// Helper function to display detailed waste analysis results
const displayDetailedResults = (result, container) => {
  if (!container) return;
  
  container.className = 'mt-6 w-full';
  
  if (result.isWaste) {
    // Create detailed waste analysis UI
    container.innerHTML = `
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <!-- Header -->
        <div class="bg-green-500 dark:bg-green-600 p-4 flex items-center justify-between">
          <div class="flex items-center">
            <div class="bg-white dark:bg-gray-800 p-2 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 class="text-lg font-bold text-white">Waste Analysis Complete</h2>
          </div>
          <div class="bg-green-400 dark:bg-green-500 rounded-full px-3 py-1 text-sm font-medium text-white">
            ${result.confidence}% Confidence
          </div>
        </div>
        
        <!-- Main Content -->
        <div class="p-5">
          <!-- Waste Type -->
          <div class="mb-6">
            <div class="flex items-center mb-2">
              <div class="h-8 w-8 rounded-full ${getWasteTypeColor(result.wasteType)} mr-3 flex items-center justify-center">
                ${getWasteTypeIcon(result.wasteType)}
              </div>
              <h3 class="text-xl font-bold text-gray-800 dark:text-gray-200">${result.wasteType}</h3>
            </div>
            <p class="text-gray-600 dark:text-gray-300">${result.description}</p>
          </div>
          
          <!-- Materials List -->
          <div class="mb-6">
            <h4 class="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Materials Identified
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${result.materials ? result.materials.map(material => `
                <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  <div class="font-medium text-gray-800 dark:text-gray-200">${material.name}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">${material.subtype}</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 mt-1">${material.description}</div>
                </div>
              `).join('') : '<div class="text-gray-500">No specific materials identified</div>'}
            </div>
          </div>
          
          <!-- Environmental Impact -->
          <div class="mb-6">
            <h4 class="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Environmental Impact
            </h4>
            <div class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded">
              <p class="text-gray-700 dark:text-gray-300">${result.environmentalImpact}</p>
            </div>
          </div>
          
          <!-- Disposal Methods -->
          <div class="mb-6">
            <h4 class="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Disposal Methods
            </h4>
            <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
              <p class="font-medium text-gray-800 dark:text-gray-200 mb-3">${result.disposalMethods?.general || 'No general disposal information available'}</p>
              
              ${result.disposalMethods?.steps ? `
                <div class="mb-3">
                  <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Step-by-step Instructions:</h5>
                  <ol class="list-decimal pl-5 space-y-1">
                    ${result.disposalMethods.steps.map(step => `
                      <li class="text-gray-600 dark:text-gray-300">${step}</li>
                    `).join('')}
                  </ol>
                </div>
              ` : ''}
              
              ${result.disposalMethods?.specialInstructions ? `
                <div class="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border-l-2 border-yellow-400 mt-3">
                  <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300">Special Instructions:</h5>
                  <p class="text-gray-600 dark:text-gray-300 text-sm">${result.disposalMethods.specialInstructions}</p>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Recycling Information -->
          <div class="mb-6">
            <h4 class="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recycling Information
            </h4>
            <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
              <div class="flex items-center mb-3">
                <div class="h-6 w-6 rounded-full ${result.recyclingInfo?.recyclable ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'} flex items-center justify-center mr-2">
                  ${result.recyclingInfo?.recyclable ? 
                    '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-600 dark:text-green-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>' : 
                    '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-600 dark:text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>'
                  }
                </div>
                <span class="font-medium text-gray-800 dark:text-gray-200">
                  ${result.recyclingInfo?.recyclable ? 'Recyclable' : 'Not Recyclable'}
                </span>
              </div>
              
              ${result.recyclingInfo?.preparation ? `
                <div class="mb-3">
                  <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preparation for Recycling:</h5>
                  <p class="text-gray-600 dark:text-gray-300">${result.recyclingInfo.preparation}</p>
                </div>
              ` : ''}
              
              ${result.recyclingInfo?.facilities ? `
                <div>
                  <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recycling Facilities:</h5>
                  <p class="text-gray-600 dark:text-gray-300">${result.recyclingInfo.facilities}</p>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Alternative Uses -->
          ${result.alternativeUses && result.alternativeUses.length > 0 ? `
            <div>
              <h4 class="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Alternative Uses & Upcycling
              </h4>
              <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-md">
                <ul class="space-y-2">
                  ${result.alternativeUses.map(use => `
                    <li class="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span class="text-gray-700 dark:text-gray-300">${use}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } else {
    // No waste detected UI
    container.innerHTML = `
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div class="bg-yellow-500 dark:bg-yellow-600 p-4">
          <div class="flex items-center">
            <div class="bg-white dark:bg-gray-800 p-2 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-500 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 class="text-lg font-bold text-white">No Waste Detected</h2>
          </div>
        </div>
        <div class="p-5">
          <p class="text-gray-600 dark:text-gray-300">${result.description}</p>
        </div>
      </div>
    `;
  }
};

// Helper function to get background color based on waste type
const getWasteTypeColor = (wasteType) => {
  const wasteColors = {
    'plastic': 'bg-yellow-500',
    'paper': 'bg-blue-500',
    'glass': 'bg-green-500',
    'metal': 'bg-yellow-500',
    'electronic': 'bg-purple-500',
    'e-waste': 'bg-purple-500',
    'hazardous': 'bg-orange-500',
    'organic': 'bg-emerald-500',
    'mixed': 'bg-yellow-500'
  };
  
  // Make search case-insensitive
  const lowerCaseType = wasteType?.toLowerCase();
  return wasteColors[lowerCaseType] || 'bg-gray-500';
};

const getWasteTypeIcon = (wasteType) => {
  const lowerCaseType = wasteType?.toLowerCase();
  
  const icons = {
    'plastic': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>',
    
    'paper': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>',
    
    'glass': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>',
    
    'metal': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>',
    
    'electronic': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>',
    
    'e-waste': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>',
    
    'hazardous': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
    
    'organic': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    
    'mixed': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>'
  };
  
  return icons[lowerCaseType] || '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>';
};


// Combine the UI structure from the second file with the detailed results display
return (
  <div className="flex flex-col items-center">

    
    {/* Status Message */}
    <div id="camera-status" className="mt-4 w-full text-center text-sm text-gray-600 dark:text-gray-300">
      {error && <p className="text-red-500">{error}</p>}
    </div>
    
    {/* Upload Button */}
    <label className={`mt-4 cursor-pointer ${loading || analyzing ? 'bg-gray-500' : 'bg-blue-500 hover:bg-blue-600'} text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center transition duration-300 ${(loading || analyzing) ? 'opacity-75 cursor-not-allowed' : ''}`}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={loading || analyzing}
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 mr-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
      {loading ? "Processing..." : 
       analyzing ? "Analyzing Waste..." : 
       "Upload Image for Analysis"}
    </label>
    
    {/* Results Section */}
    <div id="analysis-results" className="hidden mt-6 w-full max-w-lg"></div>
  </div>
);}

export default OpenImageAnalysis;
