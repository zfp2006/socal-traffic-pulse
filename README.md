SoCal Pulse: Freight & Traffic Intelligence
SoCal Pulse is an interactive, high-fidelity geospatial dashboard designed to visualize the dual-heartbeat of Southern California’s infrastructure: Passenger Congestion and Freight Flow.

By merging Caltrans Performance Measurement System (PeMS) data with OpenStreetMap (OSM) geometries, this tool allows users to identify critical bottlenecks and high-intensity freight corridors across eight counties in real-time.

Key Features
Synchronized Geospatial Mapping: Leverages D3.js and GeoJSON to project complex freeway geometries with dynamic stroke-weight scaling based on lane counts.

System-Wide Treemap: A macro-view of the entire SoCal network where area represents total traffic volume and color represents intensity.

Bi-Metric Intelligence: Instantly toggle between Congestion Intensity (Total Volume / Capacity) and Freight Ratio (Truck % of Total Traffic).

Cross-Component Interaction: Hovering over a freeway segment or clicking a bar chart entry triggers global state updates, highlighting the selected route across the entire dashboard.

The Tech Stack
Frontend: React 18, Next.js (App Router), Tailwind CSS

Data Visualization: D3.js (v7)

Data Pipeline: Python, Pandas, GeoPandas (for CRS transformation and data cleaning)

Deployment: Vercel

The Data Pipeline
The data architecture follows a "Clean-to-Edge" philosophy to ensure fast load times despite complex geometries.

Extraction: Scraped freeway geometries from OpenStreetMap using osmnx.

Processing: Utilized GeoPandas to perform a spatial join between road segments and Caltrans AADT (Annual Average Daily Traffic) CSV data.

Optimization: Converted coordinates from UTM/State Plane to WGS84 (EPSG:4326) for web compatibility and used geometry simplification to keep the GeoJSON under the 50MB "Performance Ceiling."

Serving: The processed REAL_LANES_SoCal_Pulse.geojson is served via the Next.js public directory, allowing for efficient asynchronous fetching by the client-side D3 components.

Installation & Setup
Clone the repository:

Bash
git clone https://github.com/yourusername/socal-pulse.git
cd socal-pulse
Install dependencies:

Bash
npm install
Run the development server:

Bash
npm run dev
Open http://localhost:3000 to view the dashboard.

💡 Future Roadmap
Time-Series Analysis: Adding a "Time-of-Day" slider to visualize the shift from morning commute peaks to mid-day freight surges.

Carbon Footprint Estimation: Calculating localized CO2 emissions based on traffic volume and freight ratios.

Predictive Modeling: Integrating a simple regression model to forecast congestion based on historical PeMS trends.
