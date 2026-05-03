import pandas as pd
import geopandas as gpd
import osmnx as ox
from shapely.geometry import Point
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
    edges = edges.reset_index() # Fixes the MultiIndex bug!
    
    # Clean the lanes BEFORE saving the cache!
    print("3. Cleaning the real lane numbers...")
    edges['lanes_clean'] = edges['lanes'].apply(clean_lanes)
    edges['total_lanes'] = edges['lanes_clean'] * 2 
    
    # Now it's safe to drop list columns and save the cache
    cols_to_drop = [c for c in edges.columns if edges[c].apply(lambda x: isinstance(x, list)).any()]
    edges_cache = edges.drop(columns=cols_to_drop)
    edges_cache.to_file(cache_file, driver="GeoJSON")
    print("  -> Cache saved successfully.")

print("4. Performing Spatial Join...")
caltrans_proj = caltrans_4326.to_crs("EPSG:32611")
edges_proj = edges.to_crs("EPSG:32611")

final_gdf = gpd.sjoin_nearest(caltrans_proj, edges_proj, how="left", distance_col="dist_meters")

print("5. Calculating accurate Congestion Intensity...")

major_routes = ['5', '10', '15', '101', '110', '405', '210', '605', '710', '805', '91', '60']

# If it's a major artery and OSM claims it's less than 6 lanes, force it to 6
mask_major = (final_gdf['RTE_str'].astype(str).isin(major_routes)) & (final_gdf['total_lanes'] < 6)
final_gdf.loc[mask_major, 'total_lanes'] = 6

# Ensure no other Caltrans highway drops below 4 lanes due to a bad OSM snap
final_gdf.loc[final_gdf['total_lanes'] < 4, 'total_lanes'] = 4

final_gdf['congestion_intensity'] = final_gdf['AHEAD_AADT'] / final_gdf['total_lanes']

final_gdf = final_gdf.sort_values(by=['RTE_str', 'CNTY', 'PM'])

cols_to_keep = ['OBJECTID', 'CNTY', 'RTE_str', 'POSTMILE', 'AHEAD_AADT', 
                'TOT_TRK_AADT', 'freight_ratio', 'total_lanes', 'congestion_intensity', 'geometry']

final_export = final_gdf[cols_to_keep].to_crs("EPSG:4326")
final_export.to_file("REAL_LANES_SoCal_Pulse.geojson", driver="GeoJSON")

print("\nSUCCESS! File saved as REAL_LANES_SoCal_Pulse.geojson.")