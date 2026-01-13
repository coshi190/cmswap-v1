// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {TBridgeTokenRegistry} from "../src/TBridgeTokenRegistry.sol";

/// @title RegisterTokens
/// @notice Script to register new tokens on the bridge
/// @dev Run with: forge script script/RegisterTokens.s.sol --rpc-url $RPC_URL --broadcast
contract RegisterTokens is Script {
    // ============ Chain IDs ============
    uint256 public constant KUB_CHAIN_ID = 96;
    uint256 public constant JBC_CHAIN_ID = 8899;
    uint256 public constant BSC_CHAIN_ID = 56;

    function run() external {
        // Load registry address from environment
        address registryAddress = vm.envAddress("TOKEN_REGISTRY_ADDRESS");
        TBridgeTokenRegistry registry = TBridgeTokenRegistry(registryAddress);

        console.log("Token Registry:", registryAddress);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // Example: Register a new token
        // Uncomment and modify as needed

        /*
        // Register new token with first remote chain
        registry.registerToken(
            0x..., // Local token address
            JBC_CHAIN_ID, // First remote chain
            0x..., // Remote token address
            1e18, // Min amount (1 token)
            1_000_000e18, // Max amount (1M tokens)
            100_000e18 // Daily limit (100K tokens per user)
        );

        // Add second remote chain mapping
        registry.addRemoteToken(
            0x..., // Local token address
            BSC_CHAIN_ID, // Second remote chain
            0x... // Remote token address on BSC
        );
        */

        vm.stopBroadcast();
    }

    /// @notice Register a token across all chains
    /// @param localToken Local token address
    /// @param remoteChain1 First remote chain ID
    /// @param remoteToken1 Token address on first remote chain
    /// @param remoteChain2 Second remote chain ID
    /// @param remoteToken2 Token address on second remote chain
    /// @param minAmount Minimum bridge amount
    /// @param maxAmount Maximum bridge amount
    /// @param dailyLimit Daily limit per user
    function registerTokenWithMappings(
        address localToken,
        uint256 remoteChain1,
        address remoteToken1,
        uint256 remoteChain2,
        address remoteToken2,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 dailyLimit
    ) external {
        address registryAddress = vm.envAddress("TOKEN_REGISTRY_ADDRESS");
        TBridgeTokenRegistry registry = TBridgeTokenRegistry(registryAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // Register with first remote chain
        registry.registerToken(localToken, remoteChain1, remoteToken1, minAmount, maxAmount, dailyLimit);

        console.log("Registered token:", localToken);
        console.log("  Remote chain 1:", remoteChain1);
        console.log("  Remote token 1:", remoteToken1);

        // Add second remote chain mapping
        if (remoteChain2 != 0 && remoteToken2 != address(0)) {
            registry.addRemoteToken(localToken, remoteChain2, remoteToken2);
            console.log("  Remote chain 2:", remoteChain2);
            console.log("  Remote token 2:", remoteToken2);
        }

        vm.stopBroadcast();
    }

    /// @notice Update token limits
    function updateTokenLimits(address token, uint256 minAmount, uint256 maxAmount, uint256 dailyLimit) external {
        address registryAddress = vm.envAddress("TOKEN_REGISTRY_ADDRESS");
        TBridgeTokenRegistry registry = TBridgeTokenRegistry(registryAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        registry.setTokenLimits(token, minAmount, maxAmount, dailyLimit);

        console.log("Updated limits for token:", token);
        console.log("  Min:", minAmount);
        console.log("  Max:", maxAmount);
        console.log("  Daily limit:", dailyLimit);

        vm.stopBroadcast();
    }

    /// @notice Enable or disable a token
    function setTokenEnabled(address token, bool enabled) external {
        address registryAddress = vm.envAddress("TOKEN_REGISTRY_ADDRESS");
        TBridgeTokenRegistry registry = TBridgeTokenRegistry(registryAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        registry.setTokenEnabled(token, enabled);

        console.log("Token:", token);
        console.log("  Status:", enabled ? "enabled" : "disabled");

        vm.stopBroadcast();
    }
}
