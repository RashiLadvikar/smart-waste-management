import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import sampleImage from "./sample.png"; // Adjust the path as needed
import OpenImageVideo from "./OpenImageVideo";

// Blue Marker Icon for detected locations
const blueIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

// Map component to display garbage locations and detected locations
const MapControl = ({ detectedLocations }) => {
  const map = useMap();

  useEffect(() => {
    // Add detected locations to map
    detectedLocations.forEach(async (loc) => {
      const marker = L.marker([loc.latitude, loc.longitude], { icon: blueIcon }).addTo(map);

      // Format the timestamp to a readable date/time
      const detectionTime = new Date(loc.timestamp).toLocaleString();

      // Fetch city name using OpenStreetMap Nominatim API
      let cityName = 'Unknown location';
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}&zoom=10`
        );
        const data = await response.json();

        // Extract city name from the response
        if (data.address) {
          cityName = data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.hamlet ||
            'Unknown location';
        }
      } catch (error) {
        console.error('Error fetching location name:', error);
      }

      // Create popup with city name and formatted timestamp
      const popup = L.popup({
        autoClose: true,
        closeOnClick: true
      })
        .setLatLng([loc.latitude, loc.longitude])
        .setContent(`
        <div>
          <span style="font-weight: bold;">📍 ${cityName}</span><br>
          <span>Detected: ${detectionTime}</span>
        </div>
      `);

      // Add event listeners for hover and click
      marker.bindPopup(popup);

      // Show popup on hover
      marker.on('mouseover', function () {
        this.openPopup();
      });

      // Hide popup when mouse leaves the marker
      marker.on('mouseout', function () {
        this.closePopup();
      });

      // Use flyTo for smooth transition when clicked
      marker.on('click', function () {
        map.flyTo([loc.latitude, loc.longitude], 15, {
          animate: true,
          duration: 1 // duration in seconds
        });

        // Update the selectedLocation info on UI
        const coordsDisplay = document.getElementById('coordinates-display');
        const latDisplay = document.getElementById('lat-display');
        const lngDisplay = document.getElementById('lng-display');

        if (coordsDisplay && latDisplay && lngDisplay) {
          coordsDisplay.classList.remove('hidden');
          latDisplay.textContent = loc.latitude;
          lngDisplay.textContent = loc.longitude;
        }
      });
    });
  }, [map, detectedLocations]);

  return null;
};

export default function Map() {
  const [file, setFile] = useState(null);
  const [detectedLocations, setDetectedLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([20, 78]);
  const [mapZoom, setMapZoom] = useState(5);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // Function to fetch detected locations from the API
  const fetchDetectedLocations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('https://smartwatemobile-1.onrender.com/api/location/get-location');

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data.locations)
      if (data.locations) {
        setDetectedLocations(data.locations);

        // Update status text
        const statusElement = document.getElementById('location-status');
        if (statusElement) {
          statusElement.textContent = `${data.locations.length} locations detected`;
        }
      } else {
        throw new Error(data.message || 'Failed to fetch locations');
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err.message);

      // Update status text
      const statusElement = document.getElementById('location-status');
      if (statusElement) {
        statusElement.textContent = 'Failed to fetch locations';
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle location selection from the list
  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setMapCenter([location.latitude, location.longitude]);
    setMapZoom(15);

    // Update coordinates display
    const coordsDisplay = document.getElementById('coordinates-display');
    const latDisplay = document.getElementById('lat-display');
    const lngDisplay = document.getElementById('lng-display');

    if (coordsDisplay && latDisplay && lngDisplay) {
      coordsDisplay.classList.remove('hidden');
      latDisplay.textContent = location.latitude;
      lngDisplay.textContent = location.longitude;
    }
  };

  // Fetch locations when component mounts
  useEffect(() => {
    fetchDetectedLocations();

    // Set up interval to refresh locations every 30 seconds
    const intervalId = setInterval(fetchDetectedLocations, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div>
      <section id="map-interface" className="py-16 px-18 bg-white dark:bg-neutral-800 ">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800 dark:text-white">
              Waste Detection & Map Interface
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              View and manage detected garbage locations with our intuitive mapping system.
            </p>
          </div>

          {/* Main Content Area - Restructured */}
          <div className="flex flex-col gap-8" >
            {/* Map Section with Information - Combined */}
            <div className="bg-white dark:bg-neutral-700 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gray-200 dark:bg-neutral-600 p-4">
                <h3 className="font-semibold text-gray-800 dark:text-white flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-green-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Live Map View
                </h3>
              </div>

              <div className="flex flex-col lg:flex-row">
                {/* Left Side: Map */}
                <div className="lg:w-2/3 w-full">
                  {/* Map Container */}
                  <div id="map" className="h-96 w-full bg-gray-50 dark:bg-neutral-900 relative overflow-hidden z-10">
                    <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%" }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapControl detectedLocations={detectedLocations} />
                    </MapContainer>
                  </div>

                  {/* Map Info Panel */}
                  <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${isLoading ? 'bg-yellow-500 animate-pulse' : detectedLocations.length > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Location status:{" "}
                          <span id="location-status">
                            {isLoading ? 'Loading...' :
                              error ? 'Error loading locations' :
                                detectedLocations.length > 0 ? `${detectedLocations.length} locations detected` :
                                  'No locations detected'}
                          </span>
                        </span>
                      </div>
                      <div>
                        <button
                          id="map-refresh-btn"
                          className="p-2 hover:bg-gray-300 dark:hover:bg-neutral-500 rounded-full transition"
                          title="Refresh map"
                          onClick={() => fetchDetectedLocations()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Coordinates Display */}
                    <div
                      id="coordinates-display"
                      className={`mt-3 p-3 bg-gray-50 dark:bg-neutral-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 ${selectedLocation ? '' : 'hidden'}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Current Coordinates</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Latitude:
                          </span>
                          <span id="lat-display">{selectedLocation ? selectedLocation.latitude.toFixed(6) : '--'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Longitude:
                          </span>
                          <span id="lng-display">{selectedLocation ? selectedLocation.longitude.toFixed(6) : '--'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Map Information */}
                <div className="lg:w-1/3 w-full p-6 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-neutral-700">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white mb-2">About This Map</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        This interactive map displays all detected waste locations in real-time. Each marker represents a location where waste has been identified and reported by our community.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white mb-2">Map Features</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <li>Interactive navigation with pan and zoom</li>
                        <li>Location details on marker click</li>
                        <li>Automatic location retrieval</li>
                        <li>Real-time updates every 30 seconds</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Camera Section with Information - Combined */}
            <div className="bg-white dark:bg-neutral-700 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gray-200 dark:bg-neutral-600 p-4">
                <h3 className="font-semibold text-gray-800 dark:text-white flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Waste Detection & Classification
                </h3>
              </div>

              <div className="flex flex-col lg:flex-row ">
                {/* Left Side: Camera Interface */}
                <div className="lg:w-2/3 w-full p-6 ">
                  <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
                    {/* Camera Preview */}
                    <div className="md:w-1/2">
                      <div
                        id="camera-placeholder"
                        className="bg-gray-100 dark:bg-neutral-600 h-48 w-full rounded-lg flex items-center justify-center"
                      >
                        <img src={sampleImage} alt="Uploaded" className="h-full w-full object-cover rounded-lg" />
                      </div>
                      {/* Hidden video element for camera feed */}
                      <video
                        id="camera-feed"
                        className="hidden h-48 w-full rounded-lg object-cover"
                        autoPlay=""
                      />
                      {/* Captured image will be shown here */}
                      <canvas
                        id="capture-canvas"
                        className="hidden h-48 w-full rounded-lg object-cover"
                      />
                    </div>


                  </div>
                  <div className="space-y-4 mt-10">
                    <OpenImageVideo />
                    <div
                      id="camera-status"
                      className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300"
                    >
                      Click "Upload Image " to begin the detection process
                    </div>
                  </div>
                </div>

                {/* Right Side: Detection Information */}
                <div className="lg:w-1/3 w-full p-6 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-neutral-700">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white mb-2">AI-Powered Detection</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Our system uses advanced AI algorithms to detect and classify different types of waste from images captured by users. The model can identify various categories of waste with high accuracy.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white mb-2">Waste Categories</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                          <span className="text-gray-700 dark:text-gray-300">Plastic</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                          <span className="text-gray-700 dark:text-gray-300">Paper</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <span className="text-gray-700 dark:text-gray-300">Glass</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                          <span className="text-gray-700 dark:text-gray-300">Metal</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                          <span className="text-gray-700 dark:text-gray-300">E-waste</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                          <span className="text-gray-700 dark:text-gray-300">Mixed Waste</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </section>
    </div>
  );
}
