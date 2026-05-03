import pandas as pd
import geopandas as gpd
import osmnx as ox
from shapely.geometry import Point, LineString
import os

custom_agent = "SoCalTrafficPulse/1.0"
ox.settings.http_user_agent = custom_agent

print("1. Loading Caltrans CSV and fixing the coordinate system...")
df = pd.read_csv('socal_traffic_combined.csv')
geometry = [Point(xy) for xy in zip(df.X, df.Y)]
caltrans_gdf = gpd.GeoDataFrame(df, geometry=geometry, crs="EPSG:2230")
caltrans_4326 = caltrans_gdf.to_crs("EPSG:4326")

cache_file = "OSM_Freeways_Cache.geojson"

def clean_lanes(lane_val):
    if isinstance(lane_val, list):
        lane_val = lane_val[0]
    if isinstance(lane_val, str) and '[' in lane_val:
        try:
            lane_val = lane_val.strip("[]'\" ").split(',')[0]
        except:
            return 4
    try:
        if pd.isna(lane_val):
            return 4
        return int(float(lane_val))
    except:
        return 4

print("2. Getting the real OSM Freeway Network...")
if os.path.exists(cache_file):
    print("  -> Found cached OSM data! Loading instantly...")
    edges = gpd.read_file(cache_file)
else:
    print("  -> No cache found. Downloading OSM freeways (takes a few minutes)...")
    places = [
        "Los Angeles County, California, USA",
        "Orange County, California, USA",
        "Riverside County, California, USA",
        "San Bernardino County, California, USA",
        "Ventura County, California, USA",
        "San Diego County, California, USA",
        "Imperial County, California, USA",
        "Santa Barbara County, California, USA"
    ]
    # FIX 1: Strict regex anchors to prevent snapping to 1-lane off-ramps!
    custom_filter = '["highway"~"^motorway$|^trunk$"]'
    all_edges = []
    
    for place in places:
        print(f"     Downloading {place}...")
        try:
            graph = ox.graph_from_place(place, network_type='drive', custom_filter=custom_filter)
            nodes, current_edges = ox.graph_to_gdfs(graph)
            all_edges.append(current_edges)
        except Exception as e:
            print(f"     Failed: {e}")
            
    edges = pd.concat(all_edges)
    edges = edges.reset_index() 
    
    print("3. Cleaning the real lane numbers...")
    edges['lanes_clean'] = edges['lanes'].apply(clean_lanes)
    edges['total_lanes'] = edges['lanes_clean'] * 2 
    
    cols_to_drop = [c for c in edges.columns if edges[c].apply(lambda x: isinstance(x, list)).any()]
    edges_cache = edges.drop(columns=cols_to_drop)
    edges_cache.to_file(cache_file, driver="GeoJSON")
    print("  -> Cache saved successfully.")

print("4. Performing Spatial Join...")
caltrans_proj = caltrans_4326.to_crs("EPSG:32611")
edges_proj = edges.to_crs("EPSG:32611")

final_gdf = gpd.sjoin_nearest(caltrans_proj, edges_proj, how="left", distance_col="dist_meters")

print("5. Smoothing Lane Counts to Fix Oscillations...")

major_routes = ['5', '10', '15', '101', '110', '405', '210', '605', '710', '805', '91', '60']

mask_major = (final_gdf['RTE_str'].astype(str).isin(major_routes)) & (final_gdf['total_lanes'] < 6)
final_gdf.loc[mask_major, 'total_lanes'] = 6
final_gdf.loc[final_gdf['total_lanes'] < 4, 'total_lanes'] = 4

# Crucial: Sort sequentially before we attempt to smooth the data
final_gdf = final_gdf.sort_values(by=['RTE_str', 'CNTY', 'PM'])

# FIX 1: Apply a rolling median to the lane counts! 
# This smooths out OSM's hyper-detailed turn lanes and missing data,
# preventing the lane count from randomly jumping from 10 to 6 and back.
final_gdf['total_lanes'] = final_gdf.groupby(['RTE_str', 'CNTY'])['total_lanes'].transform(
    lambda x: x.rolling(window=5, center=True, min_periods=1).median()
)

# Now calculate congestion using the *smoothed* lane counts
final_gdf['congestion_intensity'] = final_gdf['AHEAD_AADT'] / final_gdf['total_lanes']


print("6. Loading Official Highway Shapefile for True Geometry...")
shn_gdf = gpd.read_file("SHN_Lines.shp")
shn_gdf = shn_gdf[shn_gdf['AlignCode'] == 'Right']
# Robustly find the correct Route column in the shapefile
route_candidates = [c for c in shn_gdf.columns if c.upper() in ['ROUTE', 'RTE', 'RT']]
route_col = route_candidates[0] if route_candidates else [c for c in shn_gdf.columns if 'route' in c.lower() or 'rte' in c.lower()][0]

# Helper function to guarantee matching formats (turns "005", "5.0", and 5 into "5")
def clean_route_num(val):
    v = str(val).strip()
    if '.' in v:
        v = v.split('.')[0] # Chop off the decimal and anything after it
    return v.lstrip('0')    # Strip leading zeros

# Apply the cleaner to BOTH datasets so they speak the same language
shn_gdf['RTE_str'] = shn_gdf[route_col].apply(clean_route_num)

shn_proj = shn_gdf.to_crs("EPSG:32611")
final_gdf_proj = final_gdf.to_crs("EPSG:32611") 

# Clean the traffic data routes too just in case!
final_gdf_proj['RTE_str'] = final_gdf_proj['RTE_str'].apply(clean_route_num)

cols_to_drop = [c for c in ['index_left', 'index_right'] if c in final_gdf_proj.columns]
if cols_to_drop:
    final_gdf_proj = final_gdf_proj.drop(columns=cols_to_drop)

print("7. Conflating Data onto Real Highway Lines...")
matched_segments = []

for rte, group in final_gdf_proj.groupby('RTE_str'):
    # Get all segments for this route from the shapefile
    shn_route = shn_proj[shn_proj['RTE_str'] == rte].copy()
    
    if shn_route.empty: 
        print(f"  -> Warning: Could not find Route {rte} in the shapefile.")
        continue
        
    if 'Right' in shn_route['AlignCode'].values:
        shn_route = shn_route[shn_route['AlignCode'] == 'Right']

    # SPATIAL JOIN: Only pass geometry to the join to prevent column collisions!
    snapped = gpd.sjoin_nearest(shn_route[['geometry']], group, how="inner", distance_col="snap_dist")
    
    # Distance Filter: Don't snap to a sensor 10 miles away
    snapped = snapped[snapped['snap_dist'] < 3000] 
    
    # Clean up duplicate indices from the join
    snapped = snapped[~snapped.index.duplicated(keep='first')]
    
    if not snapped.empty:
        matched_segments.append(snapped)

# Combine and save
final_lines_gdf = gpd.GeoDataFrame(pd.concat(matched_segments), crs="EPSG:32611")
final_lines_gdf.to_crs("EPSG:4326").to_file("REAL_LANES_SoCal_Pulse.geojson", driver='GeoJSON')

print("8. Exporting Perfect GeoJSON...")
final_export = final_lines_gdf.to_crs("EPSG:4326")
final_export.to_file("REAL_LANES_SoCal_Pulse.geojson", driver="GeoJSON")

print("\nSUCCESS! Map is now professionally aligned to true highway curves.")