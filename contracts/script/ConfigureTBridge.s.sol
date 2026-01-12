// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {TBridgeV2} from "../src/TBridgeV2.sol";
import {TBridgeVault} from "../src/TBridgeVault.sol";
import {TBridgeFeeCollector} from "../src/TBridgeFeeCollector.sol";

/// @title ConfigureTBridge
/// @notice Script to configure tBridge-v2 after deployment
/// @dev Run with: forge script script/ConfigureTBridge.s.sol --rpc-url $RPC_URL --broadcast
contract ConfigureTBridge is Script {
    function run() external {
        // Load contract addresses from environment
        address bridgeAddress = vm.envAddress("BRIDGE_ADDRESS");
        TBridgeV2 bridge = TBridgeV2(bridgeAddress);

        console.log("Configuring bridge at:", bridgeAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // Configuration operations go here
        // Uncomment and modify as needed

        /*
        // Set custom fees for a token
        bridge.setBridgeFee(tokenAddress, 100); // 1%
        bridge.setProtocolFee(tokenAddress, 50); // 0.5%

        // Update relayer
        bridge.setRelayer(newRelayerAddress);

        // Add/remove supported chain
        bridge.setSupportedChain(chainId, true);
        */

        vm.stopBroadcast();
    }

    /// @notice Set bridge fee for a token
    function setBridgeFee(address token, uint256 feeBps) external {
        address bridgeAddress = vm.envAddress("BRIDGE_ADDRESS");
        TBridgeV2 bridge = TBridgeV2(bridgeAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        bridge.setBridgeFee(token, feeBps);
        vm.stopBroadcast();

        console.log("Set bridge fee for token:", token);
        console.log("  Fee (bps):", feeBps);
    }

    /// @notice Set protocol fee for a token
    function setProtocolFee(address token, uint256 feeBps) external {
        address bridgeAddress = vm.envAddress("BRIDGE_ADDRESS");
        TBridgeV2 bridge = TBridgeV2(bridgeAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        bridge.setProtocolFee(token, feeBps);
        vm.stopBroadcast();

        console.log("Set protocol fee for token:", token);
        console.log("  Fee (bps):", feeBps);
    }

    /// @notice Update relayer address
    function setRelayer(address newRelayer) external {
        address bridgeAddress = vm.envAddress("BRIDGE_ADDRESS");
        TBridgeV2 bridge = TBridgeV2(bridgeAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        bridge.setRelayer(newRelayer);
        vm.stopBroadcast();

        console.log("Updated relayer to:", newRelayer);
    }

    /// @notice Add or remove supported chain
    function setSupportedChain(uint256 chainId, bool supported) external {
        address bridgeAddress = vm.envAddress("BRIDGE_ADDRESS");
        TBridgeV2 bridge = TBridgeV2(bridgeAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        bridge.setSupportedChain(chainId, supported);
        vm.stopBroadcast();

        console.log("Chain:", chainId);
        console.log("  Status:", supported ? "enabled" : "disabled");
    }

    /// @notice Pause the bridge
    function pause() external {
        address bridgeAddress = vm.envAddress("BRIDGE_ADDRESS");
        TBridgeV2 bridge = TBridgeV2(bridgeAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        bridge.pause();
        vm.stopBroadcast();

        console.log("Bridge paused");
    }

    /// @notice Unpause the bridge
    function unpause() external {
        address bridgeAddress = vm.envAddress("BRIDGE_ADDRESS");
        TBridgeV2 bridge = TBridgeV2(bridgeAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        bridge.unpause();
        vm.stopBroadcast();

        console.log("Bridge unpaused");
    }

    /// @notice Update treasury address
    function setTreasury(address newTreasury) external {
        address feeCollectorAddress = vm.envAddress("FEE_COLLECTOR_ADDRESS");
        TBridgeFeeCollector feeCollector = TBridgeFeeCollector(feeCollectorAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        feeCollector.setTreasury(newTreasury);
        vm.stopBroadcast();

        console.log("Updated treasury to:", newTreasury);
    }

    /// @notice Withdraw protocol fees
    function withdrawFees(address token) external {
        address feeCollectorAddress = vm.envAddress("FEE_COLLECTOR_ADDRESS");
        TBridgeFeeCollector feeCollector = TBridgeFeeCollector(feeCollectorAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        uint256 amount = feeCollector.withdrawFees(token);
        vm.stopBroadcast();

        console.log("Withdrew fees for token:", token);
        console.log("  Amount:", amount);
    }

    /// @notice Emergency withdrawal from vault
    function emergencyWithdraw(address token, address to, uint256 amount) external {
        address vaultAddress = vm.envAddress("VAULT_ADDRESS");
        TBridgeVault vault = TBridgeVault(vaultAddress);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        vault.emergencyWithdraw(token, to, amount);
        vm.stopBroadcast();

        console.log("Emergency withdrawal:");
        console.log("  Token:", token);
        console.log("  To:", to);
        console.log("  Amount:", amount);
    }
}
