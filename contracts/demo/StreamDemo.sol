// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title StreamDemo - Hackathon Demo Contract
 * @dev Simplified ZK proof verification for wage attestations
 *
 * HACKATHON OPTIMIZATIONS:
 * - Fast verification for live demo
 * - Clear events for demo visualization
 * - Gas optimized transactions
 * - Mock verification for reliability
 *
 * DEMO NARRATIVE:
 * "Prove your wages privately on blockchain without revealing identity or exact amount"
 */

contract StreamDemo {

    // Demo events for visualization
    event WageProofVerified(
        address indexed user,
        uint256 indexed nullifierHash,
        uint256 minWage,
        uint256 maxWage,
        string employerName,
        uint256 timestamp
    );

    event EmployerRegistered(
        uint256 indexed employerID,
        string name,
        uint256 commitment
    );

    event ProofSubmitted(
        address indexed user,
        uint256 proofId,
        uint256 gasUsed,
        uint256 verificationTime
    );

    // Structs
    struct Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }

    struct PublicSignals {
        uint256 nullifierHash;
        uint256 wageCommitment;
        uint256 employerCommitment;
        uint256 minWageThreshold;
        uint256 maxWageThreshold;
    }

    struct ProofRecord {
        address user;
        uint256 nullifierHash;
        uint256 wageCommitment;
        uint256 employerCommitment;
        uint256 minWage;
        uint256 maxWage;
        uint256 timestamp;
        bool verified;
    }

    struct DemoEmployer {
        string name;
        uint256 commitment;
        bool active;
        uint256 registeredAt;
    }

    // State variables
    mapping(uint256 => bool) public nullifierUsed;
    mapping(uint256 => ProofRecord) public proofRecords;
    mapping(uint256 => DemoEmployer) public employers;
    mapping(address => uint256[]) public userProofs;

    uint256 public proofCounter;
    uint256 public totalProofsVerified;
    uint256 public totalGasUsed;

    // Demo employers for hackathon
    uint256[] public registeredEmployers;

    // Constants
    uint256 public constant MIN_WAGE_GLOBAL = 30000; // $30k minimum
    uint256 public constant MAX_WAGE_GLOBAL = 500000; // $500k maximum

    constructor() {
        // Pre-register demo employers for hackathon
        _registerDemoEmployers();
    }

    /**
     * @dev Verify ZK proof and record wage attestation
     * @param proof The ZK proof components
     * @param publicSignals The public inputs to the circuit
     * @param employerName Human readable employer name for demo
     */
    function verifyWageProof(
        Proof calldata proof,
        PublicSignals calldata publicSignals,
        string calldata employerName
    ) external returns (uint256 proofId) {
        uint256 startGas = gasleft();
        uint256 startTime = block.timestamp;

        // Validate inputs
        require(publicSignals.nullifierHash != 0, "Invalid nullifier");
        require(publicSignals.wageCommitment != 0, "Invalid wage commitment");
        require(publicSignals.employerCommitment != 0, "Invalid employer commitment");
        require(publicSignals.minWageThreshold >= MIN_WAGE_GLOBAL, "Wage below global minimum");
        require(publicSignals.maxWageThreshold <= MAX_WAGE_GLOBAL, "Wage above global maximum");
        require(publicSignals.minWageThreshold <= publicSignals.maxWageThreshold, "Invalid wage range");

        // Check nullifier hasn't been used (prevent double-spending)
        require(!nullifierUsed[publicSignals.nullifierHash], "Proof already used");

        // Verify employer is registered
        require(_isValidEmployer(publicSignals.employerCommitment), "Unregistered employer");

        // Mock ZK proof verification for demo reliability
        bool isValidProof = _mockVerifyProof(proof, publicSignals);
        require(isValidProof, "Invalid ZK proof");

        // Mark nullifier as used
        nullifierUsed[publicSignals.nullifierHash] = true;

        // Create proof record
        proofId = ++proofCounter;
        proofRecords[proofId] = ProofRecord({
            user: msg.sender,
            nullifierHash: publicSignals.nullifierHash,
            wageCommitment: publicSignals.wageCommitment,
            employerCommitment: publicSignals.employerCommitment,
            minWage: publicSignals.minWageThreshold,
            maxWage: publicSignals.maxWageThreshold,
            timestamp: block.timestamp,
            verified: true
        });

        // Track user proofs
        userProofs[msg.sender].push(proofId);

        // Update stats
        totalProofsVerified++;
        uint256 gasUsed = startGas - gasleft();
        totalGasUsed += gasUsed;

        // Emit events for demo visualization
        emit WageProofVerified(
            msg.sender,
            publicSignals.nullifierHash,
            publicSignals.minWageThreshold,
            publicSignals.maxWageThreshold,
            employerName,
            block.timestamp
        );

        emit ProofSubmitted(
            msg.sender,
            proofId,
            gasUsed,
            block.timestamp - startTime
        );

        return proofId;
    }

    /**
     * @dev Register a new employer (for demo purposes)
     */
    function registerEmployer(
        uint256 employerID,
        string calldata name,
        uint256 commitment
    ) external {
        require(employerID != 0, "Invalid employer ID");
        require(bytes(name).length > 0, "Empty employer name");
        require(commitment != 0, "Invalid commitment");
        require(!employers[employerID].active, "Employer already registered");

        employers[employerID] = DemoEmployer({
            name: name,
            commitment: commitment,
            active: true,
            registeredAt: block.timestamp
        });

        registeredEmployers.push(employerID);

        emit EmployerRegistered(employerID, name, commitment);
    }

    /**
     * @dev Get user's proof history
     */
    function getUserProofs(address user) external view returns (uint256[] memory) {
        return userProofs[user];
    }

    /**
     * @dev Get proof details
     */
    function getProofDetails(uint256 proofId) external view returns (ProofRecord memory) {
        require(proofId <= proofCounter && proofId > 0, "Invalid proof ID");
        return proofRecords[proofId];
    }

    /**
     * @dev Get demo statistics
     */
    function getDemoStats() external view returns (
        uint256 totalProofs,
        uint256 totalGas,
        uint256 avgGasPerProof,
        uint256 totalEmployers
    ) {
        return (
            totalProofsVerified,
            totalGasUsed,
            totalProofsVerified > 0 ? totalGasUsed / totalProofsVerified : 0,
            registeredEmployers.length
        );
    }

    /**
     * @dev Get all registered employers (for demo UI)
     */
    function getRegisteredEmployers() external view returns (uint256[] memory) {
        return registeredEmployers;
    }

    /**
     * @dev Check if user has verified wage in range
     */
    function hasVerifiedWageInRange(
        address user,
        uint256 minWage,
        uint256 maxWage
    ) external view returns (bool) {
        uint256[] memory userProofIds = userProofs[user];

        for (uint256 i = 0; i < userProofIds.length; i++) {
            ProofRecord memory record = proofRecords[userProofIds[i]];
            if (record.verified &&
                record.minWage <= minWage &&
                record.maxWage >= maxWage) {
                return true;
            }
        }

        return false;
    }

    // Internal functions

    /**
     * @dev Mock ZK proof verification for demo reliability
     * In production, this would call the actual verifier contract
     */
    function _mockVerifyProof(
        Proof calldata proof,
        PublicSignals calldata publicSignals
    ) internal pure returns (bool) {
        // Basic structure validation
        if (proof.a[0] == 0 || proof.a[1] == 0) return false;
        if (proof.c[0] == 0 || proof.c[1] == 0) return false;

        // Check public signals are non-zero
        if (publicSignals.nullifierHash == 0) return false;
        if (publicSignals.wageCommitment == 0) return false;
        if (publicSignals.employerCommitment == 0) return false;

        // For demo: return true if structure is valid
        return true;
    }

    /**
     * @dev Check if employer is registered and valid
     */
    function _isValidEmployer(uint256 employerCommitment) internal view returns (bool) {
        for (uint256 i = 0; i < registeredEmployers.length; i++) {
            uint256 employerID = registeredEmployers[i];
            if (employers[employerID].active &&
                employers[employerID].commitment == employerCommitment) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Pre-register demo employers for hackathon
     */
    function _registerDemoEmployers() internal {
        // TechCorp Inc
        employers[1001] = DemoEmployer({
            name: "TechCorp Inc",
            commitment: 0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456,
            active: true,
            registeredAt: block.timestamp
        });
        registeredEmployers.push(1001);

        // Finance Co
        employers[1002] = DemoEmployer({
            name: "Finance Co",
            commitment: 0x987654321fedcba987654321fedcba987654321fedcba987654321fedcba987654,
            active: true,
            registeredAt: block.timestamp
        });
        registeredEmployers.push(1002);

        // Startup XYZ
        employers[1003] = DemoEmployer({
            name: "Startup XYZ",
            commitment: 0x111111111111111111111111111111111111111111111111111111111111111111,
            active: true,
            registeredAt: block.timestamp
        });
        registeredEmployers.push(1003);
    }
}

/**
 * @title StreamDemoFactory - Deploy multiple demo instances
 * @dev For testing different scenarios in hackathon
 */
contract StreamDemoFactory {
    event DemoDeployed(address indexed demo, string scenario, address deployer);

    mapping(string => address) public scenarios;
    address[] public deployedDemos;

    function deployScenario(string calldata scenarioName) external returns (address) {
        require(scenarios[scenarioName] == address(0), "Scenario already deployed");

        StreamDemo demo = new StreamDemo();
        scenarios[scenarioName] = address(demo);
        deployedDemos.push(address(demo));

        emit DemoDeployed(address(demo), scenarioName, msg.sender);
        return address(demo);
    }

    function getScenario(string calldata scenarioName) external view returns (address) {
        return scenarios[scenarioName];
    }

    function getAllDemos() external view returns (address[] memory) {
        return deployedDemos;
    }
}