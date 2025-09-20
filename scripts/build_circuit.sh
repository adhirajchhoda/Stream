#!/bin/bash

# Build Script for Wage Proof ZK Circuit
# This script compiles the Circom circuit and generates the necessary files for proof generation

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CIRCUIT_NAME="wage_proof"
CIRCUIT_FILE="circuits/src/${CIRCUIT_NAME}.circom"
BUILD_DIR="circuits/build"
PTAU_FILE="${BUILD_DIR}/powersOfTau28_hez_final_16.ptau"
PTAU_URL="https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau"

echo -e "${GREEN}🚀 Starting ZK Circuit Build Pipeline${NC}"

# Check if required tools are installed
check_dependencies() {
    echo -e "${YELLOW}📋 Checking dependencies...${NC}"

    if ! command -v circom &> /dev/null; then
        echo -e "${RED}❌ circom not found. Please install: npm install -g circom${NC}"
        exit 1
    fi

    if ! command -v snarkjs &> /dev/null; then
        echo -e "${RED}❌ snarkjs not found. Please install: npm install -g snarkjs${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Dependencies OK${NC}"
}

# Download Powers of Tau file if not exists
download_ptau() {
    if [ ! -f "$PTAU_FILE" ]; then
        echo -e "${YELLOW}📥 Downloading Powers of Tau file...${NC}"
        curl -L "$PTAU_URL" -o "$PTAU_FILE"
        echo -e "${GREEN}✅ Powers of Tau downloaded${NC}"
    else
        echo -e "${GREEN}✅ Powers of Tau file already exists${NC}"
    fi
}

# Compile the circuit
compile_circuit() {
    echo -e "${YELLOW}🔨 Compiling circuit...${NC}"

    cd circuits/src
    circom ${CIRCUIT_NAME}.circom --r1cs --wasm --sym --c -o ../build/
    cd ../..

    echo -e "${GREEN}✅ Circuit compiled successfully${NC}"

    # Display circuit info
    echo -e "${YELLOW}📊 Circuit Statistics:${NC}"
    snarkjs r1cs info ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs
}

# Generate zkey files
generate_keys() {
    echo -e "${YELLOW}🔑 Generating proving and verification keys...${NC}"

    # Phase 1 - Powers of Tau ceremony (using pre-computed file)
    echo -e "${YELLOW}📋 Using Powers of Tau file...${NC}"

    # Phase 2 - Circuit-specific setup
    echo -e "${YELLOW}🔧 Phase 2: Circuit-specific trusted setup...${NC}"
    snarkjs groth16 setup ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs $PTAU_FILE ${BUILD_DIR}/${CIRCUIT_NAME}_0000.zkey

    # Contribute to ceremony (in production, this would be done by multiple parties)
    echo -e "${YELLOW}🎲 Contributing randomness...${NC}"
    echo "random entropy for testing" | snarkjs zkey contribute ${BUILD_DIR}/${CIRCUIT_NAME}_0000.zkey ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey --name="First contribution"

    # Generate verification key
    echo -e "${YELLOW}📋 Generating verification key...${NC}"
    snarkjs zkey export verificationkey ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey ${BUILD_DIR}/verification_key.json

    echo -e "${GREEN}✅ Keys generated successfully${NC}"
}

# Verify the setup
verify_setup() {
    echo -e "${YELLOW}🔍 Verifying circuit setup...${NC}"

    # Verify the final zkey
    snarkjs zkey verify ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs $PTAU_FILE ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey

    echo -e "${GREEN}✅ Setup verification complete${NC}"
}

# Generate test proof
test_proof() {
    echo -e "${YELLOW}🧪 Generating test proof...${NC}"

    # Create test input
    cat > ${BUILD_DIR}/test_input.json << 'EOF'
{
    "employerPrivKey": "12345",
    "r": "123456789",
    "s": "987654321",
    "employeeSecret": "54321",
    "wageAmount": "1000000000000000000",
    "periodNonce": "1",
    "employerID": "1001",
    "employeeWallet": "0x742d35Cc6644C7532905C2D2C0f6E88F4c1C7E3C",
    "periodID": "202409",
    "timestamp": "1726790400",
    "nullifierHash": "789456123",
    "wageCommitment": "456789123",
    "employerPubKeyHash": "159753486",
    "minWageThreshold": "500000000000000000",
    "maxWageThreshold": "5000000000000000000"
}
EOF

    # Calculate witness
    echo -e "${YELLOW}🧮 Calculating witness...${NC}"
    node ${BUILD_DIR}/${CIRCUIT_NAME}_js/generate_witness.js ${BUILD_DIR}/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm ${BUILD_DIR}/test_input.json ${BUILD_DIR}/witness.wtns

    # Generate proof
    echo -e "${YELLOW}🔐 Generating proof...${NC}"
    time snarkjs groth16 prove ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey ${BUILD_DIR}/witness.wtns ${BUILD_DIR}/proof.json ${BUILD_DIR}/public.json

    # Verify proof
    echo -e "${YELLOW}✅ Verifying proof...${NC}"
    snarkjs groth16 verify ${BUILD_DIR}/verification_key.json ${BUILD_DIR}/public.json ${BUILD_DIR}/proof.json

    echo -e "${GREEN}✅ Test proof generation and verification successful${NC}"
}

# Print build summary
print_summary() {
    echo -e "${GREEN}🎉 Build Complete! Generated files:${NC}"
    echo -e "  📁 ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs - Rank-1 Constraint System"
    echo -e "  📁 ${BUILD_DIR}/${CIRCUIT_NAME}_js/ - WebAssembly witness generator"
    echo -e "  📁 ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey - Proving key"
    echo -e "  📁 ${BUILD_DIR}/verification_key.json - Verification key"
    echo -e "  📁 ${BUILD_DIR}/proof.json - Test proof"
    echo -e "  📁 ${BUILD_DIR}/public.json - Test public inputs"

    echo -e "\n${YELLOW}📈 Performance Notes:${NC}"
    echo -e "  - Circuit constraints: $(snarkjs r1cs info ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs | grep 'Number of constraints' | awk '{print $4}')"
    echo -e "  - Use the generated files for integration with your application"
    echo -e "  - For production, perform a proper trusted setup ceremony"
}

# Main execution
main() {
    check_dependencies
    download_ptau
    compile_circuit
    generate_keys
    verify_setup
    test_proof
    print_summary
}

# Run the build process
main "$@"