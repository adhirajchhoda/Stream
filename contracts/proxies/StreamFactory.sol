// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../core/StreamCore.sol";
import "../core/StablecoinPool.sol";
import "../core/EmployerRegistry.sol";

/**
 * @title StreamFactory
 * @notice Factory contract for deploying Stream protocol contracts with proxy pattern
 * @dev Deploys and initializes all Stream protocol contracts in correct order
 */
contract StreamFactory is Ownable, ReentrancyGuard {
    struct DeploymentAddresses {
        address streamCore;
        address stablecoinPool;
        address employerRegistry;
        address streamCoreProxy;
        address stablecoinPoolProxy;
        address employerRegistryProxy;
    }

    struct DeploymentParams {
        address zkVerifier;
        address stablecoin;
        address stakeToken;
        address admin;
        uint256 minEmployerStake;
        uint256 stakeLockPeriod;
        uint256 minimumLockPeriod;
        uint256 withdrawalFee;
        uint256 performanceFee;
        string poolName;
        string poolSymbol;
    }

    event StreamProtocolDeployed(
        address indexed admin,
        address streamCoreProxy,
        address stablecoinPoolProxy,
        address employerRegistryProxy
    );

    event ImplementationUpgraded(
        string contractType,
        address oldImplementation,
        address newImplementation
    );

    mapping(address => DeploymentAddresses) public deployments;
    address[] public deployedInstances;

    /**
     * @notice Deploys a complete Stream protocol instance
     * @param params Deployment parameters
     * @return addresses Deployed contract addresses
     */
    function deployStreamProtocol(
        DeploymentParams memory params
    ) external nonReentrant returns (DeploymentAddresses memory addresses) {
        require(params.zkVerifier != address(0), "StreamFactory: invalid verifier");
        require(params.stablecoin != address(0), "StreamFactory: invalid stablecoin");
        require(params.stakeToken != address(0), "StreamFactory: invalid stake token");
        require(params.admin != address(0), "StreamFactory: invalid admin");

        // Deploy implementation contracts
        StreamCore streamCoreImpl = new StreamCore();
        StablecoinPool stablecoinPoolImpl = new StablecoinPool(IERC20(params.stablecoin));
        EmployerRegistry employerRegistryImpl = new EmployerRegistry();

        // Deploy proxy contracts
        ERC1967Proxy streamCoreProxy = new ERC1967Proxy(
            address(streamCoreImpl),
            ""
        );

        ERC1967Proxy stablecoinPoolProxy = new ERC1967Proxy(
            address(stablecoinPoolImpl),
            ""
        );

        ERC1967Proxy employerRegistryProxy = new ERC1967Proxy(
            address(employerRegistryImpl),
            ""
        );

        // Initialize contracts in correct order
        _initializeContracts(params, streamCoreProxy, stablecoinPoolProxy, employerRegistryProxy);

        // Store deployment addresses
        addresses = DeploymentAddresses({
            streamCore: address(streamCoreImpl),
            stablecoinPool: address(stablecoinPoolImpl),
            employerRegistry: address(employerRegistryImpl),
            streamCoreProxy: address(streamCoreProxy),
            stablecoinPoolProxy: address(stablecoinPoolProxy),
            employerRegistryProxy: address(employerRegistryProxy)
        });

        deployments[params.admin] = addresses;
        deployedInstances.push(params.admin);

        emit StreamProtocolDeployed(
            params.admin,
            address(streamCoreProxy),
            address(stablecoinPoolProxy),
            address(employerRegistryProxy)
        );

        return addresses;
    }

    /**
     * @notice Deploys a single stablecoin pool
     * @param stablecoin Address of the stablecoin
     * @param params Pool parameters
     * @return poolProxy Address of the deployed pool proxy
     */
    function deployStablecoinPool(
        address stablecoin,
        string memory name,
        string memory symbol,
        address admin,
        uint256 minimumLockPeriod,
        uint256 withdrawalFee,
        uint256 performanceFee
    ) external nonReentrant returns (address poolProxy) {
        require(stablecoin != address(0), "StreamFactory: invalid stablecoin");
        require(admin != address(0), "StreamFactory: invalid admin");

        // Deploy implementation
        StablecoinPool poolImpl = new StablecoinPool(IERC20(stablecoin));

        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(poolImpl),
            ""
        );

        // Initialize
        StablecoinPool(address(proxy)).initialize(
            name,
            symbol,
            admin,
            minimumLockPeriod,
            withdrawalFee,
            performanceFee
        );

        return address(proxy);
    }

    /**
     * @notice Gets deployment addresses for an admin
     * @param admin Admin address
     * @return addresses Deployment addresses
     */
    function getDeployment(address admin) external view returns (DeploymentAddresses memory addresses) {
        return deployments[admin];
    }

    /**
     * @notice Gets the number of deployed instances
     * @return count Number of instances
     */
    function getDeploymentCount() external view returns (uint256 count) {
        return deployedInstances.length;
    }

    /**
     * @notice Gets all deployed instance admins
     * @return admins Array of admin addresses
     */
    function getAllDeployments() external view returns (address[] memory admins) {
        return deployedInstances;
    }

    /**
     * @notice Upgrades implementation contracts for a deployment
     * @param admin Admin of the deployment to upgrade
     * @param newStreamCore New StreamCore implementation (zero address to skip)
     * @param newStablecoinPool New StablecoinPool implementation (zero address to skip)
     * @param newEmployerRegistry New EmployerRegistry implementation (zero address to skip)
     */
    function upgradeImplementations(
        address admin,
        address newStreamCore,
        address newStablecoinPool,
        address newEmployerRegistry
    ) external onlyOwner {
        DeploymentAddresses memory deployment = deployments[admin];
        require(deployment.streamCoreProxy != address(0), "StreamFactory: deployment not found");

        if (newStreamCore != address(0)) {
            address oldImpl = deployment.streamCore;
            StreamCore(deployment.streamCoreProxy).upgradeTo(newStreamCore);
            deployments[admin].streamCore = newStreamCore;

            emit ImplementationUpgraded("StreamCore", oldImpl, newStreamCore);
        }

        if (newStablecoinPool != address(0)) {
            address oldImpl = deployment.stablecoinPool;
            StablecoinPool(deployment.stablecoinPoolProxy).upgradeTo(newStablecoinPool);
            deployments[admin].stablecoinPool = newStablecoinPool;

            emit ImplementationUpgraded("StablecoinPool", oldImpl, newStablecoinPool);
        }

        if (newEmployerRegistry != address(0)) {
            address oldImpl = deployment.employerRegistry;
            EmployerRegistry(deployment.employerRegistryProxy).upgradeTo(newEmployerRegistry);
            deployments[admin].employerRegistry = newEmployerRegistry;

            emit ImplementationUpgraded("EmployerRegistry", oldImpl, newEmployerRegistry);
        }
    }

    /**
     * @notice Emergency function to transfer ownership of deployed contracts
     * @param admin Current admin of the deployment
     * @param newAdmin New admin address
     */
    function transferDeploymentOwnership(address admin, address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "StreamFactory: invalid new admin");

        DeploymentAddresses memory deployment = deployments[admin];
        require(deployment.streamCoreProxy != address(0), "StreamFactory: deployment not found");

        // Transfer ownership of all contracts
        StreamCore(deployment.streamCoreProxy).grantRole(
            StreamCore(deployment.streamCoreProxy).DEFAULT_ADMIN_ROLE(),
            newAdmin
        );
        StablecoinPool(deployment.stablecoinPoolProxy).grantRole(
            StablecoinPool(deployment.stablecoinPoolProxy).DEFAULT_ADMIN_ROLE(),
            newAdmin
        );
        EmployerRegistry(deployment.employerRegistryProxy).grantRole(
            EmployerRegistry(deployment.employerRegistryProxy).DEFAULT_ADMIN_ROLE(),
            newAdmin
        );

        // Update deployment mapping
        deployments[newAdmin] = deployment;
        delete deployments[admin];

        // Update deployed instances array
        for (uint256 i = 0; i < deployedInstances.length; i++) {
            if (deployedInstances[i] == admin) {
                deployedInstances[i] = newAdmin;
                break;
            }
        }
    }

    // Internal functions

    /**
     * @notice Initializes all contracts in correct order
     */
    function _initializeContracts(
        DeploymentParams memory params,
        ERC1967Proxy streamCoreProxy,
        ERC1967Proxy stablecoinPoolProxy,
        ERC1967Proxy employerRegistryProxy
    ) internal {
        // Initialize EmployerRegistry first
        EmployerRegistry(address(employerRegistryProxy)).initialize(
            params.stakeToken,
            params.admin,
            params.minEmployerStake,
            params.stakeLockPeriod
        );

        // Initialize StablecoinPool
        StablecoinPool(address(stablecoinPoolProxy)).initialize(
            params.poolName,
            params.poolSymbol,
            params.admin,
            params.minimumLockPeriod,
            params.withdrawalFee,
            params.performanceFee
        );

        // Initialize StreamCore with references to other contracts
        StreamCore(address(streamCoreProxy)).initialize(
            params.zkVerifier,
            address(stablecoinPoolProxy),
            address(employerRegistryProxy),
            params.admin,
            params.minEmployerStake
        );

        // Set up cross-contract references
        EmployerRegistry(address(employerRegistryProxy)).setStreamCore(address(streamCoreProxy));

        // Grant disburser role to StreamCore in StablecoinPool
        StablecoinPool(address(stablecoinPoolProxy)).grantRole(
            StablecoinPool(address(stablecoinPoolProxy)).DISBURSER_ROLE(),
            address(streamCoreProxy)
        );
    }
}