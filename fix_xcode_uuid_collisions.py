#!/usr/bin/env python3
"""
StreamApp Xcode Project UUID Collision Fix
Repairs systematic UUID collisions in project.pbxproj that cause:
'-[PBXGroup buildPhase]: unrecognized selector sent to instance' error
"""

import re
import json
import shutil
import secrets
from pathlib import Path
from collections import defaultdict

class XcodeProjectFixer:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.pbxproj_path = self.project_path / "project.pbxproj"
        self.collision_map = {}
        self.content = ""
        self.original_content = ""

        # Known UUID collisions from investigation
        self.known_collisions = {
            "A1000001000000000000001A": {"name": "Core", "file": "StreamApp.swift"},
            "A1000001000000000000008A": {"name": "Onboarding", "file": "MainTabView.swift"},
            "A1000001000000000000007A": {"name": "Components", "file": "WalletConnectView.swift"},
            "A1000001000000000000006E": {"name": "Authentication", "file": "AuthenticationView.swift"},
            "A1000001000000000000006A": {"name": "Views", "file": "WorkSessionViewModel.swift"},
            "A1000001000000000000005A": {"name": "ViewModels", "file": "ZKProofService.swift"},
            "A1000001000000000000003E": {"name": "Security", "file": "BiometricAuthService.swift"},
            "A1000001000000000000003A": {"name": "Resources", "file": "StreamColors.swift"},
            "A1000001000000000000002E": {"name": "Network", "file": "APIService.swift"},
            "A1000001000000000000002A": {"name": "Models", "file": "Attestation.swift"},
        }

    def generate_xcode_uuid(self):
        """Generate proper Xcode-compatible 24-character hex UUID"""
        # Generate 12 random bytes (96 bits)
        random_bytes = secrets.token_bytes(12)
        # Convert to 24-character uppercase hex string
        return random_bytes.hex().upper()

    def generate_unique_uuid_set(self, count, existing_uuids=set()):
        """Generate a set of guaranteed unique UUIDs"""
        uuids = set()
        while len(uuids) < count:
            uuid = self.generate_xcode_uuid()
            if uuid not in existing_uuids and uuid not in uuids:
                uuids.add(uuid)
        return uuids

    def load_project(self):
        """Load and validate project file"""
        print(f"Loading project file: {self.pbxproj_path}")
        try:
            with open(self.pbxproj_path, 'r', encoding='utf-8') as f:
                self.content = f.read()
                self.original_content = self.content
            print(f"✅ Project file loaded ({len(self.content)} characters)")
        except Exception as e:
            raise Exception(f"Failed to load project file: {e}")

    def detect_collisions(self):
        """Identify all UUID collisions automatically"""
        print("\n🔍 Detecting UUID collisions...")

        # Find all UUIDs in the file
        all_uuids = re.findall(r'[A-F0-9]{24}', self.content)
        uuid_counts = defaultdict(int)

        for uuid in all_uuids:
            uuid_counts[uuid] += 1

        # Find collisions (UUIDs that appear more than twice)
        collisions = {}
        for uuid, count in uuid_counts.items():
            if count > 2:  # Build file + group + references = 3+ occurrences
                collisions[uuid] = count

        print(f"Found {len(collisions)} UUID collisions:")
        for uuid, count in collisions.items():
            collision_info = self.known_collisions.get(uuid, {"name": "Unknown", "file": "Unknown"})
            print(f"  - {uuid}: {count} occurrences (Group: {collision_info['name']}, File: {collision_info['file']})")

        return collisions

    def generate_replacement_uuids(self):
        """Generate new UUIDs for conflicting groups"""
        print("\n🔄 Generating replacement UUIDs...")

        # Extract all existing UUIDs for collision avoidance
        existing_uuids = set(re.findall(r'[A-F0-9]{24}', self.content))

        # Generate new UUIDs for each collision
        new_uuids = self.generate_unique_uuid_set(len(self.known_collisions), existing_uuids)
        new_uuid_list = list(new_uuids)

        replacement_map = {}
        for i, (old_uuid, info) in enumerate(self.known_collisions.items()):
            new_uuid = new_uuid_list[i]
            replacement_map[old_uuid] = {
                "old_uuid": old_uuid,
                "new_group_uuid": new_uuid,
                "group_name": info["name"],
                "associated_file": info["file"]
            }
            print(f"  {old_uuid} → {new_uuid} (Group: {info['name']})")

        self.collision_map = replacement_map
        return replacement_map

    def fix_group_definitions(self):
        """Update PBXGroup object definitions"""
        print("\n🔧 Fixing group definitions...")

        for old_uuid, mapping in self.collision_map.items():
            new_uuid = mapping["new_group_uuid"]
            group_name = mapping["group_name"]

            # Pattern to match group definition: OLD_UUID = { ... isa = PBXGroup ... };
            pattern = f"({old_uuid} = {{[^}}]+isa = PBXGroup[^}}]+}})"

            # Find the match to verify it exists
            match = re.search(pattern, self.content)
            if match:
                # Replace the UUID while preserving the rest of the definition
                replacement = match.group(1).replace(old_uuid, new_uuid, 1)
                self.content = self.content.replace(match.group(1), replacement)
                print(f"  ✅ Updated group definition: {group_name} ({old_uuid} → {new_uuid})")
            else:
                print(f"  ⚠️  Group definition not found for: {group_name} ({old_uuid})")

    def fix_parent_references(self):
        """Update all parent group children arrays"""
        print("\n🔗 Fixing parent references...")

        for old_uuid, mapping in self.collision_map.items():
            new_uuid = mapping["new_group_uuid"]
            group_name = mapping["group_name"]

            # Pattern to match children arrays containing the old UUID
            pattern = f"(children = \\([^)]*){old_uuid}([^)]*\\))"

            matches = re.findall(pattern, self.content)
            if matches:
                # Replace old UUID with new UUID in children arrays
                for match in matches:
                    old_children = f"children = ({match[0]}{old_uuid}{match[1]})"
                    new_children = f"children = ({match[0]}{new_uuid}{match[1]})"
                    self.content = self.content.replace(old_children, new_children)

                print(f"  ✅ Updated parent references for: {group_name} ({len(matches)} references)")
            else:
                print(f"  ⚠️  No parent references found for: {group_name}")

    def validate_uuid_uniqueness(self):
        """Validate that all UUIDs are now unique"""
        print("\n✅ Validating UUID uniqueness...")

        all_uuids = re.findall(r'[A-F0-9]{24}', self.content)
        unique_uuids = set(all_uuids)

        if len(all_uuids) == len(unique_uuids):
            print(f"  ✅ All UUIDs are unique ({len(unique_uuids)} total)")
            return True
        else:
            duplicate_count = len(all_uuids) - len(unique_uuids)
            print(f"  ❌ Still have {duplicate_count} duplicate UUIDs")

            # Find remaining duplicates
            uuid_counts = defaultdict(int)
            for uuid in all_uuids:
                uuid_counts[uuid] += 1

            duplicates = [uuid for uuid, count in uuid_counts.items() if count > 1]
            print(f"  Remaining duplicates: {duplicates}")
            return False

    def validate_object_references(self):
        """Verify all object references have corresponding definitions"""
        print("\n🔍 Validating object references...")

        # Extract all object definitions (UUID = {)
        object_definitions = set(re.findall(r'([A-F0-9]{24}) = {', self.content))

        # Extract all UUID references
        all_references = set(re.findall(r'[A-F0-9]{24}', self.content))

        # Find orphaned references
        orphaned = all_references - object_definitions

        if not orphaned:
            print(f"  ✅ All {len(all_references)} references have definitions")
            return True
        else:
            print(f"  ❌ Found {len(orphaned)} orphaned references: {orphaned}")
            return False

    def validate_project_structure(self):
        """Verify essential project sections exist"""
        print("\n📋 Validating project structure...")

        required_sections = [
            'PBXBuildFile',
            'PBXFileReference',
            'PBXGroup',
            'PBXNativeTarget',
            'PBXProject',
            'PBXSourcesBuildPhase'
        ]

        missing_sections = []
        for section in required_sections:
            if f"/* Begin {section} section */" not in self.content:
                missing_sections.append(section)

        if not missing_sections:
            print(f"  ✅ All required sections present")
            return True
        else:
            print(f"  ❌ Missing sections: {missing_sections}")
            return False

    def validate_xcode_format(self):
        """Check Xcode project file format compliance"""
        print("\n📄 Validating Xcode format...")

        # Check file header
        if not self.content.startswith("// !$*UTF8*$!"):
            print("  ❌ Invalid project file header")
            return False

        # Check balanced braces
        brace_count = self.content.count('{') - self.content.count('}')
        if brace_count != 0:
            print(f"  ❌ Unbalanced braces: {brace_count}")
            return False

        # Check balanced parentheses
        paren_count = self.content.count('(') - self.content.count(')')
        if paren_count != 0:
            print(f"  ❌ Unbalanced parentheses: {paren_count}")
            return False

        print("  ✅ Xcode format is valid")
        return True

    def save_project(self):
        """Save fixed project with validation"""
        print("\n💾 Saving fixed project...")

        try:
            # Write to temporary file first
            temp_path = self.pbxproj_path.with_suffix('.pbxproj.tmp')
            with open(temp_path, 'w', encoding='utf-8') as f:
                f.write(self.content)

            # Replace original file
            shutil.move(str(temp_path), str(self.pbxproj_path))
            print(f"  ✅ Project saved successfully")

            return True
        except Exception as e:
            print(f"  ❌ Failed to save project: {e}")
            return False

    def rollback(self):
        """Rollback to original content"""
        print("\n↩️  Rolling back to original content...")
        self.content = self.original_content
        if self.save_project():
            print("  ✅ Rollback successful")
        else:
            print("  ❌ Rollback failed")

    def fix_project(self):
        """Main fix execution method"""
        print("🚀 Starting StreamApp Xcode Project UUID Collision Fix")
        print("=" * 60)

        try:
            # Phase 1: Load and analyze
            self.load_project()
            collisions = self.detect_collisions()

            if not collisions:
                print("✅ No UUID collisions detected. Project may already be fixed.")
                return True

            # Phase 2: Generate replacements
            self.generate_replacement_uuids()

            # Phase 3: Apply fixes
            self.fix_group_definitions()
            self.fix_parent_references()

            # Phase 4: Validate
            if not self.validate_uuid_uniqueness():
                print("❌ UUID uniqueness validation failed")
                self.rollback()
                return False

            if not self.validate_object_references():
                print("❌ Object reference validation failed")
                self.rollback()
                return False

            if not self.validate_project_structure():
                print("❌ Project structure validation failed")
                self.rollback()
                return False

            if not self.validate_xcode_format():
                print("❌ Xcode format validation failed")
                self.rollback()
                return False

            # Phase 5: Save
            if not self.save_project():
                print("❌ Failed to save project")
                self.rollback()
                return False

            print("\n🎉 UUID collision fix completed successfully!")
            print("✅ Project should now open correctly in Xcode")
            return True

        except Exception as e:
            print(f"\n💥 Critical error during fix: {e}")
            self.rollback()
            return False

def main():
    project_path = "/Users/ashwathreddymuppa/Stream/ios/StreamApp.xcodeproj"

    print(f"StreamApp Xcode Project UUID Collision Fixer")
    print(f"Project: {project_path}")
    print()

    fixer = XcodeProjectFixer(project_path)
    success = fixer.fix_project()

    if success:
        print("\n🎯 Fix completed successfully!")
        print("Try opening the project in Xcode now.")
    else:
        print("\n💔 Fix failed. Check backup and try manual resolution.")

    return success

if __name__ == "__main__":
    main()