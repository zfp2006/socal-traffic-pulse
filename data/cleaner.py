import pandas as pd

# Load datasets
aadt = pd.read_csv('Annual_Average_Daily_Traffic.csv')
trucks = pd.read_csv('Truck__Average_Daily_Traffic.csv')

# 1. Standardize Join Keys
# Ensure Routes are strings without leading zeros
aadt['RTE_str'] = aadt['RTE'].astype(str).str.strip().str.lstrip('0')
trucks['RTE_str'] = trucks['RTE'].astype(str).str.strip().str.lstrip('0')

# Standardize Counties (ensure no hidden spaces)
aadt['CNTY'] = aadt['CNTY'].astype(str).str.strip()
trucks['CNTY'] = trucks['CNTY'].astype(str).str.strip()

# 2. Focus on Southern California (LA, Orange, Riverside, San Bernardino)
socal_counties = ['LA', 'ORA', 'RIV', 'SBD', 'VEN', 'SD', 'IMP', 'SB']
aadt = aadt[aadt['CNTY'].isin(socal_counties)].copy()
trucks = trucks[trucks['CNTY'].isin(socal_counties)].copy()

aadt['PM_round'] = aadt['PM'].round(1)
aadt = aadt.sort_values('AHEAD_AADT', ascending=False)
aadt = aadt.drop_duplicates(subset=['RTE_str', 'CNTY', 'PM_round'], keep='first')

# 3. Perform a "Nearest" Join using merge_asof
# This finds the nearest truck sensor on the SAME Route in the SAME County
final_list = []

for (rte, cnty), group in aadt.groupby(['RTE_str', 'CNTY']):
    truck_sub = trucks[(trucks['RTE_str'] == rte) & (trucks['CNTY'] == cnty)]
    
    if not truck_sub.empty:
        # Sort by postmile for merge_asof
        group = group.sort_values('PM')
        truck_sub = truck_sub.sort_values('POSTMILE')
        
        # Match each AADT point to nearest Truck station within 2 miles
        matched = pd.merge_asof(
            group, 
            truck_sub[['POSTMILE', 'TOT_TRK_AADT', 'VEHICLE_AADT_TOTAL']], 
            left_on='PM', 
            right_on='POSTMILE', 
            direction='nearest',
            tolerance=2.0  # Allow a 2-mile gap to find the nearest station
        )
        final_list.append(matched)
    else:
        # If no truck data exists for this route/county at all, keep it as NaN
        final_list.append(group.sort_values('PM'))

combined_data = pd.concat(final_list)

# 4. Calculate your Project Metrics
combined_data['freight_ratio'] = combined_data['TOT_TRK_AADT'] / combined_data['VEHICLE_AADT_TOTAL']

combined_data['freight_ratio'] = combined_data['freight_ratio'].fillna(0).clip(upper=1.0)

# 5. Diagnostic Check
match_count = combined_data['TOT_TRK_AADT'].notna().sum()
print(f"Final Join Success: {match_count} points matched ({match_count/len(combined_data):.1%})")

# Export for Leo and Zach to use in D3
combined_data.to_csv('socal_traffic_combined.csv', index=False)