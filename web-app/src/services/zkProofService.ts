import { getBigInt, keccak256, toUtf8Bytes, type Signer, Contract } from 'ethers';

export interface ZKProofInput {
  salary: number;
  hoursWorked: number;
  hourlyRate: number;
  periodStart: Date;
  periodEnd: Date;
  employeeId: string;
  employerAttestation: string;
}

export interface ZKProofOutput {
  proof: {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
  };
  publicSignals: string[];
  verificationKey: any;
  proofHash: string;
}

export interface ZKCircuit {
  wasmPath: string;
  zkeyPath: string;
  verificationKeyPath: string;
}

class ZKProofService {
  private circuits: Record<string, ZKCircuit> = {
    salary: {
      wasmPath: '/circuits/salary.wasm',
      zkeyPath: '/circuits/salary_final.zkey',
      verificationKeyPath: '/circuits/salary_verification_key.json'
    },
    workHours: {
      wasmPath: '/circuits/work_hours.wasm',
      zkeyPath: '/circuits/work_hours_final.zkey',
      verificationKeyPath: '/circuits/work_hours_verification_key.json'
    },
    employment: {
      wasmPath: '/circuits/employment.wasm',
      zkeyPath: '/circuits/employment_final.zkey',
      verificationKeyPath: '/circuits/employment_verification_key.json'
    }
  };

