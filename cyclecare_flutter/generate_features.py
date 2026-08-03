import os

base_dir = r"c:\Users\MustafaGOCUK\Desktop\cyclecare\cyclecare_flutter\lib\features"

features = [
    "auth", "onboarding", "cycle_tracking", "home", "calendar", 
    "symptoms", "moods", "fertility", "reports", "ai_insights", 
    "journal", "notifications", "profile", "settings", "subscription"
]

layers = [
    "domain/entities", "domain/repositories", "domain/usecases",
    "data/models", "data/datasources", "data/repositories",
    "presentation/bloc", "presentation/screens", "presentation/widgets"
]

def create_structure():
    for feature in features:
        for layer in layers:
            path = os.path.join(base_dir, feature, layer)
            os.makedirs(path, exist_ok=True)
            # Create a .gitkeep so empty directories are tracked
            with open(os.path.join(path, ".gitkeep"), "w") as f:
                f.write("")

if __name__ == "__main__":
    create_structure()
    print("Clean Architecture feature directories created successfully.")
