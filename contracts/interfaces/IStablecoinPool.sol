// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IStablecoinPool
 * @notice Interface for stablecoin liquidity pools
 */
interface IStablecoinPool {
    /**
     * @notice Emitted when liquidity is added to the pool
     * @param provider Address providing liquidity
     * @param amount Amount of stablecoin added
     * @param shares LP tokens minted
     */
    event LiquidityAdded(
        address indexed provider,
        uint256 amount,
        uint256 shares
    );

    /**
     * @notice Emitted when liquidity is removed from the pool
     * @param provider Address removing liquidity
     * @param amount Amount of stablecoin withdrawn
     * @param shares LP tokens burned
     */
    event LiquidityRemoved(
        address indexed provider,
        uint256 amount,
        uint256 shares
    );

    /**
     * @notice Emitted when an advance is disbursed
     * @param recipient Address receiving the advance
     * @param amount Amount disbursed
     * @param fee Fee charged
     */
    event AdvanceDisbursed(
        address indexed recipient,
        uint256 amount,
        uint256 fee
    );

    /**
     * @notice Emitted when fees are collected
     * @param amount Fee amount collected
     * @param totalFees Total fees accumulated
     */
    event FeesCollected(uint256 amount, uint256 totalFees);

    /**
     * @notice Adds liquidity to the pool
     * @param amount Amount of stablecoin to add
     * @return shares Number of LP tokens minted
     */
    function addLiquidity(uint256 amount) external returns (uint256 shares);

    /**
     * @notice Removes liquidity from the pool
     * @param shares Number of LP tokens to burn
     * @return amount Amount of stablecoin withdrawn
     */
    function removeLiquidity(uint256 shares) external returns (uint256 amount);

    /**
     * @notice Disburses an advance to a recipient
     * @param recipient Address to receive the advance
     * @param amount Amount to disburse
     * @return success True if disbursement was successful
     */
    function disburseAdvance(address recipient, uint256 amount) external returns (bool success);

    /**
     * @notice Calculates the current fee for an advance
     * @param amount Amount of the advance
     * @return fee Fee amount
     */
    function calculateFee(uint256 amount) external view returns (uint256 fee);

    /**
     * @notice Gets the current pool utilization ratio
     * @return utilization Utilization ratio (scaled by 1e18)
     */
    function getUtilizationRatio() external view returns (uint256 utilization);

    /**
     * @notice Gets the total liquidity in the pool
     * @return liquidity Total liquidity amount
     */
    function getTotalLiquidity() external view returns (uint256 liquidity);

    /**
     * @notice Gets the available liquidity for advances
     * @return available Available liquidity amount
     */
    function getAvailableLiquidity() external view returns (uint256 available);
}