  private snarkjs: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamic import of snarkjs in browser environment
      const snarkjsModule = await import('snarkjs' as any);
      this.snarkjs = snarkjsModule.default || snarkjsModule;
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ZK proof service:', error);
      throw new Error('ZK proof service initialization failed');
    }
  }

  async generateSalaryProof(input: ZKProofInput): Promise<ZKProofOutput> {
    await this.initialize();

    try {
      // Convert input to circuit format
      const circuitInput = this.prepareSalaryCircuitInput(input);

      // Generate proof using snarkjs
      const { proof, publicSignals } = await this.snarkjs.groth16.fullProve(
        circuitInput,
        this.circuits.salary.wasmPath,
        this.circuits.salary.zkeyPath
      );

      // Load verification key
      const verificationKey = await this.loadVerificationKey('salary');

      // Generate proof hash for storage/reference
      const proofHash = this.generateProofHash(proof, publicSignals);

      return {
        proof: {
          pi_a: [proof.pi_a[0], proof.pi_a[1]],
          pi_b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
          pi_c: [proof.pi_c[0], proof.pi_c[1]]
        },
        publicSignals,
        verificationKey,
        proofHash
      };
    } catch (error) {
      console.error('Failed to generate salary proof:', error);
      throw new Error('Salary proof generation failed');
    }
  }

  async generateWorkHoursProof(input: ZKProofInput): Promise<ZKProofOutput> {
    await this.initialize();

    try {
      const circuitInput = this.prepareWorkHoursCircuitInput(input);

      const { proof, publicSignals } = await this.snarkjs.groth16.fullProve(
        circuitInput,
        this.circuits.workHours.wasmPath,
        this.circuits.workHours.zkeyPath
      );

      const verificationKey = await this.loadVerificationKey('workHours');
      const proofHash = this.generateProofHash(proof, publicSignals);

      return {
        proof: {
          pi_a: [proof.pi_a[0], proof.pi_a[1]],
          pi_b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
          pi_c: [proof.pi_c[0], proof.pi_c[1]]
        },
        publicSignals,
        verificationKey,
        proofHash
      };
    } catch (error) {
      console.error('Failed to generate work hours proof:', error);
      throw new Error('Work hours proof generation failed');
    }
  }

  async generateEmploymentProof(input: ZKProofInput): Promise<ZKProofOutput> {
    await this.initialize();

    try {
      const circuitInput = this.prepareEmploymentCircuitInput(input);

      const { proof, publicSignals } = await this.snarkjs.groth16.fullProve(
        circuitInput,
        this.circuits.employment.wasmPath,
        this.circuits.employment.zkeyPath
      );

      const verificationKey = await this.loadVerificationKey('employment');
      const proofHash = this.generateProofHash(proof, publicSignals);

      return {
        proof: {
          pi_a: [proof.pi_a[0], proof.pi_a[1]],
          pi_b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
          pi_c: [proof.pi_c[0], proof.pi_c[1]]
        },
        publicSignals,
        verificationKey,
        proofHash
      };
    } catch (error) {
      console.error('Failed to generate employment proof:', error);
      throw new Error('Employment proof generation failed');
    }
  }

  async verifyProof(
    proofType: 'salary' | 'workHours' | 'employment',
    proof: ZKProofOutput['proof'],
    publicSignals: string[]
  ): Promise<boolean> {
    await this.initialize();

    try {
      const verificationKey = await this.loadVerificationKey(proofType);

      const result = await this.snarkjs.groth16.verify(
        verificationKey,
        publicSignals,
        proof
      );

      return result;
    } catch (error) {
      console.error('Failed to verify proof:', error);
      return false;
    }
  }

  async submitProofToBlockchain(
    proofOutput: ZKProofOutput,
    contractAddress: string,
    signer: Signer | null
  ): Promise<string> {
    try {
      // Contract ABI for proof submission
      const contractABI = [
        'function submitProof(uint256[2] calldata _pA, uint256[2][2] calldata _pB, uint256[2] calldata _pC, uint256[] calldata _publicSignals) external returns (bool)'
      ];

      if (!signer) {
        throw new Error('Signer not available');
      }
      const contract = new Contract(contractAddress, contractABI, signer);

      // Convert proof to the format expected by the smart contract
      const pA = [
        getBigInt(proofOutput.proof.pi_a[0]),
        getBigInt(proofOutput.proof.pi_a[1])
      ];

      const pB = [
        [getBigInt(proofOutput.proof.pi_b[0][0]), getBigInt(proofOutput.proof.pi_b[0][1])],
        [getBigInt(proofOutput.proof.pi_b[1][0]), getBigInt(proofOutput.proof.pi_b[1][1])]
      ];

      const pC = [
        getBigInt(proofOutput.proof.pi_c[0]),
        getBigInt(proofOutput.proof.pi_c[1])
      ];

      const publicSignals = proofOutput.publicSignals.map(signal =>
        getBigInt(signal)
      );

      // Submit proof to blockchain
      const tx = await contract.submitProof(pA, pB, pC, publicSignals);
      await tx.wait();

      return tx.hash;
    } catch (error) {
      console.error('Failed to submit proof to blockchain:', error);
      throw new Error('Blockchain proof submission failed');
    }
  }

  private prepareSalaryCircuitInput(input: ZKProofInput): any {
    // Convert input to circuit-compatible format
    // This would depend on the specific circuit design
    return {
      salary: input.salary.toString(),
      hoursWorked: input.hoursWorked.toString(),
      hourlyRate: Math.floor(input.hourlyRate * 100).toString(), // Convert to cents
      periodStart: Math.floor(input.periodStart.getTime() / 1000).toString(),
      periodEnd: Math.floor(input.periodEnd.getTime() / 1000).toString(),
      employeeId: this.hashToFieldElement(input.employeeId),
      employerAttestation: this.hashToFieldElement(input.employerAttestation)
    };
  }

  private prepareWorkHoursCircuitInput(input: ZKProofInput): any {
    return {
      hoursWorked: input.hoursWorked.toString(),
      periodStart: Math.floor(input.periodStart.getTime() / 1000).toString(),
      periodEnd: Math.floor(input.periodEnd.getTime() / 1000).toString(),
      employeeId: this.hashToFieldElement(input.employeeId),
      minimumHours: '40', // Example threshold
      employerAttestation: this.hashToFieldElement(input.employerAttestation)
    };
  }

  private prepareEmploymentCircuitInput(input: ZKProofInput): any {
    return {
      employeeId: this.hashToFieldElement(input.employeeId),
      employerAttestation: this.hashToFieldElement(input.employerAttestation),
      startDate: Math.floor(input.periodStart.getTime() / 1000).toString(),
      isActive: '1' // 1 for active, 0 for inactive
    };
  }

  private async loadVerificationKey(circuitType: keyof typeof this.circuits): Promise<any> {
    try {
      const response = await fetch(this.circuits[circuitType].verificationKeyPath);
      return await response.json();
    } catch (error) {
      console.error(`Failed to load verification key for ${circuitType}:`, error);
      throw new Error(`Verification key loading failed for ${circuitType}`);
    }
  }

  private generateProofHash(proof: any, publicSignals: string[]): string {
    // Generate a hash of the proof for reference/storage
    const proofString = JSON.stringify({ proof, publicSignals });
    return keccak256(toUtf8Bytes(proofString));
  }

  private hashToFieldElement(input: string): string {
    // Convert string to field element (example implementation)
    const hash = keccak256(toUtf8Bytes(input));
    // Take first 31 bytes to ensure it's within the field size
    const hashBigInt = getBigInt(hash);
    const modulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    return (hashBigInt % modulus).toString();
  }

  // Utility method to check if WebAssembly is supported
  static isWebAssemblySupported(): boolean {
    try {
      if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
        const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
        if (module instanceof WebAssembly.Module) {
          return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
        }
      }
    } catch (e) {
      // WebAssembly not supported
    }
    return false;
  }

  // Utility method to get circuit information
  getCircuitInfo(circuitType: keyof typeof this.circuits): ZKCircuit {
    return this.circuits[circuitType];
  }

  // Method to preload circuits for better performance
  async preloadCircuits(): Promise<void> {
    await this.initialize();

    const circuitTypes = Object.keys(this.circuits) as Array<keyof typeof this.circuits>;

    await Promise.all(
      circuitTypes.map(async (type) => {
        try {
          await this.loadVerificationKey(type);
          console.log(`Preloaded verification key for ${type}`);
        } catch (error) {
          console.warn(`Failed to preload verification key for ${type}:`, error);
        }
      })
    );
  }
}

// Export singleton instance
export const zkProofService = new ZKProofService();
export default zkProofService;