#!/usr/bin/env python3
"""
StreamApp Xcode Project UUID Collision Fix - Precise Version
Repairs systematic UUID collisions using exact pattern matching
"""

import re
import secrets
from pathlib import Path

class PreciseXcodeProjectFixer:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.pbxproj_path = self.project_path / "project.pbxproj"
        self.content = ""
        self.original_content = ""

        # Exact UUID collisions that need group UUID replacement
        # The build file UUIDs stay the same, only group UUIDs change
        self.collision_fixes = {
            "A1000001000000000000001A": {"group_name": "Core", "line_pattern": r'A1000001000000000000001A /\* Core \*/ = \{'},
            "A1000001000000000000002A": {"group_name": "Models", "line_pattern": r'A1000001000000000000002A /\* Models \*/ = \{'},
            "A1000001000000000000002E": {"group_name": "Network", "line_pattern": r'A1000001000000000000002E /\* Network \*/ = \{'},
            "A1000001000000000000003A": {"group_name": "Resources", "line_pattern": r'A1000001000000000000003A /\* Resources \*/ = \{'},
            "A1000001000000000000003E": {"group_name": "Security", "line_pattern": r'A1000001000000000000003E /\* Security \*/ = \{'},
            "A1000001000000000000005A": {"group_name": "ViewModels", "line_pattern": r'A1000001000000000000005A /\* ViewModels \*/ = \{'},
            "A1000001000000000000006A": {"group_name": "Views", "line_pattern": r'A1000001000000000000006A /\* Views \*/ = \{'},
            "A1000001000000000000006E": {"group_name": "Authentication", "line_pattern": r'A1000001000000000000006E /\* Authentication \*/ = \{'},
            "A1000001000000000000007A": {"group_name": "Components", "line_pattern": r'A1000001000000000000007A /\* Components \*/ = \{'},
            "A1000001000000000000008A": {"group_name": "Onboarding", "line_pattern": r'A1000001000000000000008A /\* Onboarding \*/ = \{'},
        }

    def generate_xcode_uuid(self):
        """Generate proper Xcode-compatible 24-character hex UUID"""
        return secrets.token_bytes(12).hex().upper()

    def load_project(self):
        """Load project file"""
        print(f"Loading project file: {self.pbxproj_path}")
        with open(self.pbxproj_path, 'r', encoding='utf-8') as f:
            self.content = f.read()
            self.original_content = self.content
        print(f"✅ Project file loaded ({len(self.content)} characters)")

    def generate_replacement_uuids(self):
        """Generate new UUIDs for each collision"""
        print("\n🔄 Generating replacement UUIDs...")

        # Extract existing UUIDs to avoid collisions
        existing_uuids = set(re.findall(r'[A-F0-9]{24}', self.content))

        replacement_map = {}
        for old_uuid, info in self.collision_fixes.items():
            # Generate new UUID that doesn't conflict
            while True:
                new_uuid = self.generate_xcode_uuid()
                if new_uuid not in existing_uuids:
                    existing_uuids.add(new_uuid)
                    break

            replacement_map[old_uuid] = new_uuid
            print(f"  {old_uuid} → {new_uuid} (Group: {info['group_name']})")

        return replacement_map

    def fix_group_definitions(self, replacement_map):
        """Fix group definition lines with precise pattern matching"""
        print("\n🔧 Fixing group definitions...")

        for old_uuid, new_uuid in replacement_map.items():
            group_info = self.collision_fixes[old_uuid]
            group_name = group_info["group_name"]

            # Find and replace the exact group definition line
            old_line_pattern = f"{old_uuid} /* {group_name} */ = {{"
            new_line_pattern = f"{new_uuid} /* {group_name} */ = {{"

            if old_line_pattern in self.content:
                self.content = self.content.replace(old_line_pattern, new_line_pattern)
                print(f"  ✅ Updated group definition: {group_name}")
            else:
                print(f"  ⚠️  Group definition not found: {group_name}")

    def fix_parent_references(self, replacement_map):
        """Fix parent group children references"""
        print("\n🔗 Fixing parent references...")

        for old_uuid, new_uuid in replacement_map.items():
            group_name = self.collision_fixes[old_uuid]["group_name"]

            # Find references in children arrays
            # Pattern: children = ( ... A1000001000000000000001A /* Core */, ... )
            old_ref_pattern = f"{old_uuid} /* {group_name} */"
            new_ref_pattern = f"{new_uuid} /* {group_name} */"

            occurrences = self.content.count(old_ref_pattern)
            if occurrences > 0:
                self.content = self.content.replace(old_ref_pattern, new_ref_pattern)
                print(f"  ✅ Updated {occurrences} references for: {group_name}")
            else:
                print(f"  ⚠️  No references found for: {group_name}")

    def validate_fix(self):
        """Validate that the fix worked"""
        print("\n✅ Validating fix...")

        # Check for remaining UUID collisions in the specific patterns
        remaining_collisions = []
        for old_uuid in self.collision_fixes.keys():
            # Count occurrences - should now be exactly 2 (build file + build phase reference)
            count = self.content.count(old_uuid)
            if count > 2:
                remaining_collisions.append((old_uuid, count))

        if not remaining_collisions:
            print("  ✅ All targeted collisions resolved!")
            return True
        else:
            print(f"  ❌ Still have collisions: {remaining_collisions}")
            return False

    def save_project(self):
        """Save the fixed project"""
        print("\n💾 Saving fixed project...")
        try:
            with open(self.pbxproj_path, 'w', encoding='utf-8') as f:
                f.write(self.content)
            print("  ✅ Project saved successfully")
            return True
        except Exception as e:
            print(f"  ❌ Failed to save: {e}")
            return False

    def rollback(self):
        """Rollback to original content"""
        print("\n↩️  Rolling back...")
        self.content = self.original_content
        self.save_project()

    def fix_project(self):
        """Execute the precise fix"""
        print("🚀 Starting Precise UUID Collision Fix")
        print("=" * 50)

        try:
            # Load project
            self.load_project()

            # Generate replacement UUIDs
            replacement_map = self.generate_replacement_uuids()

            # Apply fixes
            self.fix_group_definitions(replacement_map)
            self.fix_parent_references(replacement_map)

            # Validate
            if not self.validate_fix():
                print("❌ Validation failed")
                self.rollback()
                return False

            # Save
            if not self.save_project():
                print("❌ Save failed")
                self.rollback()
                return False

            print("\n🎉 Precise fix completed successfully!")
            print("✅ Group UUID collisions resolved")
            print("✅ Build file UUIDs preserved")
            return True

        except Exception as e:
            print(f"\n💥 Error: {e}")
            self.rollback()
            return False

def main():
    project_path = "/Users/ashwathreddymuppa/Stream/ios/StreamApp.xcodeproj"

    print("StreamApp Xcode Project - Precise UUID Collision Fix")
    print(f"Project: {project_path}")
    print()

    fixer = PreciseXcodeProjectFixer(project_path)
    success = fixer.fix_project()

    if success:
        print("\n🎯 Fix completed! Try opening in Xcode now.")
    else:
        print("\n💔 Fix failed. Check logs above.")

    return success

if __name__ == "__main__":
    main()