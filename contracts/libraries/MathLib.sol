// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MathLib
 * @notice Library for mathematical operations with safety checks
 */
library MathLib {
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_UTILIZATION = 9500; // 95% max utilization
    uint256 public constant BASE_FEE = 50; // 0.5% base fee
    uint256 public constant MAX_FEE = 1000; // 10% max fee

    /**
     * @notice Calculates dynamic fee based on pool utilization
     * @param utilization Current pool utilization (scaled by PRECISION)
     * @return fee Fee percentage (scaled by 10000)
     */
    function calculateDynamicFee(uint256 utilization) internal pure returns (uint256 fee) {
        if (utilization == 0) {
            return BASE_FEE;
        }

        // Fee increases exponentially with utilization
        // fee = BASE_FEE + (utilization^2 / PRECISION) * scaling_factor
        uint256 utilizationSquared = (utilization * utilization) / PRECISION;
        uint256 additionalFee = (utilizationSquared * 450) / PRECISION; // 0.45% per utilization^2

        fee = BASE_FEE + additionalFee;

        // Cap at maximum fee
        if (fee > MAX_FEE) {
            fee = MAX_FEE;
        }
    }

    /**
     * @notice Calculates pool utilization ratio
     * @param totalBorrowed Total amount borrowed from pool
     * @param totalLiquidity Total liquidity in pool
     * @return utilization Utilization ratio (scaled by PRECISION)
     */
    function calculateUtilization(
        uint256 totalBorrowed,
        uint256 totalLiquidity
    ) internal pure returns (uint256 utilization) {
        if (totalLiquidity == 0) {
            return 0;
        }
        return (totalBorrowed * PRECISION) / totalLiquidity;
    }

    /**
     * @notice Calculates LP tokens to mint for liquidity provision
     * @param amount Amount of tokens being added
     * @param totalSupply Current total supply of LP tokens
     * @param totalReserves Current total reserves in pool
     * @return shares Number of LP tokens to mint
     */
    function calculateSharesForLiquidity(
        uint256 amount,
        uint256 totalSupply,
        uint256 totalReserves
    ) internal pure returns (uint256 shares) {
        if (totalSupply == 0 || totalReserves == 0) {
            // First liquidity provider gets shares equal to amount
            return amount;
        }

        shares = (amount * totalSupply) / totalReserves;
    }

    /**
     * @notice Calculates tokens to return for LP token burn
     * @param shares Number of LP tokens being burned
     * @param totalSupply Current total supply of LP tokens
     * @param totalReserves Current total reserves in pool
     * @return amount Number of tokens to return
     */
    function calculateTokensForShares(
        uint256 shares,
        uint256 totalSupply,
        uint256 totalReserves
    ) internal pure returns (uint256 amount) {
        require(totalSupply > 0, "MathLib: no shares exist");
        amount = (shares * totalReserves) / totalSupply;
    }

    /**
     * @notice Calculates compound interest for yield generation
     * @param principal Principal amount
     * @param rate Annual interest rate (scaled by PRECISION)
     * @param time Time period in seconds
     * @return interest Interest earned
     */
    function calculateCompoundInterest(
        uint256 principal,
        uint256 rate,
        uint256 time
    ) internal pure returns (uint256 interest) {
        if (principal == 0 || rate == 0 || time == 0) {
            return 0;
        }

        // Simple interest calculation for efficiency
        // For more complex scenarios, implement compound interest
        uint256 annualInterest = (principal * rate) / PRECISION;
        interest = (annualInterest * time) / 365 days;
    }

    /**
     * @notice Validates that a value is within bounds
     * @param value Value to check
     * @param min Minimum allowed value
     * @param max Maximum allowed value
     * @return valid True if value is within bounds
     */
    function isWithinBounds(uint256 value, uint256 min, uint256 max) internal pure returns (bool valid) {
        return value >= min && value <= max;
    }

    /**
     * @notice Safe division with rounding up
     * @param a Dividend
     * @param b Divisor
     * @return result Division result rounded up
     */
    function divCeil(uint256 a, uint256 b) internal pure returns (uint256 result) {
        require(b > 0, "MathLib: division by zero");
        result = (a + b - 1) / b;
    }

    /**
     * @notice Calculates percentage with precision
     * @param amount Base amount
     * @param percentage Percentage (scaled by 10000)
     * @return result Calculated percentage
     */
    function percentage(uint256 amount, uint256 percentage) internal pure returns (uint256 result) {
        result = (amount * percentage) / 10000;
    }
}