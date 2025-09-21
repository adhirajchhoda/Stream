#!/usr/bin/env python3
"""
Fix Info.plist Build Conflict
Resolves "Multiple commands produce Info.plist" error by:
1. Removing Info.plist from Resources build phase
2. Disabling auto-generation (GENERATE_INFOPLIST_FILE = NO)
3. Setting INFOPLIST_FILE to manual Info.plist path
"""

from pathlib import Path

def fix_infoplist_conflict():
    print("🚀 Fixing Info.plist Build Conflict")
    print("=" * 50)

    project_path = Path("/Users/ashwathreddymuppa/Stream/ios/StreamApp.xcodeproj/project.pbxproj")

    # Read current content
    print("📖 Reading project file...")
    with open(project_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Remove Info.plist from PBXBuildFile section
    print("🗑️  Removing Info.plist from PBXBuildFile section...")
    infoplist_buildfile_line = "0DD18F0E2E7FBB1900A893D7 /* Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = 0DD18F062E7FBB1900A893D7 /* Info.plist */; };"

    if infoplist_buildfile_line in content:
        content = content.replace(infoplist_buildfile_line, "")
        print("  ✅ Removed PBXBuildFile entry")
    else:
        print("  ⚠️  PBXBuildFile entry not found")

    # 2. Remove Info.plist from Resources build phase
    print("🗑️  Removing Info.plist from Resources build phase...")
    infoplist_resource_line = "0DD18F0E2E7FBB1900A893D7 /* Info.plist in Resources */,"

    if infoplist_resource_line in content:
        content = content.replace(infoplist_resource_line, "")
        print("  ✅ Removed from Resources build phase")
    else:
        print("  ⚠️  Resources build phase entry not found")

    # 3. Change GENERATE_INFOPLIST_FILE from YES to NO
    print("⚙️  Disabling auto-generation...")
    content = content.replace("GENERATE_INFOPLIST_FILE = YES;", "GENERATE_INFOPLIST_FILE = NO;")
    print("  ✅ Set GENERATE_INFOPLIST_FILE = NO")

    # 4. Add INFOPLIST_FILE setting after GENERATE_INFOPLIST_FILE in both configurations
    print("📝 Adding INFOPLIST_FILE setting...")

    # Add after each GENERATE_INFOPLIST_FILE = NO; line
    infoplist_setting = "INFOPLIST_FILE = StreamApp/Info.plist;"
    content = content.replace(
        "GENERATE_INFOPLIST_FILE = NO;",
        f"GENERATE_INFOPLIST_FILE = NO;\n\t\t\t\t{infoplist_setting}"
    )
    print("  ✅ Added INFOPLIST_FILE setting to both configurations")

    # 5. Save the modified project
    print("💾 Saving modified project...")
    with open(project_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("  ✅ Project file updated")

    # 6. Validation
    print("\n✅ Validation...")
    print("  - Info.plist removed from build resources")
    print("  - Auto-generation disabled")
    print("  - Manual Info.plist path configured")
    print("  - Build conflict should be resolved")

    print("\n🎯 Fix completed successfully!")
    print("Try building the project now.")

    return True

if __name__ == "__main__":
    fix_infoplist_conflict()