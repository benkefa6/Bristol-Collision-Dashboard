import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

DATA_PATH = Path("/workspace/attachments/Bristol Traffic Collisions.csv")
OUTPUT_DIR = Path("/workspace/artifacts/bristol_outputs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

sns.set_style("whitegrid")
plt.rcParams["figure.figsize"] = (10, 6)

print("1. Loading data...")
df = pd.read_csv(DATA_PATH)
print(f"   Loaded {len(df):,} records")

print("\n2. Creating temporal features...")
df["datetime"] = pd.to_datetime(df["DATE_TIME_CONVERTED"], utc=True, errors="coerce")
df["year"] = df["datetime"].dt.year
df["month"] = df["datetime"].dt.month
df["day_of_week"] = df["datetime"].dt.day_name()
df["hour"] = df["datetime"].dt.hour
df["is_weekend"] = df["datetime"].dt.dayofweek.isin([5, 6])
df["is_rush_hour"] = df["hour"].isin([7, 8, 9, 16, 17, 18])
df["vulnerable_user"] = (df["PEDESTRIAN"] > 0) | (df["CYCLES"] > 0) | (df["MCYCLES"] > 0)

df = df.dropna(subset=["datetime"]).copy()
severity_map = {1: "Fatal", 2: "Serious", 3: "Slight"}
df["severity_label"] = df["SEVERITY"].map(severity_map)

print("\n3. Generating visualisations...")

# 1. Severity distribution
fig, ax = plt.subplots()
order = ["Fatal", "Serious", "Slight"]
sns.countplot(data=df, x="severity_label", hue="severity_label", order=order, 
              hue_order=order, palette="Reds_r", legend=False, ax=ax)
ax.set_title("Collision Severity Distribution – Bristol 2020–2024")
ax.set_xlabel("Severity")
ax.set_ylabel("Number of Collisions")
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "01_severity_distribution.png", dpi=150)
plt.close()
print("   Saved 01_severity_distribution.png")

# 2. Collisions by hour
fig, ax = plt.subplots()
hour_counts = df["hour"].value_counts().sort_index()
ax.bar(hour_counts.index, hour_counts.values, color="steelblue")
ax.set_title("Collisions by Hour of Day – Bristol")
ax.set_xlabel("Hour of Day")
ax.set_ylabel("Number of Collisions")
ax.set_xticks(range(0, 24))
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "02_collisions_by_hour.png", dpi=150)
plt.close()
print("   Saved 02_collisions_by_hour.png")

# 3. Hour x Day heatmap
heatmap_data = pd.crosstab(df["hour"], df["day_of_week"])
day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
heatmap_data = heatmap_data.reindex(columns=day_order)
fig, ax = plt.subplots(figsize=(10, 8))
sns.heatmap(heatmap_data, cmap="YlOrRd", ax=ax)
ax.set_title("Collision Heatmap: Hour of Day vs Day of Week – Bristol")
ax.set_xlabel("Day of Week")
ax.set_ylabel("Hour of Day")
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "03_hour_day_heatmap.png", dpi=150)
plt.close()
print("   Saved 03_hour_day_heatmap.png")

# 4. Accident types
fig, ax = plt.subplots(figsize=(10, 6))
type_counts = df["ACCIDENT_DESCRIPTION"].value_counts().head(10)
type_counts.plot(kind="barh", ax=ax, color="teal")
ax.set_title("Top 10 Accident Types – Bristol")
ax.set_xlabel("Number of Collisions")
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "04_accident_types.png", dpi=150)
plt.close()
print("   Saved 04_accident_types.png")

# 5. Vulnerable users trend
yearly = df.groupby("year").agg(total=("OBJECTID", "count"), vulnerable=("vulnerable_user", "sum")).reset_index()
yearly["vulnerable_pct"] = yearly["vulnerable"] / yearly["total"] * 100
fig, ax1 = plt.subplots()
ax1.bar(yearly["year"], yearly["total"], color="lightgray", label="All collisions")
ax2 = ax1.twinx()
ax2.plot(yearly["year"], yearly["vulnerable_pct"], color="crimson", marker="o", linewidth=2, label="% Vulnerable")
ax1.set_title("Total Collisions and % Involving Vulnerable Road Users")
ax1.set_xlabel("Year")
ax1.set_ylabel("Total Collisions")
ax2.set_ylabel("% Vulnerable Road Users")
ax1.legend(loc="upper left")
ax2.legend(loc="upper right")
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "05_vulnerable_users_trend.png", dpi=150)
plt.close()
print("   Saved 05_vulnerable_users_trend.png")

# 6. Spatial scatter
fig, ax = plt.subplots(figsize=(8, 8))
severity_colors = {"Fatal": "red", "Serious": "orange", "Slight": "gray"}
for sev, color in severity_colors.items():
    subset = df[df["severity_label"] == sev]
    ax.scatter(subset["X"], subset["Y"], c=color, s=8, alpha=0.6, label=sev)
ax.set_title("Collision Locations by Severity – Bristol (OS Grid)")
ax.set_xlabel("Easting (X)")
ax.set_ylabel("Northing (Y)")
ax.legend()
ax.set_aspect("equal")
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "06_spatial_severity.png", dpi=150)
plt.close()
print("   Saved 06_spatial_severity.png")

print("\nAll visualisations saved to:", OUTPUT_DIR)
print(f"Total collisions analysed: {len(df):,}")
